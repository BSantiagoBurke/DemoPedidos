import Link from "next/link";
import { getPedidosTenant, listTenantSlugs } from "@/lib/tenants";
import { BeeCodeFooter } from "@/components/ui/BeeCodeFooter";

export default function Home() {
  const tenants = listTenantSlugs("pedidos")
    .map((slug) => getPedidosTenant(slug))
    .filter((t) => t !== null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">BeeCode</p>
      <h1 className="mt-1 text-3xl font-bold">Demos de pedidos online</h1>
      <p className="mt-2 text-muted">Probalas desde el celular como si fueras un cliente.</p>
      <ul className="mt-8 flex flex-col gap-3">
        {tenants.map((t) => (
          <li key={t.slug}>
            <Link href={`/pedidos/${t.slug}`} className="flex min-h-11 items-center justify-between rounded-2xl border border-line bg-surface p-4 font-semibold">
              <span>
                {t.name}
                <span className="block text-sm font-normal text-muted">{t.sucursales.length === 1 ? "1 sucursal" : `${t.sucursales.length} sucursales`}</span>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto"><BeeCodeFooter /></div>
    </main>
  );
}
