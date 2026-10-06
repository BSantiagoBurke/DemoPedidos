import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PedidosProvider } from "@/components/pedidos/PedidosProvider";
import { tenantCssVars } from "@/lib/color";
import { getPedidosTenant, listTenantSlugs } from "@/lib/tenants";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listTenantSlugs("pedidos").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tenant = getPedidosTenant(slug);
  if (!tenant) return {};
  return {
    title: { default: tenant.name, template: `%s · ${tenant.name}` },
    description: tenant.tagline ?? `Hacé tu pedido online en ${tenant.name}.`,
    icons: { icon: tenant.logo },
  };
}

export default async function PedidosLayout({ params, children }: Params & { children: React.ReactNode }) {
  const { slug } = await params;
  const tenant = getPedidosTenant(slug);
  if (!tenant) notFound();

  return (
    <div style={tenantCssVars(tenant.colors) as React.CSSProperties} className="min-h-dvh">
      <PedidosProvider tenant={tenant}>{children}</PedidosProvider>
    </div>
  );
}
