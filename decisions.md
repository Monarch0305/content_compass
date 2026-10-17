# Decisions log

Every meaningful decision for Content Compass goes here, **with the reason**. The point is to record *why* something was chosen, not only what.

## Rules for logging

- Log a decision whenever you choose a tool, library, data shape, structure, behaviour, scope change, or trade-off.
- **A reason is required.** If no reason was given, ask for it before writing the entry. Never log a decision without one.
- Newest entries go at the **bottom**. Never delete old entries. If a decision changes, add a new entry and mark the old one `Superseded by D-xxx`.
- Record alternatives that were considered when there were any.
- Record who decided: **Viraj** (stated by the user), **Claude** (proposed by AI), or **Both**.
- Pin versions when relevant (AI model, package versions).

## Status meanings

- **Accepted:** Viraj stated or confirmed it.
- **Provisional:** proposed and not objected to, but not yet tested or explicitly confirmed. Revisit when real code exists.
- **Superseded:** replaced by a later entry.

## Entry template

```
### D-000: Short title
- **Date:** YYYY-MM-DD
- **Decided by:** Viraj / Claude / Both
- **Status:** Accepted / Provisional / Superseded by D-xxx
- **Decision:** What was decided.
- **Reason:** Why. (required)
- **Alternatives considered:** What else was an option, and why not.
- **Consequences / follow-ups:** What this affects.
```

---

## Log

### D-001: Personal project first, public later
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Build Content Compass for personal use first, with the long-term aim of opening it up as everyone's "second brain for videos".
- **Reason:** Viraj wants to solve his own "save it and forget it" problem first, and keep the bigger vision open.
- **Alternatives considered:** Building it as a public product from the start. Rejected because it adds scope before the core loop is proven.
- **Consequences / follow-ups:** Architecture must stay multi-user ready (see D-011).

### D-002: Three-phase roadmap
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** V1 = short-form video capture + reminders. V2 = blogs, links, shopping links and other platforms. V3 = social layer with private/public saves and discovery.
- **Reason:** Prove the core "never forget to watch" loop first, then widen content types, then add social once there is something worth sharing.
- **Alternatives considered:** Starting with a universal save-anything tool. Rejected because each content type needs different detail fetching (text extraction, price tracking), which would slow V1.
- **Consequences / follow-ups:** V2 and V3 features must not leak into V1 (see `project.md` out-of-scope list).

### D-003: V1 platforms are YouTube, YouTube Shorts and Instagram Reels only
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Support only YouTube, YouTube Shorts and Instagram Reels in V1. Leave TikTok out.
- **Reason:** Narrow scope keeps detail-fetching tractable. TikTok is not available in India, so Viraj can't use or test it.
- **Alternatives considered:** Adding TikTok. Rejected for the reason above.

### D-004: Keep V1 basic
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** V1 contains only: capture, detail fetching, AI summary, optional note, dashboard, two daily reminders, and mark-as-watched/delete. Extra reminder ideas are parked (drop-it triage, time-fit nudges, intent-based timing, "no need to watch" shortcut, backlog streaks).
- **Reason:** Get the basic loop working before adding anything. Viraj explicitly asked to keep V1 basic.
- **Alternatives considered:** Including the smarter reminder ideas now. Parked, not rejected.
- **Consequences / follow-ups:** Revisit the parked list once V1 is in daily use.

### D-005: Optional "why are you saving this?" note
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Saving a link includes an optional free-text note that the user can skip.
- **Reason:** Reel captions are often vague or just hashtags, so automatic summaries may be weak. The user's own note supplies the missing context.
- **Alternatives considered:** Making the note required (rejected: adds friction to saving).

### D-006: Search by summary is deferred
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Leave search/lookup out of V1 and treat it as a later feature alongside the social layer.
- **Reason:** The core promise is "don't forget to watch". Search isn't needed for that, and it becomes almost free to add later because summaries are already stored.

### D-007: Android users, so build a PWA, not a native app
- **Date:** 2026-10-17
- **Decided by:** Both (Viraj uses Android; Claude proposed the PWA)
- **Status:** Provisional
- **Decision:** Build an installable web app (PWA) rather than a native app.
- **Reason:** On Android, a PWA can appear in the share sheet and receive push notifications, which covers both core needs (quick capture and reminders) with one codebase and no app store.
- **Alternatives considered:** Native app with React Native/Expo. More work for no V1 benefit on Android. Could wrap the PWA for the Play Store later.
- **Consequences / follow-ups:** Test the share flow and push on a real phone early. Check Chrome battery settings if notifications are delayed.

### D-008: Core stack is Next.js + Supabase + LLM API + Web Push
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed); Viraj moved on to architecture without objection
- **Status:** Provisional
- **Decision:** Next.js for the app and server routes, Supabase for database/login/scheduled jobs, Claude Haiku for summaries, Web Push for reminders.
- **Reason:** One codebase for screens and server code; Supabase gives database, login and scheduling in one place and is ready for multiple users; Haiku is cheap and fast enough for 2-3 line summaries; Web Push delivers notifications when the app is closed.
- **Alternatives considered:** Not explored in depth. Other combinations would also work, but this one has strong beginner material and fits the PWA decision.
- **Consequences / follow-ups:** Confirm hosting and JavaScript-vs-TypeScript (see `project.md` section 11).

### D-009: Instagram data from public preview only, with note as fallback
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Provisional
- **Decision:** For Reels, read only the publicly available page preview (title, caption, thumbnail). If it fails or is vague, rely on the user's note. No logins, bots, or heavy scraping.
- **Reason:** Meta offers no simple open API for Reels. Preview data works for many links, and heavy scraping would break Meta's rules and be fragile. This is fine for a personal tool, and must be revisited before going public.
- **Alternatives considered:** Full scraping (rejected: rules and fragility). Downloading and transcribing reel audio (rejected for V1: too complex).
- **Consequences / follow-ups:** Build Instagram last (see D-012). Re-evaluate before V3 or any public release.

### D-010: Store our own copy of thumbnails
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Provisional
- **Decision:** Copy each thumbnail into our own storage instead of linking to the original image URL.
- **Reason:** Instagram's image links expire, which would leave broken thumbnails on the dashboard.

### D-011: Every record carries a `user_id` from day one
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Provisional
- **Decision:** All tables have a `user_id`, and Supabase Row Level Security limits each user to their own rows, even though V1 has a single user.
- **Reason:** Costs almost nothing now, and it lets the app open to other users and the V3 social layer without a rebuild.

### D-012: Build in slices, learning each tool just in time
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Provisional
- **Decision:** Build order: (1) screens with fake data, (2) real data and login, (3) YouTube details + AI summary, (4) PWA install, share-sheet saving and push reminders, (5) Instagram.
- **Reason:** Viraj is new to this stack. Learning one piece and building it right away avoids tutorial overload, and each slice produces something working. Instagram goes last because it is the least predictable part.

### D-013: Use project.md, decisions.md and flow.md to guide AI-assisted building
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Keep three living documents in the repo root: `project.md` (scope, stack, architecture, rules), `decisions.md` (this file, always with reasons), and `flow.md` (how code execution travels, created by the AI once code exists).
- **Reason:** Each AI session starts with no memory. Written context lets any session pick up where the last left off, and recording *why* choices were made prevents re-debating or silently reversing them. Viraj also wants to understand the system himself, not just have it generated.
- **Consequences / follow-ups:** AI must read these files at session start, update them as part of each change, and write a handoff note at the end of each session.

---

### D-014: Language is TypeScript
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Write the whole project in TypeScript, not plain JavaScript. (Resolves the open question in `project.md` section 11.)
- **Reason:** It catches a whole class of mistakes before the code runs, which matters while Viraj is learning. Supabase can also generate TypeScript types straight from the database tables, so the data shape stays in sync automatically.
- **Alternatives considered:** JavaScript — less upfront ceremony, but no type safety and weaker editor help.
- **Consequences / follow-ups:** All files are `.ts`/`.tsx`. A shared `SavedItem` type lives in `src/lib/types.ts`.

### D-015: Styling with Tailwind CSS v4
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed); Viraj said go
- **Status:** Provisional
- **Decision:** Use Tailwind CSS (v4) for styling.
- **Reason:** Fast to iterate on a phone-first layout, huge amount of learning material, and it pairs cleanly with the Motion animation library planned for later (D-019). Tailwind v4 is also what `create-next-app` scaffolds by default now, so tutorials match.
- **Alternatives considered:** Plain CSS / CSS Modules (more boilerplate for a learner); a component kit like shadcn/ui (more to learn than needed for three screens).
- **Consequences / follow-ups:** New dependencies `tailwindcss` and `@tailwindcss/postcss`. Colours are defined as tokens in `src/app/globals.css` so the whole app can be restyled from one place.

### D-016: Login is email + a one-time code (OTP) every time
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Sign in with an email address plus a one-time code (OTP) entered on every sign-in. No stored password, and no long-lived "stay logged in" magic link.
- **Reason:** Viraj explicitly wants an OTP each time. Supabase Auth supports this directly via `signInWithOtp` (it emails a 6-digit code), so there is no password to manage or leak.
- **Alternatives considered:** Password login (rejected: another secret to manage); persistent magic-link session (rejected: Viraj wants to re-verify each time).
- **Consequences / follow-ups:** Session length / "remember me" behaviour to be confirmed when auth is built in step 2. Email delivery uses Supabase's built-in mailer for now.

### D-017: In-memory store for the fake-data step
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Provisional
- **Decision:** For build step 1 (screens with fake data), hold the list of items in a small React context store (`src/lib/store.tsx`), seeded from `src/lib/fake-data.ts`.
- **Reason:** With no database yet, the screens still need to share one list so that marking an item watched on the detail screen updates the dashboard. The store exposes `addItem`, `markWatched`, `deleteItem`, `getItem` — the same names that will later call the real `/api/links` routes, so the screens barely change in step 2.
- **Consequences / follow-ups:** State resets on page refresh; this is expected and goes away once Supabase is wired in. Delete `store.tsx` seeding and `fake-data.ts` then.

### D-018: V1 behaviour defaults
- **Date:** 2026-10-17
- **Decided by:** Both (Claude proposed, Viraj said "go with the defaults")
- **Status:** Provisional
- **Decision:** (a) Saving a link that is already saved is blocked with an "already saved" message, no duplicate row. (b) When a Reel caption is empty/just hashtags, the summary is built from the user's note; with no note, show a "add a note" placeholder. (c) If there are no unwatched items at a reminder time, no notification is sent. (d) LLM spend capped at roughly $2/month (Claude Haiku). (e) The reminder scheduler is Supabase `pg_cron`, matching D-008. (f) Very old unwatched items get no special treatment in V1 (the "Drop it" idea stays parked). (g) The two reminder times are 09:00 and 20:00 Asia/Kolkata.
- **Reason:** These are the smallest sensible choices that keep the core loop honest without adding scope. Viraj accepted the defaults rather than specifying each.
- **Consequences / follow-ups:** Revisit (d) once real usage shows the actual cost, and (g) once reminders are tested on a real phone.

### D-019: Animations come after the core loop; use Motion + CSS View Transitions
- **Date:** 2026-10-17
- **Decided by:** Both
- **Status:** Provisional
- **Decision:** Build the core loop with only minimal transitions first. Add richer animation afterwards, using the Motion library (formerly Framer Motion) plus the browser's built-in CSS View Transitions.
- **Reason:** Keep V1 basic (D-004); animation is polish that should not block the "never forget to watch" loop. Motion covers gestures and spring motion with one library; View Transitions need no dependency. No animation connector is needed — these are code libraries.
- **Alternatives considered:** A heavier motion/3D stack (rejected for a phone PWA on mid-range Android — stutter risk). A Figma connector (only worth it if Viraj designs in Figma).
- **Consequences / follow-ups:** Respect the phone's "reduce motion" setting. Adding `motion` later needs its own dependency note. Hosting (Vercel) is still deferred — Viraj will decide later (section 11 stays open).

### D-020: Optional per-item custom reminder (quick presets)
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** The Add screen's note area is now two parts: **"Why are you saving this?"** (the existing optional note) and **"Do you need a custom reminder?"** — an optional quick-pick with presets **Tonight / This weekend / Next week**. Stored per item as `custom_reminder` (null = none). This is *in addition to* the two daily nudges, not a replacement. Tapping the selected preset again clears it.
- **Reason:** Viraj asked for it directly. Presets (rather than a date/time picker) keep saving to one tap on a phone and avoid fiddly input.
- **Alternatives considered:** Exact date & time picker (precise but slow on mobile); a plain yes/no flag (too vague to act on later). Presets are the middle ground.
- **Consequences / follow-ups:** This pulls forward part of the parked "intent-based timing" idea (D-004), so V1 scope now includes a per-item reminder preset. Adds a `custom_reminder` column to `saved_items` when the schema is built. The preset becomes a real fire time in the reminder job (step 4); the exact time each preset maps to is still to be defined then.

### D-021: Light theme (white background)
- **Date:** 2026-10-17
- **Decided by:** Viraj
- **Status:** Accepted
- **Decision:** Use a light theme — white background with cool-neutral surfaces, near-black text, purple accent kept. Replaces the initial dark palette.
- **Reason:** Viraj asked for a white background.
- **Consequences / follow-ups:** Colour tokens in `globals.css` flipped to light; platform-tag text colours darkened for contrast on white. A dark-mode option can be added later if wanted (not in scope now).

### D-022: Dedicated Supabase project; publishable key only in the app
- **Date:** 2026-10-17
- **Decided by:** Both (Viraj chose "create it now"; Claude proposed the setup)
- **Status:** Accepted
- **Decision:** Created a **separate** Supabase project `content-compass` (ref `ockzteekfjtbtafomaqu`, region ap-southeast-1) rather than reusing Viraj's existing projects (Aurum, taxfolio, PaperTrade). The app's `.env.local` holds only `NEXT_PUBLIC_SUPABASE_URL` and the **publishable (anon) key** — no service-role secret. Schema applied via the migration file `supabase/migrations/20261017113700_init_schema.sql` through the Supabase connector.
- **Reason:** A dedicated project keeps this app's data and auth isolated from unrelated projects. The publishable key is safe in the browser because RLS limits every user to their own rows, so the app never needs the service-role key (the reminder cron will need it in step 4, kept server-only then).
- **Alternatives considered:** Reusing a paused project (rejected: mixes unrelated data/auth); putting the service-role key in the app (rejected: unnecessary and unsafe).
- **Consequences / follow-ups:** `.env.local` is required to run the app (template in `.env.local.example`). All three tables have RLS enabled; security advisor reported no issues.

### D-023: Email OTP delivered as a typed code (email template change required)
- **Date:** 2026-10-17
- **Decided by:** Claude (implementation detail of D-016)
- **Status:** Accepted
- **Decision:** Login uses `signInWithOtp` + `verifyOtp` with a typed 6-digit code. Supabase's default "Magic Link" email shows a link, not a code, so the project's email template must be changed to include the code token (`{{ .Token }}`). This is a one-time dashboard step by Viraj (the connector can't edit auth templates).
- **Reason:** D-016 wants a code entered every time, not a magic link. The template change is what makes the emailed value a visible code.
- **Consequences / follow-ups:** Documented in the test checklist. Built-in Supabase email is rate-limited (fine for personal testing); a real email provider (e.g. Resend) can be added before going public.

### D-024: YouTube details via oEmbed first, Data API only for duration
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed)
- **Status:** Accepted
- **Decision:** Fetch YouTube/Shorts details in `src/lib/youtube.ts` from **oEmbed** (title, channel, thumbnail) — which needs **no API key** — and use the **YouTube Data API** only to add the video's duration, and only when `YOUTUBE_API_KEY` is set. Everything degrades gracefully: a failed call falls back to a placeholder instead of erroring.
- **Reason:** oEmbed gives the most valuable fields with zero setup, so the app is useful before Viraj has any key. The Data API (which needs a Google Cloud key and has quotas) is reserved for the one thing oEmbed lacks. Graceful fallback means saving a link never breaks on a network hiccup.
- **Alternatives considered:** Data API for everything (rejected: requires a key just to save anything, and burns quota); scraping the watch page (rejected: fragile, against terms).
- **Consequences / follow-ups:** `YOUTUBE_API_KEY` is optional. Instagram Reels still use placeholders + the note until step 5 (per D-009).

### D-025: AI summary uses Claude Haiku with a no-key fallback
- **Date:** 2026-10-17
- **Decided by:** Claude (proposed; model per D-008)
- **Status:** Accepted
- **Decision:** `src/lib/summary.ts` calls **Claude Haiku** (`claude-haiku-5-5`) for a 2-3 line summary when `ANTHROPIC_API_KEY` is set. With no key, or if the call fails, it falls back to the user's note (else the title) so the saved item is still recognisable. Reels have no caption (D-009), so the note carries the context — the same path handles that.
- **Reason:** Haiku is cheap and fast enough for short summaries (D-008) and fits the ~$2/mo cap (D-018). The fallback keeps the app fully usable before a key is added and resilient if the API is briefly unavailable.
- **Alternatives considered:** A larger model (rejected: unnecessary cost for 2-3 lines); blocking saves until a key exists (rejected: breaks the core loop).
- **Consequences / follow-ups:** Pinned model `claude-haiku-5-5`, SDK `@anthropic-ai/sdk@0.70.1`. Summary is generated synchronously on save (fine at personal volume); revisit if saving feels slow.

<!-- Add new entries below this line. Next ID: D-026 -->
