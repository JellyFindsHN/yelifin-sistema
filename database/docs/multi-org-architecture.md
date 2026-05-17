# Multi-organización / Multi-usuario por negocio

> **Estado:** Exploración futura. No implementado.  
> **Fecha de análisis:** 17 de mayo de 2026

---

## Contexto

Hoy Konta tiene arquitectura **1 usuario = 1 negocio**. Cada tabla usa `user_id` como clave de aislamiento (tenant key). El objetivo sería convertir el modelo a **1 organización = N usuarios con roles**, donde una empresa puede tener un dueño, admins y empleados con acceso limitado.

---

## Arquitectura actual

```
users (Firebase UID)
  └── user_id ──► products, sales, inventory, accounts,
                  customers, events, supplies, transactions...
                  (25+ tablas, todas filtran por user_id)
```

La suscripción también es por usuario (`user_subscriptions.user_id`).

---

## Modelo objetivo

```
organizations
  ├── organization_members (user → org, con rol)
  └── [todas las tablas migran de user_id → org_id]

users (Firebase UID)
  └── pertenece a una o más organizations con un rol
```

### Flujo de autenticación nuevo

```
Firebase token
  → userId
  → organization_members (¿a qué org pertenece? ¿qué rol tiene?)
  → orgId + role
  → permisos del rol
  → datos de la organización
```

---

## Tablas nuevas necesarias

### `organizations`
```sql
CREATE TABLE organizations (
  id             BIGSERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  slug           VARCHAR(100) UNIQUE,
  logo_url       TEXT,
  timezone       VARCHAR(64) NOT NULL DEFAULT 'America/Tegucigalpa',
  currency       VARCHAR(3)  NOT NULL DEFAULT 'HNL',
  locale         VARCHAR(16) NOT NULL DEFAULT 'es-HN',
  owner_user_id  BIGINT NOT NULL REFERENCES users(id),
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### `organization_members`
```sql
CREATE TABLE organization_members (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(30) NOT NULL CHECK (role IN ('OWNER','ADMIN','CASHIER','VIEWER')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at  TIMESTAMP,
  joined_at   TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, user_id)
);
```

### `org_role_permissions`
Reutiliza `system_features` existente (ya tiene las categorías correctas):
```sql
CREATE TABLE org_role_permissions (
  id          BIGSERIAL PRIMARY KEY,
  org_id      BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role        VARCHAR(30) NOT NULL,
  feature_key VARCHAR(100) NOT NULL REFERENCES system_features(feature_key),
  can_view    BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (org_id, role, feature_key)
);
```

---

## Roles sugeridos

| Rol | Descripción |
|-----|-------------|
| `OWNER` | Creó la org. Acceso total. Gestiona suscripción y miembros. |
| `ADMIN` | Acceso total excepto suscripción y eliminar la org. |
| `CASHIER` | Solo ventas: crear ventas, ver clientes, ver productos. |
| `VIEWER` | Solo lectura en los módulos que el admin le asigne. |

---

## Migración de las 25+ tablas existentes

El cambio más grande: reemplazar `user_id` como tenant key por `org_id`.

### Estrategia recomendada (gradual, sin romper producción)

**Fase 1 — Crear org por usuario existente:**
```sql
-- Crear una org por cada usuario actual
INSERT INTO organizations (name, owner_user_id)
SELECT COALESCE(up.business_name, u.display_name, u.email), u.id
FROM users u
LEFT JOIN user_profile up ON up.user_id = u.id;

-- Agregar a cada usuario como OWNER de su propia org
INSERT INTO organization_members (org_id, user_id, role, joined_at)
SELECT o.id, o.owner_user_id, 'OWNER', NOW()
FROM organizations o;
```

**Fase 2 — Agregar `org_id` a cada tabla (sin borrar `user_id` aún):**
```sql
ALTER TABLE products   ADD COLUMN org_id BIGINT REFERENCES organizations(id);
ALTER TABLE sales      ADD COLUMN org_id BIGINT REFERENCES organizations(id);
ALTER TABLE accounts   ADD COLUMN org_id BIGINT REFERENCES organizations(id);
-- ... repetir para las 25+ tablas
```

**Fase 3 — Poblar `org_id` en datos existentes:**
```sql
UPDATE products p
SET org_id = (SELECT id FROM organizations WHERE owner_user_id = p.user_id);
-- ... repetir para cada tabla
```

**Fase 4 — Hacer `org_id NOT NULL` y cambiar queries a filtrar por `org_id`.**

**Fase 5 — Retirar `user_id` como tenant key** (dejarlo solo como referencia de quién creó el registro si se quiere auditoría).

---

## Cambios en el código

### `lib/auth.ts` — `verifyAuth()`
Hoy devuelve `{ userId }`. Necesitaría devolver también `{ userId, orgId, role }`.

```typescript
// Nuevo flujo
const { userId } = await verifyAuth(request);
const membership = await sql`
  SELECT org_id, role FROM organization_members
  WHERE user_id = ${userId} AND is_active = TRUE
  LIMIT 1
`;
const { org_id: orgId, role } = membership[0];
```

### Todos los API routes
Hoy: `WHERE user_id = ${userId}`  
Futuro: `WHERE org_id = ${orgId}`

Son ~35 archivos en `app/api/`.

### `verifyFeatureAccess()` existente
Ya existe en `lib/auth.ts` y verifica acceso por feature_key. Se extendería para verificar también el rol dentro de la org.

### Middleware / contexto UI
El hook `useMe()` tendría que devolver también `orgId` y `role` para que los componentes puedan mostrar/ocultar funcionalidades.

---

## Implicaciones en suscripción

La suscripción pasaría de `user_subscriptions.user_id` a `org_subscriptions.org_id`. El OWNER es quien paga. Los miembros adicionales podrían ser:
- **Incluidos en el plan** (límite de N miembros por plan), o
- **Con costo adicional por asiento** (modelo por seat)

---

## Esfuerzo estimado

| Área | Complejidad |
|---|---|
| Nuevas tablas DB + migración datos existentes | Alta |
| Reescribir `lib/auth.ts` y middleware | Media-Alta |
| Actualizar ~35 API routes | Muy Alta |
| UI: invitar miembros, asignar roles, gestionar org | Media |
| Firebase: flujo de invitación (magic link / email) | Media |
| **Total estimado** | **3–5 semanas** |

---

## Lo que ya está bien posicionado

- `system_features` con `feature_key` por categoría → base perfecta para permisos por rol
- `verifyFeatureAccess()` ya existe y puede extenderse
- Firebase Auth es flexible para múltiples cuentas por org
- El patrón `user_id` es 100% consistente en toda la DB → migración predecible aunque voluminosa

---

## Próximos pasos cuando se decida implementar

1. Validar modelo de roles con usuarios reales (¿qué necesita un cajero vs. un admin?)
2. Decidir modelo de precios: ¿por org o por asiento?
3. Crear las tablas nuevas y migrar datos existentes en staging
4. Migrar API routes de a módulo (empezar por el más usado, ej. ventas)
5. Agregar UI de gestión de organización
