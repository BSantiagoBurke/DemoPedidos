/**
 * Carga de tenants desde /tenants/*.json. Solo servidor y scripts (usa fs).
 * Compartido con la demo de turnos: cada JSON declara su "type".
 * Los archivos que empiezan con "_" son plantillas y no se publican.
 */
import fs from "node:fs";
import path from "node:path";
import { tenantPedidosSchema, type TenantPedidosConfig } from "./pedidos/schema";

export const TENANTS_DIR = path.join(process.cwd(), "tenants");

export type TenantType = "pedidos" | "turnos";

function readTenantFile(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(TENANTS_DIR, file), "utf8"));
}

export function listTenantFiles(includeTemplates = false): string[] {
  return fs
    .readdirSync(TENANTS_DIR)
    .filter((f) => f.endsWith(".json") && (includeTemplates || !f.startsWith("_")))
    .sort();
}

export function listTenantSlugs(type: TenantType): string[] {
  return listTenantFiles()
    .filter((file) => {
      const data = readTenantFile(file);
      return typeof data === "object" && data !== null && (data as { type?: unknown }).type === type;
    })
    .map((file) => file.replace(/\.json$/, ""));
}

const cache = new Map<string, TenantPedidosConfig>();

/** Devuelve el tenant validado o null si no existe. Lanza si el JSON es inválido (falla el build, no la demo). */
export function getPedidosTenant(slug: string): TenantPedidosConfig | null {
  if (!/^[a-z0-9-]+$/.test(slug) || slug.startsWith("_")) return null;
  const cached = cache.get(slug);
  if (cached) return cached;
  const file = `${slug}.json`;
  if (!fs.existsSync(path.join(TENANTS_DIR, file))) return null;
  const data = readTenantFile(file);
  if ((data as { type?: unknown }).type !== "pedidos") return null;
  const tenant = tenantPedidosSchema.parse(data);
  if (tenant.slug !== slug) throw new Error(`El slug de ${file} (${tenant.slug}) no coincide con el nombre del archivo`);
  cache.set(slug, tenant);
  return tenant;
}
