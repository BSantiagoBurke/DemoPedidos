import type { Order, OrderStatus } from "./schema";

export const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  nuevo: { label: "Nuevo", className: "bg-sky-100 text-sky-900 ring-sky-300" },
  preparacion: { label: "En preparación", className: "bg-amber-100 text-amber-900 ring-amber-300" },
  listo: { label: "Listo", className: "bg-emerald-100 text-emerald-900 ring-emerald-300" },
  entregado: { label: "Entregado", className: "bg-stone-200 text-stone-800 ring-stone-300" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-900 ring-red-300" },
};

const FLOW: Partial<Record<OrderStatus, OrderStatus>> = { nuevo: "preparacion", preparacion: "listo", listo: "entregado" };

/** Siguiente estado en el flujo normal, o null si el pedido ya está cerrado. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  return FLOW[status] ?? null;
}

/** Contadores del día. Los cancelados no suman. */
export function dayStats(orders: Order[]) {
  const valid = orders.filter((o) => o.status !== "cancelado");
  const total = valid.reduce((sum, o) => sum + o.total, 0);
  return { count: valid.length, total, average: valid.length ? Math.round(total / valid.length) : 0 };
}
