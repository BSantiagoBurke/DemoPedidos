/**
 * npm run new-tenant -- --slug la-oma --type pedidos [--name "La Oma"]
 * Copia la plantilla a tenants/<slug>.json y crea public/tenants/<slug>/ con un logo provisorio.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    type: { type: "string", default: "pedidos" },
    name: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

const fail = (msg: string): never => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const slug = values.slug ?? fail('Falta --slug. Ej.: npm run new-tenant -- --slug la-oma --type pedidos --name "La Oma"');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail("El slug va en minúsculas, con números y guiones. Ej.: la-oma");
const type = values.type ?? "pedidos";

const root = process.cwd();
const template = path.join(root, "tenants", `_template-${type}.json`);
if (!fs.existsSync(template)) fail(`No hay plantilla para el tipo "${type}" (${path.relative(root, template)})`);

const target = path.join(root, "tenants", `${slug}.json`);
if (fs.existsSync(target) && !values.force) fail(`Ya existe tenants/${slug}.json (usá --force para pisarlo)`);

const name = values.name ?? slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
const data = JSON.parse(fs.readFileSync(template, "utf8")) as Record<string, unknown> & { colors: { primary: string; accent: string } };
data.slug = slug;
data.name = name;
data.logo = `/tenants/${slug}/logo.svg`;
data.adminPin = String(Math.floor(1000 + Math.random() * 9000));
fs.writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`);

const publicDir = path.join(root, "public", "tenants", slug);
fs.mkdirSync(publicDir, { recursive: true });
const logo = path.join(publicDir, "logo.svg");
if (!fs.existsSync(logo)) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${name}"><circle cx="48" cy="48" r="46" fill="${data.colors.primary}"/><text x="48" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#fff">${initials}</text></svg>\n`;
  fs.writeFileSync(logo, svg);
}

console.log(`✓ Creado tenants/${slug}.json (PIN del panel: ${data.adminPin})
✓ Creado public/tenants/${slug}/ (logo provisorio: reemplazá logo.svg o cambiá "logo" por un .png/.jpg)

Siguientes pasos:
  1. Editá tenants/${slug}.json: colores, sucursales (WhatsApp con 549...), zonas, categorías y productos.
  2. Fotos (opcional): copialas a public/tenants/${slug}/ y poné "image": "/tenants/${slug}/archivo.jpg".
  3. npm run validate-tenants
  4. npm run dev  →  http://localhost:3000/pedidos/${slug}`);
