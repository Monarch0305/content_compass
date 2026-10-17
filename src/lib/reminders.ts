// Quick-pick reminder presets shown on the Add screen (D-020).
//
// Keeping the list in one place means the Add screen (the buttons), the detail
// screen (the label), and the reminder job later (turning a preset into a real
// time) all agree on the same set.

import type { ReminderPreset } from "./types";

export const REMINDER_PRESETS: { key: ReminderPreset; label: string }[] = [
  { key: "tonight", label: "Tonight" },
  { key: "weekend", label: "This weekend" },
  { key: "next_week", label: "Next week" },
];

// Human-friendly label for a stored preset key.
export function reminderLabel(preset: ReminderPreset): string {
  return REMINDER_PRESETS.find((p) => p.key === preset)?.label ?? "";
}

// Turn a preset into a concrete fire time (D-029), computed in the user's
// timezone. V1 is single-user in Asia/Kolkata (D-018), which has no DST, so we
// use a fixed +5:30 offset — simple and reliable. Returns an ISO UTC string.
//
//   tonight      -> today 20:00 IST (or, if already past, 1 hour from now)
//   weekend      -> the coming Saturday 10:00 IST
//   next_week    -> next Monday 09:00 IST
export function computeRemindAt(
  preset: ReminderPreset,
  now: Date = new Date()
): string {
  const IST = 330 * 60000; // +5:30 in milliseconds
  const ist = new Date(now.getTime() + IST); // read IST wall-clock via getUTC*
  const y = ist.getUTCFullYear();
  const mo = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const dow = ist.getUTCDay(); // 0 = Sunday … 6 = Saturday (in IST)

  // Build a UTC instant from an IST wall-clock date/time.
  const istToUtc = (yy: number, mm: number, dd: number, hh: number, min: number) =>
    new Date(Date.UTC(yy, mm, dd, hh, min) - IST);

  let target: Date;
  if (preset === "tonight") {
    target = istToUtc(y, mo, d, 20, 0);
    if (target.getTime() <= now.getTime()) {
      target = new Date(now.getTime() + 60 * 60000); // past 8pm -> in an hour
    }
  } else if (preset === "weekend") {
    const add = (6 - dow + 7) % 7; // days until Saturday
    target = istToUtc(y, mo, d + add, 10, 0);
    if (target.getTime() <= now.getTime()) {
      target = istToUtc(y, mo, d + add + 7, 10, 0);
    }
  } else {
    // next_week -> next Monday (never today)
    let add = (1 - dow + 7) % 7;
    if (add === 0) add = 7;
    target = istToUtc(y, mo, d + add, 9, 0);
    if (target.getTime() <= now.getTime()) {
      target = istToUtc(y, mo, d + add + 7, 9, 0);
    }
  }
  return target.toISOString();
}
