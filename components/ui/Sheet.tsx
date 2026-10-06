"use client";

import { useEffect, useId, useRef } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Oculta visualmente el título (sigue siendo el nombre accesible). */
  hideTitle?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Bottom sheet en mobile y modal centrado en desktop, sobre <dialog> nativo:
 * foco atrapado, Escape y top layer los resuelve el navegador.
 * Cierre tocando el fondo con closedby="any" y fallback para Safari.
 */
export function Sheet({ open, onClose, title, hideTitle, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = () => {
      document.documentElement.style.overflow = "";
      onCloseRef.current();
    };
    const handleClick = (event: MouseEvent) => {
      if ("closedBy" in HTMLDialogElement.prototype || event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = r.top <= event.clientY && event.clientY <= r.bottom && r.left <= event.clientX && event.clientX <= r.right;
      if (!inside) dialog.close();
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleClick);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleClick);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} {...{ closedby: "any" }}>
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <h2 id={titleId} className={hideTitle ? "sr-only" : "pt-2 text-lg font-bold leading-tight"}>
              {title}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="ml-auto grid size-11 shrink-0 place-items-center rounded-full text-2xl leading-none text-muted hover:bg-page"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          {footer && <div className="pb-safe border-t border-line px-4 pt-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
