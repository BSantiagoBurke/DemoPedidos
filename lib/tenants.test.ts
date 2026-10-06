import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/storage";
import { createLocalOrderRepository } from "@/lib/repositories/order";
import { createLocalAvailabilityRepository } from "@/lib/repositories/availability";
import { seedOrders } from "@/lib/seed/pedidos";
import { getPedidosTenant, listTenantSlugs } from "./tenants";

describe("tenants", () => {
  it("todos los tenants publicados son válidos", () => {
    const slugs = listTenantSlugs("pedidos");
    expect(slugs).toEqual(expect.arrayContaining(["pastas-demo", "empanadas-demo"]));
    for (const slug of slugs) expect(getPedidosTenant(slug)?.slug).toBe(slug);
  });
  it("no expone plantillas ni slugs raros", () => {
    expect(getPedidosTenant("_template-pedidos")).toBeNull();
    expect(getPedidosTenant("../package")).toBeNull();
    expect(getPedidosTenant("no-existe")).toBeNull();
  });
});

describe("datos semilla y repositorios", () => {
  const tenant = getPedidosTenant("empanadas-demo")!;
  const now = new Date("2026-10-06T21:00:00-03:00");

  it("genera entre 6 y 10 pedidos de hoy con totales correctos", () => {
    const orders = seedOrders(tenant, now);
    expect(orders.length).toBeGreaterThanOrEqual(6);
    expect(orders.length).toBeLessThanOrEqual(10);
    expect(new Set(orders.map((o) => o.status)).size).toBeGreaterThanOrEqual(4);
    for (const o of orders) {
      expect(o.items.length).toBeGreaterThan(0);
      expect(o.subtotal).toBe(o.items.reduce((s, i) => s + i.unitPrice * i.qty, 0));
      expect(o.total).toBe(o.subtotal + o.envio);
      expect(new Date(o.createdAt).getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("crea, cambia estado y reinicia", () => {
    const store = createMemoryStore();
    const repo = createLocalOrderRepository({
      slug: tenant.slug, store, sucursalIds: tenant.sucursales.map((s) => s.id), seed: () => seedOrders(tenant, now), now: () => now,
    });
    const seeded = repo.list().length;
    const created = repo.create({
      sucursalId: "yerba-buena", modalidad: "retiro", customerName: "Ana", customerPhone: "381 555 0000", medioPago: "Efectivo",
      items: [{ productoId: "pollo", name: "Pollo", variantLabels: ["Docena"], unitPrice: 8800, qty: 1 }], subtotal: 8800, envio: 0, total: 8800,
    });
    expect(created.id).toMatch(/^B-\d{4}$/);
    expect(created.status).toBe("nuevo");
    expect(repo.list()).toHaveLength(seeded + 1);
    expect(repo.updateStatus(created.id, "listo")?.status).toBe("listo");
    expect(repo.updateStatus("Z-0", "listo")).toBeNull();
    repo.reset();
    expect(repo.list()).toHaveLength(seeded);
  });

  it("la disponibilidad del panel pisa la del JSON", () => {
    const repo = createLocalAvailabilityRepository(tenant.slug, createMemoryStore());
    expect(repo.get("arabe", false)).toBe(false);
    repo.set("arabe", true);
    expect(repo.get("arabe", false)).toBe(true);
    repo.reset();
    expect(repo.get("arabe", false)).toBe(false);
  });
});
