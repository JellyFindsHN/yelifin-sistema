# Plan: Plan "Business" — POS de mostrador para comercio real

> Estado: **solo documentado**. Nada implementado — no se toca código ni se crea ninguna
> migración hasta que se pida explícitamente. Este documento es la referencia para retomarlo
> más adelante.

## Motivación

El POS actual (`app/api/sales/route.ts`, `components/sales/pos/*`) está pensado para catálogos
chicos con venta táctil: tocar producto → carrito → una cuenta destino → un método de pago
inferido del tipo de cuenta. Funciona bien para artesanos/eventos/servicios, pero no ajusta a
un comercio de mostrador (minimarket, farmacia, ferretería, etc.):

- **Sin código de barras.** `products` no tiene columna `barcode`; `product-grid.tsx` es
  100% tap-to-add. Con 200+ SKU no es operable.
- **Un solo método de pago, sin efectivo/vuelto.** `sale-options-panel.tsx` ni siquiera pide
  método de pago explícito — lo infiere del tipo de cuenta (`ACCOUNT_TYPE_TO_PAYMENT`). No hay
  pago mixto real ni cálculo de vuelto.
- **Sin caja.** No hay apertura/cierre, arqueo, ni reporte por cajero/turno.
- **Cancelación todo-o-nada.** `cancel-sale-dialog.tsx` anula la venta completa; no hay
  devolución parcial por línea con reintegro al medio de pago original.
- **`sale_number` no es fiscal.** Es un correlativo interno (`VTA-00001`); no hay CAI
  (rangos autorizados por el SAR) para facturar legalmente en Honduras.
- **Sin crédito a clientes.** `credit_limit` solo existe en `credit_cards` (pasivo del
  negocio). Toda venta debe pagarse contra una cuenta de inmediato — no hay "fiar".

## Decisión de arquitectura: misma app, misma base de datos

Se evaluaron tres opciones (ver hilo de la sesión de planificación) y se descartaron las que
requerían una segunda base de datos:

1. ~~Proyecto y base de datos separados~~ — descartado. Una factura, un cierre de caja o una
   devolución necesitan referenciar `sales`, `sale_items`, `products`, `accounts`, `customers`
   con integridad referencial y dentro de la misma transacción atómica que hoy usa
   `POST /api/sales` (`BEGIN`/`COMMIT` en `app/api/sales/route.ts:492-667`). Con dos bases se
   pierde eso y hay que inventar una capa de sincronización solo para evitar extender un schema
   que ya está ahí.
2. ~~Proyecto separado, misma base de datos~~ — es el patrón que **ya existe** para
   `hikonta-admin` y `hikonta-partners` (ver `admin-panel-architecture.md`,
   `partner-dashboard-architecture.md`): repo hermano, subdominio propio, mismo `DATABASE_URL`.
   Se descartó para Business porque esos paneles comparten *casi nada* de UI con el producto
   principal (admin es god-mode de plataforma, partners es un dashboard de afiliados) — separarlos
   reduce superficie de ataque sin duplicar trabajo. Business, en cambio, es el mismo POS +
   productos + clientes + inventario que ya existe, con capas adicionales encima. Separarlo en
   otro repo duplicaría el 90% del código compartido (auth, productos, inventario, FIFO) sin
   ninguna ganancia de seguridad equivalente.
3. **Elegido: una sola app (`yelifin-sistema`), una sola base de datos.** Tablas nuevas con
   `org_id` como todas las demás, activadas por plan/feature flag — mismo mecanismo que ya usa
   el resto del producto.

## Subdominio: alias del mismo despliegue, no un proyecto nuevo

`proxy.ts` ya resuelve enrutamiento por plan (`RESTRICTED_PLANS` / `PLAN_HOME`, líneas 117-128;
hoy usado por el plan `finanzas`). Para Business:

- `business.hikonta.com` es un dominio adicional apuntando al **mismo** proyecto de Vercel.
- La cookie `hikonta_session` (`proxy.ts:160`) se emite con `domain: .hikonta.com` para que
  la sesión funcione en ambos subdominios sin re-login.
- Se agrega una regla más en `proxy.ts`, mismo patrón que `enforcePlanRules`: si
  `plan_slug === 'business'` y el host no es `business.*`, redirige; y viceversa.

## Feature-gating: extender el catálogo existente, no inventar uno nuevo

`subscription_plans` / `system_features` / `plan_features`
(`database/Inserts/plans-and-suscriptions.sql`) ya es el catálogo de features por plan, con
`verifyFeatureAccess()` / `requireFeature()` en `lib/auth.ts` y `components/shared/feature-gate.tsx`
en el frontend. Para Business se agrega:

- Plan nuevo `business` en `subscription_plans`.
- Features nuevas en `system_features`: `sales.barcode`, `sales.cash_register`,
  `sales.split_payment`, `sales.returns`, `sales.invoicing_cai`, `customers.credit_accounts`.
- `plan_features` las activa solo para `business` (y para `admin`, que ya tiene bypass total).

## Modelo de datos propuesto (mismo Postgres, todo con `org_id`)

| Tabla | Para qué |
|---|---|
| `products.barcode` (o `product_barcodes` si un producto necesita varios códigos) | Escaneo en el POS |
| `cash_registers` | Puntos de emisión (caja 1, caja 2…), ligada a `warehouse_id` |
| `cash_register_sessions` | Apertura/cierre: `opened_by`, `opening_amount`, `closed_by`, `closing_amount_declared`, `expected_amount`, `difference`, `status` |
| `cash_register_movements` | Entradas/salidas de efectivo manuales dentro de una sesión (retiros, fondos) |
| `sale_payments` | Reemplaza el pago único actual (`sales.payment_method`) por líneas `{sale_id, method, amount, account_id}` → pago mixto real |
| `fiscal_ranges` | Rangos CAI: código, `range_start`/`range_end`, correlativo actual, fecha de vencimiento |
| `sale_returns` / `sale_return_items` | Devoluciones parciales, con reintegro a `accounts`/`sale_payments` |
| `customers.credit_limit`, `customers.credit_balance` + `customer_payments` | Ventas al fiado / abonos |

Todas con `org_id` y FKs normales a `sales`/`customers`/`products` — la venta sigue siendo una
sola transacción atómica.

## Fases sugeridas (orden de construcción, no de este documento)

1. **Caja + cobro real**: `cash_registers`, `cash_register_sessions`, `sale_payments`
   (mixto + vuelto), `products.barcode`.
2. **Post-venta**: `sale_returns` con reintegro parcial.
3. **Crédito a clientes**: `credit_limit`/`credit_balance` + `customer_payments`.
4. **Fiscal**: `fiscal_ranges` + numeración CAI en factura/ticket.
5. **UX dedicada**: ruta `app/(business)/` para pantallas que no aplican a otros planes
   (apertura/cierre de caja, config de CAI); subdominio activo.

## Explícitamente fuera de alcance (por ahora)

- Modo offline / PWA para el mostrador sin internet.
- Multi-caja concurrente en tiempo real (2 cajeros cobrando a la vez) — las fases de arriba
  ya lo permiten a nivel de datos (`cash_registers` es 1:N por org), pero no hay UI de
  "selecciona tu caja al iniciar turno" planeada todavía.
- Impresión fiscal directa a hardware (impresora fiscal certificada) — se asume ticket
  térmico genérico como hoy (`app/(print)/sales/[id]/receipt/page.tsx`), con el número de
  factura/CAI impreso como dato, no integración con un dispositivo fiscal.

## Pendiente

- [ ] Validar con un contador/asesor fiscal el formato exacto que exige el SAR para el CAI
  impreso en el ticket (no solo el número de rango).
- [ ] Decidir si `sale_payments` reemplaza a `sales.payment_method`/`sales.account_id` o
  coexiste con ellos (compatibilidad con ventas ya creadas antes de esta migración).
- [x] Precio y límites del plan `business` en `subscription_plans` — ver investigación de
  mercado abajo. ~~Propuesto inicialmente: $39 USD/mes~~ → **revisado a $29 USD/mes**
  (≈ L 750/mes) tras validar contra el precio exacto de Ventix. Ver "Revisión" al final.

## Investigación de mercado — precio del plan Business

Comparado contra competidores directos en Honduras (mismo requisito de CAI/SAR) y referentes
regionales LatAm, excluyendo POS globales (Square, Clover, Lightspeed) por no ser comparables
reales — son de mercado EEUU/Canadá y cobran % por transacción además de la mensualidad, algo
que HiKonta no hace.

**Honduras (competencia directa):**

| Producto | Plan | Precio/mes |
|---|---|---|
| Ventix | Pro | $20 |
| Ventix | Enterprise | $60 |
| QuickERP | Pyme (recomendado) | $29 |
| QuickERP | Standard | $50 |
| QuickERP | Pro | $130 |
| IOplat | Entrada | desde $5 |

**LatAm (referencia regional, mismo tipo de negocio):**

| Producto | Plan | Precio/mes (aprox. a USD) |
|---|---|---|
| Alegra POS | Pro | ~$20 (399 MXN) |
| Alegra POS | Gastrobar (tope) | ~$32 (599 MXN) |
| Alegra Facturación | Plus (tope) | ~$38 (699 MXN) |
| Siigo | Emprendedor (con inventario) | ~$47 |
| Loyverse | Core + Inventario avanzado | ~$34 ($5 + $29) |

**Conclusión:** la banda real de un plan completo (POS + inventario + facturación fiscal, sin
cobrar % por transacción) en este mercado es **$20-$50/mes**, con el "punto dulce" de los
planes tope en **$29-$38**. **$39/mes** cae justo en la parte alta de ese punto dulce —por
encima de Alegra Gastrobar/Plus y QuickERP Pyme, por debajo de los techos locales (QuickERP
Pro $130, Ventix Enterprise $60, Siigo Premium ~$50)— y se justifica porque empaqueta CAI/SAR +
código de barras + caja + multi-bodega + crédito a clientes, algo que ningún competidor local
resuelve completo en un solo producto.

El salto Pro→Business ($12.99 → $39, ~3x) es grande pero no atípico en este mercado — QuickERP
salta 2.6x entre sus dos tiers intermedios (Pyme→Standard). Se justifica porque no es "más
límite", es una categoría de producto distinta (mostrador real + fiscal).

Pendiente de decidir, no del precio en sí:
- [ ] Mostrar el precio también en Lempiras en `landing-pricing.tsx`, igual que hace Ventix
  (USD y HNL).
- [ ] Descuento por pago anual — todos los competidores lo ofrecen (Alegra 25%, Ventix 20%,
  QuickERP 10%). Ninguno de los planes actuales de HiKonta (`landing-pricing.tsx`) tiene
  facturación anual todavía.

## Revisión — precio bajado de $39 a $29/mes

Validación adicional con el precio **exacto** del competidor hondureño más cercano (Ventix,
con CAI real) y el contexto de poder adquisitivo local cambió la recomendación:

**Ventix (Honduras, con CAI) — planes reales:**

| Plan | Precio | Incluye |
|---|---|---|
| Free | $0 / L 0 | POS básico, CAI, 100 facturas/mes |
| **Pro** | **$20/mes = L 500/mes** | Inventario completo, CRM, multi-bodega, facturación CAI |
| Enterprise | $60/mes = L 1,500/mes | + contabilidad, compras, multi-sucursal, e-commerce |

Ventix Pro ya vende CAI + inventario + multi-bodega por **$20/L500** — prácticamente el mismo
alcance que el plan Business de este documento, menos caja/devoluciones/crédito (que Ventix no
anuncia en ningún tier). Contra ese comparable directo, $39 quedaba a medio camino entre su Pro
y su Enterprise, sin ofrecer todavía lo que justifica el salto a Enterprise (contabilidad,
multi-sucursal).

**Poder adquisitivo (Honduras 2026):** salario mínimo promedio **L 14,917/mes** (~$564 USD),
tipo de cambio ~L 26.4-26.9/USD. $39/mes ≈ L 1,030 (~6.9% de un salario mínimo, solo en
software) vs. $29/mes ≈ L 750 (~5.0%) — diferencia perceptible para el dueño de un comercio
que paga uno o dos salarios mínimos.

**Precio final recomendado: $29 USD/mes (≈ L 750/mes).** Coincide con el tier "recomendado" de
QuickERP ($29 Pyme) y queda justo encima del Pro de Ventix ($20), defendible porque el plan
Business sí trae caja (apertura/cierre/arqueo) y devoluciones parciales que Ventix Pro no
ofrece. Deja espacio de precio hacia arriba para un futuro tier "Enterprise" ($50-60) si se
agrega contabilidad, multi-sucursal o e-commerce más adelante — mismo patrón que ya usa el
mercado local. No bajar de $24.99: por debajo de eso empieza a canibalizar el plan Pro actual
($12.99).
