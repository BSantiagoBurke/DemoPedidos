import { describe, expect, it } from "vitest";
import { pastasTenant as t, empanadasTenant as e } from "@/tests/fixtures";
import {
  addLine, cartCount, cartSubtotal, hasVariablePrice, meetsMinimum, minPrice, missingForMinimum,
  missingRequired, removeLine, resolveLines, setQty, shippingCost, toOrderItems, unitPrice, type CartLine,
} from "./cart";

const noquis = t.productos.find((p) => p.id === "noquis")!;
const sorrentinos = t.productos.find((p) => p.id === "sorrentinos")!;
const fileto = t.productos.find((p) => p.id === "salsa-fileto")!;

describe("precios", () => {
  it("suma el delta de la variante elegida", () => {
    expect(unitPrice(noquis, { tamano: "medio" })).toBe(4200);
    expect(unitPrice(noquis, { tamano: "kilo" })).toBe(7500);
    expect(unitPrice(sorrentinos, { relleno: "cuatro-quesos" })).toBe(9500);
  });
  it("calcula el precio 'desde' y si es variable", () => {
    expect(minPrice(noquis)).toBe(4200);
    expect(hasVariablePrice(noquis)).toBe(true);
    expect(hasVariablePrice(fileto)).toBe(false);
    const gaseosa = e.productos.find((p) => p.id === "gaseosa")!;
    expect(hasVariablePrice(gaseosa)).toBe(false);
  });
  it("detecta variantes obligatorias faltantes", () => {
    expect(missingRequired(noquis, {})).toEqual(["tamano"]);
    expect(missingRequired(noquis, { tamano: "inexistente" })).toEqual(["tamano"]);
    expect(missingRequired(noquis, { tamano: "kilo" })).toEqual([]);
  });
});

describe("carrito", () => {
  const base = (): CartLine[] => {
    let lines: CartLine[] = [];
    lines = addLine(lines, { productoId: "noquis", selections: { tamano: "kilo" }, qty: 1 });
    lines = addLine(lines, { productoId: "salsa-fileto", selections: {}, qty: 2, note: "  " });
    return lines;
  };

  it("agrupa líneas idénticas y separa las que tienen otra nota", () => {
    let lines = base();
    lines = addLine(lines, { productoId: "noquis", selections: { tamano: "kilo" }, qty: 2 });
    expect(lines).toHaveLength(2);
    expect(lines[0]!.qty).toBe(3);
    lines = addLine(lines, { productoId: "noquis", selections: { tamano: "kilo" }, qty: 1, note: "sin salsa" });
    expect(lines).toHaveLength(3);
  });

  it("calcula subtotal y cantidad", () => {
    const resolved = resolveLines(base(), t.productos);
    expect(cartSubtotal(resolved)).toBe(7500 + 3200 * 2);
    expect(cartCount(resolved)).toBe(3);
  });

  it("edita cantidad y elimina en 0", () => {
    const lines = base();
    const key = lines[1]!.key;
    expect(setQty(lines, key, 5).find((l) => l.key === key)!.qty).toBe(5);
    expect(setQty(lines, key, 0)).toHaveLength(1);
    expect(removeLine(lines, key)).toHaveLength(1);
    expect(setQty(lines, key, 500).find((l) => l.key === key)!.qty).toBe(99);
  });

  it("descarta líneas de productos inexistentes o con variantes inválidas", () => {
    const lines: CartLine[] = [
      ...base(),
      { key: "x", productoId: "no-existe", selections: {}, qty: 1 },
      { key: "y", productoId: "noquis", selections: {}, qty: 1 },
    ];
    expect(resolveLines(lines, t.productos)).toHaveLength(2);
  });

  it("marca agotados según la disponibilidad", () => {
    const resolved = resolveLines(base(), t.productos, (id) => id !== "noquis");
    expect(resolved.find((r) => r.producto.id === "noquis")!.available).toBe(false);
  });

  it("genera items de pedido", () => {
    const items = toOrderItems(resolveLines(base(), t.productos));
    expect(items[0]).toEqual({ productoId: "noquis", name: "Ñoquis de papa", variantLabels: ["1 kg"], unitPrice: 7500, qty: 1 });
    expect(items[1]).not.toHaveProperty("note");
  });
});

describe("envío y mínimo", () => {
  it("cobra la zona de la sucursal elegida", () => {
    expect(shippingCost(e, { modalidad: "delivery", sucursalId: "yerba-buena", zonaId: "san-javier" })).toBe(3000);
    expect(shippingCost(e, { modalidad: "delivery", sucursalId: "centro", zonaId: "san-javier" })).toBe(0);
  });
  it("no cobra envío en retiro ni sin zona", () => {
    expect(shippingCost(e, { modalidad: "retiro", sucursalId: "centro", zonaId: "microcentro" })).toBe(0);
    expect(shippingCost(e, { modalidad: "delivery", sucursalId: "centro" })).toBe(0);
  });
  it("aplica el pedido mínimo sobre el subtotal", () => {
    expect(meetsMinimum(7999, 8000)).toBe(false);
    expect(missingForMinimum(5000, 8000)).toBe(3000);
    expect(meetsMinimum(8000, 8000)).toBe(true);
    expect(meetsMinimum(0, 0)).toBe(true);
  });
});
