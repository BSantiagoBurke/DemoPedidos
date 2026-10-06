import type { Modalidad, OrderItem, Producto, TenantPedidosConfig } from "./schema";

/** varianteId -> optionId */
export type Selections = Record<string, string>;

export type CartLine = {
  key: string;
  productoId: string;
  selections: Selections;
  qty: number;
  note?: string;
};

export type ResolvedLine = {
  line: CartLine;
  producto: Producto;
  variantLabels: string[];
  unitPrice: number;
  total: number;
  available: boolean;
};

export const MAX_QTY = 99;

function clampQty(qty: number): number {
  return Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
}

export function unitPrice(producto: Producto, selections: Selections): number {
  let price = producto.price;
  for (const variante of producto.variantes ?? []) {
    const option = variante.options.find((o) => o.id === selections[variante.id]);
    if (option) price += option.priceDelta;
  }
  return price;
}

/** Precio más bajo posible eligiendo las variantes obligatorias ("Desde $X"). */
export function minPrice(producto: Producto): number {
  let price = producto.price;
  for (const variante of producto.variantes ?? []) {
    if (!variante.required) continue;
    price += Math.min(...variante.options.map((o) => o.priceDelta));
  }
  return price;
}

/** true si el precio final depende de la variante elegida. */
export function hasVariablePrice(producto: Producto): boolean {
  return (producto.variantes ?? []).some((v) => {
    const deltas = new Set(v.options.map((o) => o.priceDelta));
    return deltas.size > 1 || (!v.required && !deltas.has(0));
  });
}

export function missingRequired(producto: Producto, selections: Selections): string[] {
  return (producto.variantes ?? [])
    .filter((v) => v.required && !v.options.some((o) => o.id === selections[v.id]))
    .map((v) => v.id);
}

export function variantLabels(producto: Producto, selections: Selections): string[] {
  const labels: string[] = [];
  for (const variante of producto.variantes ?? []) {
    const option = variante.options.find((o) => o.id === selections[variante.id]);
    if (option) labels.push(option.label);
  }
  return labels;
}

export function lineKey(productoId: string, selections: Selections, note?: string): string {
  const sel = Object.keys(selections)
    .sort()
    .map((k) => `${k}=${selections[k]}`)
    .join("&");
  return `${productoId}|${sel}|${(note ?? "").trim()}`;
}

/** Agrega una línea; si ya existe una idéntica (mismo producto, variantes y nota) suma cantidades. */
export function addLine(lines: CartLine[], input: Omit<CartLine, "key">): CartLine[] {
  const note = input.note?.trim() || undefined;
  const key = lineKey(input.productoId, input.selections, note);
  const qty = clampQty(input.qty);
  if (qty === 0) return lines;
  const existing = lines.find((l) => l.key === key);
  if (existing) {
    return lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + qty) } : l));
  }
  return [...lines, { key, productoId: input.productoId, selections: input.selections, qty, note }];
}

export function setQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  const next = clampQty(qty);
  if (next === 0) return removeLine(lines, key);
  return lines.map((l) => (l.key === key ? { ...l, qty: next } : l));
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((l) => l.key !== key);
}

/**
 * Cruza el carrito con la carta actual. Descarta líneas cuyo producto ya no existe
 * o cuyas variantes obligatorias ya no son válidas (por ejemplo, si cambió el JSON).
 */
export function resolveLines(
  lines: CartLine[],
  productos: Producto[],
  isAvailable: (productoId: string) => boolean = () => true,
): ResolvedLine[] {
  const byId = new Map(productos.map((p) => [p.id, p]));
  const resolved: ResolvedLine[] = [];
  for (const line of lines) {
    const producto = byId.get(line.productoId);
    if (!producto || missingRequired(producto, line.selections).length > 0) continue;
    const price = unitPrice(producto, line.selections);
    resolved.push({
      line,
      producto,
      variantLabels: variantLabels(producto, line.selections),
      unitPrice: price,
      total: price * line.qty,
      available: isAvailable(producto.id),
    });
  }
  return resolved;
}

export function cartSubtotal(lines: ResolvedLine[]): number {
  return lines.reduce((sum, l) => sum + l.total, 0);
}

export function cartCount(lines: ResolvedLine[]): number {
  return lines.reduce((sum, l) => sum + l.line.qty, 0);
}

export type ShippingInput = { modalidad: Modalidad; sucursalId?: string; zonaId?: string };

/** Costo de envío: 0 en retiro o si todavía no se eligió zona. */
export function shippingCost(tenant: TenantPedidosConfig, input: ShippingInput): number {
  if (input.modalidad !== "delivery" || !input.zonaId) return 0;
  const sucursal = tenant.sucursales.find((s) => s.id === input.sucursalId);
  const zona = sucursal?.zonas.find((z) => z.id === input.zonaId);
  return zona?.costoEnvio ?? 0;
}

/** Cuánto falta para el pedido mínimo (sobre el subtotal, sin envío). 0 = alcanzado. */
export function missingForMinimum(subtotal: number, pedidoMinimo: number): number {
  return Math.max(0, pedidoMinimo - subtotal);
}

export function meetsMinimum(subtotal: number, pedidoMinimo: number): boolean {
  return missingForMinimum(subtotal, pedidoMinimo) === 0;
}

export function orderTotals(subtotal: number, envio: number) {
  return { subtotal, envio, total: subtotal + envio };
}

export function toOrderItems(lines: ResolvedLine[]): OrderItem[] {
  return lines.map((l) => ({
    productoId: l.producto.id,
    name: l.producto.name,
    variantLabels: l.variantLabels,
    unitPrice: l.unitPrice,
    qty: l.line.qty,
    ...(l.line.note ? { note: l.line.note } : {}),
  }));
}
