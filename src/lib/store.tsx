"use client";

// The app's data layer, now backed by the real API (build step 2).
//
// This keeps the SAME hook shape the screens already used (items, getItem,
// addItem, markWatched, deleteItem) so the screens barely changed — only the
// implementation swapped from an in-memory array to calls against /api/links,
// which read and write Supabase under the user's session.
//
// It loads the user's items once on mount, then keeps a local copy in sync as
// the user adds, marks watched, or deletes — so the UI stays snappy without a
// full refetch each time.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { SavedItem, ReminderPreset } from "./types";

// What the Add screen sends to create an item. The server fills in the rest
// (title, thumbnail, summary — real values arrive in step 3).
export interface NewItemInput {
  url: string;
  user_note: string | null;
  custom_reminder: ReminderPreset | null;
}

interface Store {
  items: SavedItem[];
  loading: boolean;
  getItem: (id: string) => SavedItem | undefined;
  // Resolves with the created item, or throws an Error with a readable message
  // (e.g. "You've already saved this one.") so the Add screen can show it.
  addItem: (input: NewItemInput) => Promise<SavedItem>;
  markWatched: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

// Small helper: throw the server's error message if a response isn't ok.
async function asJson(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return body;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the user's items once when the app mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await asJson(await fetch("/api/links"))) as SavedItem[];
        if (!cancelled) setItems(data);
      } catch {
        // If this fails (e.g. not signed in), the middleware will have already
        // redirected to /login; leave the list empty.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback(async (input: NewItemInput) => {
    const created = (await asJson(
      await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    )) as SavedItem;
    setItems((prev) => [created, ...prev]);
    return created;
  }, []);

  const markWatched = useCallback(async (id: string) => {
    const updated = (await asJson(
      await fetch(`/api/links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "watched" }),
      })
    )) as SavedItem;
    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await asJson(await fetch(`/api/links/${id}`, { method: "DELETE" }));
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const store = useMemo<Store>(
    () => ({
      items,
      loading,
      getItem: (id) => items.find((it) => it.id === id),
      addItem,
      markWatched,
      deleteItem,
    }),
    [items, loading, addItem, markWatched, deleteItem]
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used inside <StoreProvider>");
  }
  return store;
}
