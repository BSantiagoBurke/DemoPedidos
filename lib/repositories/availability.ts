import { pedidosKey, readJson, type KeyValueStore } from "@/lib/storage";

export interface AvailabilityRepository {
  /** Disponibilidad efectiva: lo que marcó el panel o, si no hay nada, el valor del JSON. */
  get(productoId: string, fallback: boolean): boolean;
  set(productoId: string, disponible: boolean): void;
  /** Solo los productos que el panel pisó. */
  overrides(): Record<string, boolean>;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

const isOverrides = (value: unknown): value is Record<string, boolean> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((v) => typeof v === "boolean");

export function createLocalAvailabilityRepository(slug: string, store: KeyValueStore): AvailabilityRepository {
  const key = pedidosKey(slug, "availability");
  const overrides = () => readJson(store, key, isOverrides) ?? {};
  return {
    get: (productoId, fallback) => overrides()[productoId] ?? fallback,
    set: (productoId, disponible) => store.set(key, JSON.stringify({ ...overrides(), [productoId]: disponible })),
    overrides,
    reset: () => store.remove(key),
    subscribe: (listener) => store.subscribe((changed) => changed === key && listener()),
  };
}
