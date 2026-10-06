"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BeeCodeFooter } from "@/components/ui/BeeCodeFooter";
import { normalize } from "@/lib/format";
import type { Producto } from "@/lib/pedidos/schema";
import { CartBar } from "./CartBar";
import { CartSheet } from "./CartSheet";
import { ProductCard } from "./ProductCard";
import { ProductSheet } from "./ProductSheet";
import { usePedidos } from "./PedidosProvider";
import { StoreHeader } from "./StoreHeader";

const sectionId = (id: string) => `cat-${id}`;

export function Menu() {
  const { tenant, isAvailable } = usePedidos();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Producto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const sections = useMemo(() => {
    const q = normalize(query);
    return tenant.categorias
      .map((c) => ({
        categoria: c,
        productos: tenant.productos.filter((p) => p.categoriaId === c.id && (!q || normalize(p.name).includes(q))),
      }))
      .filter((s) => s.productos.length > 0);
  }, [tenant, query]);

  const active = useScrollSpy(sections.map((s) => sectionId(s.categoria.id)));
  const navRef = useRef<HTMLElement>(null);

  // Mantiene visible la categoría activa en la barra horizontal.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(`[href="#${active}"]`);
    if (nav && link) nav.scrollTo({ left: link.offsetLeft - nav.clientWidth / 2 + link.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  let index = 0;
  return (
    <>
      <StoreHeader />

      <div className="sticky top-0 z-10 mt-3 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pt-3">
          <label htmlFor="buscar" className="sr-only">Buscar en la carta</label>
          <input
            id="buscar"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá un producto"
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-line bg-surface px-4"
          />
        </div>
        <nav ref={navRef} aria-label="Categorías" className="category-nav mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2">
          {sections.map(({ categoria }) => (
            <a
              key={categoria.id}
              href={`#${sectionId(categoria.id)}`}
              aria-current={active === sectionId(categoria.id) ? "true" : undefined}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-sm font-semibold whitespace-nowrap"
            >
              {categoria.name}
            </a>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-28">
        {sections.length === 0 && (
          <div className="py-12 text-center">
            <p className="font-semibold">No encontramos “{query}”.</p>
            <button type="button" onClick={() => setQuery("")} className="mt-2 min-h-11 font-semibold text-primary-ink underline">Ver toda la carta</button>
          </div>
        )}
        {sections.map(({ categoria, productos }) => (
          <section key={categoria.id} id={sectionId(categoria.id)} aria-labelledby={`${sectionId(categoria.id)}-t`} className="scroll-mt-32 pt-5">
            <h2 id={`${sectionId(categoria.id)}-t`} className="mb-3 text-lg font-bold">{categoria.name}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {productos.map((p) => (
                <li key={p.id}>
                  <ProductCard producto={p} available={isAvailable(p.id)} onSelect={setSelected} priority={index++ < 2} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <BeeCodeFooter />
      </main>

      <CartBar onOpen={() => setCartOpen(true)} announcement={announcement} />
      <ProductSheet producto={selected} onClose={() => setSelected(null)} onAdded={setAnnouncement} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

/** Scrollspy con IntersectionObserver (funciona en Safari, donde no hay scroll-target-group). */
function useScrollSpy(ids: string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];
    setActive((current) => (current && list.includes(current) ? current : list[0]));
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = list.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    for (const id of list) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}
