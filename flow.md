# flow.md: how the code runs

> **Status: reflects build step 5 — all V1 features coded.**
> YouTube details are live (oEmbed + optional Data API), Instagram Reels read
> public Open Graph tags (D-009, best-effort), and summaries use Claude Haiku
> (with a no-key fallback). Reminder *delivery* requires the app deployed over HTTPS
> with the service-role key set and the pg_cron schedule applied (see
> `supabase/reminders_cron.sql`). Update this file in the same change whenever a
> function is added, renamed, moved, or its calls change. A stale `flow.md` is a bug.

## 1. Entry points

| Entry point | File | Triggered by |
|---|---|---|
| Middleware (auth gate + session refresh) | `src/middleware.ts` | Every page request except `/api`, static, `sw.js`, manifest |
| Root layout (store + service-worker registration) | `src/app/layout.tsx` | Every page load |
| PWA manifest | `src/app/manifest.ts` | `/manifest.webmanifest` (install + share target) |
| Service worker | `public/sw.js` | Push messages, notification taps |
| Login | `src/app/login/page.tsx` | `/login` |
| Home / dashboard | `src/app/page.tsx` | `/` |
| Add link | `src/app/add/page.tsx` | `/add` (also `/add?url=` from a share) |
| Share target | `src/app/share/page.tsx` | `/share?url=…` from the Android share sheet |
| Video detail | `src/app/video/[id]/page.tsx` | `/video/<id>` |
| List + create API | `src/app/api/links/route.ts` | `GET`/`POST /api/links` |
| Update + delete API | `src/app/api/links/[id]/route.ts` | `PATCH`/`DELETE /api/links/<id>` |
| Save push subscription | `src/app/api/push/subscribe/route.ts` | `POST /api/push/subscribe` |
| Reminder cron | `src/app/api/cron/reminders/route.ts` | `POST /api/cron/reminders` (scheduler) |

## 2. Execution order per flow

```
Flow: Login (email + one-time code, D-016)
1. signed-out user hits any page -> middleware redirects -> /login   (src/middleware.ts)
2. type email, "Send code"       -> supabase.auth.signInWithOtp()    (login/page.tsx)
3. type code, "Verify"           -> supabase.auth.verifyOtp()        (login/page.tsx)
4. session cookie set            -> router.push("/") + refresh
```

```
Flow: Save a link (paste or share)
1a. paste on /add, tap Preview, OR
1b. share from YouTube/Instagram -> /share -> redirect -> /add?url=…  (share/page.tsx)
2. /add auto-previews the URL    -> detectPlatform()                 (lib/platform.ts)
3. add optional note + reminder preset, tap Save
4. store.addItem(input)          -> POST /api/links                  (lib/store.tsx)
5. route fetches details         -> fetchYouTubeDetails()            (lib/youtube.ts)  [YouTube/Shorts]
                                 -> fetchInstagramDetails()         (lib/instagram.ts) [Reels, public OG tags]
6. route writes summary          -> summarise() (Claude Haiku/fallback)(lib/summary.ts)
7. route inserts                 -> supabase saved_items.insert()    (api/links/route.ts)
8. created row prepended locally -> back to dashboard
```

```
Flow: Enable reminders
1. dashboard "Enable reminders"  -> Notification.requestPermission() (components/EnableReminders.tsx)
2. subscribe via service worker  -> pushManager.subscribe(VAPID)
3. POST /api/push/subscribe      -> upsert push_subscriptions + default reminder_settings (api/push/subscribe/route.ts)
```

```
Flow: Send reminders (two daily nudges, D-018)
1. pg_cron at 03:30 & 14:30 UTC  -> net.http_post -> POST /api/cron/reminders  (supabase/reminders_cron.sql)
2. endpoint checks Bearer CRON_SECRET, loads VAPID + service-role client       (api/cron/reminders/route.ts)
3. reads all unwatched items + subscriptions (service role bypasses RLS)
4. web-push sends one notification per device; dead subs (404/410) deleted
5. phone shows notification -> tap -> service worker focuses/opens app          (public/sw.js)
```

```
Flow: Mark watched / delete  -> PATCH/DELETE /api/links/<id>   (video/[id]/page.tsx -> store -> API)
Flow: Sign out               -> supabase.auth.signOut() -> /login (components/SignOutButton.tsx)
```

## 3. Call graph

- `middleware` (`middleware.ts`) -> `supabase.auth.getUser()`; redirects
- `RootLayout` (`layout.tsx`) -> `StoreProvider`, `ServiceWorkerRegister`, `Header`
- `ServiceWorkerRegister` -> `navigator.serviceWorker.register("/sw.js")`
- `DashboardPage` -> `useStore()`; renders `VideoCard`, `EnableReminders`, `SignOutButton`, `EmptyState`
- `EnableReminders` -> `Notification.requestPermission`, `pushManager.subscribe`, `POST /api/push/subscribe`
- `AddForm` (`add/page.tsx`) -> `useSearchParams`, `useStore().addItem`, `detectPlatform`, `extractYouTubeId`, `platformLabel`, `REMINDER_PRESETS`
- `SharePage` (`share/page.tsx`) -> `useSearchParams` -> redirect to `/add?url=`
- `GET/POST /api/links` -> server `createClient()`, `auth.getUser()`, `saved_items`; POST also `fetchYouTubeDetails()`, `summarise()`
- `POST /api/push/subscribe` -> server `createClient()`, upsert `push_subscriptions` + `reminder_settings`
- `POST /api/cron/reminders` -> `createAdminClient()` (service role), `webpush.sendNotification()`
- `fetchYouTubeDetails` (`youtube.ts`) -> YouTube oEmbed + (if key) Data API
- `summarise` (`summary.ts`) -> Anthropic `messages.create` (Claude Haiku) or fallback

## 4. Data in and out

| Function (file) | Input | Output | Supabase |
|---|---|---|---|
| `GET /api/links` | session | `SavedItem[]` | select `saved_items` |
| `POST /api/links` | `{url, user_note, custom_reminder}` | `SavedItem` / 400 / 409 | insert `saved_items` |
| `PATCH /api/links/[id]` | `{status?, user_note?}` | `SavedItem` | update `saved_items` |
| `DELETE /api/links/[id]` | — | `{ok}` | delete `saved_items` |
| `POST /api/push/subscribe` | PushSubscription JSON | `{ok}` | upsert `push_subscriptions`, `reminder_settings` |
| `POST /api/cron/reminders` | `Bearer CRON_SECRET` | `{sent, removed, users}` / 401 / 503 | read all `saved_items` + `push_subscriptions` (service role), delete dead subs |

## 5. External calls

| Service | Where | Notes |
|---|---|---|
| Supabase Auth | login, middleware, API routes, SignOutButton | email OTP, session cookies |
| Supabase Postgres | API routes (user client); cron (service-role client) | RLS for users; cron bypasses it |
| YouTube oEmbed | `lib/youtube.ts` (POST /api/links) | keyless; title, channel, thumbnail |
| YouTube Data API | `lib/youtube.ts` (POST /api/links) | duration only; needs `YOUTUBE_API_KEY` |
| LLM (Claude Haiku) | `lib/summary.ts` (POST /api/links) | needs `ANTHROPIC_API_KEY`, else fallback |
| Web Push | `api/cron/reminders` (web-push) + `public/sw.js` | needs VAPID keys + service-role + a schedule |
| Instagram (public OG tags) | `src/lib/instagram.ts` (POST /api/links) | reel title/thumbnail/caption; best-effort, no login (D-009) |

## 6. File map

| File | Job |
|---|---|
| `src/middleware.ts` | Auth gate; excludes `/api`, static, `sw.js`, manifest |
| `src/app/layout.tsx` | Root layout: metadata/manifest/icons, store, SW registration |
| `src/app/manifest.ts` | PWA manifest incl. share target |
| `public/sw.js` | Service worker: push + notification click |
| `src/app/login/page.tsx` | Email one-time-code sign-in (D-016) |
| `src/app/page.tsx` | Dashboard: list, add, enable-reminders, sign out |
| `src/app/add/page.tsx` | Add screen (Suspense-wrapped; `?url=` prefill) |
| `src/app/share/page.tsx` | Share target -> forwards URL to `/add` |
| `src/app/video/[id]/page.tsx` | Detail: summary, note, reminder, watched/delete |
| `src/app/api/links/route.ts` | List + create (fetch details + summary) |
| `src/app/api/links/[id]/route.ts` | Update + delete |
| `src/app/api/push/subscribe/route.ts` | Store push subscription + default settings |
| `src/app/api/cron/reminders/route.ts` | Send daily nudges (secret-protected, service role) |
| `src/components/VideoCard.tsx` | Dashboard card |
| `src/components/PlatformTag.tsx` | Platform label |
| `src/components/SignOutButton.tsx` | Sign out |
| `src/components/EnableReminders.tsx` | Permission + push subscribe UI |
| `src/components/ServiceWorkerRegister.tsx` | Registers `/sw.js` |
| `src/lib/types.ts` | `SavedItem`, `Platform`, `ItemStatus`, `ReminderPreset` |
| `src/lib/platform.ts` | URL utilities |
| `src/lib/youtube.ts` | YouTube detail-fetching |
| `src/lib/instagram.ts` | Instagram Reel details via public OG tags (D-009) |
| `src/lib/summary.ts` | Claude Haiku summary + fallback (uses caption/note) |
| `src/lib/reminders.ts` | Reminder presets + label |
| `src/lib/store.tsx` | Browser data layer over `/api/links` |
| `src/lib/supabase/client.ts` | Supabase browser client |
| `src/lib/supabase/server.ts` | Supabase server client (cookies) |
| `src/lib/supabase/admin.ts` | Supabase service-role client (cron only) |
| `public/icon-*.png`, `icon.svg` | App icons |
| `supabase/migrations/*.sql` | Database schema |
| `supabase/reminders_cron.sql` | pg_cron schedule template (run after deploy) |

---

**Last updated:** 2026-10-17 | **Updated by:** Claude | **Reflects:** build step 5 — all V1 features coded (incl. Instagram Reels via public OG tags). Remaining before it's fully live: deploy (HTTPS + service-role key + pg_cron), the Supabase email-template edit, and the optional `remind_at` follow-up (D-027).
