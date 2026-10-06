"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { QtyStepper, TrashIcon } from "@/components/ui/QtyStepper";
import { formatARS } from "@/lib/format";
import { missingForMinimum } from "@/lib/pedidos/cart";
import { usePedidos } from "./PedidosProvider";

export function CartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tenant, cart } = usePedidos();
  const falta = missingForMinimum(cart.subtotal, tenant.pedidoMinimo);
  const unavailable = cart.lines.filter((l) => !l.available);
  const blocked = cart.count === 0 || falta > 0 || unavailable.length > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tu pedido"
      footer={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatARS(cart.subtotal)}</span>
          </div>
          {falta > 0 && (
            <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900" role="status">
              El pedido mínimo es {formatARS(tenant.pedidoMinimo)}. Sumá {formatARS(falta)} más para continuar.
            </p>
          )}
          {unavailable.length > 0 && (
            <p className="rounded-lg bg-red-50 p-2 text-sm text-red-900" role="status">
              Se agotó: {unavailable.map((l) => l.producto.name).join(", ")}. Quitalo para continuar.
            </p>
          )}
          {blocked ? (
            <button type="button" disabled className="min-h-12 rounded-xl bg-line font-semibold text-muted">Continuar</button>
          ) : (
            <Link href={`/pedidos/${tenant.slug}/checkout`} className="grid min-h-12 place-items-center rounded-xl bg-primary font-semibold text-on-primary">
              Continuar
            </Link>
          )}
        </div>
      }
    >
      {cart.lines.length === 0 ? (
        <p className="p-6 text-center text-muted">Todavía no agregaste nada.</p>
      ) : (
        <ul className="divide-y divide-line">
          {cart.lines.map((l) => (
            <li key={l.line.key} className="flex gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${l.available ? "" : "text-red-800 line-through"}`}>{l.producto.name}</p>
                {l.variantLabels.length > 0 && <p className="text-sm text-muted">{l.variantLabels.join(", ")}</p>}
                {l.line.note && <p className="text-sm italic text-muted">“{l.line.note}”</p>}
                <p className="mt-1 text-sm tabular-nums">{formatARS(l.total)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <QtyStepper value={l.line.qty} min={0} onChange={(q) => cart.setQty(l.line.key, q)} label={`Cantidad de ${l.producto.name}`} size="sm" />
                <button type="button" onClick={() => cart.remove(l.line.key)} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted underline">
                  <TrashIcon /> Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
