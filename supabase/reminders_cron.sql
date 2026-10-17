-- Reminder scheduler (Supabase pg_cron) — RUN THIS AFTER THE APP IS DEPLOYED.
--
-- It is NOT in supabase/migrations/ on purpose: it needs the live app URL and
-- the CRON_SECRET, which don't exist until deploy. Run it once in the Supabase
-- SQL editor after replacing the two placeholders below.
--
--   <APP_URL>      e.g. https://content-compass.vercel.app   (no trailing slash)
--   <CRON_SECRET>  the value from .env.local (CRON_SECRET)
--
-- Times: two daily nudges at 09:00 and 20:00 Asia/Kolkata (D-018).
-- Asia/Kolkata is UTC+5:30, and cron runs in UTC, so:
--   09:00 IST = 03:30 UTC   ->   30 3 * * *
--   20:00 IST = 14:30 UTC   ->   30 14 * * *

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Morning nudge (09:00 IST)
select cron.schedule(
  'content-compass-reminders-morning',
  '30 3 * * *',
  $$
    select net.http_post(
      url := '<APP_URL>/api/cron/reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET>',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Evening nudge (20:00 IST)
select cron.schedule(
  'content-compass-reminders-evening',
  '30 14 * * *',
  $$
    select net.http_post(
      url := '<APP_URL>/api/cron/reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET>',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);

-- To change or remove later:
--   select cron.unschedule('content-compass-reminders-morning');
--   select cron.unschedule('content-compass-reminders-evening');
--   select * from cron.job;
