/**
 * npm run validate-tenants
 * Valida todos los tenants (incluida la plantilla) contra el schema y chequea
 * que existan los archivos de logo e imágenes en /public.
 */
import fs from "node:fs";
import path from "node:path";
import { tenantPedidosSchema } from "../lib/pedidos/schema";
import { contrastRatio, readableOn } from "../lib/color";
import { listTenantFiles, TENANTS_DIR } from "../lib/tenants";

const PUBLIC_DIR = path.join(process.cwd(), "public");
let failed = 0;

for (const file of listTenantFiles(true)) {
  const isTemplate = file.startsWith("_");
  const problems: string[] = [];
  const warnings: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(path.join(TENANTS_DIR, file), "utf8"));
  } catch (e) {
    problems.push(`JSON inválido: ${(e as Error).message}`);
  }

  const type = (data as { type?: unknown } | undefined)?.type;
  if (data && type !== "pedidos") {
    console.log(`·  ${file}: tipo "${String(type)}", lo valida su propio script`);
    continue;
  }

  const result = data ? tenantPedidosSchema.safeParse(data) : null;
  if (result && !result.success) {
    for (const issue of result.error.issues) problems.push(`${issue.path.join(".") || "(raíz)"}: ${issue.message}`);
  }
  if (result?.success) {
    const t = result.data;
    if (!isTemplate && `${t.slug}.json` !== file) problems.push(`slug "${t.slug}" no coincide con el archivo ${file}`);
    const files = [t.logo, ...t.productos.map((p) => p.image).filter((i): i is string => !!i)];
    for (const f of files) if (!fs.existsSync(path.join(PUBLIC_DIR, f))) problems.push(`no existe public${f}`);
    const ratio = contrastRatio(t.colors.primary, readableOn(t.colors.primary));
    if (ratio < 4.5) warnings.push(`el color primario tiene contraste ${ratio.toFixed(1)}:1 con su texto (AA pide 4.5). Probá un tono más oscuro.`);
    if (t.productos.length < 8 && !isTemplate) warnings.push(`solo ${t.productos.length} productos (se recomiendan 8 a 15)`);
  }

  if (problems.length) {
    failed++;
    console.log(`✗  ${file}`);
    for (const p of problems) console.log(`     - ${p}`);
  } else {
    console.log(`✓  ${file}`);
  }
  for (const w of warnings) console.log(`     ! ${w}`);
}

if (failed) {
  console.log(`\n${failed} tenant(s) con errores.`);
  process.exit(1);
}
console.log("\nTodos los tenants son válidos.");
