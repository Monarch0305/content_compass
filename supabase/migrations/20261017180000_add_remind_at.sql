-- Custom per-item reminders (D-029, implementing the D-027 follow-up).
-- Adds a concrete fire time + a "sent" flag so the preset reminders
-- (Tonight / This weekend / Next week) can be delivered at the right moment.
-- Rollback: alter table public.saved_items drop column remind_at, drop column reminded;

alter table public.saved_items
  add column remind_at timestamptz,
  add column reminded  boolean not null default false;

-- Fast lookup of items that are due and not yet reminded.
create index saved_items_due_reminders_idx
  on public.saved_items (remind_at)
  where reminded = false and remind_at is not null;
