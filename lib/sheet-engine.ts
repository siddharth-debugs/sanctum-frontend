/**
 * sheet-engine — the pure spreadsheet core. No React, no DOM; fully unit-test
 * friendly. Handles A1 addressing, range expansion, a small formula language
 * (arithmetic, cell refs, ranges, a curated function set, comparisons), and
 * value formatting. Errors surface as the usual spreadsheet sentinels:
 *   #ERROR!  — parse / bad reference / type error
 *   #DIV/0!  — division by zero
 *   #CIRC!   — circular reference detected during evaluation
 */

import type { NumberFormat, SheetCell } from "@/lib/api/types";

// ---------------------------------------------------------------------------
// A1 addressing
// ---------------------------------------------------------------------------

/** 0 -> "A", 25 -> "Z", 26 -> "AA". */
export function colToLetter(col: number): string {
  let n = col;
  let out = "";
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out;
    n = Math.floor(n / 26) - 1;
  }
  return out;
}

/** "A" -> 1, "Z" -> 26, "AA" -> 27. (1-indexed, matching spreadsheet usage.) */
export function letterToCol(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

/** Build an A1 key from a 0-based row/col. cellKey(0,0) -> "A1". */
export function cellKey(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

const A1_RE = /^([A-Za-z]+)(\d+)$/;

/** Parse "B4" -> { row: 3, col: 1 } (0-based). null if not a valid ref. */
export function parseRef(ref: string): { row: number; col: number } | null {
  const m = A1_RE.exec(ref.trim());
  if (!m) return null;
  const col = letterToCol(m[1]) - 1;
  const row = parseInt(m[2], 10) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

/** Expand "A1:B3" into ["A1","B1","A2","B2","A3","B3"]. Order: row-major. */
export function expandRange(range: string): string[] {
  const [a, b] = range.split(":");
  const start = parseRef(a);
  const end = parseRef(b ?? a);
  if (!start || !end) return [];
  const r0 = Math.min(start.row, end.row);
  const r1 = Math.max(start.row, end.row);
  const c0 = Math.min(start.col, end.col);
  const c1 = Math.max(start.col, end.col);
  const out: string[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      out.push(cellKey(r, c));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Errors & value model
// ---------------------------------------------------------------------------

export const ERR = {
  REF: "#ERROR!",
  DIV0: "#DIV/0!",
  CIRC: "#CIRC!",
} as const;

const ERROR_VALUES = new Set<string>([ERR.REF, ERR.DIV0, ERR.CIRC]);

export function isErrorValue(v: unknown): boolean {
  return typeof v === "string" && ERROR_VALUES.has(v);
}

/** A computed cell value: a number, a string, or a boolean. */
export type CellValue = number | string | boolean;

/** Thrown internally to short-circuit evaluation with a sentinel. */
class FormulaError extends Error {
  constructor(public sentinel: string) {
    super(sentinel);
  }
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenType =
  | "number"
  | "string"
  | "ref"
  | "range"
  | "ident"
  | "op"
  | "lparen"
  | "rparen"
  | "comma";

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = ["<=", ">=", "<>", "+", "-", "*", "/", "%", "^", "=", "<", ">"];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const src = input;

  while (i < src.length) {
    const ch = src[i];

    // whitespace
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }

    // string literal (double or single quotes)
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let str = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) {
          str += src[j + 1];
          j += 2;
        } else {
          str += src[j];
          j++;
        }
      }
      if (j >= src.length) throw new FormulaError(ERR.REF); // unterminated
      tokens.push({ type: "string", value: str });
      i = j + 1;
      continue;
    }

    // number
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = src.slice(i, j);
      if ((num.match(/\./g) ?? []).length > 1) throw new FormulaError(ERR.REF);
      tokens.push({ type: "number", value: num });
      i = j;
      continue;
    }

    // identifier / ref / range
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      let word = src.slice(i, j);
      i = j;

      // range like A1:B3
      if (A1_RE.test(word) && src[i] === ":") {
        let k = i + 1;
        while (k < src.length && /[A-Za-z0-9]/.test(src[k])) k++;
        const second = src.slice(i + 1, k);
        if (A1_RE.test(second)) {
          tokens.push({ type: "range", value: `${word}:${second}` });
          i = k;
          continue;
        }
      }

      // boolean literals
      const upper = word.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") {
        tokens.push({ type: "ident", value: upper });
        continue;
      }

      // function call: ident immediately followed by "("
      let p = i;
      while (p < src.length && (src[p] === " " || src[p] === "\t")) p++;
      if (src[p] === "(") {
        tokens.push({ type: "ident", value: word });
        continue;
      }

      // single cell ref
      if (A1_RE.test(word)) {
        tokens.push({ type: "ref", value: word });
        continue;
      }

      // bare identifier (unknown name) — treat as error-prone ident
      tokens.push({ type: "ident", value: word });
      continue;
    }

    // operators
    const two = src.slice(i, i + 2);
    if (OPERATORS.includes(two)) {
      tokens.push({ type: "op", value: two });
      i += 2;
      continue;
    }
    if (OPERATORS.includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ch });
      i++;
      continue;
    }

    // unknown char
    throw new FormulaError(ERR.REF);
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent → AST)
// ---------------------------------------------------------------------------

type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "ref"; ref: string }
  | { kind: "range"; range: string }
  | { kind: "unary"; op: string; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }
  private expect(type: TokenType): Token {
    const t = this.next();
    if (!t || t.type !== type) throw new FormulaError(ERR.REF);
    return t;
  }

  parse(): Node {
    const node = this.parseComparison();
    if (this.pos !== this.tokens.length) throw new FormulaError(ERR.REF);
    return node;
  }

  // lowest precedence: comparisons
  private parseComparison(): Node {
    let left = this.parseAdditive();
    while (
      this.peek()?.type === "op" &&
      ["=", "<", ">", "<=", ">=", "<>"].includes(this.peek()!.value)
    ) {
      const op = this.next()!.value;
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    while (
      this.peek()?.type === "op" &&
      ["+", "-"].includes(this.peek()!.value)
    ) {
      const op = this.next()!.value;
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseExponent();
    while (
      this.peek()?.type === "op" &&
      ["*", "/", "%"].includes(this.peek()!.value)
    ) {
      const op = this.next()!.value;
      const right = this.parseExponent();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseExponent(): Node {
    const left = this.parseUnary();
    if (this.peek()?.type === "op" && this.peek()!.value === "^") {
      this.next();
      // right-associative
      const right = this.parseExponent();
      return { kind: "binary", op: "^", left, right };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.peek()?.type === "op" && ["-", "+"].includes(this.peek()!.value)) {
      const op = this.next()!.value;
      const arg = this.parseUnary();
      return { kind: "unary", op, arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const t = this.peek();
    if (!t) throw new FormulaError(ERR.REF);

    if (t.type === "number") {
      this.next();
      return { kind: "num", value: parseFloat(t.value) };
    }
    if (t.type === "string") {
      this.next();
      return { kind: "str", value: t.value };
    }
    if (t.type === "ref") {
      this.next();
      return { kind: "ref", ref: t.value };
    }
    if (t.type === "range") {
      this.next();
      return { kind: "range", range: t.value };
    }
    if (t.type === "lparen") {
      this.next();
      const node = this.parseComparison();
      this.expect("rparen");
      return node;
    }
    if (t.type === "ident") {
      this.next();
      const upper = t.value.toUpperCase();
      if (upper === "TRUE") return { kind: "bool", value: true };
      if (upper === "FALSE") return { kind: "bool", value: false };
      // function call
      this.expect("lparen");
      const args: Node[] = [];
      if (this.peek()?.type !== "rparen") {
        args.push(this.parseComparison());
        while (this.peek()?.type === "comma") {
          this.next();
          args.push(this.parseComparison());
        }
      }
      this.expect("rparen");
      return { kind: "call", name: upper, args };
    }

    throw new FormulaError(ERR.REF);
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/** Internal evaluation context carrying memo + circular-ref guard. */
interface EvalCtx {
  cells: Record<string, SheetCell>;
  cache: Map<string, CellValue>;
  inProgress: Set<string>;
}

function toNumber(v: CellValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    if (v.trim() === "") return 0;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
    throw new FormulaError(ERR.REF);
  }
  return 0;
}

function toBoolean(v: CellValue): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const u = v.trim().toUpperCase();
    if (u === "TRUE") return true;
    if (u === "FALSE" || u === "") return false;
    return true;
  }
  return false;
}

/** Resolve a single cell ref to its computed value (memoized, guarded). */
function evalRef(ref: string, ctx: EvalCtx): CellValue {
  const key = ref.toUpperCase();
  if (ctx.cache.has(key)) return ctx.cache.get(key)!;
  if (ctx.inProgress.has(key)) throw new FormulaError(ERR.CIRC);

  const cell = ctx.cells[key];
  if (!cell) return 0; // empty ref behaves as 0 / "" in arithmetic/text

  ctx.inProgress.add(key);
  try {
    const value = computeCell(key, cell, ctx);
    ctx.cache.set(key, value);
    return value;
  } finally {
    ctx.inProgress.delete(key);
  }
}

/** Compute a cell's value (formula or literal). */
function computeCell(key: string, cell: SheetCell, ctx: EvalCtx): CellValue {
  if (cell.f && cell.f.startsWith("=")) {
    const ast = new Parser(tokenize(cell.f.slice(1))).parse();
    return evalNode(ast, ctx);
  }
  if (cell.v === undefined || cell.v === null) return 0;
  return cell.v;
}

/** Gather the numeric values of a node, flattening ranges (for SUM etc.). */
function collectNumbers(node: Node, ctx: EvalCtx): number[] {
  if (node.kind === "range") {
    const out: number[] = [];
    for (const ref of expandRange(node.range)) {
      const cell = ctx.cells[ref.toUpperCase()];
      if (!cell) continue; // skip blanks in aggregates
      const v = evalRef(ref, ctx);
      if (typeof v === "number") out.push(v);
      else if (typeof v === "boolean") out.push(v ? 1 : 0);
      else if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        if (!Number.isNaN(n)) out.push(n);
      }
    }
    return out;
  }
  return [toNumber(evalNode(node, ctx))];
}

/** Gather raw values (numbers + non-empty strings) for COUNTA-style fns. */
function collectValues(node: Node, ctx: EvalCtx): CellValue[] {
  if (node.kind === "range") {
    const out: CellValue[] = [];
    for (const ref of expandRange(node.range)) {
      const cell = ctx.cells[ref.toUpperCase()];
      if (!cell) continue;
      if (cell.v === undefined && !cell.f) continue;
      out.push(evalRef(ref, ctx));
    }
    return out;
  }
  return [evalNode(node, ctx)];
}

const FUNCTIONS: Record<string, (args: Node[], ctx: EvalCtx) => CellValue> = {
  SUM: (args, ctx) =>
    args.reduce((acc, a) => acc + collectNumbers(a, ctx).reduce((s, n) => s + n, 0), 0),

  PRODUCT: (args, ctx) => {
    const nums = args.flatMap((a) => collectNumbers(a, ctx));
    return nums.reduce((p, n) => p * n, 1);
  },

  AVERAGE: (args, ctx) => {
    const nums = args.flatMap((a) => collectNumbers(a, ctx));
    if (nums.length === 0) throw new FormulaError(ERR.DIV0);
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  },

  MIN: (args, ctx) => {
    const nums = args.flatMap((a) => collectNumbers(a, ctx));
    return nums.length ? Math.min(...nums) : 0;
  },

  MAX: (args, ctx) => {
    const nums = args.flatMap((a) => collectNumbers(a, ctx));
    return nums.length ? Math.max(...nums) : 0;
  },

  COUNT: (args, ctx) => args.flatMap((a) => collectNumbers(a, ctx)).length,

  COUNTA: (args, ctx) =>
    args.flatMap((a) => collectValues(a, ctx)).filter((v) => {
      if (typeof v === "string") return v.trim() !== "";
      return v !== undefined && v !== null;
    }).length,

  ROUND: (args, ctx) => {
    if (args.length < 1) throw new FormulaError(ERR.REF);
    const x = toNumber(evalNode(args[0], ctx));
    const digits = args[1] ? toNumber(evalNode(args[1], ctx)) : 0;
    const f = Math.pow(10, digits);
    return Math.round(x * f) / f;
  },

  ABS: (args, ctx) => Math.abs(toNumber(evalNode(args[0], ctx))),

  SQRT: (args, ctx) => {
    const x = toNumber(evalNode(args[0], ctx));
    if (x < 0) throw new FormulaError(ERR.REF);
    return Math.sqrt(x);
  },

  IF: (args, ctx) => {
    if (args.length < 2) throw new FormulaError(ERR.REF);
    const cond = toBoolean(evalNode(args[0], ctx));
    if (cond) return evalNode(args[1], ctx);
    return args[2] ? evalNode(args[2], ctx) : false;
  },

  AND: (args, ctx) =>
    args.every((a) => {
      // flatten ranges for AND/OR too
      const vals = collectValues(a, ctx);
      return vals.every((v) => toBoolean(v));
    }),

  OR: (args, ctx) =>
    args.some((a) => {
      const vals = collectValues(a, ctx);
      return vals.some((v) => toBoolean(v));
    }),

  NOT: (args, ctx) => !toBoolean(evalNode(args[0], ctx)),

  CONCAT: (args, ctx) =>
    args
      .flatMap((a) => collectValues(a, ctx))
      .map((v) => stringify(v))
      .join(""),
};
// aliases
FUNCTIONS.AVG = FUNCTIONS.AVERAGE;
FUNCTIONS.CONCATENATE = FUNCTIONS.CONCAT;

function stringify(v: CellValue): string {
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  return v;
}

function compare(op: string, l: CellValue, r: CellValue): boolean {
  // Numeric comparison when both sides are number-ish; else string compare.
  const ln = typeof l === "number" ? l : typeof l === "boolean" ? (l ? 1 : 0) : null;
  const rn = typeof r === "number" ? r : typeof r === "boolean" ? (r ? 1 : 0) : null;
  let a: number | string;
  let b: number | string;
  if (ln !== null && rn !== null) {
    a = ln;
    b = rn;
  } else if (
    typeof l !== "string" ||
    typeof r !== "string" ||
    (!Number.isNaN(Number(l)) && !Number.isNaN(Number(r)) && l !== "" && r !== "")
  ) {
    // mixed but both numeric-coercible
    const cl = Number(l);
    const cr = Number(r);
    if (!Number.isNaN(cl) && !Number.isNaN(cr)) {
      a = cl;
      b = cr;
    } else {
      a = stringify(l);
      b = stringify(r);
    }
  } else {
    a = stringify(l);
    b = stringify(r);
  }

  switch (op) {
    case "=":
      return a === b;
    case "<>":
      return a !== b;
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      throw new FormulaError(ERR.REF);
  }
}

function evalNode(node: Node, ctx: EvalCtx): CellValue {
  switch (node.kind) {
    case "num":
      return node.value;
    case "str":
      return node.value;
    case "bool":
      return node.value;
    case "ref":
      return evalRef(node.ref, ctx);
    case "range":
      // A bare range used as a scalar resolves to its first cell.
      {
        const refs = expandRange(node.range);
        if (refs.length === 0) throw new FormulaError(ERR.REF);
        return evalRef(refs[0], ctx);
      }
    case "unary": {
      const v = toNumber(evalNode(node.arg, ctx));
      return node.op === "-" ? -v : v;
    }
    case "binary": {
      if (["=", "<", ">", "<=", ">=", "<>"].includes(node.op)) {
        return compare(node.op, evalNode(node.left, ctx), evalNode(node.right, ctx));
      }
      const l = toNumber(evalNode(node.left, ctx));
      const r = toNumber(evalNode(node.right, ctx));
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) throw new FormulaError(ERR.DIV0);
          return l / r;
        case "%":
          if (r === 0) throw new FormulaError(ERR.DIV0);
          return l % r;
        case "^":
          return Math.pow(l, r);
        default:
          throw new FormulaError(ERR.REF);
      }
    }
    case "call": {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new FormulaError(ERR.REF);
      return fn(node.args, ctx);
    }
    default:
      throw new FormulaError(ERR.REF);
  }
}

/**
 * Evaluate an entire sheet. Returns a Map of A1 key -> computed CellValue for
 * every non-empty cell. Memoized within a single pass; per-cell errors are
 * isolated (one bad formula does not break the whole sheet).
 */
export function evaluateSheet(
  cells: Record<string, SheetCell>,
  _rows?: number,
  _cols?: number,
): Map<string, CellValue> {
  const result = new Map<string, CellValue>();
  const cache = new Map<string, CellValue>();

  for (const key of Object.keys(cells)) {
    const upper = key.toUpperCase();
    if (result.has(upper)) continue;
    const cell = cells[key];
    if (cell.v === undefined && !cell.f) continue; // style-only cell

    const ctx: EvalCtx = { cells, cache, inProgress: new Set() };
    try {
      const value = cache.has(upper)
        ? cache.get(upper)!
        : computeCell(upper, cell, ctx);
      cache.set(upper, value);
      result.set(upper, value);
    } catch (err) {
      const sentinel = err instanceof FormulaError ? err.sentinel : ERR.REF;
      result.set(upper, sentinel);
      // Do NOT cache errors as a stable value for refs that may be valid via
      // other paths; but cache so dependents see the same sentinel this pass.
      cache.set(upper, sentinel);
    }
  }

  return result;
}

/**
 * Evaluate a single formula string (e.g. live preview / tests). Returns the
 * computed value or an error sentinel string.
 */
export function evaluateFormula(
  formula: string,
  cells: Record<string, SheetCell> = {},
): CellValue {
  try {
    const body = formula.startsWith("=") ? formula.slice(1) : formula;
    const ast = new Parser(tokenize(body)).parse();
    const ctx: EvalCtx = { cells, cache: new Map(), inProgress: new Set() };
    return evalNode(ast, ctx);
  } catch (err) {
    return err instanceof FormulaError ? err.sentinel : ERR.REF;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const NUMBER_FMT = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const CURRENCY_FMT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const PERCENT_FMT = new Intl.NumberFormat("en-IN", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Render a computed value for display, applying the requested number format. */
export function formatValue(
  value: CellValue | undefined | null,
  fmt: NumberFormat = "general",
): string {
  if (value === undefined || value === null || value === "") return "";
  if (isErrorValue(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  // Numeric formatting only applies to numbers (or numeric strings under a
  // non-general format).
  const asNum =
    typeof value === "number"
      ? value
      : fmt !== "general" && value.trim() !== "" && !Number.isNaN(Number(value))
        ? Number(value)
        : null;

  if (asNum === null) {
    return String(value);
  }

  switch (fmt) {
    case "number":
      return NUMBER_FMT.format(asNum);
    case "currency":
      return CURRENCY_FMT.format(asNum);
    case "percent":
      return PERCENT_FMT.format(asNum);
    case "general":
    default:
      // plain — trim trailing float noise, keep integers clean
      return String(roundFloat(asNum));
  }
}

/** Cosmetic float cleanup so 0.1+0.2 doesn't render 0.30000000000000004. */
function roundFloat(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.round((n + Number.EPSILON) * 1e10) / 1e10;
}

/** True when the (computed) value should be right-aligned by default. */
export function isNumericValue(value: CellValue | undefined | null): boolean {
  return typeof value === "number";
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/** RFC-4180-ish field quoting. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV string from the COMPUTED + FORMATTED values, trimming trailing
 * fully-empty rows/columns so exports are tidy.
 */
export function sheetToCsv(
  cells: Record<string, SheetCell>,
  rows: number,
  cols: number,
): string {
  const computed = evaluateSheet(cells, rows, cols);

  // Find the used bounds so we don't emit a 50x26 block of empties.
  let maxRow = -1;
  let maxCol = -1;
  for (const key of Object.keys(cells)) {
    const pos = parseRef(key);
    if (!pos) continue;
    const cell = cells[key];
    if (cell.v === undefined && !cell.f) continue;
    if (pos.row > maxRow) maxRow = pos.row;
    if (pos.col > maxCol) maxCol = pos.col;
  }
  if (maxRow < 0) return "";
  const lastRow = Math.min(maxRow, rows - 1);
  const lastCol = Math.min(maxCol, cols - 1);

  const lines: string[] = [];
  for (let r = 0; r <= lastRow; r++) {
    const row: string[] = [];
    for (let c = 0; c <= lastCol; c++) {
      const key = cellKey(r, c);
      const cell = cells[key];
      const fmt = cell?.s?.fmt ?? "general";
      const display = formatValue(computed.get(key), fmt);
      row.push(csvField(display));
    }
    lines.push(row.join(","));
  }
  return lines.join("\r\n");
}
