"use client";

import { formatARS } from "@/lib/format";
import { usePedidos } from "./PedidosProvider";

export function CartBar({ onOpen, announcement }: { onOpen: () => void; announcement: string }) {
  const { cart, hydrated } = usePedidos();
  const empty = cart.count === 0;
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur">
      <p className="sr-only" role="status">{announcement}</p>
      <button
        type="button"
        onClick={onOpen}
        disabled={empty}
        className="mx-auto flex min-h-12 w-full max-w-2xl items-center gap-3 rounded-xl bg-primary px-4 font-semibold text-on-primary transition disabled:bg-line disabled:text-muted"
      >
        {empty ? (
          <span className="flex-1 text-center">{hydrated ? "Tu pedido está vacío" : "Cargando…"}</span>
        ) : (
          <>
            <span className="grid min-w-7 place-items-center rounded-md bg-black/15 px-1.5 py-0.5 text-sm tabular-nums">{cart.count}</span>
            <span className="flex-1 text-left">Ver mi pedido</span>
            <span className="tabular-nums">{formatARS(cart.subtotal)}</span>
          </>
        )}
      </button>
    </div>
  );
}
