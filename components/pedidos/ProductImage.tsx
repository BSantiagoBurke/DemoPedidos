import Image from "next/image";
import type { Producto } from "@/lib/pedidos/schema";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

type Props = { producto: Producto; className?: string; sizes: string; priority?: boolean };

/** Foto del producto o, si no hay, un placeholder con el color del negocio. */
export function ProductImage({ producto, className = "", sizes, priority }: Props) {
  if (producto.image) {
    return (
      <div className={`relative overflow-hidden bg-accent-soft ${className}`}>
        <Image src={producto.image} alt="" fill sizes={sizes} priority={priority} className="object-cover" unoptimized={producto.image.endsWith(".svg")} />
      </div>
    );
  }
  return (
    <div className={`grid place-items-center overflow-hidden bg-accent-soft ${className}`} aria-hidden="true">
      <span className="font-serif text-2xl font-bold text-primary-ink opacity-80">{initials(producto.name) || "•"}</span>
    </div>
  );
}
