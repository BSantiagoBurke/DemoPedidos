import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:MM (24 h)");
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex de 6 dígitos, ej. #B4432F");
const id = z.string().regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones");

export const dayHoursSchema = z.object({ open: time, close: time }).nullable();

const weekHoursSchema = z.object({
  "0": dayHoursSchema,
  "1": dayHoursSchema,
  "2": dayHoursSchema,
  "3": dayHoursSchema,
  "4": dayHoursSchema,
  "5": dayHoursSchema,
  "6": dayHoursSchema,
});

const zonaSchema = z.object({
  id,
  name: z.string().min(1),
  costoEnvio: z.number().int().nonnegative(),
});

const sucursalSchema = z.object({
  id,
  name: z.string().min(1),
  address: z.string().min(1),
  whatsapp: z.string().regex(/^\d{10,15}$/, "Formato internacional sin '+', ej. 5493815551234"),
  mapsUrl: z.url().optional(),
  hours: weekHoursSchema,
  zonas: z.array(zonaSchema),
});

const varianteSchema = z.object({
  id,
  name: z.string().min(1),
  required: z.boolean(),
  options: z
    .array(z.object({ id, label: z.string().min(1), priceDelta: z.number().int() }))
    .min(1),
});

const productoSchema = z.object({
  id,
  categoriaId: id,
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().nonnegative(),
  image: z.string().startsWith("/").optional(),
  variantes: z.array(varianteSchema).optional(),
  disponible: z.boolean(),
});

const MODALIDADES = ["delivery", "retiro"] as const;

export const tenantPedidosSchema = z
  .object({
    slug: id,
    type: z.literal("pedidos"),
    name: z.string().min(1),
    tagline: z.string().optional(),
    logo: z.string().startsWith("/"),
    colors: z.object({ primary: hexColor, accent: hexColor }),
    adminPin: z.string().regex(/^\d{4,6}$/, "PIN de 4 a 6 dígitos"),
    pedidoMinimo: z.number().int().nonnegative(),
    tiempoEstimadoMin: z.tuple([z.number().int().positive(), z.number().int().positive()]),
    modalidades: z.array(z.enum(MODALIDADES)).min(1),
    mediosPago: z.array(z.string().min(1)).min(1),
    sucursales: z.array(sucursalSchema).min(1),
    categorias: z.array(z.object({ id, name: z.string().min(1) })).min(1),
    productos: z.array(productoSchema).min(1),
  })
  .superRefine((t, ctx) => {
    const dupes = (label: string, ids: string[], path: (string | number)[]) => {
      const seen = new Set<string>();
      for (const value of ids) {
        if (seen.has(value)) ctx.addIssue({ code: "custom", message: `${label} duplicado: ${value}`, path });
        seen.add(value);
      }
    };
    dupes("id de sucursal", t.sucursales.map((s) => s.id), ["sucursales"]);
    dupes("id de categoría", t.categorias.map((c) => c.id), ["categorias"]);
    dupes("id de producto", t.productos.map((p) => p.id), ["productos"]);

    const [min, max] = t.tiempoEstimadoMin;
    if (min > max) ctx.addIssue({ code: "custom", message: "tiempoEstimadoMin: el mínimo supera al máximo", path: ["tiempoEstimadoMin"] });

    const categorias = new Set(t.categorias.map((c) => c.id));
    t.productos.forEach((p, i) => {
      if (!categorias.has(p.categoriaId)) {
        ctx.addIssue({ code: "custom", message: `Categoría inexistente: ${p.categoriaId}`, path: ["productos", i, "categoriaId"] });
      }
    });

    if (t.modalidades.includes("delivery")) {
      t.sucursales.forEach((s, i) => {
        if (s.zonas.length === 0) {
          ctx.addIssue({ code: "custom", message: `La sucursal ${s.id} no tiene zonas y el tenant ofrece delivery`, path: ["sucursales", i, "zonas"] });
        }
      });
    }
  });

export type TenantPedidosConfig = z.infer<typeof tenantPedidosSchema>;
export type Sucursal = TenantPedidosConfig["sucursales"][number];
export type Zona = Sucursal["zonas"][number];
export type Producto = TenantPedidosConfig["productos"][number];
export type Variante = NonNullable<Producto["variantes"]>[number];
export type Categoria = TenantPedidosConfig["categorias"][number];
export type DayHours = z.infer<typeof dayHoursSchema>;
export type WeekHours = Sucursal["hours"];
export type Modalidad = (typeof MODALIDADES)[number];

export const ORDER_STATUSES = ["nuevo", "preparacion", "listo", "entregado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = {
  productoId: string;
  name: string;
  variantLabels: string[];
  unitPrice: number;
  qty: number;
  note?: string;
};

export type Order = {
  id: string;
  tenantSlug: string;
  sucursalId: string;
  modalidad: Modalidad;
  zonaId?: string;
  address?: string;
  reference?: string;
  customerName: string;
  customerPhone: string;
  medioPago: string;
  items: OrderItem[];
  subtotal: number;
  envio: number;
  total: number;
  scheduledFor?: string;
  status: OrderStatus;
  createdAt: string;
};
