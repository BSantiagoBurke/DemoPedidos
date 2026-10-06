"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { formatARS, onlyDigits } from "@/lib/format";
import { ORDER_STATUSES, type Order } from "@/lib/pedidos/schema";
import { describeMoment, formatTime, isSameZonedDay } from "@/lib/pedidos/schedule";
import { dayStats, nextStatus, STATUS_META } from "@/lib/pedidos/status";
import { pedidosKey, sessionStore } from "@/lib/storage";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { usePedidos } from "../PedidosProvider";

export function AdminPanel() {
  const { tenant, hydrated } = usePedidos();
  const [unlocked, setUnlocked] = useState(false);
  const sessionKey = pedidosKey(tenant.slug, "admin-session");

  useEffect(() => {
    setUnlocked(sessionStore().get(sessionKey) === "ok");
  }, [sessionKey]);

  if (!hydrated) return null;
  if (!unlocked) {
    return (
      <PinGate
        onUnlock={() => {
          sessionStore().set(sessionKey, "ok");
          setUnlocked(true);
        }}
      />
    );
  }
  return (
    <Dashboard
      onLock={() => {
        sessionStore().remove(sessionKey);
        setUnlocked(false);
      }}
    />
  );
}

function DemoBadge() {
  return <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-black tracking-widest text-on-accent">DEMO</span>;
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { tenant } = usePedidos();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <div className="flex items-center gap-2"><DemoBadge /><span className="text-sm text-muted">{tenant.name}</span></div>
      <h1 className="text-2xl font-bold">Panel del local</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pin === tenant.adminPin) onUnlock();
          else setError(true);
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="pin" className="font-semibold">PIN de acceso</label>
        <input
          id="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin}
          onChange={(e) => { setPin(onlyDigits(e.target.value)); setError(false); }}
          aria-invalid={error} aria-describedby="pin-help"
          className="h-12 rounded-xl border border-line bg-surface px-3 text-center text-2xl tracking-[0.5em] aria-[invalid=true]:border-red-600"
        />
        {error && <p className="text-sm font-medium text-red-700" role="alert">PIN incorrecto.</p>}
        <button type="submit" className="min-h-12 rounded-xl bg-primary font-semibold text-on-primary">Entrar</button>
      </form>
      <p id="pin-help" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
        <strong>Esto es una demo:</strong> el PIN no es una autenticación real, solo evita que un cliente entre por error. El PIN de esta demo es <strong>{tenant.adminPin}</strong>.
      </p>
      <Link href={`/pedidos/${tenant.slug}`} className="text-center text-sm font-semibold underline">Volver a la carta</Link>
    </main>
  );
}

function useOrders() {
  const { repos } = usePedidos();
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    setOrders(repos.orders.list());
    return repos.orders.subscribe(() => setOrders(repos.orders.list()));
  }, [repos]);
  return orders;
}

function Dashboard({ onLock }: { onLock: () => void }) {
  const { tenant, repos, now, cart } = usePedidos();
  const orders = useOrders();
  const [tab, setTab] = useState<"pedidos" | "productos">("pedidos");
  const [sucursalId, setSucursalId] = useState<string>("todas");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const today = useMemo(
    () => orders.filter((o) => (now ? isSameZonedDay(new Date(o.createdAt), now) : true) && (sucursalId === "todas" || o.sucursalId === sucursalId)),
    [orders, now, sucursalId],
  );
  const stats = dayStats(today);
  const detail = orders.find((o) => o.id === detailId) ?? null;

  useEffect(() => {
    if (!confirmReset) return;
    const t = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmReset]);

  const reset = () => {
    if (!confirmReset) return setConfirmReset(true);
    repos.orders.reset();
    repos.availability.reset();
    cart.clear();
    setConfirmReset(false);
    setSucursalId("todas");
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-ink text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          <DemoBadge />
          <h1 className="min-w-0 truncate font-bold">{tenant.name}</h1>
          <Link href={`/pedidos/${tenant.slug}`} className="ml-auto inline-flex min-h-11 items-center px-2 text-sm underline">Ver carta</Link>
          <button type="button" onClick={onLock} className="min-h-11 px-2 text-sm underline">Salir</button>
        </div>
        <div className="mx-auto flex max-w-3xl px-2" role="tablist" aria-label="Secciones del panel">
          {(["pedidos", "productos"] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`min-h-11 flex-1 border-b-4 font-semibold capitalize ${tab === t ? "border-accent" : "border-transparent text-white/70"}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
        {tab === "pedidos" ? (
          <>
            <dl className="grid grid-cols-3 gap-2">
              <Stat label="Pedidos hoy" value={String(stats.count)} />
              <Stat label="Vendido" value={formatARS(stats.total)} />
              <Stat label="Ticket prom." value={formatARS(stats.average)} />
            </dl>

            {tenant.sucursales.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Filtrar por sucursal">
                {[{ id: "todas", name: "Todas" }, ...tenant.sucursales].map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={sucursalId === s.id} onClick={() => setSucursalId(s.id)}
                    className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${sucursalId === s.id ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            {today.length === 0 ? (
              <p className="rounded-2xl bg-surface p-6 text-center text-muted">Todavía no hay pedidos hoy.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {today.map((o) => <OrderCard key={o.id} order={o} onOpen={() => setDetailId(o.id)} />)}
              </ul>
            )}
          </>
        ) : (
          <ProductsTab />
        )}

        <section className="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          <p>Los pedidos de esta demo se guardan en este navegador. En la versión real, el panel los recibe desde cualquier celular.</p>
          <button type="button" onClick={reset} className={`min-h-11 self-start rounded-xl px-4 font-semibold ${confirmReset ? "bg-red-700 text-white" : "border border-line bg-surface text-ink"}`}>
            {confirmReset ? "Tocá de nuevo para confirmar" : "Reiniciar demo"}
          </button>
        </section>
      </main>

      <OrderDetail order={detail} onClose={() => setDetailId(null)} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-bold tabular-nums sm:text-lg">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const meta = STATUS_META[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.className}`}>{meta.label}</span>;
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const { tenant, repos, now } = usePedidos();
  const sucursal = tenant.sucursales.find((s) => s.id === order.sucursalId);
  const next = nextStatus(order.status);
  const items = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <li className={`rounded-2xl bg-surface p-3 ${order.status === "nuevo" ? "ring-2 ring-sky-300" : ""} ${order.status === "entregado" || order.status === "cancelado" ? "opacity-75" : ""}`}>
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-1 text-left" aria-label={`Ver pedido ${order.id} de ${order.customerName}`}>
        <span className="flex w-full items-center gap-2">
          <span className="font-bold">{order.id}</span>
          <StatusPill status={order.status} />
          <span className="ml-auto text-sm text-muted tabular-nums">{formatTime(new Date(order.createdAt))}</span>
        </span>
        <span className="flex w-full items-center justify-between gap-2 text-sm">
          <span className="truncate">{order.customerName} · {items} {items === 1 ? "producto" : "productos"}</span>
          <span className="font-semibold tabular-nums">{formatARS(order.total)}</span>
        </span>
        <span className="text-xs text-muted">
          {order.modalidad === "delivery" ? "Delivery" : "Retiro"}
          {tenant.sucursales.length > 1 && sucursal ? ` · ${sucursal.name}` : ""}
          {order.scheduledFor && now ? ` · Programado ${describeMoment(new Date(order.scheduledFor), now)}` : ""}
        </span>
      </button>
      {next && (
        <button type="button" onClick={() => repos.orders.updateStatus(order.id, next)} className="mt-2 min-h-11 w-full rounded-xl bg-primary-soft font-semibold text-primary-ink">
          Pasar a “{STATUS_META[next].label}”
        </button>
      )}
    </li>
  );
}

function customerWhatsApp(phone: string): string {
  const digits = onlyDigits(phone);
  // Celular argentino sin código de país: 549 + característica + número.
  return digits.length === 10 ? `549${digits}` : digits;
}

function OrderDetail({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { tenant, repos, now } = usePedidos();
  const sucursal = tenant.sucursales.find((s) => s.id === order?.sucursalId);
  const zona = sucursal?.zonas.find((z) => z.id === order?.zonaId);

  return (
    <Sheet open={order !== null} onClose={onClose} title={order ? `Pedido ${order.id}` : "Pedido"}>
      {order && (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusPill status={order.status} />
            <span>Recibido a las {formatTime(new Date(order.createdAt))}</span>
            {order.scheduledFor && now && <span className="font-semibold text-ink">· Programado {describeMoment(new Date(order.scheduledFor), now)}</span>}
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold">Estado</legend>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((s) => (
                <button key={s} type="button" aria-pressed={order.status === s} onClick={() => repos.orders.updateStatus(order.id, s)}
                  className={`min-h-11 rounded-full px-3 text-sm font-semibold ring-1 ${order.status === s ? STATUS_META[s].className + " ring-2" : "bg-surface ring-line"}`}>
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </fieldset>

          <ul className="flex flex-col gap-2 rounded-xl bg-page p-3 text-sm">
            {order.items.map((i, idx) => (
              <li key={idx}>
                <div className="flex justify-between gap-2">
                  <span><strong>{i.qty}x</strong> {i.name}{i.variantLabels.length > 0 && ` (${i.variantLabels.join(", ")})`}</span>
                  <span className="tabular-nums">{formatARS(i.unitPrice * i.qty)}</span>
                </div>
                {i.note && <p className="italic text-muted">Nota: {i.note}</p>}
              </li>
            ))}
            <li className="mt-1 border-t border-line pt-2">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatARS(order.subtotal)}</span></div>
              {order.modalidad === "delivery" && <div className="flex justify-between"><span>Envío</span><span className="tabular-nums">{formatARS(order.envio)}</span></div>}
              <div className="flex justify-between text-base font-bold"><span>Total</span><span className="tabular-nums">{formatARS(order.total)}</span></div>
            </li>
          </ul>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted">Cliente</dt><dd>{order.customerName}</dd>
            <dt className="text-muted">Teléfono</dt><dd>{order.customerPhone}</dd>
            <dt className="text-muted">Modalidad</dt><dd>{order.modalidad === "delivery" ? `Delivery${zona ? ` (${zona.name})` : ""}` : "Retiro en el local"}</dd>
            {order.address && (<><dt className="text-muted">Dirección</dt><dd>{order.address}</dd></>)}
            {order.reference && (<><dt className="text-muted">Referencia</dt><dd>{order.reference}</dd></>)}
            {sucursal && tenant.sucursales.length > 1 && (<><dt className="text-muted">Sucursal</dt><dd>{sucursal.name}</dd></>)}
            <dt className="text-muted">Pago</dt><dd>{order.medioPago}</dd>
          </dl>

          <a href={buildWhatsAppLink(customerWhatsApp(order.customerPhone), `Hola ${order.customerName.split(" ")[0]}, te escribimos de ${tenant.name} por tu pedido ${order.id}.`)}
            target="_blank" rel="noopener" className="grid min-h-12 place-items-center rounded-xl border border-line font-semibold">
            Escribirle al cliente por WhatsApp
          </a>
        </div>
      )}
    </Sheet>
  );
}

function ProductsTab() {
  const { tenant, repos, isAvailable } = usePedidos();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Lo que marques como agotado deja de poder pedirse en la carta al instante.</p>
      {tenant.categorias.map((c) => {
        const productos = tenant.productos.filter((p) => p.categoriaId === c.id);
        if (productos.length === 0) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-2 font-bold">{c.name}</h2>
            <ul className="divide-y divide-line rounded-2xl bg-surface">
              {productos.map((p) => {
                const on = isAvailable(p.id);
                return (
                  <li key={p.id}>
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className={`text-xs font-semibold ${on ? "text-emerald-700" : "text-red-700"}`}>{on ? "Disponible" : "Agotado"}</span>
                      </span>
                      <input type="checkbox" role="switch" checked={on} onChange={(e) => repos.availability.set(p.id, e.target.checked)}
                        className="peer sr-only" />
                      <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-emerald-600 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary-ink)] after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
