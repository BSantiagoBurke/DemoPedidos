/**
 * Acceso seguro a localStorage / sessionStorage.
 * - Envuelve cada lectura y escritura en try/catch (modo privado, cuota llena, SSR).
 * - Si el storage no está disponible, cae a un Map en memoria.
 * - Notifica cambios dentro de la misma pestaña y entre pestañas (evento "storage").
 * Ningún componente debería usar window.localStorage directamente: pasan por los repositorios.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  subscribe(listener: (key: string) => void): () => void;
}

type Kind = "local" | "session";

function nativeStorage(kind: Kind): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = "__beecode_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function createSafeStore(kind: Kind): KeyValueStore {
  const memory = new Map<string, string>();
  const listeners = new Set<(key: string) => void>();
  let cached: Storage | null | undefined;
  const storage = () => (cached === undefined ? (cached = nativeStorage(kind)) : cached);
  const emit = (key: string) => listeners.forEach((l) => l(key));

  return {
    get(key) {
      try {
        const s = storage();
        if (s) return s.getItem(key);
      } catch {
        /* sigue al fallback */
      }
      return memory.get(key) ?? null;
    },
    set(key, value) {
      memory.set(key, value);
      try {
        storage()?.setItem(key, value);
      } catch {
        /* queda en memoria */
      }
      emit(key);
    },
    remove(key) {
      memory.delete(key);
      try {
        storage()?.removeItem(key);
      } catch {
        /* nada */
      }
      emit(key);
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key) listener(e.key);
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}

let local: KeyValueStore | null = null;
let session: KeyValueStore | null = null;
export const localStore = () => (local ??= createSafeStore("local"));
export const sessionStore = () => (session ??= createSafeStore("session"));

/** Store en memoria pura, útil para tests. */
export function createMemoryStore(): KeyValueStore {
  const memory = new Map<string, string>();
  const listeners = new Set<(key: string) => void>();
  return {
    get: (key) => memory.get(key) ?? null,
    set: (key, value) => {
      memory.set(key, value);
      listeners.forEach((l) => l(key));
    },
    remove: (key) => {
      memory.delete(key);
      listeners.forEach((l) => l(key));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function readJson<T>(store: KeyValueStore, key: string, guard: (value: unknown) => value is T): T | null {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const pedidosKey = (slug: string, name: string) => `beecode:pedidos:${slug}:${name}`;
