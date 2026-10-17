# flow.md: how the code runs

> **Status: reflects build step 2 (real data + email-OTP login).**
> YouTube/Instagram detail-fetching and the AI summary are still placeholders
> (step 3); PWA share target and reminders are not built yet (step 4). Those
> sections say so. Update this file in the same change whenever a function is
> added, renamed, moved, or its calls change. A stale `flow.md` is a bug.

## 1. Entry points

| Entry point | File | Triggered by |
|---|---|---|
| Middleware (auth gate + session refresh) | `src/middleware.ts` | Every page request except `/api`, static |
| Root layout (provides the store) | `src/app/layout.tsx` | Every page load |
| Login | `src/app/login/page.tsx` | Opening `/login` (or any redirect when signed out) |
| Home / dashboard | `src/app/page.tsx` | Opening `/` |
| Add link | `src/app/add/page.tsx` | Opening `/add` (floating + button) |
| Video detail | `src/app/video/[id]/page.tsx` | Opening `/video/<id>` |
| List + create API | `src/app/api/links/route.ts` | `GET`/`POST /api/links` |
| Update + delete API | `src/app/api/links/[id]/route.ts` | `PATCH`/`DELETE /api/links/<id>` |
| Share handler | — | **Not built yet** (step 4, PWA share target) |
| Reminder job | — | **Not built yet** (step 4) |

Data now lives in **Supabase**, read/written through the API routes under the
logged-in user's session. The browser store (`src/lib/store.tsx`) keeps a local
copy in sync for a snappy UI.

## 2. Execution order per flow

```
Flow: Login (email + one-time code, D-016)
1. signed-out user hits any page -> middleware redirects -> /login   (src/middleware.ts)
2. type email, tap "Send code"   -> supabase.auth.signInWithOtp()    (src/app/login/page.tsx)
   -> Supabase emails a 6-digit code
3. type code, tap "Verify"       -> supabase.auth.verifyOtp()        (src/app/login/page.tsx)
4. session cookie set            -> router.push("/") + refresh       -> dashboard
```

```
Flow: Open the dashboard
1. browser loads /                -> middleware confirms session      (src/middleware.ts)
2. StoreProvider mounts, fetches  -> GET /api/links                   (src/lib/store.tsx)
3. route checks user, queries     -> supabase.from("saved_items")...  (src/app/api/links/route.ts)
   (RLS returns only this user's rows)
4. dashboard renders cards        -> <VideoCard/>                      (src/app/page.tsx)
```

```
Flow: Save a link
1. /add: paste URL, Preview       -> detectPlatform(), extractYouTubeId() (src/lib/platform.ts)
2. add optional note + reminder preset, tap Save
3. store.addItem(input)           -> POST /api/links                  (src/lib/store.tsx)
4. route: detect platform, insert -> supabase ... .insert(...)        (src/app/api/links/route.ts)
   (unique (user_id,url) -> 409 "already saved")
5. created row returned, prepended to the local list -> back to dashboard
```

```
Flow: Mark watched / delete
1. /video/<id>: getItem(id) from the local store                     (src/app/video/[id]/page.tsx)
2a. Mark watched -> store.markWatched(id) -> PATCH /api/links/<id>    (status=watched, sets watched_at)
2b. Delete       -> store.deleteItem(id)  -> DELETE /api/links/<id>
3. local list updated -> router.push("/")

Flow: Sign out -> SignOutButton -> supabase.auth.signOut() -> /login  (src/components/SignOutButton.tsx)
```

## 3. Call graph

- `middleware` (`middleware.ts`) -> `supabase.auth.getUser()`; redirects to `/login` or back
- `StoreProvider` (`store.tsx`) -> `fetch` GET/POST/PATCH/DELETE `/api/links`; exposes `items`, `loading`, `getItem`, `addItem`, `markWatched`, `deleteItem`
- `LoginPage` (`login/page.tsx`) -> `createClient()` (browser) -> `signInWithOtp()`, `verifyOtp()`
- `DashboardPage` (`page.tsx`) -> `useStore()`; renders `VideoCard`, `SignOutButton`, `EmptyState`
- `AddPage` (`add/page.tsx`) -> `useStore().addItem`, `detectPlatform`, `extractYouTubeId`, `platformLabel`, `REMINDER_PRESETS`
- `VideoDetailPage` (`video/[id]/page.tsx`) -> `useStore()` (`getItem`, `markWatched`, `deleteItem`, `loading`), `reminderLabel`
- `GET/POST /api/links` (`api/links/route.ts`) -> `createClient()` (server) -> `auth.getUser()`, `from("saved_items")`
- `PATCH/DELETE /api/links/[id]` (`api/links/[id]/route.ts`) -> `createClient()` (server) -> `auth.getUser()`, `from("saved_items")`

## 4. Data in and out

| Function (file) | Input | Output | Supabase |
|---|---|---|---|
| `GET /api/links` | — (session cookie) | `SavedItem[]` | select `saved_items` where `user_id` |
| `POST /api/links` | `{ url, user_note, custom_reminder }` | created `SavedItem` (201) / 400 / 409 | insert `saved_items` |
| `PATCH /api/links/[id]` | `{ status?, user_note? }` | updated `SavedItem` | update `saved_items` |
| `DELETE /api/links/[id]` | — | `{ ok: true }` | delete `saved_items` |
| `detectPlatform`, `extractYouTubeId`, `platformLabel` (`platform.ts`) | url / platform | platform / id / label | none (pure) |
| store `addItem/markWatched/deleteItem` (`store.tsx`) | see API | updates local `items` | via the API routes |

RLS on all three tables enforces `auth.uid() = user_id`, so a user can never
read or change another user's rows — the API's `.eq("user_id", ...)` is a
belt-and-braces second check.

## 5. External calls

| Service | Where | Notes |
|---|---|---|
| Supabase Auth | `login/page.tsx`, `middleware.ts`, both API routes, `SignOutButton` | email OTP, session cookies |
| Supabase Postgres | both API routes (server client) | `saved_items` CRUD under RLS |
| YouTube / Instagram | — | **Not built yet** (step 3) |
| LLM (Claude Haiku) | — | **Not built yet** (step 3) |
| Web Push | — | **Not built yet** (step 4) |

## 6. File map

| File | Job |
|---|---|
| `src/middleware.ts` | Auth gate: refresh session, redirect signed-out users to `/login` |
| `src/app/layout.tsx` | Root layout: metadata, global CSS, header, store provider |
| `src/app/login/page.tsx` | Email + one-time-code sign-in (D-016) |
| `src/app/page.tsx` | Dashboard: lists items, add button, sign out, empty state |
| `src/app/add/page.tsx` | Add-link screen: paste → preview → note + reminder → save |
| `src/app/video/[id]/page.tsx` | Detail screen: summary, note, reminder, open / watched / delete |
| `src/app/api/links/route.ts` | `GET` list + `POST` create saved items |
| `src/app/api/links/[id]/route.ts` | `PATCH` update + `DELETE` one item |
| `src/components/VideoCard.tsx` | One card in the dashboard list |
| `src/components/PlatformTag.tsx` | Coloured YouTube/Short/Reel label |
| `src/components/SignOutButton.tsx` | Signs out, returns to `/login` |
| `src/lib/types.ts` | `SavedItem`, `Platform`, `ItemStatus`, `ReminderPreset` |
| `src/lib/platform.ts` | URL utilities: detect platform, extract YouTube id, label |
| `src/lib/reminders.ts` | Reminder presets + label (D-020) |
| `src/lib/store.tsx` | Browser data layer: loads from and writes to `/api/links` |
| `src/lib/supabase/client.ts` | Supabase browser client |
| `src/lib/supabase/server.ts` | Supabase server client (cookie-based session) |
| `src/app/globals.css` | Tailwind import + colour tokens (light theme) |
| `supabase/migrations/*.sql` | Database schema (applied to the project) |

---

**Last updated:** 2026-10-17 | **Updated by:** Claude | **Reflects:** build step 2 (Supabase data + email-OTP login, RLS); detail-fetching/AI summary still placeholder (step 3); pre-git-init
