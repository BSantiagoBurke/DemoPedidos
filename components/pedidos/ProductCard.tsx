"use client";

import { formatARS } from "@/lib/format";
import { hasVariablePrice, minPrice } from "@/lib/pedidos/cart";
import type { Producto } from "@/lib/pedidos/schema";
import { ProductImage } from "./ProductImage";

type Props = { producto: Producto; available: boolean; onSelect: (producto: Producto) => void; priority?: boolean };

export function ProductCard({ producto, available, onSelect, priority }: Props) {
  const price = minPrice(producto);
  return (
    <button
      type="button"
      onClick={() => onSelect(producto)}
      disabled={!available}
      className="flex w-full gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition enabled:hover:border-primary enabled:active:scale-[0.99] disabled:cursor-not-allowed"
    >
      <div className={`min-w-0 flex-1 ${available ? "" : "opacity-60"}`}>
        <h3 className="font-semibold leading-snug">{producto.name}</h3>
        {producto.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{producto.description}</p>}
        <p className="mt-2 font-semibold">
          {hasVariablePrice(producto) && <span className="text-sm font-normal text-muted">Desde </span>}
          {formatARS(price)}
        </p>
      </div>
      <div className="relative shrink-0">
        <ProductImage producto={producto} sizes="96px" priority={priority} className={`size-24 rounded-xl ${available ? "" : "grayscale"}`} />
        {available ? (
          <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-xl font-bold leading-none text-on-primary shadow" aria-hidden="true">+</span>
        ) : (
          <span className="absolute inset-x-1 bottom-1 rounded-md bg-ink/85 py-0.5 text-center text-xs font-semibold text-white">Agotado</span>
        )}
      </div>
    </button>
  );
}
