import { formatARS } from "./format";
import type { Order, TenantPedidosConfig } from "./pedidos/schema";
import { describeMoment } from "./pedidos/schedule";

/** Límite práctico para links wa.me (algunos navegadores y WhatsApp cortan URLs largas). */
export const WHATSAPP_URL_LIMIT = 2000;

/** Link genérico a un chat de WhatsApp. Compartido con la demo de turnos. */
export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Evita que el texto que escribe el cliente rompa el formato de WhatsApp (*negrita*, _cursiva_, ~tachado~). */
function clean(text: string): string {
  return text.replace(/[*_~`]/g, "").replace(/\s+\n/g, "\n").trim();
}

function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

type MessageOptions = {
  /** Largo máximo de notas y referencia. Infinity = sin recorte, 0 = se omiten. */
  noteLimit?: number;
  now?: Date;
};

export function buildOrderMessage(order: Order, tenant: TenantPedidosConfig, options: MessageOptions = {}): string {
  const { noteLimit = Infinity, now = new Date() } = options;
  const sucursal = tenant.sucursales.find((s) => s.id === order.sucursalId);
  const zona = sucursal?.zonas.find((z) => z.id === order.zonaId);

  const lines: string[] = [];
  lines.push(`*Nuevo pedido ${order.id}* 🛒`);
  if (sucursal) lines.push(`Sucursal: ${sucursal.name}`);
  lines.push(order.modalidad === "delivery" ? `Modalidad: Delivery${zona ? ` (${zona.name})` : ""}` : "Modalidad: Retiro en el local");
  if (order.scheduledFor) lines.push(`*Programado para ${describeMoment(new Date(order.scheduledFor), now)}*`);
  lines.push("");

  for (const item of order.items) {
    const variants = item.variantLabels.length > 0 ? ` (${item.variantLabels.join(", ")})` : "";
    lines.push(`${item.qty}x ${item.name}${variants} ${formatARS(item.unitPrice * item.qty)}`);
    const note = item.note ? clean(item.note) : "";
    if (note && noteLimit > 0) lines.push(`   Nota: ${cut(note, noteLimit)}`);
  }
  lines.push("");

  lines.push(`Subtotal: ${formatARS(order.subtotal)}`);
  if (order.modalidad === "delivery") lines.push(`Envío: ${formatARS(order.envio)}`);
  lines.push(`*Total: ${formatARS(order.total)}*`);
  lines.push("");

  lines.push(`Nombre: ${clean(order.customerName)}`);
  lines.push(`Tel: ${clean(order.customerPhone)}`);
  if (order.modalidad === "delivery" && order.address) {
    lines.push(`Dirección: ${clean(order.address)}`);
    const reference = order.reference ? clean(order.reference) : "";
    if (reference && noteLimit > 0) lines.push(`Referencia: ${cut(reference, noteLimit)}`);
  }
  lines.push(`Pago: ${order.medioPago}`);

  return lines.join("\n");
}

/**
 * Link wa.me al número de la sucursal elegida. Si supera el límite, recorta
 * notas y referencia en pasos sucesivos. Los productos nunca se recortan.
 */
export function buildOrderWhatsAppUrl(order: Order, tenant: TenantPedidosConfig, now = new Date()): string {
  const sucursal = tenant.sucursales.find((s) => s.id === order.sucursalId);
  if (!sucursal) throw new Error(`Sucursal inexistente: ${order.sucursalId}`);

  let url = "";
  for (const noteLimit of [Infinity, 80, 40, 20, 0]) {
    url = buildWhatsAppLink(sucursal.whatsapp, buildOrderMessage(order, tenant, { noteLimit, now }));
    if (url.length <= WHATSAPP_URL_LIMIT) return url;
  }
  return url;
}
