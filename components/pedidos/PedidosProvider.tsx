"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addLine, cartCount, cartSubtotal, removeLine, resolveLines, setQty,
  type CartLine, type ResolvedLine,
} from "@/lib/pedidos/cart";
import type { TenantPedidosConfig } from "@/lib/pedidos/schema";
import { createLocalAvailabilityRepository, type AvailabilityRepository } from "@/lib/repositories/availability";
import { createLocalCartRepository, type CartRepository } from "@/lib/repositories/cart";
import { createLocalOrderRepository, type OrderRepository } from "@/lib/repositories/order";
import { seedOrders } from "@/lib/seed/pedidos";
import { localStore } from "@/lib/storage";

type Repositories = {
  orders: OrderRepository;
  availability: AvailabilityRepository;
  cart: CartRepository;
};

type PedidosContextValue = {
  tenant: TenantPedidosConfig;
  repos: Repositories;
  /** false hasta leer el storage del navegador (evita parpadeos de hidratación). */
  hydrated: boolean;
  /** Hora actual, se actualiza cada 30 s. null durante el render del servidor. */
  now: Date | null;
  isAvailable: (productoId: string) => boolean;
  cart: {
    lines: ResolvedLine[];
    count: number;
    subtotal: number;
    add: (input: Omit<CartLine, "key">) => void;
    setQty: (key: string, qty: number) => void;
    remove: (key: string) => void;
    clear: () => void;
  };
};

const PedidosContext = createContext<PedidosContextValue | null>(null);

export function usePedidos(): PedidosContextValue {
  const value = useContext(PedidosContext);
  if (!value) throw new Error("usePedidos debe usarse dentro de <PedidosProvider>");
  return value;
}

function createRepositories(tenant: TenantPedidosConfig): Repositories {
  const store = localStore();
  return {
    orders: createLocalOrderRepository({
      slug: tenant.slug,
      store,
      sucursalIds: tenant.sucursales.map((s) => s.id),
      seed: () => seedOrders(tenant),
    }),
    availability: createLocalAvailabilityRepository(tenant.slug, store),
    cart: createLocalCartRepository(tenant.slug, store),
  };
}

export function PedidosProvider({ tenant, children }: { tenant: TenantPedidosConfig; children: React.ReactNode }) {
  const repos = useMemo(() => createRepositories(tenant), [tenant]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [rawLines, setRawLines] = useState<CartLine[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setRawLines(repos.cart.load());
    setOverrides(repos.availability.overrides());
    setNow(new Date());
    setHydrated(true);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    const unsubscribe = repos.availability.subscribe(() => setOverrides(repos.availability.overrides()));
    return () => {
      window.clearInterval(tick);
      unsubscribe();
    };
  }, [repos]);

  const isAvailable = useCallback(
    (productoId: string) => {
      const producto = tenant.productos.find((p) => p.id === productoId);
      return overrides[productoId] ?? producto?.disponible ?? false;
    },
    [overrides, tenant.productos],
  );

  const update = useCallback(
    (fn: (lines: CartLine[]) => CartLine[]) => {
      setRawLines((prev) => {
        const next = fn(prev);
        repos.cart.save(next);
        return next;
      });
    },
    [repos],
  );

  const cart = useMemo(() => {
    const lines = resolveLines(rawLines, tenant.productos, isAvailable);
    return {
      lines,
      count: cartCount(lines),
      subtotal: cartSubtotal(lines),
      add: (input: Omit<CartLine, "key">) => update((l) => addLine(l, input)),
      setQty: (key: string, qty: number) => update((l) => setQty(l, key, qty)),
      remove: (key: string) => update((l) => removeLine(l, key)),
      clear: () => update(() => []),
    };
  }, [rawLines, tenant.productos, isAvailable, update]);

  const value = useMemo(
    () => ({ tenant, repos, hydrated, now, isAvailable, cart }),
    [tenant, repos, hydrated, now, isAvailable, cart],
  );

  return <PedidosContext.Provider value={value}>{children}</PedidosContext.Provider>;
}
