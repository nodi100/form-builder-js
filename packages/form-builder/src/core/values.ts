import type { UploadedFile } from "./types";

/** No value at all: undefined, null, NaN, "" or whitespace, [] or {} */
export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

/**
 * What `isRequired` and the `notEmpty` condition treat as empty: a blank
 * value, or `false` (an unchecked checkbox).
 */
export function isEmptyValue(value: unknown): boolean {
  return value === false || isBlank(value);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A real calendar date written as "YYYY-MM-DD" (so "2025-02-30" is not) */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today as "YYYY-MM-DD" in `timeZone` (an IANA name), or in the local time zone */
export function todayIso(timeZone?: string): string {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A date `min` / `max` from the schema: "today" is resolved when called */
export function resolveDateBound(bound: unknown, timeZone?: string): string | undefined {
  if (bound === "today") return todayIso(timeZone);
  return typeof bound === "string" ? bound : undefined;
}

/** The shape validateFormValues accepts for a file. Size and type are only
 *  what the client claims; they are type-checked, never trusted. */
export function isUploadedFile(value: unknown): value is UploadedFile {
  return (
    isPlainObject(value) &&
    typeof value.id === "string" &&
    value.id !== "" &&
    typeof value.name === "string" &&
    (value.size === undefined || (typeof value.size === "number" && Number.isFinite(value.size))) &&
    (value.type === undefined || typeof value.type === "string")
  );
}
