"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Check,
  Loader2,
  Plus,
  Link2,
  Building2,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ComboboxStandalone } from "@/components/app/combobox-standalone";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { useUpdateSheet } from "@/hooks/use-sheets";
import { cn } from "@/lib/utils";
import { cellKey, evaluateSheet, sheetToCsv } from "@/lib/sheet-engine";
import type {
  CellStyle,
  NumberFormat,
  Sheet,
  SheetCell,
  SheetData,
} from "@/lib/api/types";
import { SheetToolbar } from "./sheet-toolbar";
import {
  SheetGrid,
  type CellPos,
  type SelectionRange,
} from "./sheet-grid";

const AUTOSAVE_MS = 700;

interface WorkingState {
  title: string;
  data: SheetData;
  clientId: string | null;
  projectId: string | null;
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/** Selected cell list from a range (for applying styles / clearing). */
function rangeCells(sel: SelectionRange): CellPos[] {
  const r0 = Math.min(sel.anchor.row, sel.focus.row);
  const r1 = Math.max(sel.anchor.row, sel.focus.row);
  const c0 = Math.min(sel.anchor.col, sel.focus.col);
  const c1 = Math.max(sel.anchor.col, sel.focus.col);
  const out: CellPos[] = [];
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) out.push({ row: r, col: c });
  return out;
}

/** A cell's raw editing content (formula if present, else literal). */
function rawContent(cell?: SheetCell): string {
  if (!cell) return "";
  if (cell.f) return cell.f;
  if (cell.v === undefined || cell.v === null) return "";
  return String(cell.v);
}

/** Parse a committed string into { f } or { v } cell fragments. */
function parseInput(input: string): Pick<SheetCell, "v" | "f"> {
  const trimmed = input;
  if (trimmed.startsWith("=")) return { f: trimmed };
  if (trimmed === "") return {};
  const n = Number(trimmed);
  if (trimmed.trim() !== "" && !Number.isNaN(n)) return { v: n };
  return { v: trimmed };
}

export function SheetEditor({ sheet }: { sheet: Sheet }) {
  const router = useRouter();
  const update = useUpdateSheet(sheet.id);

  const [working, setWorking] = React.useState<WorkingState>(() => ({
    title: sheet.title,
    data: sheet.data,
    clientId: sheet.clientId,
    projectId: sheet.projectId,
  }));
  // Mirror the latest working state for side-effecting callbacks (so the
  // scheduleSave side effect lives OUTSIDE the setState updater).
  const workingRef = React.useRef(working);
  workingRef.current = working;
  const [status, setStatus] = React.useState<SaveStatus>("idle");

  const [active, setActive] = React.useState<CellPos>({ row: 0, col: 0 });
  const [selection, setSelection] = React.useState<SelectionRange>({
    anchor: { row: 0, col: 0 },
    focus: { row: 0, col: 0 },
  });
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");

  // Title rename
  const [titleDraft, setTitleDraft] = React.useState(sheet.title);
  const [editingTitle, setEditingTitle] = React.useState(false);

  // ---- autosave plumbing -------------------------------------------------
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = React.useRef<WorkingState | null>(null);
  const updateRef = React.useRef(update);
  updateRef.current = update;

  const flush = React.useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setStatus("saving");
    updateRef.current.mutate(
      {
        title: pending.title,
        data: pending.data,
        clientId: pending.clientId,
        projectId: pending.projectId,
      },
      {
        onSuccess: () => setStatus((s) => (pendingRef.current ? s : "saved")),
        onError: () => setStatus("error"),
      },
    );
  }, []);

  const scheduleSave = React.useCallback(
    (next: WorkingState) => {
      pendingRef.current = next;
      setStatus("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, AUTOSAVE_MS);
    },
    [flush],
  );

  // Flush on unmount (best-effort).
  React.useEffect(() => {
    return () => {
      const pending = pendingRef.current;
      if (pending) {
        updateRef.current.mutate({
          title: pending.title,
          data: pending.data,
          clientId: pending.clientId,
          projectId: pending.projectId,
        });
      }
    };
  }, []);

  /** Apply a working-state update and schedule a save. */
  const commit = React.useCallback(
    (updater: (prev: WorkingState) => WorkingState) => {
      const next = updater(workingRef.current);
      workingRef.current = next;
      setWorking(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  // ---- computed grid -----------------------------------------------------
  const computed = React.useMemo(
    () =>
      evaluateSheet(working.data.cells, working.data.rows, working.data.cols),
    [working.data],
  );

  // ---- selection helpers -------------------------------------------------
  const clampPos = React.useCallback(
    (pos: CellPos): CellPos => ({
      row: Math.max(0, Math.min(working.data.rows - 1, pos.row)),
      col: Math.max(0, Math.min(working.data.cols - 1, pos.col)),
    }),
    [working.data.rows, working.data.cols],
  );

  const selectCell = React.useCallback(
    (pos: CellPos, extend: boolean) => {
      const p = clampPos(pos);
      setActive(p);
      setSelection((sel) =>
        extend ? { anchor: sel.anchor, focus: p } : { anchor: p, focus: p },
      );
    },
    [clampPos],
  );

  const dragTo = React.useCallback(
    (pos: CellPos) => {
      const p = clampPos(pos);
      setActive(p);
      setSelection((sel) => ({ anchor: sel.anchor, focus: p }));
    },
    [clampPos],
  );

  const selectColumn = React.useCallback(
    (col: number) => {
      setActive({ row: 0, col });
      setSelection({
        anchor: { row: 0, col },
        focus: { row: working.data.rows - 1, col },
      });
    },
    [working.data.rows],
  );

  const selectRow = React.useCallback(
    (row: number) => {
      setActive({ row, col: 0 });
      setSelection({
        anchor: { row, col: 0 },
        focus: { row, col: working.data.cols - 1 },
      });
    },
    [working.data.cols],
  );

  // ---- editing -----------------------------------------------------------
  const startEdit = React.useCallback(
    (initial?: string) => {
      const key = cellKey(active.row, active.col);
      setEditValue(initial !== undefined ? initial : rawContent(working.data.cells[key]));
      setEditing(true);
    },
    [active, working.data.cells],
  );

  const writeCell = React.useCallback(
    (pos: CellPos, raw: string) => {
      const key = cellKey(pos.row, pos.col);
      commit((prev) => {
        const cells = { ...prev.data.cells };
        const existing = cells[key];
        const parsed = parseInput(raw);
        if (parsed.v === undefined && parsed.f === undefined) {
          // cleared value — keep style if any, else drop the cell
          if (existing?.s) cells[key] = { s: existing.s };
          else delete cells[key];
        } else {
          cells[key] = { ...(existing?.s ? { s: existing.s } : {}), ...parsed };
        }
        return { ...prev, data: { ...prev.data, cells } };
      });
    },
    [commit],
  );

  const commitEdit = React.useCallback(
    (dir: "down" | "right" | "none") => {
      writeCell(active, editValue);
      setEditing(false);
      if (dir === "down") {
        const p = clampPos({ row: active.row + 1, col: active.col });
        setActive(p);
        setSelection({ anchor: p, focus: p });
      } else if (dir === "right") {
        const p = clampPos({ row: active.row, col: active.col + 1 });
        setActive(p);
        setSelection({ anchor: p, focus: p });
      }
    },
    [active, editValue, writeCell, clampPos],
  );

  const cancelEdit = React.useCallback(() => setEditing(false), []);

  // Clear values for the whole selection (Delete/Backspace).
  const clearSelection = React.useCallback(() => {
    const list = rangeCells(selection);
    commit((prev) => {
      const cells = { ...prev.data.cells };
      for (const pos of list) {
        const key = cellKey(pos.row, pos.col);
        const existing = cells[key];
        if (!existing) continue;
        if (existing.s) cells[key] = { s: existing.s };
        else delete cells[key];
      }
      return { ...prev, data: { ...prev.data, cells } };
    });
  }, [selection, commit]);

  // ---- keyboard navigation (grid not editing) ----------------------------
  const onKeyNav = React.useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e;
      if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
        e.preventDefault();
        const delta =
          key === "ArrowUp"
            ? { row: -1, col: 0 }
            : key === "ArrowDown"
              ? { row: 1, col: 0 }
              : key === "ArrowLeft"
                ? { row: 0, col: -1 }
                : { row: 0, col: 1 };
        const p = clampPos({ row: active.row + delta.row, col: active.col + delta.col });
        if (e.shiftKey) {
          setActive(p);
          setSelection((sel) => ({ anchor: sel.anchor, focus: p }));
        } else {
          setActive(p);
          setSelection({ anchor: p, focus: p });
        }
        return;
      }
      if (key === "Enter") {
        e.preventDefault();
        startEdit();
        return;
      }
      if (key === "Tab") {
        e.preventDefault();
        const p = clampPos({
          row: active.row,
          col: active.col + (e.shiftKey ? -1 : 1),
        });
        setActive(p);
        setSelection({ anchor: p, focus: p });
        return;
      }
      if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        clearSelection();
        return;
      }
      if (key === "Escape") {
        return;
      }
      // Start typing → enter edit mode replacing content
      if (
        key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        startEdit(key);
      }
    },
    [active, clampPos, startEdit, clearSelection],
  );

  // ---- style application -------------------------------------------------
  const activeKey = cellKey(active.row, active.col);
  const activeStyle: CellStyle = working.data.cells[activeKey]?.s ?? {};

  const applyStyle = React.useCallback(
    (patch: (prev: CellStyle) => CellStyle) => {
      const list = rangeCells(selection);
      commit((prev) => {
        const cells = { ...prev.data.cells };
        for (const pos of list) {
          const key = cellKey(pos.row, pos.col);
          const existing = cells[key] ?? {};
          const nextStyle = patch(existing.s ?? {});
          // prune empty style keys
          const cleaned: CellStyle = {};
          for (const [k, v] of Object.entries(nextStyle)) {
            if (v !== undefined && v !== false && v !== null) {
              (cleaned as Record<string, unknown>)[k] = v;
            }
          }
          const hasStyle = Object.keys(cleaned).length > 0;
          if (
            existing.v === undefined &&
            existing.f === undefined &&
            !hasStyle
          ) {
            delete cells[key];
          } else {
            cells[key] = hasStyle
              ? { ...existing, s: cleaned }
              : (() => {
                  const { s: _drop, ...rest } = existing;
                  void _drop;
                  return rest;
                })();
          }
        }
        return { ...prev, data: { ...prev.data, cells } };
      });
    },
    [selection, commit],
  );

  const toggleMark = React.useCallback(
    (k: "b" | "i" | "u") => {
      const turnOn = !activeStyle[k];
      applyStyle((s) => ({ ...s, [k]: turnOn ? true : undefined }));
    },
    [activeStyle, applyStyle],
  );

  const setAlign = React.useCallback(
    (a: NonNullable<CellStyle["a"]>) => applyStyle((s) => ({ ...s, a })),
    [applyStyle],
  );
  const setColor = React.useCallback(
    (color: string | undefined) => applyStyle((s) => ({ ...s, color })),
    [applyStyle],
  );
  const setBg = React.useCallback(
    (bg: string | undefined) => applyStyle((s) => ({ ...s, bg })),
    [applyStyle],
  );
  const setFmt = React.useCallback(
    (fmt: NumberFormat) =>
      applyStyle((s) => ({ ...s, fmt: fmt === "general" ? undefined : fmt })),
    [applyStyle],
  );
  const clearFormatting = React.useCallback(
    () => applyStyle(() => ({})),
    [applyStyle],
  );

  // ---- formula bar -------------------------------------------------------
  const [fxValue, setFxValue] = React.useState("");
  const [fxFocused, setFxFocused] = React.useState(false);
  const displayedRaw = rawContent(working.data.cells[activeKey]);
  const fxShown = fxFocused ? fxValue : displayedRaw;

  // ---- title -------------------------------------------------------------
  const commitTitle = React.useCallback(() => {
    setEditingTitle(false);
    const t = titleDraft.trim() || "Untitled sheet";
    if (t !== working.title) {
      commit((prev) => ({ ...prev, title: t }));
    } else {
      setTitleDraft(t);
    }
  }, [titleDraft, working.title, commit]);

  // ---- link (client/project) --------------------------------------------
  const { data: clients } = useClients();
  const { data: projects } = useProjects();
  const clientOptions = React.useMemo(
    () => (clients ?? []).map((c) => ({ label: c.name, value: c.id })),
    [clients],
  );
  const projectOptions = React.useMemo(
    () =>
      (projects ?? [])
        .filter((p) => !working.clientId || p.clientId === working.clientId)
        .map((p) => ({ label: p.name, value: p.id })),
    [projects, working.clientId],
  );

  // ---- rows/cols expansion ----------------------------------------------
  const addRows = React.useCallback(
    () =>
      commit((prev) => ({
        ...prev,
        data: { ...prev.data, rows: prev.data.rows + 10 },
      })),
    [commit],
  );
  const addCols = React.useCallback(
    () =>
      commit((prev) => ({
        ...prev,
        data: { ...prev.data, cols: prev.data.cols + 5 },
      })),
    [commit],
  );

  // ---- CSV export --------------------------------------------------------
  const exportCsv = React.useCallback(() => {
    const csv = sheetToCsv(
      working.data.cells,
      working.data.rows,
      working.data.cols,
    );
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(working.title || "sheet").replace(/[^\w.-]+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [working]);

  const selCount = rangeCells(selection).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/sheets")}
          title="Back to Sheets"
        >
          <ArrowLeft />
        </Button>

        {editingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              } else if (e.key === "Escape") {
                setTitleDraft(working.title);
                setEditingTitle(false);
              }
            }}
            className="h-8 w-56 font-display text-base font-semibold"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setTitleDraft(working.title);
              setEditingTitle(true);
            }}
            className="rounded-md px-2 py-1 font-display text-base font-semibold tracking-tight transition-colors hover:bg-accent/10"
            title="Rename"
          >
            {working.title || "Untitled sheet"}
          </button>
        )}

        <SaveBadge status={status} />

        <div className="ml-auto flex items-center gap-2">
          <LinkMenu
            clientId={working.clientId}
            projectId={working.projectId}
            clientName={
              clients?.find((c) => c.id === working.clientId)?.name ?? null
            }
            projectName={
              projects?.find((p) => p.id === working.projectId)?.name ?? null
            }
            clientOptions={clientOptions}
            projectOptions={projectOptions}
            onClient={(id) =>
              commit((prev) => ({
                ...prev,
                clientId: id || null,
                // dropping the client unlinks an incompatible project
                projectId:
                  id &&
                  projects?.find((p) => p.id === prev.projectId)?.clientId === id
                    ? prev.projectId
                    : id
                      ? prev.projectId
                      : null,
              }))
            }
            onProject={(id) =>
              commit((prev) => ({ ...prev, projectId: id || null }))
            }
          />
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <SheetToolbar
        active={activeStyle}
        onToggle={toggleMark}
        onAlign={setAlign}
        onColor={setColor}
        onBg={setBg}
        onFormat={setFmt}
        onClearFormatting={clearFormatting}
      />

      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b bg-card/40 px-3 py-1.5">
        <span className="grid h-7 min-w-[56px] place-items-center rounded-md border bg-muted px-2 font-mono text-xs font-semibold text-muted-foreground">
          {activeKey}
        </span>
        <span className="font-mono text-sm text-muted-foreground">fx</span>
        <input
          value={fxShown}
          onFocus={() => {
            setFxFocused(true);
            setFxValue(displayedRaw);
          }}
          onChange={(e) => setFxValue(e.target.value)}
          onBlur={() => {
            if (fxFocused) writeCell(active, fxValue);
            setFxFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              writeCell(active, fxValue);
              setFxFocused(false);
              (e.target as HTMLInputElement).blur();
              const p = clampPos({ row: active.row + 1, col: active.col });
              setActive(p);
              setSelection({ anchor: p, focus: p });
            } else if (e.key === "Escape") {
              setFxFocused(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Enter a value or =formula"
          className="h-7 flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Grid */}
      <div className="relative min-h-0 flex-1">
        <SheetGrid
          data={working.data}
          computed={computed}
          selection={selection}
          active={active}
          editing={editing}
          editValue={editValue}
          onEditValueChange={setEditValue}
          onSelectCell={selectCell}
          onSelectColumn={selectColumn}
          onSelectRow={selectRow}
          onStartEdit={startEdit}
          onCommitEdit={commitEdit}
          onCancelEdit={cancelEdit}
          onKeyNav={onKeyNav}
          onDragTo={dragTo}
        />
      </div>

      {/* Footer: add rows/cols + selection summary */}
      <div className="flex items-center gap-2 border-t bg-card/40 px-3 py-1.5 text-xs text-muted-foreground">
        <Button variant="ghost" size="xs" onClick={addRows}>
          <Plus className="size-3" /> 10 rows
        </Button>
        <Button variant="ghost" size="xs" onClick={addCols}>
          <Plus className="size-3" /> 5 cols
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <span>
          {working.data.rows} × {working.data.cols}
        </span>
        {selCount > 1 && (
          <>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <span>{selCount} cells selected</span>
          </>
        )}
      </div>
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, { text: string; cls: string; icon: React.ReactNode }> = {
    idle: {
      text: "All changes saved",
      cls: "text-muted-foreground",
      icon: <Check className="size-3.5" />,
    },
    saved: {
      text: "All changes saved",
      cls: "text-muted-foreground",
      icon: <Check className="size-3.5 text-success" />,
    },
    dirty: {
      text: "Saving…",
      cls: "text-muted-foreground",
      icon: <Loader2 className="size-3.5 animate-spin" />,
    },
    saving: {
      text: "Saving…",
      cls: "text-muted-foreground",
      icon: <Loader2 className="size-3.5 animate-spin" />,
    },
    error: {
      text: "Save failed — retrying",
      cls: "text-destructive",
      icon: <Loader2 className="size-3.5" />,
    },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", s.cls)}>
      {s.icon}
      {s.text}
    </span>
  );
}

function LinkMenu({
  clientId,
  projectId,
  clientName,
  projectName,
  clientOptions,
  projectOptions,
  onClient,
  onProject,
}: {
  clientId: string | null;
  projectId: string | null;
  clientName: string | null;
  projectName: string | null;
  clientOptions: { label: string; value: string }[];
  projectOptions: { label: string; value: string }[];
  onClient: (id: string) => void;
  onProject: (id: string) => void;
}) {
  const linked = clientId || projectId;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="size-4" />
          {linked ? (
            <span className="max-w-[160px] truncate">
              {clientName ?? projectName}
            </span>
          ) : (
            "Link"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Building2 className="size-3.5" /> Client
          </label>
          <ComboboxStandalone
            value={clientId ?? ""}
            onChange={onClient}
            options={clientOptions}
            placeholder="No client"
            emptyText="No clients."
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FolderKanban className="size-3.5" /> Project
          </label>
          <ComboboxStandalone
            value={projectId ?? ""}
            onChange={onProject}
            options={projectOptions}
            placeholder="No project"
            emptyText="No projects."
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

