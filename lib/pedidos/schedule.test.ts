import { describe, expect, it } from "vitest";
import { empanadasTenant as e, pastasTenant as t } from "@/tests/fixtures";
import { anyOpen, describeMoment, earliestOpening, formatTime, isOpenAt, nextOpening, scheduleSlots } from "./schedule";

// Tucumán es UTC-3 todo el año. 2026-10-06 es martes.
const at = (local: string) => new Date(`${local}-03:00`);
const pastas = t.sucursales[0]!.hours;
const yb = e.sucursales.find((s) => s.id === "yerba-buena")!.hours;

describe("abierto / cerrado", () => {
  it("respeta apertura y cierre del día", () => {
    expect(isOpenAt(pastas, at("2026-10-06T09:29:00"))).toBe(false);
    expect(isOpenAt(pastas, at("2026-10-06T09:30:00"))).toBe(true);
    expect(isOpenAt(pastas, at("2026-10-06T21:59:00"))).toBe(true);
    expect(isOpenAt(pastas, at("2026-10-06T22:00:00"))).toBe(false);
  });
  it("cierra los días sin horario (lunes)", () => {
    expect(isOpenAt(pastas, at("2026-10-05T12:00:00"))).toBe(false);
  });
  it("soporta horarios que cruzan la medianoche", () => {
    expect(isOpenAt(yb, at("2026-10-06T23:50:00"))).toBe(true);
    expect(isOpenAt(yb, at("2026-10-07T00:20:00"))).toBe(true); // ventana del martes
    expect(isOpenAt(yb, at("2026-10-07T00:40:00"))).toBe(false);
    // Domingo 19:00 a 00:30 -> lunes 00:15 sigue abierto aunque el lunes no abra.
    expect(isOpenAt(yb, at("2026-10-05T00:15:00"))).toBe(true);
  });
  it("evalúa varias sucursales", () => {
    const all = e.sucursales.map((s) => s.hours);
    expect(anyOpen(all, at("2026-10-06T08:00:00"))).toBe(false);
    expect(anyOpen(all, at("2026-10-06T12:00:00"))).toBe(true);
    expect(formatTime(earliestOpening(all, at("2026-10-06T08:00:00"))!.start)).toBe("10:00");
  });
});

describe("próxima apertura y programación", () => {
  it("encuentra la próxima apertura saltando días cerrados", () => {
    const next = nextOpening(pastas, at("2026-10-04T15:00:00"))!; // domingo después del cierre
    expect(next.start.toISOString()).toBe(at("2026-10-06T09:30:00").toISOString()); // lunes cerrado -> martes
  });
  it("genera turnos de 30 minutos dentro de la ventana", () => {
    const slots = scheduleSlots(pastas, at("2026-10-06T23:00:00"));
    expect(formatTime(slots[0]!)).toBe("09:30");
    expect(formatTime(slots.at(-1)!)).toBe("21:30");
    expect(slots).toHaveLength(25);
  });
  it("describe el momento en lenguaje natural", () => {
    const now = at("2026-10-06T23:00:00");
    expect(describeMoment(at("2026-10-06T23:30:00"), now)).toBe("hoy a las 23:30");
    expect(describeMoment(at("2026-10-07T09:30:00"), now)).toBe("mañana a las 09:30");
    expect(describeMoment(at("2026-10-10T11:00:00"), now)).toBe("el sábado a las 11:00");
  });
});
