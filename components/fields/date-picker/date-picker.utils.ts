import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  isValid,
  nextDay,
  parse,
  setDay,
  startOfWeek,
} from "date-fns";
import type { Day } from "date-fns";

/**
 * Date-picker pure helpers. Kept framework-free (no React, no RHF) so they are
 * trivially unit-testable and shared by the text input + presets.
 */

/** Strip the time component so comparisons/selection land on calendar days. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const WEEKDAYS: Record<string, Day> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const UNIT_TO_ADDER: Record<
  string,
  (date: Date, amount: number) => Date
> = {
  day: addDays,
  days: addDays,
  week: addWeeks,
  weeks: addWeeks,
  month: addMonths,
  months: addMonths,
};

/** Fallback date-fns formats tried, in order, on free-text that isn't a phrase. */
const FALLBACK_FORMATS = ["d MMM", "d MMMM", "MMM d", "MM/dd/yyyy", "yyyy-MM-dd"];

/**
 * Parse a human date phrase relative to `today` and return a normalized Date at
 * local midnight, or `null` when nothing matches.
 *
 * Understands:
 *  - `today` / `tomorrow` / `yesterday`
 *  - `in N days|weeks|months`
 *  - `next <weekday>` / `this <weekday>`
 *  - numeric/short fallbacks: `d MMM`, `MM/dd/yyyy`, `yyyy-MM-dd`
 */
export function parseNaturalDate(text: string, today: Date = new Date()): Date | null {
  const base = startOfDay(today);
  const input = text.trim().toLowerCase().replace(/\s+/g, " ");
  if (!input) return null;

  if (input === "today" || input === "now") return base;
  if (input === "tomorrow" || input === "tmr" || input === "tmrw") {
    return addDays(base, 1);
  }
  if (input === "yesterday") return addDays(base, -1);

  // "in N days|weeks|months" (also tolerate a bare "N days")
  const inMatch = input.match(
    /^(?:in\s+)?(\d{1,4})\s+(day|days|week|weeks|month|months)$/,
  );
  if (inMatch) {
    const amount = Number.parseInt(inMatch[1], 10);
    const adder = UNIT_TO_ADDER[inMatch[2]];
    if (adder && Number.isFinite(amount)) return adder(base, amount);
  }

  // "next <weekday>" / "this <weekday>" / bare "<weekday>"
  const weekdayMatch = input.match(/^(next|this)?\s*([a-z]+)$/);
  if (weekdayMatch) {
    const qualifier = weekdayMatch[1];
    const dayName = weekdayMatch[2];
    if (dayName in WEEKDAYS) {
      const target = WEEKDAYS[dayName];
      if (qualifier === "this") {
        // The named weekday within the current week (Sunday-anchored).
        return startOfDay(setDay(base, target, { weekStartsOn: 0 }));
      }
      // "next <weekday>" and bare "<weekday>" → strictly the next occurrence.
      return startOfDay(nextDay(base, target));
    }
  }

  // Numeric / short formats.
  for (const fmt of FALLBACK_FORMATS) {
    const parsed = parse(input, fmt, base);
    if (isValid(parsed)) return startOfDay(parsed);
  }

  return null;
}

/** A selectable shortcut shown in the presets column / chip row. */
export interface DatePickerPreset {
  /** Stable key for React + keyboard focus. */
  id: string;
  label: string;
  /** Resolve the preset to a date relative to `today`; `null` clears the value. */
  resolve: (today: Date) => Date | null;
}

/** Default presets per spec §5. "No date" clears the value. */
export const DEFAULT_PRESETS: DatePickerPreset[] = [
  { id: "today", label: "Today", resolve: (t) => startOfDay(t) },
  { id: "tomorrow", label: "Tomorrow", resolve: (t) => addDays(startOfDay(t), 1) },
  {
    id: "this-weekend",
    label: "This weekend",
    // Saturday of the current week (Sunday-anchored).
    resolve: (t) => endOfWeek(startOfDay(t), { weekStartsOn: 0 }),
  },
  {
    id: "next-week",
    label: "Next week",
    // Monday of next week.
    resolve: (t) => addWeeks(startOfWeek(startOfDay(t), { weekStartsOn: 1 }), 1),
  },
  {
    id: "in-2-weeks",
    label: "In 2 weeks",
    resolve: (t) => addWeeks(startOfDay(t), 2),
  },
  { id: "no-date", label: "No date", resolve: () => null },
];

/** True when a candidate date falls outside the inclusive [from, to] window. */
export function isOutsideRange(
  date: Date,
  fromDate?: Date,
  toDate?: Date,
): boolean {
  if (fromDate && startOfDay(date) < startOfDay(fromDate)) return true;
  if (toDate && startOfDay(date) > startOfDay(toDate)) return true;
  return false;
}
