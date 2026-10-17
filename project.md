# Content Compass

> Save later. Actually watch instead of forgetting.

- **Status:** Build steps 1-4 done (screens; Supabase data + email-OTP login + RLS; YouTube details + Haiku summaries; PWA install + Android share-to-save + Web Push reminders). Reminder *delivery* activates on deploy. Instagram (step 5) not yet built.
- **Owner:** Viraj
- **Last updated:** 2026-10-17
- **Companion files:** `decisions.md` (why we chose things), `flow.md` (how the code runs, created once code exists)

---

## 1. What it is

Content Compass is a personal "watch later" app for short-form video. You copy or share a link from YouTube, YouTube Shorts or Instagram Reels, and the app saves it, pulls in the details, writes a short summary, and reminds you twice a day to actually watch it.

## 2. Problem and goal

**Problem:** You see a reel or short you can't watch right now, save it somewhere, and forget it exists.

**Goal:** Make saving take one tap, make forgetting hard, and make every saved item easy to recognise (thumbnail + short summary + your own note) so you remember why you saved it.

## 3. Users

- **Now:** Viraj only (personal project, Android phone).
- **Later:** Anyone. The long-term pitch is "everyone's second brain for the internet". So the architecture must be multi-user ready from day one, even though V1 has one user.

---

## 4. Scope

### V1: in scope

1. **Capture:** paste a link in the app, or share it from Instagram/YouTube through the Android share sheet.
2. **Detail fetching:** title, thumbnail, channel and (where possible) duration for YouTube, Shorts and Reels.
3. **AI summary:** a 2-3 line summary of each saved video.
4. **Optional note:** a free-text "why are you saving this?" field, because reel captions are often vague. Can be skipped.
5. **Dashboard:** list of saved items showing thumbnail, title, platform tag and summary. App name and tagline shown on the home screen.
6. **Reminders:** two push notifications a day (09:00 and 20:00 IST, D-018) that nudge you to watch unwatched items, plus an optional per-item custom reminder set at save time via a quick preset (D-020).
7. **Status:** mark an item as watched (so reminders skip it) and delete an item.
8. **Login:** email login via Supabase so data is per-user from the start.

### V1: out of scope (do not build yet)

- Blogs, articles, shopping links (V2)
- TikTok (not available in India)
- Search by summary (later)
- Any social, sharing or public profile features (V3)
- Downloading or transcribing audio of reels
- Native Android/iOS app (PWA is enough for now)

### User flows (V1)

1. **Save:** Share or paste a link, then the app detects the platform, fetches details, generates the summary, shows a preview, user adds an optional note, then Save.
2. **Browse:** Open the app and see the dashboard. Tap an item to see the detail screen (summary, note, open-in-app button, mark as watched).
3. **Remind:** Twice a day the app sends a notification such as "3 videos waiting. Start with: <title>". Tapping it opens the app.
4. **Clear:** Watch the video, then mark it watched (or delete it).

### Screens (wireframes agreed)

1. Home / dashboard
2. Add link
3. Video detail
4. Reminder notification (not a screen, but part of the design)

---

## 5. Future versions

### V2: save anything
Blogs, article links, product/shopping links and other platforms. Needs per-type detail fetching (text extraction for articles, price tracking for products) and per-type summaries.

### V3: social layer
Items can be private or public. People with similar saved feeds can connect and discover each other. Idea to explore: match people on what they actually *finished* watching, not only what they saved.

### Parked ideas (not committed, revisit after V1 works)
- **Search/lookup** by summary ("didn't I save a video about this?"). Nearly free once summaries are stored.
- **"Drop it" triage:** reminders offer Watch now / Later / Drop it.
- **Time-fit nudges:** "Got 5 minutes? Here are 3 short ones."
- **Intent-based timing:** a note like "for this weekend" shapes when the reminder fires.
- **Summary as shortcut:** a "Got it, no need to watch" action.
- **Backlog-zero streaks:** light gamification for clearing the queue.

---

## 6. Tech stack

| Layer | Choice | Why |
|---|---|---|
| App framework | Next.js (React) | One codebase for the screens and the server code; large beginner-friendly learning material |
| App type | PWA (installable web app) | Android supports installing it, receiving shares, and push notifications. No app store needed |
| Backend | Next.js route handlers (API routes) | Keeps server code in the same project |
| Database + login | Supabase (Postgres + Auth) | Database, login, and scheduled jobs in one place; ready for many users later |
| Summaries | LLM API (Claude Haiku) | Cheap and fast for 2-3 line summaries |
| YouTube details | YouTube oEmbed + YouTube Data API | Official, stable, free tier is enough |
| Instagram details | Public page preview tags (title, caption, thumbnail), falling back to the user's note | Meta has no simple open API for Reels. See risks |
| Reminders | Scheduled job, then Web Push (service worker + VAPID keys) | Works as a normal Android notification when the app is closed |
| Hosting | **Open** (see section 11) | |
| Language | **Open**: JavaScript or TypeScript (see section 11) | |

---

## 7. Architecture

```
SAVING A LINK

 Android share sheet ──▶ Content Compass PWA ──▶ Next.js server
 (Reels, YouTube)        (installed on phone)         │
                                                      ├──▶ YouTube API       (title, thumbnail, duration)
                                                      ├──▶ Instagram preview (title, caption, thumbnail)
                                                      ├──▶ LLM API           (2-3 line summary)
                                                      └──▶ Supabase          (save item, thumbnail copy)

REMINDERS

 Scheduled job (2x/day) ──▶ reads unwatched items from Supabase ──▶ sends Web Push ──▶ phone ──▶ opens app
```

### Components

- **PWA front end:** the three screens, a service worker (receives push), a manifest (install + share target).
- **Server (Next.js route handlers):** all calls to YouTube, Instagram, the LLM and Supabase happen here, never in the browser, so API keys stay secret.
- **Supabase:** stores users, saved items, push subscriptions, and reminder settings. Row Level Security (RLS) ensures each user can only read and write their own rows.
- **Scheduler:** a scheduled job runs at the reminder times and calls a protected server endpoint that picks items and sends pushes.

### Data model (planned)

**`saved_items`**
- `id`, `user_id` (required on every row), `url`, `platform` (youtube / short / reel)
- `title`, `channel`, `duration`, `thumbnail_url` (our own stored copy, not the original link)
- `summary`, `user_note` (optional)
- `custom_reminder` (optional preset: `tonight` / `weekend` / `next_week`, or null; D-020)
- `status` (unwatched / watched), `created_at`, `watched_at`

**`push_subscriptions`**
- `id`, `user_id`, `endpoint`, `keys`, `created_at`

**`reminder_settings`**
- `user_id`, `times` (two daily times), `timezone` (default Asia/Kolkata)

### Planned routes (names may change; log changes in `decisions.md`)

- `POST /api/links`: create a saved item from a URL (fetch, summarise, save)
- `GET /api/links`: list the user's items
- `PATCH /api/links/[id]`: edit note, mark watched
- `DELETE /api/links/[id]`: delete an item
- `POST /api/push/subscribe`: store a device's push subscription
- `POST /api/cron/reminders`: called by the scheduler (protected by a secret), sends reminders
- `/share`: page that receives data from the Android share sheet (set in the PWA manifest)

### Build order (learn one slice, build one slice)

1. Screens with fake data (Next.js)
2. Real data and login (Supabase)
3. YouTube details + AI summary
4. PWA install, share-sheet saving, and push reminders
5. Instagram Reels (last, least predictable)

---

## 8. Constraints: things AI must never do

- Never commit secrets or API keys. Keys live in `.env.local` and server-side only.
- Never change the database schema, auth settings, or RLS policies without asking first and logging a decision. Before any schema change, state in plain language: **what** changes, **why**, **which table(s)** and **which migration file** it lives in, whether **RLS** is affected, and how to **roll it back**. Wait for Viraj's approval, then log it in `decisions.md`. Apply schema changes through a reviewed migration file, never directly/ad-hoc via the Supabase connector.
- Never delete or reset user data or tables.
- Never add a new dependency without saying why and logging it.
- Never use logins, bots, or other workarounds to get Instagram data. Only use publicly available preview data.
- Never refactor or touch code outside the requested change.
- Never build anything listed under "V1: out of scope".

---

## 9. Working rules for AI assistants

Viraj is learning this stack while building. Treat every session as teaching, not only coding.

1. **Read first.** At the start of every session, read `project.md`, `decisions.md`, and `flow.md` (once it exists), plus the latest handoff note below.
2. **Ask "why" before "what".** If a request seems unclear or flawed, say so before writing code.
3. **One change per request.** Keep changes small, traceable and easy to review. Viraj reads every diff.
4. **Explain the code.** Use explicit comments and plain-language explanations of what each part does and why.
5. **Log every meaningful decision in `decisions.md`, with the reason.** A meaningful decision is anything about tools, libraries, data shape, structure, behaviour, scope, or trade-offs. If Viraj didn't state a reason, ask for it before logging. Never log a decision without a reason.
6. **Create and maintain `flow.md`** (see section 10).
7. **Give a test checklist** for every feature: how to check it works, with evidence rather than a promise.
8. **Give a rollback note** for risky changes: how to undo it.
9. **Write an end-of-session handoff note** (section 12) so the next session can pick up cold.
10. **Pin versions.** Record the AI model and key package versions in `decisions.md` when they matter to a decision.

---

## 10. Instruction: create and maintain `flow.md`

When the first runnable code exists, create `flow.md` in the project root (a starter template is provided). It must show how code execution travels through the project, covering:

- **Entry points:** what is the code's entry point (for each of: the web app, the share handler, the reminder job, each API route)?
- **Order of execution:** step by step, what runs first, second, third, for each user flow (save a link, open the dashboard, send a reminder, mark watched).
- **Call graph:** which function calls which other functions, and in which file each lives.
- **Data in and out:** what each function receives and returns, and what it reads from or writes to Supabase.
- **External calls:** where YouTube, Instagram, the LLM, and push services are called.
- **Where to look:** a file map so a new reader knows which file to open for which job.

Update `flow.md` in the same change whenever a function is added, renamed, moved, or its calls change. Stale `flow.md` is a bug.

---

## 11. Open questions

- ~~What are the two reminder times?~~ **Resolved (D-018):** 09:00 and 20:00 Asia/Kolkata.
- ~~JavaScript or TypeScript?~~ **Resolved (D-014):** TypeScript.
- Where to host? **Deferred:** Viraj will decide later; Vercel is the leaning default.
- ~~Monthly cost limit for LLM calls?~~ **Resolved (D-018):** ~$2/month (Claude Haiku).
- Does Instagram preview-tag reading work reliably enough? Test early, then confirm. (Still open — Instagram is built last.)
- ~~What happens to very old unwatched items?~~ **Resolved (D-018):** no special handling in V1; "Drop it" stays parked.
- Login session length / "remember me" behaviour, given OTP-every-time (D-016). Decide when auth is built.

## 12. V1 definition of done

- [ ] Paste a YouTube link and see a real title, thumbnail, and summary
- [ ] Share a link from Instagram or YouTube straight into the app on Android
- [ ] Optional note can be added or skipped
- [ ] Dashboard lists all saved items for the logged-in user only
- [ ] Two reminders arrive per day, even with the app closed
- [ ] Marking watched removes an item from reminders
- [ ] Another test account cannot see my items

## 13. Handoff notes (newest first)

**2026-10-17 (session 5):** Built **step 4** (D-026). PWA manifest (`app/manifest.ts`) with Android **share target**, generated app icons (`public/icon-*.png`), service worker (`public/sw.js`, push + notification click) registered via `components/ServiceWorkerRegister`. **Share-to-save**: `/share` forwards the shared URL to `/add?url=`, which auto-previews. **Push**: "Enable reminders" on the dashboard (`components/EnableReminders`) subscribes and stores to `push_subscriptions` via `POST /api/push/subscribe` (also seeds a default `reminder_settings` row). **Reminders cron**: `POST /api/cron/reminders` (Bearer `CRON_SECRET`, service-role client, `web-push`) sends the two daily nudges; schedule template in `supabase/reminders_cron.sql`. VAPID keys generated into `.env.local`. Build passes; smoke-tested manifest/sw/cron guards. **Custom-preset firing deferred** to a `remind_at` follow-up (D-027). **To make reminders actually fire:** deploy over HTTPS, set `SUPABASE_SERVICE_ROLE_KEY` (+ the VAPID/CRON values) in the host env, and run `supabase/reminders_cron.sql` with the live URL. **Next step:** step 5 — Instagram Reels via public preview tags (D-009), built last. Then the `remind_at` follow-up for custom presets. (Also still pending: the Supabase email-template `{{ .Token }}` edit for login.)

**2026-10-17 (session 4):** Built **step 3**. Added `src/lib/youtube.ts` (real title/channel/thumbnail via keyless oEmbed; duration via YouTube Data API only if `YOUTUBE_API_KEY` set; D-024) and `src/lib/summary.ts` (Claude Haiku `claude-haiku-5-5` summary when `ANTHROPIC_API_KEY` set, else note/title fallback; D-025), both wired into `POST /api/links` to replace the placeholders. Installed `@anthropic-ai/sdk@0.70.1`. Build passes; verified oEmbed returns real data. Keys are optional — the app works without them and improves when added; both are in `.env.local` (empty) and documented in `.env.local.example`. **Next step:** step 4 — PWA (manifest + service worker), Android share-target save, and Web Push reminders (two daily + the custom presets). Needs VAPID keys (generated, no account) and a scheduler (Supabase `pg_cron` per D-008/D-018).

**2026-10-17 (session 3):** Built **step 2**. Created a dedicated Supabase project `content-compass` and applied the schema (saved_items / push_subscriptions / reminder_settings, all with RLS; security advisor clean) via a migration file (D-022). Added email-OTP login (D-016/D-023), auth middleware protecting all pages, and `/api/links` routes that replace the in-memory store with real Supabase reads/writes under the user's session. Deleted fake-data.ts. `npm run build` passes; runtime smoke test confirms signed-out `/`→`/login` redirect, `/api/links`→401, `/login`→200. **Action needed from Viraj before the login works end to end:** (1) in the Supabase dashboard, edit the Auth "Magic Link" email template to show the code `{{ .Token }}` (D-023); (2) the app needs `.env.local` (already present in this session; see `.env.local.example`). **Still not pushed to GitHub** — code is only in this ephemeral session. **Next step:** step 3 — real YouTube details (oEmbed + Data API) and the Claude Haiku summary in `POST /api/links`. Needs an Anthropic API key and a YouTube Data API key.

**2026-10-17 (session 2):** Chose connectors (Supabase + Context7 now; Vercel later). Settled open questions: TypeScript (D-014), Tailwind v4 (D-015), email-OTP-every-time login (D-016), behaviour defaults (D-018), animations deferred to after the core loop using Motion + View Transitions (D-019). **Built build step 1:** Next.js 15 + TS + Tailwind project with the three screens (dashboard, add link, video detail) running on fake data via an in-memory store (D-017). `npm run build` passes clean. `flow.md` created. **Not done:** nothing is pushed to GitHub yet — Viraj needs to create a repo and push (commands provided in chat), or this is lost when the cloud session ends. **Next step:** build step 2 — Supabase project, email-OTP login, real `saved_items` table with RLS, and swap the in-memory store for real `/api/links` routes. Needs from Viraj: a Supabase project, an Anthropic API key, and a YouTube Data API key (for step 3).

**2026-10-17 (session 1):** Ideation, scope, stack, architecture, wireframes, and learning path are done. No code written. Next step: set up the Next.js project and build the three screens with fake data. Open questions in section 11 do not block this step.
