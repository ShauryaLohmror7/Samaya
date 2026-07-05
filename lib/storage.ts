import { get, set, del } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/**
 * Thin repository layer: everything the app persists goes through this
 * StateStorage adapter backed by IndexedDB (idb-keyval).
 *
 * This is the seam for a future sync layer — a Supabase-backed adapter
 * (or a composite local+remote one) can replace `createIdbStorage()`
 * without touching any feature code.
 */
export function createIdbStorage(): StateStorage {
  // During SSR/prerender there is no IndexedDB; persist must no-op there.
  if (typeof indexedDB === "undefined") {
    return {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    };
  }
  return {
    getItem: async (name) => {
      const value = await get<string>(name);
      return value ?? null;
    },
    setItem: async (name, value) => {
      await set(name, value);
    },
    removeItem: async (name) => {
      await del(name);
    },
  };
}
