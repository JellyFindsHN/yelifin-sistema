# Multi-Org Migration — Estado del Trabajo

> **Rama:** `feat/multi-org-migration`  
> **Última sesión:** 30 de mayo de 2026  
> **Estado:** Migración completa. Pendiente solo: sidebar nav por permisos de rol, flujo de invitación por email (futuro).

---

## Lo que ya está hecho

### Base de datos

| Script | Descripción | Ejecutado en Neon |
|--------|-------------|-------------------|
| `v4-multi-org-infrastructure.sql` | Crea `organizations`, `org_roles`, `org_role_permissions`, `organization_members`, `org_subscriptions`. Migra todos los usuarios existentes a su propia org con rol "Dueño" y suscripción migrada. | ✅ |
| `v4.1-add-org-id-to-data-tables.sql` | Agrega `org_id` (nullable → NOT NULL) a las 24 tablas de datos. Popula desde `user_id`. Actualiza UNIQUE constraints e índices. | ✅ |
| `v4.2-add-audit-fields.sql` | Agrega `created_by` y `updated_by` (FK → users) a las 24 tablas. Backfill de `created_by = user_id` en registros existentes. | ✅ |

### Modelo de roles

- Roles **personalizados por organización** (no fijos) — el OWNER crea roles con nombre libre (Cajero, Bodeguero, Contador, etc.)
- Permisos por rol y módulo: `can_view`, `can_edit`, `can_delete`, `show_costs`, `show_profit`
- El OWNER identificado en `organizations.owner_user_id` tiene bypass total en el código
- Al crear una org se genera automáticamente el rol "Dueño" con todos los permisos activados

### `lib/auth.ts`

- `AuthUser` ahora incluye: `orgId`, `roleId`, `roleName`, `isOwner`
- `verifyAuth()` resuelve la org y rol del usuario en un solo query con JOINs
- `verifySubscription(orgId)` usa `org_subscriptions`
- `verifyFeatureAccess(orgId, featureKey)` usa `org_subscriptions`
- `verifyResourceLimit(orgId, type)` simplificado — ya no recibe `userId`, usa `org_id` en conteos
- `verifyModuleAccess(auth, module, permission)` — verifica un permiso puntual con bypass para OWNER
- `getModulePermissions(auth, module)` — retorna los 5 flags para condicionar qué datos se exponen
- `getOrgTimezone(orgId)` — helper que reemplaza la consulta a `user_profile`
- `ensureOrgExists(userId, name, ...)` — crea org + rol + membership + suscripción para usuarios nuevos

### API Routes (58 archivos migrados)

Todos los routes en `app/api/` (excepto admin) fueron migrados:

- `const { userId, orgId } = auth.data` en cada handler
- `WHERE user_id = ${userId}` → `WHERE org_id = ${orgId}` en todas las queries de lectura
- INSERT: columna `user_id` → `org_id` + agrega `created_by = ${userId}`
- UPDATE iniciado por usuario: agrega `updated_by = ${userId}` en SET
- UPDATE de sistema (balance, stock): solo cambia WHERE a `org_id`, sin `updated_by`
- Timezone: consulta migrada de `user_profile` a `organizations`
- Advisory lock en ventas: `pg_advisory_xact_lock(${userId})` → `pg_advisory_xact_lock(${orgId})`
- Sale number sequence ahora es por org (no por usuario)

### Login route

- Llama `ensureOrgExists()` como fallback — si un usuario no tiene org la crea automáticamente
- Retorna `org.id` y `role` en la respuesta de login

---

## Lo que falta

### 1. ~~Ejecutar scripts SQL en Neon~~ ✅

---

### 2. ~~Rutas admin~~ ✅

- `admin/users` y `admin/users/[id]` — migrados a `org_subscriptions` + `org_id`
- `admin/stats` — migrado a `org_subscriptions` (cuenta orgs, no user_subscriptions)
- `admin/storage` — migrado a `org_id` en query de topUsers
- `admin/plans` y `admin/plans/[id]` — sin cambios necesarios (datos de plataforma)
- Sidebar — usa `org.name` y `org.logo_url` como fallback para miembros sin business_name

---

### 3. ~~UI de gestión de organización~~ ✅

| Pantalla | Ruta | Estado |
|----------|------|--------|
| Perfil de organización | `/settings/organization` | ✅ Migrado a `/api/organization` |
| Gestión de miembros | `/settings/members` | ✅ Nuevo |
| Gestión de roles | `/settings/roles` | ✅ Nuevo |
| Invitación | `/invite/[token]` | ⬜ Pendiente (requiere flujo de email) |

Sidebar actualizado: "Equipo" y "Roles" visibles solo para `isOwner`.

APIs implementadas ✅:
- `GET/PATCH /api/organization` — perfil de la org
- `GET/POST /api/organization/members` — listar e invitar miembros (por email directo)
- `PATCH/DELETE /api/organization/members/[id]` — cambiar rol / revocar acceso
- `GET/POST /api/organization/roles` — listar y crear roles con permisos
- `PATCH/DELETE /api/organization/roles/[id]` — editar y eliminar roles

APIs pendientes:
- `POST /api/organization/invite` — enviar email de invitación (requiere servicio de email)
- `POST /api/organization/invite/accept` — aceptar invitación con token

---

### 4. Flujo de invitación por email

- El OWNER ingresa el email del nuevo miembro
- Se genera un token único y se envía por email (Firebase o servicio externo)
- El invitado hace clic en el link → se registra o hace login → se une a la org con el rol asignado
- Token debe expirar (ej: 48 horas)

Tabla sugerida:
```sql
CREATE TABLE org_invitations (
  id         BIGSERIAL PRIMARY KEY,
  org_id     BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id    BIGINT NOT NULL REFERENCES org_roles(id) ON DELETE CASCADE,
  email      VARCHAR(255) NOT NULL,
  token      VARCHAR(255) UNIQUE NOT NULL,
  invited_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

### 5. ~~Contexto de org en el cliente~~ ✅

- `useMe()` expone: `orgId`, `roleId`, `isOwner`, `org`, `role`, `permissions`, `getModulePermissions(module)`
- `useModulePermissions(module)` — hook standalone que retorna los 5 flags + `isLoading`
- `/api/auth/me` GET migrado a `org_subscriptions` + agrega `org`, `role`, `permissions` en respuesta
- `types/index.ts` — agregados `OrgModule`, `ModulePermissions`, `OrgInfo`, `OrgRole`, `OrgMember`, `OrgPermissions`

---

### 6. Selector de org (multi-org futuro)

Si en el futuro un usuario pertenece a múltiples orgs:
- Agregar selector de org activa en el header
- Pasar `X-Org-ID` header en requests o almacenar en cookie
- Modificar `verifyAuth()` para leer el org activo del header/cookie en lugar de tomar el primero

Por ahora `verifyAuth()` toma la primera org ordenada por `joined_at ASC` — suficiente para el caso 1 usuario = 1 org.

---

### 7. Limpiar `user_id` como tenant key (Fase 5 — futuro)

Una vez que todo el código funciona con `org_id`, se puede eliminar `user_id` como tenant key de las tablas de datos. Por ahora se mantiene como referencia histórica.

El campo quedó como `created_by` en el sentido conceptual — pero la columna `user_id` original sigue existiendo hasta que se decida hacer el DROP en una migración futura.
