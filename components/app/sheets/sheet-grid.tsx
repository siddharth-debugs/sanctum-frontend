"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  cellKey,
  colToLetter,
  formatValue,
  isErrorValue,
  isNumericValue,
  type CellValue,
} from "@/lib/sheet-engine";
import type { SheetCell, SheetData } from "@/lib/api/types";

export interface CellPos {
  row: number;
  col: number;
}

export interface SelectionRange {
  anchor: CellPos;
  focus: CellPos;
}

export interface SheetGridProps {
  data: SheetData;
  computed: Map<string, CellValue>;
  selection: SelectionRange;
  /** The single "active" cell within the selection (where edits land). */
  active: CellPos;
  editing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  /** Move active cell + collapse selection (used by mouse + header clicks). */
  onSelectCell: (pos: CellPos, extend: boolean) => void;
  onSelectColumn: (col: number) => void;
  onSelectRow: (row: number) => void;
  onStartEdit: (initial?: string) => void;
  /** Commit the in-progress edit. dir = where to move next. */
  onCommitEdit: (dir: "down" | "right" | "none") => void;
  onCancelEdit: () => void;
  onKeyNav: (e: React.KeyboardEvent) => void;
  /** Drag-select handler (mouse moved into a cell while pressed). */
  onDragTo: (pos: CellPos) => void;
}

function inRange(pos: CellPos, sel: SelectionRange): boolean {
  const r0 = Math.min(sel.anchor.row, sel.focus.row);
  const r1 = Math.max(sel.anchor.row, sel.focus.row);
  const c0 = Math.min(sel.anchor.col, sel.focus.col);
  const c1 = Math.max(sel.anchor.col, sel.focus.col);
  return pos.row >= r0 && pos.row <= r1 && pos.col >= c0 && pos.col <= c1;
}

const COL_W = 104; // px
const ROW_H = 28; // px
const HEAD_W = 44; // row-header column width

export function SheetGrid({
  data,
  computed,
  selection,
  active,
  editing,
  editValue,
  onEditValueChange,
  onSelectCell,
  onSelectColumn,
  onSelectRow,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onKeyNav,
  onDragTo,
}: SheetGridProps) {
  const dragging = React.useRef(false);
  const editInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) {
      const el = editInputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  React.useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const cols = data.cols;
  const rows = data.rows;

  const activeKey = cellKey(active.row, active.col);

  return (
    <div
      className="relative h-full select-none overflow-auto outline-none"
      tabIndex={0}
      role="grid"
      aria-label="Spreadsheet grid"
      onKeyDown={(e) => {
        if (editing) return; // edit input owns keys while editing
        onKeyNav(e);
      }}
    >
      <table
        className="border-collapse text-sm"
        style={{ borderSpacing: 0 }}
        cellPadding={0}
        cellSpacing={0}
      >
        <thead>
          <tr className="sticky top-0 z-30">
            {/* corner */}
            <th
              className="sticky left-0 z-40 border-b border-r bg-muted"
              style={{ width: HEAD_W, height: ROW_H, minWidth: HEAD_W }}
            />
            {Array.from({ length: cols }).map((_, c) => {
              const activeCol = c === active.col;
              return (
                <th
                  key={c}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectColumn(c);
                  }}
                  className={cn(
                    "cursor-pointer border-b border-r bg-muted text-center text-xs font-semibold text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))]",
                    activeCol &&
                      "bg-[color-mix(in_srgb,var(--primary)_18%,var(--muted))] text-primary",
                  )}
                  style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}
                >
                  {colToLetter(c)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => {
            const activeRow = r === active.row;
            return (
              <tr key={r}>
                {/* row header */}
                <th
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectRow(r);
                  }}
                  className={cn(
                    "sticky left-0 z-20 cursor-pointer border-b border-r bg-muted text-center text-xs font-semibold text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))]",
                    activeRow &&
                      "bg-[color-mix(in_srgb,var(--primary)_18%,var(--muted))] text-primary",
                  )}
                  style={{ width: HEAD_W, minWidth: HEAD_W, height: ROW_H }}
                >
                  {r + 1}
                </th>
                {Array.from({ length: cols }).map((_, c) => {
                  const pos = { row: r, col: c };
                  const key = cellKey(r, c);
                  const cell: SheetCell | undefined = data.cells[key];
                  const isActive = r === active.row && c === active.col;
                  const selected = inRange(pos, selection);
                  const value = computed.get(key);
                  const s = cell?.s;
                  const fmt = s?.fmt ?? "general";
                  const display = formatValue(value, fmt);
                  const err = isErrorValue(value);
                  // default alignment: numbers right, text left, unless overridden
                  const alignDefault = isNumericValue(value) ? "right" : "left";
                  const align = s?.a ?? alignDefault;

                  if (isActive && editing) {
                    return (
                      <td
                        key={c}
                        className="relative border-b border-r p-0"
                        style={{ width: COL_W, minWidth: COL_W, height: ROW_H }}
                      >
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => onEditValueChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onCommitEdit("down");
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              onCommitEdit("right");
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              onCancelEdit();
                            }
                            e.stopPropagation();
                          }}
                          onBlur={() => onCommitEdit("none")}
                          className="absolute inset-0 z-10 size-full bg-card px-1.5 text-sm outline-none ring-2 ring-inset ring-primary"
                          style={{
                            fontWeight: s?.b ? 700 : undefined,
                            fontStyle: s?.i ? "italic" : undefined,
                          }}
                        />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={c}
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        e.preventDefault();
                        dragging.current = true;
                        onSelectCell(pos, e.shiftKey);
                      }}
                      onMouseEnter={() => {
                        if (dragging.current) onDragTo(pos);
                      }}
                      onDoubleClick={() => onStartEdit()}
                      className={cn(
                        "relative overflow-hidden border-b border-r align-middle",
                        selected &&
                          !isActive &&
                          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
                        err && "text-destructive",
                      )}
                      style={{
                        width: COL_W,
                        minWidth: COL_W,
                        maxWidth: COL_W,
                        height: ROW_H,
                        backgroundColor: s?.bg,
                        color: err ? undefined : s?.color,
                      }}
                    >
                      <div
                        className={cn(
                          "pointer-events-none truncate px-1.5 leading-[26px]",
                          align === "right" && "text-right",
                          align === "center" && "text-center",
                          align === "left" && "text-left",
                          isNumericValue(value) && "tabular-nums",
                        )}
                        style={{
                          fontWeight: s?.b ? 700 : undefined,
                          fontStyle: s?.i ? "italic" : undefined,
                          textDecoration: s?.u ? "underline" : undefined,
                        }}
                      >
                        {display}
                      </div>
                      {isActive && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-primary"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* expose active key for debugging/aria */}
      <span className="sr-only" aria-live="polite">
        {activeKey}
      </span>
    </div>
  );
}
