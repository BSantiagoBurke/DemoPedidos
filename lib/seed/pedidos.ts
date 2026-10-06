import { addMinutes, max as maxDate } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { cartSubtotal, resolveLines, shippingCost, toOrderItems, type CartLine } from "@/lib/pedidos/cart";
import type { Order, OrderStatus, TenantPedidosConfig } from "@/lib/pedidos/schema";
import { TIMEZONE, zonedDateKey } from "@/lib/pedidos/schedule";

/** PRNG determinístico (mulberry32): la misma demo genera los mismos pedidos el mismo día. */
function rng(seedText: string) {
  let seed = 0;
  for (const ch of seedText) seed = (Math.imul(31, seed) + ch.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  "Lucía Fernández", "Martín Gómez", "Carla Ruiz", "Diego Paz", "Sofía Herrera",
  "Juan Pérez", "Valentina Díaz", "Tomás Medina", "Agustina Ledesma", "Nicolás Romero",
];
const STREETS = ["Av. Mate de Luna", "San Martín", "Laprida", "25 de Mayo", "Av. Aconquija", "Santiago del Estero", "Junín", "Crisóstomo Álvarez"];
const NOTES = ["sin cebolla", "bien cocidas", "con extra queso", "cortadas al medio"];
const REFERENCES = ["timbre B", "portón negro", "dpto 3", "frente a la plaza"];

/** Estados del más viejo al más nuevo: lo viejo ya se entregó, lo reciente recién entra. */
const STATUS_PLAN: OrderStatus[] = ["entregado", "entregado", "cancelado", "entregado", "entregado", "listo", "preparacion", "preparacion", "nuevo", "nuevo"];

export function seedOrders(tenant: TenantPedidosConfig, now: Date = new Date(), count = 8): Order[] {
  const n = Math.max(6, Math.min(10, count));
  const today = zonedDateKey(now);
  const random = rng(`${tenant.slug}:${today}`);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const startOfDay = fromZonedTime(`${today}T00:01:00`, TIMEZONE);
  const productos = tenant.productos.filter((p) => p.disponible);
  const statuses = STATUS_PLAN.slice(STATUS_PLAN.length - n);

  const orders: Order[] = [];
  // Del más viejo (hace ~4 h) al más nuevo (hace pocos minutos).
  let minutesAgo = 230 + Math.floor(random() * 20);
  for (let i = 0; i < n; i++) {
    const sucursalIndex = Math.floor(random() * tenant.sucursales.length);
    const sucursal = tenant.sucursales[sucursalIndex] ?? tenant.sucursales[0]!;
    const modalidad = tenant.modalidades.length > 1 ? (random() < 0.6 ? "delivery" : "retiro") : tenant.modalidades[0]!;
    const zona = modalidad === "delivery" ? pick(sucursal.zonas) : undefined;

    let lines: CartLine[] = [];
    const itemCount = 1 + Math.floor(random() * 3);
    for (let j = 0; j < itemCount && productos.length > 0; j++) {
      const producto = pick(productos);
      if (lines.some((l) => l.productoId === producto.id)) continue;
      const selections: Record<string, string> = {};
      for (const v of producto.variantes ?? []) {
        if (v.required) selections[v.id] = pick(v.options).id;
      }
      const note = random() < 0.15 ? pick(NOTES) : undefined;
      lines = [...lines, { key: `${producto.id}-${j}`, productoId: producto.id, selections, qty: 1 + Math.floor(random() * 2), note }];
    }

    const resolved = resolveLines(lines, tenant.productos);
    const subtotal = cartSubtotal(resolved);
    const envio = shippingCost(tenant, { modalidad, sucursalId: sucursal.id, zonaId: zona?.id });
    const createdAt = maxDate([addMinutes(now, -minutesAgo), startOfDay]);
    minutesAgo = Math.max(2, minutesAgo - (15 + Math.floor(random() * 25)));

    orders.push({
      id: `${String.fromCharCode(65 + sucursalIndex)}-${1001 + i}`,
      tenantSlug: tenant.slug,
      sucursalId: sucursal.id,
      modalidad,
      ...(zona ? { zonaId: zona.id, address: `${pick(STREETS)} ${100 + Math.floor(random() * 1900)}`, reference: pick(REFERENCES) } : {}),
      customerName: pick(CUSTOMERS),
      customerPhone: `381 555-${String(1000 + Math.floor(random() * 9000))}`,
      medioPago: pick(tenant.mediosPago),
      items: toOrderItems(resolved),
      subtotal,
      envio,
      total: subtotal + envio,
      status: statuses[i] ?? "nuevo",
      createdAt: createdAt.toISOString(),
    });
  }
  return orders;
}
