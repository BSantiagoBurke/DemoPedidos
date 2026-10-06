"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BeeCodeFooter } from "@/components/ui/BeeCodeFooter";
import { formatARS, onlyDigits } from "@/lib/format";
import { missingForMinimum, orderTotals, shippingCost, toOrderItems } from "@/lib/pedidos/cart";
import type { Modalidad, Order } from "@/lib/pedidos/schema";
import { describeMoment, formatTime, scheduleSlots, storeStatus } from "@/lib/pedidos/schedule";
import { buildOrderWhatsAppUrl } from "@/lib/whatsapp";
import { usePedidos } from "./PedidosProvider";

type Field = "modalidad" | "sucursal" | "zona" | "address" | "name" | "phone" | "pago" | "schedule";
type Errors = Partial<Record<Field, string>>;

const inputClass = "h-12 w-full rounded-xl border border-line bg-surface px-3 aria-[invalid=true]:border-red-600";

export function Checkout() {
  const { tenant, cart, repos, hydrated, now } = usePedidos();
  const single = tenant.sucursales.length === 1;
  const [modalidad, setModalidad] = useState<Modalidad | "">(tenant.modalidades.length === 1 ? tenant.modalidades[0]! : "");
  const [sucursalId, setSucursalId] = useState(single ? tenant.sucursales[0]!.id : "");
  const [zonaId, setZonaId] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pago, setPago] = useState(tenant.mediosPago.length === 1 ? tenant.mediosPago[0]! : "");
  const [scheduledFor, setScheduledFor] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState<{ order: Order; url: string } | null>(null);

  const clear = (field: Field) => setErrors(({ [field]: _cleared, ...rest }) => rest);

  const sucursal = tenant.sucursales.find((s) => s.id === sucursalId);
  const status = sucursal && now ? storeStatus(sucursal.hours, now) : null;
  const closed = status !== null && !status.open;
  const slots = useMemo(() => (sucursal && now && closed ? scheduleSlots(sucursal.hours, now) : []), [sucursal, now, closed]);

  const envio = modalidad ? shippingCost(tenant, { modalidad, sucursalId, zonaId }) : 0;
  const totals = orderTotals(cart.subtotal, envio);
  const falta = missingForMinimum(cart.subtotal, tenant.pedidoMinimo);
  const unavailable = cart.lines.filter((l) => !l.available);

  if (sent) return <Confirmation order={sent.order} url={sent.url} />;

  if (!hydrated) {
    return <div className="mx-auto max-w-xl p-4"><div className="h-64 animate-pulse rounded-2xl bg-line" /></div>;
  }

  if (cart.count === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Tu pedido está vacío</h1>
        <Link href={`/pedidos/${tenant.slug}`} className="grid min-h-12 place-items-center rounded-xl bg-primary px-6 font-semibold text-on-primary">Ver la carta</Link>
      </main>
    );
  }

  const validate = (): Errors => {
    const e: Errors = {};
    if (!modalidad) e.modalidad = "Elegí delivery o retiro.";
    if (!sucursal) e.sucursal = "Elegí tu sucursal.";
    if (modalidad === "delivery") {
      if (!zonaId) e.zona = "Elegí tu zona.";
      if (address.trim().length < 5) e.address = "Escribí tu dirección (calle y número).";
    }
    if (name.trim().length < 2) e.name = "Escribí tu nombre.";
    if (onlyDigits(phone).length < 8) e.phone = "Escribí un teléfono válido.";
    if (!pago) e.pago = "Elegí cómo vas a pagar.";
    if (closed && !scheduledFor) e.schedule = "La sucursal está cerrada: elegí un horario.";
    return e;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    if (falta > 0 || unavailable.length > 0 || !sucursal || !modalidad) return;

    const order = repos.orders.create({
      sucursalId: sucursal.id,
      modalidad,
      ...(modalidad === "delivery" ? { zonaId, address: address.trim(), ...(reference.trim() ? { reference: reference.trim() } : {}) } : {}),
      customerName: name.trim(),
      customerPhone: phone.trim(),
      medioPago: pago,
      items: toOrderItems(cart.lines),
      ...totals,
      ...(closed && scheduledFor ? { scheduledFor } : {}),
    });
    const url = buildOrderWhatsAppUrl(order, tenant);
    cart.clear();
    setSent({ order, url });
    window.scrollTo({ top: 0 });
    window.location.href = url;
  };

  let step = 0;
  const title = (text: string) => (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
      <span className="grid size-7 place-items-center rounded-full bg-primary text-sm text-on-primary" aria-hidden="true">{++step}</span>
      {text}
    </h2>
  );

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-xl items-center gap-2 px-2 py-1">
          <Link href={`/pedidos/${tenant.slug}`} className="grid size-11 place-items-center rounded-full text-xl" aria-label="Volver a la carta">←</Link>
          <h1 className="font-bold">Finalizá tu pedido</h1>
          <span className="ml-auto pr-2 text-sm text-muted">{tenant.name}</span>
        </div>
      </header>

      <form onSubmit={submit} noValidate className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
        {tenant.modalidades.length > 1 && (
          <section className="rounded-2xl bg-surface p-4">
            {title("¿Cómo lo querés?")}
            <div id="f-modalidad" tabIndex={-1} role="radiogroup" aria-label="Modalidad" className="grid grid-cols-2 gap-2">
              {tenant.modalidades.map((m) => (
                <ChoiceCard key={m} name="modalidad" checked={modalidad === m} onChange={() => { setModalidad(m); clear("modalidad"); }}
                  label={m === "delivery" ? "Delivery" : "Retiro en el local"} hint={m === "delivery" ? "Te lo llevamos" : "Sin costo de envío"} />
              ))}
            </div>
            <FieldError id="modalidad" error={errors.modalidad} />
          </section>
        )}

        {!single && (
          <section className="rounded-2xl bg-surface p-4">
            {title("Elegí tu sucursal")}
            <div id="f-sucursal" tabIndex={-1} role="radiogroup" aria-label="Sucursal" className="flex flex-col gap-2">
              {tenant.sucursales.map((s) => {
                const st = now ? storeStatus(s.hours, now) : null;
                return (
                  <ChoiceCard key={s.id} name="sucursal" checked={sucursalId === s.id}
                    onChange={() => { setSucursalId(s.id); setZonaId(""); setScheduledFor(""); clear("sucursal"); }}
                    label={s.name} hint={s.address}
                    badge={st ? (st.open ? { text: "Abierta", tone: "ok" } : { text: "Cerrada", tone: "warn" }) : undefined} />
                );
              })}
            </div>
            <FieldError id="sucursal" error={errors.sucursal} />
          </section>
        )}

        {modalidad === "delivery" && (
          <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            {title("¿A dónde te lo llevamos?")}
            {!sucursal ? (
              <p className="text-sm text-muted">Primero elegí la sucursal para ver las zonas de envío.</p>
            ) : (
              <>
                <div>
                  <label htmlFor="f-zona" className="mb-1 block font-semibold">Zona</label>
                  <select id="f-zona" value={zonaId} onChange={(e) => { setZonaId(e.target.value); clear("zona"); }} aria-invalid={!!errors.zona} aria-describedby="e-zona" className={inputClass}>
                    <option value="">Elegí tu zona</option>
                    {sucursal.zonas.map((z) => <option key={z.id} value={z.id}>{z.name} · envío {formatARS(z.costoEnvio)}</option>)}
                  </select>
                  <FieldError id="zona" error={errors.zona} />
                </div>
                <div>
                  <label htmlFor="f-address" className="mb-1 block font-semibold">Dirección</label>
                  <input id="f-address" value={address} onChange={(e) => { setAddress(e.target.value); clear("address"); }} autoComplete="street-address" placeholder="Calle y número, piso o depto" aria-invalid={!!errors.address} aria-describedby="e-address" className={inputClass} />
                  <FieldError id="address" error={errors.address} />
                </div>
                <div>
                  <label htmlFor="f-reference" className="mb-1 block font-semibold">Referencia <span className="font-normal text-muted">(opcional)</span></label>
                  <input id="f-reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="Ej.: portón negro, timbre B" className={inputClass} />
                </div>
              </>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
          {title("Tus datos")}
          <div>
            <label htmlFor="f-name" className="mb-1 block font-semibold">Nombre</label>
            <input id="f-name" value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} autoComplete="name" aria-invalid={!!errors.name} aria-describedby="e-name" className={inputClass} />
            <FieldError id="name" error={errors.name} />
          </div>
          <div>
            <label htmlFor="f-phone" className="mb-1 block font-semibold">Teléfono</label>
            <input id="f-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clear("phone"); }} autoComplete="tel" placeholder="381 555-1234" aria-invalid={!!errors.phone} aria-describedby="e-phone" className={inputClass} />
            <FieldError id="phone" error={errors.phone} />
          </div>
        </section>

        <section className="rounded-2xl bg-surface p-4">
          {title("¿Cómo pagás?")}
          <div id="f-pago" tabIndex={-1} role="radiogroup" aria-label="Medio de pago" className="flex flex-wrap gap-2">
            {tenant.mediosPago.map((m) => (
              <label key={m} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 font-medium ${pago === m ? "border-primary bg-primary-soft" : "border-line"}`}>
                <input type="radio" name="pago" checked={pago === m} onChange={() => { setPago(m); clear("pago"); }} className="size-4 accent-[var(--primary)]" />
                {m}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">El pago se coordina con el local. Acá no se cobra nada.</p>
          <FieldError id="pago" error={errors.pago} />
        </section>

        {closed && sucursal && (
          <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
            <h2 className="font-bold text-amber-950">{single ? "Estamos cerrados" : `${sucursal.name} está cerrada`} ahora</h2>
            {status && !status.open && status.opensAt && now ? (
              <>
                <p className="mt-1 text-sm text-amber-950">Abre {describeMoment(status.opensAt, now)}. Programá tu pedido para cuando abra.</p>
                <label htmlFor="f-schedule" className="mt-3 mb-1 block font-semibold text-amber-950">Programar para</label>
                <select id="f-schedule" value={scheduledFor} onChange={(e) => { setScheduledFor(e.target.value); clear("schedule"); }} aria-invalid={!!errors.schedule} aria-describedby="e-schedule" className={inputClass}>
                  <option value="">Elegí un horario</option>
                  {slots.map((s) => <option key={s.toISOString()} value={s.toISOString()}>{describeMoment(s, now).replace(/ a las \d\d:\d\d$/, "")} {formatTime(s)} hs</option>)}
                </select>
                <FieldError id="schedule" error={errors.schedule} />
              </>
            ) : (
              <p className="mt-1 text-sm text-amber-950">Por ahora no tiene horarios cargados.</p>
            )}
          </section>
        )}

        <section className="rounded-2xl bg-surface p-4">
          <h2 className="mb-3 text-lg font-bold">Resumen</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {cart.lines.map((l) => (
              <li key={l.line.key} className="flex justify-between gap-3">
                <span>{l.line.qty}x {l.producto.name}{l.variantLabels.length > 0 && <span className="text-muted"> ({l.variantLabels.join(", ")})</span>}</span>
                <span className="tabular-nums">{formatARS(l.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
            <Row label="Subtotal" value={formatARS(totals.subtotal)} />
            {modalidad === "delivery" && <Row label="Envío" value={zonaId ? formatARS(totals.envio) : "Elegí tu zona"} />}
            <Row label="Total" value={formatARS(totals.total)} strong />
          </dl>
          {falta > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              El pedido mínimo es {formatARS(tenant.pedidoMinimo)}. Te faltan {formatARS(falta)}.{" "}
              <Link href={`/pedidos/${tenant.slug}`} className="font-semibold underline">Agregar productos</Link>
            </p>
          )}
          {unavailable.length > 0 && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900" role="alert">
              Se agotó: {unavailable.map((l) => l.producto.name).join(", ")}. <Link href={`/pedidos/${tenant.slug}`} className="font-semibold underline">Volvé a la carta</Link> para quitarlo.
            </p>
          )}
        </section>

        <button type="submit" disabled={falta > 0 || unavailable.length > 0} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#1f8f4e] px-4 text-lg font-bold text-white disabled:bg-line disabled:text-muted">
          <WhatsAppIcon /> Enviar pedido
        </button>
        <p className="-mt-2 text-center text-xs text-muted">Se abre WhatsApp con tu pedido listo para mandar.</p>
        <BeeCodeFooter />
      </form>
    </>
  );
}

function ChoiceCard({ name, checked, onChange, label, hint, badge }: {
  name: string; checked: boolean; onChange: () => void; label: string; hint?: string;
  badge?: { text: string; tone: "ok" | "warn" };
}) {
  return (
    <label className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${checked ? "border-primary bg-primary-soft" : "border-line"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-5 shrink-0 accent-[var(--primary)]" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          {label}
          {badge && <span className={`rounded-full px-2 text-xs ${badge.tone === "ok" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{badge.text}</span>}
        </span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function FieldError({ id, error }: { id: Field; error?: string }) {
  return <p id={`e-${id}`} className="mt-1 text-sm font-medium text-red-700" role={error ? "alert" : undefined}>{error}</p>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-lg font-bold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Confirmation({ order, url }: { order: Order; url: string }) {
  const { tenant } = usePedidos();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl" aria-hidden="true">✓</div>
      <h1 className="text-2xl font-bold">¡Pedido {order.id} listo!</h1>
      <p className="text-muted">Solo falta que lo mandes por WhatsApp. El local te confirma por ahí.</p>
      <a href={url} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1f8f4e] font-bold text-white">
        <WhatsAppIcon /> Abrir WhatsApp de nuevo
      </a>
      <Link href={`/pedidos/${tenant.slug}`} className="min-h-11 font-semibold text-primary-ink underline">Volver a la carta</Link>
      <p className="mt-6 rounded-xl bg-surface p-3 text-sm text-muted">
        Demo: mirá cómo le llega al negocio en el{" "}
        <Link href={`/pedidos/${tenant.slug}/admin`} className="font-semibold underline">panel del dueño</Link>.
      </p>
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}
