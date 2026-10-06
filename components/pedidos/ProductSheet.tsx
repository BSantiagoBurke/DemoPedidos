"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { QtyStepper } from "@/components/ui/QtyStepper";
import { formatARS } from "@/lib/format";
import { missingRequired, unitPrice, type Selections } from "@/lib/pedidos/cart";
import type { Producto } from "@/lib/pedidos/schema";
import { ProductImage } from "./ProductImage";
import { usePedidos } from "./PedidosProvider";

type Props = { producto: Producto | null; onClose: () => void; onAdded: (message: string) => void };

export function ProductSheet({ producto, onClose, onAdded }: Props) {
  return (
    <Sheet open={producto !== null} onClose={onClose} title={producto?.name ?? "Producto"} hideTitle>
      {/* key: reinicia el formulario al abrir otro producto */}
      {producto && <ProductForm key={producto.id} producto={producto} onDone={onClose} onAdded={onAdded} />}
    </Sheet>
  );
}

function ProductForm({ producto, onDone, onAdded }: { producto: Producto; onDone: () => void; onAdded: (m: string) => void }) {
  const { cart, isAvailable } = usePedidos();
  const [selections, setSelections] = useState<Selections>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const missing = missingRequired(producto, selections);
  const total = unitPrice(producto, selections) * qty;
  const available = isAvailable(producto.id);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (missing.length > 0) {
      setShowErrors(true);
      document.getElementById(`variante-${missing[0]}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    cart.add({ productoId: producto.id, selections, qty, note });
    onAdded(`Agregaste ${qty}x ${producto.name}`);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate>
      <ProductImage producto={producto} sizes="(min-width: 640px) 512px, 100vw" className="aspect-[16/9] w-full" />
      <div className="flex flex-col gap-5 p-4">
        <div>
          <h3 className="text-xl font-bold">{producto.name}</h3>
          {producto.description && <p className="mt-1 text-muted">{producto.description}</p>}
          <p className="mt-2 font-semibold">{formatARS(unitPrice(producto, selections))}</p>
        </div>

        {(producto.variantes ?? []).map((v) => {
          const invalid = showErrors && missing.includes(v.id);
          return (
            <fieldset key={v.id} id={`variante-${v.id}`} className="flex flex-col gap-2" aria-invalid={invalid || undefined}>
              <legend className="mb-2 flex w-full items-center justify-between">
                <span className="font-semibold">{v.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${invalid ? "bg-red-100 text-red-800" : v.required ? "bg-page text-muted" : "text-muted"}`}>
                  {v.required ? (invalid ? "Elegí una opción" : "Obligatorio") : "Opcional"}
                </span>
              </legend>
              {v.options.map((o) => {
                const checked = selections[v.id] === o.id;
                return (
                  <label key={o.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 ${checked ? "border-primary bg-primary-soft" : "border-line"}`}>
                    <input
                      type="radio"
                      name={v.id}
                      value={o.id}
                      checked={checked}
                      onChange={() => setSelections((s) => ({ ...s, [v.id]: o.id }))}
                      onClick={() => {
                        // En variantes opcionales, tocar de nuevo deselecciona.
                        if (!v.required && checked) setSelections(({ [v.id]: _removed, ...rest }) => rest);
                      }}
                      className="size-5 accent-[var(--primary)]"
                    />
                    <span className="flex-1">{o.label}</span>
                    {o.priceDelta !== 0 && <span className="text-sm text-muted">{o.priceDelta > 0 ? "+" : "−"}{formatARS(Math.abs(o.priceDelta))}</span>}
                  </label>
                );
              })}
            </fieldset>
          );
        })}

        <div className="flex flex-col gap-1">
          <label htmlFor="nota" className="font-semibold">Nota para la cocina <span className="font-normal text-muted">(opcional)</span></label>
          <textarea id="nota" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} rows={2} placeholder="Ej.: sin cebolla" className="rounded-xl border border-line p-3" />
        </div>
      </div>

      <div className="pb-safe sticky bottom-0 flex items-center gap-3 border-t border-line bg-surface px-4 pt-3">
        <QtyStepper value={qty} onChange={setQty} label="Cantidad" />
        <button type="submit" disabled={!available} className="flex min-h-12 flex-1 items-center justify-between gap-2 rounded-xl bg-primary px-4 font-semibold text-on-primary disabled:opacity-50">
          <span>{available ? "Agregar" : "Agotado"}</span>
          <span className="tabular-nums">{formatARS(total)}</span>
        </button>
      </div>
    </form>
  );
}
