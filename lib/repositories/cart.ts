import type { CartLine } from "@/lib/pedidos/cart";
import { pedidosKey, readJson, type KeyValueStore } from "@/lib/storage";

export interface CartRepository {
  load(): CartLine[];
  save(lines: CartLine[]): void;
  clear(): void;
}

const isCartLines = (value: unknown): value is CartLine[] =>
  Array.isArray(value) &&
  value.every(
    (l) =>
      typeof l === "object" &&
      l !== null &&
      typeof (l as CartLine).key === "string" &&
      typeof (l as CartLine).productoId === "string" &&
      typeof (l as CartLine).qty === "number" &&
      typeof (l as CartLine).selections === "object",
  );

export function createLocalCartRepository(slug: string, store: KeyValueStore): CartRepository {
  const key = pedidosKey(slug, "cart");
  return {
    load: () => readJson(store, key, isCartLines) ?? [],
    save: (lines) => store.set(key, JSON.stringify(lines)),
    clear: () => store.remove(key),
  };
}
