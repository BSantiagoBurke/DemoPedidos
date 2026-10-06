import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { WeekHours } from "./schema";

export const TIMEZONE = "America/Argentina/Tucuman";

export type TimeWindow = { start: Date; end: Date };

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** "2026-10-06" + offset días, en aritmética de calendario (sin horas). */
function shiftDate(dateKey: string, days: number): string {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayOfWeek(dateKey: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [y = 0, m = 1, d = 1] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function zonedDateKey(date: Date, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Ventanas de atención desde ayer hasta dentro de `daysAhead` días.
 * Si `close` <= `open`, la ventana cruza la medianoche (ej. 19:00 a 00:30).
 */
export function openingWindows(hours: WeekHours, now: Date, daysAhead = 7, tz = TIMEZONE): TimeWindow[] {
  const today = zonedDateKey(now, tz);
  const windows: TimeWindow[] = [];
  for (let offset = -1; offset <= daysAhead; offset++) {
    const date = shiftDate(today, offset);
    const day = hours[String(dayOfWeek(date)) as keyof WeekHours];
    if (!day) continue;
    const crosses = toMinutes(day.close) <= toMinutes(day.open);
    const start = fromZonedTime(`${date}T${day.open}:00`, tz);
    const end = fromZonedTime(`${crosses ? shiftDate(date, 1) : date}T${day.close}:00`, tz);
    windows.push({ start, end });
  }
  return windows;
}

export function currentWindow(hours: WeekHours, now: Date, tz = TIMEZONE): TimeWindow | null {
  return openingWindows(hours, now, 0, tz).find((w) => w.start <= now && now < w.end) ?? null;
}

export function isOpenAt(hours: WeekHours, now: Date, tz = TIMEZONE): boolean {
  return currentWindow(hours, now, tz) !== null;
}

/** Próxima ventana que empieza después de `now`. null si el local no tiene horarios cargados. */
export function nextOpening(hours: WeekHours, now: Date, tz = TIMEZONE): TimeWindow | null {
  return openingWindows(hours, now, 7, tz).find((w) => w.start > now) ?? null;
}

/**
 * Horarios para programar un pedido dentro de la próxima apertura, cada `stepMin` minutos.
 * El último turno es `stepMin` antes del cierre.
 */
export function scheduleSlots(hours: WeekHours, now: Date, stepMin = 30, tz = TIMEZONE): Date[] {
  const window = nextOpening(hours, now, tz);
  if (!window) return [];
  const slots: Date[] = [];
  const stepMs = stepMin * 60_000;
  for (let t = window.start.getTime(); t + stepMs <= window.end.getTime(); t += stepMs) {
    slots.push(new Date(t));
  }
  return slots;
}

export function formatTime(date: Date, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "HH:mm");
}

/** "hoy a las 19:00", "mañana a las 11:00", "el sábado a las 11:00". */
export function describeMoment(date: Date, now: Date, tz = TIMEZONE): string {
  const target = zonedDateKey(date, tz);
  const today = zonedDateKey(now, tz);
  const time = formatTime(date, tz);
  if (target === today) return `hoy a las ${time}`;
  if (target === shiftDate(today, 1)) return `mañana a las ${time}`;
  return `el ${DAY_NAMES[dayOfWeek(target)]} a las ${time}`;
}

export function isSameZonedDay(a: Date, b: Date, tz = TIMEZONE): boolean {
  return zonedDateKey(a, tz) === zonedDateKey(b, tz);
}

/** Abierto si al menos una sucursal está abierta. */
export function anyOpen(hoursList: WeekHours[], now: Date, tz = TIMEZONE): boolean {
  return hoursList.some((h) => isOpenAt(h, now, tz));
}

/** Próxima apertura entre varias sucursales. */
export function earliestOpening(hoursList: WeekHours[], now: Date, tz = TIMEZONE): TimeWindow | null {
  const all = hoursList.map((h) => nextOpening(h, now, tz)).filter((w): w is TimeWindow => w !== null);
  all.sort((a, b) => a.start.getTime() - b.start.getTime());
  return all[0] ?? null;
}

/** Horario de hoy de una sucursal, ej. "09:30 a 22:00", o null si hoy no abre. */
export function todayHoursLabel(hours: WeekHours, now: Date, tz = TIMEZONE): string | null {
  const dow = dayOfWeek(zonedDateKey(now, tz));
  const day = hours[String(dow) as keyof WeekHours];
  return day ? `${day.open} a ${day.close}` : null;
}

export type StoreStatus =
  | { open: true; closesAt: Date }
  | { open: false; opensAt: Date | null };

export function storeStatus(hours: WeekHours, now: Date, tz = TIMEZONE): StoreStatus {
  const current = currentWindow(hours, now, tz);
  if (current) return { open: true, closesAt: current.end };
  return { open: false, opensAt: nextOpening(hours, now, tz)?.start ?? null };
}
