import type { Order, OrderStatus } from "@/lib/pedidos/schema";
import { pedidosKey, readJson, type KeyValueStore } from "@/lib/storage";

export type NewOrder = Omit<Order, "id" | "status" | "createdAt" | "tenantSlug">;

export interface OrderRepository {
  /** Pedidos guardados, del más nuevo al más viejo. La primera vez genera los datos semilla. */
  list(): Order[];
  create(input: NewOrder): Order;
  updateStatus(id: string, status: OrderStatus): Order | null;
  /** Vuelve al estado inicial (datos semilla). */
  reset(): void;
  subscribe(listener: () => void): () => void;
}

const isOrderArray = (value: unknown): value is Order[] =>
  Array.isArray(value) && value.every((o) => typeof o === "object" && o !== null && "id" in o && "items" in o);

/** "A-1042": la letra identifica la sucursal (A = primera), el número es correlativo. */
export function nextOrderId(existing: Order[], sucursalIndex: number): string {
  const letter = String.fromCharCode(65 + Math.max(0, Math.min(25, sucursalIndex)));
  const max = existing.reduce((acc, o) => Math.max(acc, Number(o.id.split("-")[1]) || 0), 1000);
  return `${letter}-${max + 1}`;
}

type Options = {
  slug: string;
  store: KeyValueStore;
  sucursalIds: string[];
  seed: () => Order[];
  now?: () => Date;
};

export function createLocalOrderRepository({ slug, store, sucursalIds, seed, now = () => new Date() }: Options): OrderRepository {
  const key = pedidosKey(slug, "orders");
  const sort = (orders: Order[]) => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const save = (orders: Order[]) => store.set(key, JSON.stringify(orders));

  const read = (): Order[] => {
    const stored = readJson(store, key, isOrderArray);
    if (stored) return stored;
    const seeded = seed();
    save(seeded);
    return seeded;
  };

  return {
    list: () => sort(read()),
    create(input) {
      const orders = read();
      const order: Order = {
        ...input,
        id: nextOrderId(orders, sucursalIds.indexOf(input.sucursalId)),
        tenantSlug: slug,
        status: "nuevo",
        createdAt: now().toISOString(),
      };
      save([...orders, order]);
      return order;
    },
    updateStatus(id, status) {
      const orders = read();
      const current = orders.find((o) => o.id === id);
      if (!current) return null;
      const updated: Order = { ...current, status };
      save(orders.map((o) => (o.id === id ? updated : o)));
      return updated;
    },
    reset: () => save(seed()),
    subscribe: (listener) => store.subscribe((changed) => changed === key && listener()),
  };
}
