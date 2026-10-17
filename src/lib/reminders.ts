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
