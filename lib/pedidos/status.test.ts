import { describe, expect, it } from "vitest";
import type { Order } from "./schema";
import { dayStats, nextStatus } from "./status";

describe("estados", () => {
  it("avanza en el flujo normal", () => {
    expect(nextStatus("nuevo")).toBe("preparacion");
    expect(nextStatus("listo")).toBe("entregado");
    expect(nextStatus("entregado")).toBeNull();
    expect(nextStatus("cancelado")).toBeNull();
  });
  it("calcula los contadores sin cancelados", () => {
    const o = (total: number, status: Order["status"]) => ({ total, status }) as Order;
    expect(dayStats([o(10000, "nuevo"), o(5000, "entregado"), o(9000, "cancelado")])).toEqual({ count: 2, total: 15000, average: 7500 });
    expect(dayStats([])).toEqual({ count: 0, total: 0, average: 0 });
  });
});
