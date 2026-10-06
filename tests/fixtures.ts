import { tenantPedidosSchema, type TenantPedidosConfig } from "@/lib/pedidos/schema";
import empanadas from "@/tenants/empanadas-demo.json";
import pastas from "@/tenants/pastas-demo.json";

export const pastasTenant: TenantPedidosConfig = tenantPedidosSchema.parse(pastas);
export const empanadasTenant: TenantPedidosConfig = tenantPedidosSchema.parse(empanadas);
