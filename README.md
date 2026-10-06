# BeeCode Demos: Pedidos online

Demo comercial de una web de pedidos para negocios gastronómicos (rotiserías, pastas, empanadas, pizzerías). El cliente arma el pedido desde el celular y el negocio lo recibe **completo y ordenado en su WhatsApp de siempre**, sin comisiones.

Cada negocio es un **tenant**: un JSON con su nombre, colores, carta y sucursales. Personalizar una demo nueva lleva 20 a 30 minutos.

- Carta: `/pedidos/<slug>`
- Checkout: `/pedidos/<slug>/checkout`
- Panel del dueño: `/pedidos/<slug>/admin` (PIN de demo, está en el JSON)

Tenants de ejemplo (ficticios): `pastas-demo` (1 sucursal, pedido mínimo) y `empanadas-demo` (3 sucursales, cada una con su WhatsApp, zonas y horarios; Yerba Buena cruza la medianoche).

## Arranque

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests de cálculos, horarios, WhatsApp, tenants y repositorios
npm run build      # build de producción (valida los tenants al generar las páginas)
```

Requiere Node 20 o superior.

## Personalizar para un negocio nuevo (20 a 30 min)

1. **Crear el tenant**

   ```bash
   npm run new-tenant -- --slug la-oma --type pedidos --name "La Oma"
   ```

   Copia `tenants/_template-pedidos.json` a `tenants/la-oma.json`, genera un PIN y crea `public/tenants/la-oma/` con un logo provisorio.

2. **Editar `tenants/la-oma.json`**
   - `colors.primary` y `colors.accent`: sacalos del logo o del Instagram. El texto sobre el color primario se elige solo (blanco o negro) para mantener contraste AA.
   - `sucursales`: dirección, `whatsapp` en formato internacional sin `+` (ej. `5493815551234`), horarios por día (`"0"` = domingo, `null` = cerrado; si `close` es menor que `open`, cruza la medianoche) y `zonas` con su costo de envío.
   - `categorias` y 8 a 15 `productos` reales de su carta. Las variantes (`Tamaño`, `Cantidad`, `Sabor`) suman `priceDelta` al precio base. `required: true` obliga a elegir una opción.
   - `pedidoMinimo` en pesos (0 = sin mínimo), `tiempoEstimadoMin`, `modalidades` y `mediosPago`.
   - Opcional: `mapsUrl` por sucursal si el link automático de Google Maps no encuentra bien la dirección.

3. **Logo y fotos**: reemplazá `public/tenants/la-oma/logo.svg` (o apuntá `logo` a un `.png`/`.jpg`). Las fotos van en la misma carpeta y se referencian como `"image": "/tenants/la-oma/ñoquis.jpg"`. Sin fotos, la carta usa placeholders con el color del negocio y se ve bien igual.

   > Fotos sacadas del Instagram del negocio: **solo en demos privadas**, nunca en los tenants públicos de ejemplo.

4. **Validar**: `npm run validate-tenants` muestra errores por campo (ids repetidos, categorías inexistentes, WhatsApp mal escrito, archivos que faltan) y avisos de contraste.

5. **Publicar**: commit y push. Vercel redeploya y la demo queda en `https://demo.beecodelab.com/pedidos/la-oma`. Las páginas se generan en el build, así que un tenant nuevo aparece recién después del deploy.

## Cómo mostrar la demo

1. Mandá el link de la carta. El cliente arma un pedido y toca "Enviar pedido": se abre WhatsApp con el mensaje listo, dirigido al número de la sucursal elegida. (En la demo, el número es el del negocio; avisale que le va a llegar un mensaje de prueba, o usá tu número mientras la presentás).
2. Después, abrí `/admin` **en el mismo celular** con el PIN: el pedido aparece arriba de todo, junto con 8 pedidos de ejemplo del día.
3. Mostrá cómo cambiar estados y marcar un producto agotado (desaparece de la carta al instante).
4. "Reiniciar demo" vuelve todo al estado inicial.

**Limitación a explicar:** el panel solo ve los pedidos hechos en ese mismo navegador porque todo vive en `localStorage`. "En la versión real, el panel recibe los pedidos desde cualquier celular". El argumento central no cambia: el pedido llega ordenado a su WhatsApp.

## Stack

Next.js 16 (App Router) · TypeScript estricto · Tailwind CSS 4 · zod 4 · date-fns + date-fns-tz (`America/Argentina/Tucuman`) · Vitest. Sin backend ni base de datos.

## Arquitectura

```
app/
  pedidos/[slug]/layout.tsx          # carga y valida el tenant (servidor), inyecta colores, provider
  pedidos/[slug]/page.tsx            # carta
  pedidos/[slug]/checkout/page.tsx   # checkout
  pedidos/[slug]/admin/page.tsx      # panel
  robots.ts                          # Disallow: /
components/
  pedidos/                           # carta, detalle, carrito, checkout, provider
  pedidos/admin/                     # panel del dueño
  ui/                                # Sheet (<dialog> nativo), QtyStepper, footer (compartidos con turnos)
lib/
  pedidos/schema.ts                  # schema zod + tipos (TenantPedidosConfig, Order...)
  pedidos/cart.ts                    # cálculos puros: precios, carrito, envío, mínimo
  pedidos/schedule.ts                # abierto/cerrado, próxima apertura, turnos para programar
  pedidos/status.ts                  # estados del pedido y contadores del día
  repositories/                      # OrderRepository, AvailabilityRepository, CartRepository
  seed/pedidos.ts                    # pedidos de ejemplo (determinísticos por día)
  storage.ts                         # localStorage/sessionStorage seguro con fallback en memoria
  tenants.ts                         # lectura de tenants/*.json (solo servidor y scripts)
  whatsapp.ts                        # mensaje del pedido y links wa.me (compartido)
  color.ts                           # contraste WCAG para los colores del tenant
scripts/
  new-tenant.ts, validate-tenants.ts
tenants/
  _template-pedidos.json, pastas-demo.json, empanadas-demo.json
```

Decisiones:

- **Toda la lógica de negocio en `lib/`, como funciones puras con tests.** Los componentes solo muestran y llaman.
- **Persistencia detrás de interfaces.** Ningún componente toca `localStorage`; los repositorios usan `lib/storage.ts`, que envuelve cada acceso en try/catch y cae a memoria (modo incógnito, cuota llena). Para pasar a un backend real alcanza con otra implementación de `OrderRepository` y `AvailabilityRepository`.
- **El carrito guarda ids, no precios.** El precio se recalcula siempre contra la carta actual, así que un cambio en el JSON nunca deja un total viejo. Las líneas de productos que ya no existen se descartan.
- **Disponibilidad:** el JSON define el valor inicial y el panel lo pisa. Las pestañas abiertas se enteran al instante (evento `storage`).
- **Horarios:** una ventana por día; soporta cierres después de medianoche. Si la sucursal está cerrada, el checkout obliga a programar el pedido en un turno de la próxima apertura (cada 30 min).
- **Mensaje de WhatsApp:** formato fijo con negritas de WhatsApp. Si el link supera 2000 caracteres se recortan notas y referencia de a poco, nunca los productos. El texto que escribe el cliente se limpia de `* _ ~` para no romper el formato.
- **IDs de pedido** tipo `A-1042`: la letra es la sucursal (A, B, C...) y el número es correlativo.
- **Modales** con `<dialog>` nativo (`showModal`): foco atrapado y Escape sin librerías. Cierre tocando afuera con `closedby="any"` y fallback para Safari.
- **No indexable:** meta `noindex, nofollow`, header `X-Robots-Tag` y `robots.txt` con `Disallow: /`.

## Calidad

- 31 tests (Vitest): subtotal, variantes, envío por zona, mínimo, abierto/cerrado (incluida la medianoche), turnos, formato y recorte del mensaje, validación de tenants, seed y repositorios.
- Probado de punta a punta con Playwright a 375 px: búsqueda, agotados, variantes obligatorias, carrito persistente, checkout con validaciones, mínimo, sucursal cerrada con pedido programado, link de WhatsApp a la sucursal correcta, panel (PIN, estados, agotados, reinicio). Sin scroll horizontal ni errores de consola.
- Lighthouse mobile (build de producción): carta 97 de performance y 100 de accesibilidad; checkout 98 y 100.

## Deploy en Vercel

1. Importar el repo en Vercel (framework: Next.js, sin variables de entorno).
2. Agregar el dominio `demo.beecodelab.com` en Settings → Domains y crear el CNAME que indica Vercel.
3. Cada push a `main` redeploya. `npm run build` falla si un tenant tiene errores, así que una demo rota nunca llega a producción.

## Fuera de alcance

Pagos online, integración con PedidosYa, backend, stock por cantidad, facturación, seguimiento del delivery, cuentas de clientes y notificaciones.

---

Demo creada por [BeeCode](https://beecodelab.com).
