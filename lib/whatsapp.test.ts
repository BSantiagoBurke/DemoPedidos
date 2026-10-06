import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/pedidos/schema";
import { empanadasTenant as e } from "@/tests/fixtures";
import { buildOrderMessage, buildOrderWhatsAppUrl, WHATSAPP_URL_LIMIT } from "./whatsapp";

const order: Order = {
  id: "A-1042",
  tenantSlug: "empanadas-demo",
  sucursalId: "centro",
  modalidad: "delivery",
  zonaId: "barrio-norte",
  address: "Av. Mate de Luna 1234",
  reference: "timbre B",
  customerName: "Juan Pérez",
  customerPhone: "381 555-1234",
  medioPago: "Transferencia",
  items: [
    { productoId: "carne-cuchillo", name: "Carne cortada a cuchillo", variantLabels: ["Docena"], unitPrice: 9000, qty: 2 },
    { productoId: "humita-chala", name: "Humita en chala", variantLabels: [], unitPrice: 3800, qty: 1, note: "sin *picante*" },
  ],
  subtotal: 21800,
  envio: 1800,
  total: 23600,
  status: "nuevo",
  createdAt: "2026-10-06T15:00:00.000Z",
};

describe("mensaje de WhatsApp", () => {
  it("respeta el formato acordado", () => {
    expect(buildOrderMessage(order, e)).toBe(
      [
        "*Nuevo pedido A-1042* 🛒",
        "Sucursal: Centro",
        "Modalidad: Delivery (Barrio Norte)",
        "",
        "2x Carne cortada a cuchillo (Docena) $18.000",
        "1x Humita en chala $3.800",
        "   Nota: sin picante",
        "",
        "Subtotal: $21.800",
        "Envío: $1.800",
        "*Total: $23.600*",
        "",
        "Nombre: Juan Pérez",
        "Tel: 381 555-1234",
        "Dirección: Av. Mate de Luna 1234",
        "Referencia: timbre B",
        "Pago: Transferencia",
      ].join("\n"),
    );
  });

  it("en retiro no muestra envío ni dirección", () => {
    const msg = buildOrderMessage({ ...order, modalidad: "retiro", envio: 0, total: 21800 }, e);
    expect(msg).toContain("Modalidad: Retiro en el local");
    expect(msg).not.toContain("Envío");
    expect(msg).not.toContain("Dirección");
  });

  it("indica si el pedido está programado", () => {
    const msg = buildOrderMessage({ ...order, scheduledFor: "2026-10-07T12:30:00.000Z" }, e, { now: new Date("2026-10-06T23:00:00-03:00") });
    expect(msg).toContain("*Programado para mañana a las 09:30*");
  });

  it("usa el WhatsApp de la sucursal elegida", () => {
    expect(buildOrderWhatsAppUrl(order, e)).toMatch(/^https:\/\/wa\.me\/5493815550201\?text=/);
    expect(buildOrderWhatsAppUrl({ ...order, sucursalId: "yerba-buena" }, e)).toMatch(/^https:\/\/wa\.me\/5493815550202\?/);
  });

  it("recorta notas largas pero nunca productos", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      productoId: "pollo", name: `Pollo ${i}`, variantLabels: ["Docena"], unitPrice: 8800, qty: 1,
      note: "una nota muy larga que se repite para inflar el mensaje ".repeat(4),
    }));
    const url = buildOrderWhatsAppUrl({ ...order, items }, e);
    expect(url.length).toBeLessThanOrEqual(WHATSAPP_URL_LIMIT);
    const text = decodeURIComponent(url.split("?text=")[1]!);
    for (let i = 0; i < 12; i++) expect(text).toContain(`1x Pollo ${i} (Docena)`);
  });
});
