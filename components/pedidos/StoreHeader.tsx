"use client";

import Image from "next/image";
import { formatARS } from "@/lib/format";
import { anyOpen, describeMoment, earliestOpening, storeStatus, todayHoursLabel, formatTime } from "@/lib/pedidos/schedule";
import { usePedidos } from "./PedidosProvider";

export function mapsUrl(address: string, override?: string): string {
  return override ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function StatusBadge() {
  const { tenant, now } = usePedidos();
  if (!now) return <span className="inline-block h-7 w-24 animate-pulse rounded-full bg-line" aria-hidden="true" />;
  const hours = tenant.sucursales.map((s) => s.hours);
  const open = anyOpen(hours, now);
  let detail = "";
  if (open && tenant.sucursales.length === 1) {
    const status = storeStatus(hours[0]!, now);
    if (status.open) detail = `hasta las ${formatTime(status.closesAt)}`;
  } else if (!open) {
    const next = earliestOpening(hours, now);
    if (next) detail = `abre ${describeMoment(next.start, now)}`;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${open ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
      <span className={`size-2 rounded-full ${open ? "bg-emerald-600" : "bg-red-600"}`} aria-hidden="true" />
      {open ? "Abierto" : "Cerrado"}
      {detail && <span className="font-normal">· {detail}</span>}
    </span>
  );
}

export function StoreHeader() {
  const { tenant, now } = usePedidos();
  const [minT, maxT] = tenant.tiempoEstimadoMin;
  const modalidades = tenant.modalidades.length === 2 ? "Delivery y retiro" : tenant.modalidades[0] === "delivery" ? "Solo delivery" : "Solo retiro";

  return (
    <header>
      <div className="h-24 bg-primary" />
      <div className="mx-auto -mt-12 max-w-2xl px-4">
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src={tenant.logo} alt={`Logo de ${tenant.name}`} width={64} height={64} priority unoptimized={tenant.logo.endsWith(".svg")} className="size-16 shrink-0 rounded-full border-4 border-surface object-cover shadow-sm" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{tenant.name}</h1>
              {tenant.tagline && <p className="text-sm text-muted">{tenant.tagline}</p>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <li><span aria-hidden="true">⏱ </span>{minT}–{maxT} min</li>
            <li><span aria-hidden="true">🛵 </span>{modalidades}</li>
            {tenant.pedidoMinimo > 0 && <li>Pedido mínimo {formatARS(tenant.pedidoMinimo)}</li>}
          </ul>
          <details className="group mt-3 border-t border-line pt-2">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold">
              {tenant.sucursales.length === 1 ? "Dirección y horarios" : `Nuestras ${tenant.sucursales.length} sucursales`}
              <span className="transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <ul className="flex flex-col gap-3 pb-1 text-sm">
              {tenant.sucursales.map((s) => {
                const today = now ? todayHoursLabel(s.hours, now) : null;
                const open = now ? storeStatus(s.hours, now).open : null;
                return (
                  <li key={s.id}>
                    <p className="font-semibold">
                      {s.name}
                      {open !== null && <span className={`ml-2 text-xs font-medium ${open ? "text-emerald-700" : "text-red-700"}`}>{open ? "Abierta" : "Cerrada"}</span>}
                    </p>
                    <p className="text-muted">{s.address}</p>
                    {now && <p className="text-muted">Hoy: {today ?? "cerrado"}</p>}
                    <a href={mapsUrl(s.address, s.mapsUrl)} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center font-semibold text-primary-ink underline underline-offset-2">
                      Ver en Google Maps
                    </a>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>
      </div>
    </header>
  );
}
