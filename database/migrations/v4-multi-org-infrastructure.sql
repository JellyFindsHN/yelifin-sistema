-- ============================================================
-- MIGRACIÓN v4: INFRAESTRUCTURA MULTI-ORGANIZACIÓN
-- Fecha: 2026-05-29
-- ============================================================
-- SEGURO DE EJECUTAR EN PRODUCCIÓN:
--   - No elimina ni modifica datos existentes.
--   - Todas las tablas se crean con IF NOT EXISTS.
--   - Los INSERT de migración son idempotentes.
-- ORDEN DE EJECUCIÓN: ejecutar completo, de arriba hacia abajo.
-- ============================================================

-- ============================================================
-- PASO 1: organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id            BIGSERIAL    PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(120) UNIQUE,
  logo_url      TEXT,
  timezone      VARCHAR(64)  NOT NULL DEFAULT 'America/Tegucigalpa',
  currency      VARCHAR(3)   NOT NULL DEFAULT 'HNL',
  locale        VARCHAR(16)  NOT NULL DEFAULT 'es-HN',
  owner_user_id BIGINT       NOT NULL REFERENCES users(id),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug  ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_user_id);

-- ============================================================
-- PASO 2: org_roles — roles personalizados por organización
-- El OWNER siempre tiene un rol de sistema creado automáticamente.
-- Los demás roles los crea el OWNER (Cajero, Bodeguero, Contador, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS org_roles (
  id         BIGSERIAL    PRIMARY KEY,
  org_id     BIGINT       NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  is_owner   BOOLEAN      NOT NULL DEFAULT FALSE, -- solo el rol de sistema del dueño
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON org_roles(org_id);

-- ============================================================
-- PASO 3: org_role_permissions
-- Permisos por rol y módulo.
-- show_costs  → puede ver costos unitarios, precios de compra
-- show_profit → puede ver ganancias, márgenes
-- Un "Bodeguero" tendría can_view=true en INVENTORY pero
-- show_costs=false y show_profit=false
-- ============================================================

CREATE TABLE IF NOT EXISTS org_role_permissions (
  id          BIGSERIAL   PRIMARY KEY,
  role_id     BIGINT      NOT NULL REFERENCES org_roles(id) ON DELETE CASCADE,
  module      VARCHAR(50) NOT NULL CHECK (module IN (
    'PRODUCTS', 'INVENTORY', 'SALES', 'CUSTOMERS',
    'FINANCES', 'EVENTS', 'REPORTS', 'ADMIN'
  )),
  can_view    BOOLEAN     NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN     NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN     NOT NULL DEFAULT FALSE,
  show_costs  BOOLEAN     NOT NULL DEFAULT FALSE,
  show_profit BOOLEAN     NOT NULL DEFAULT FALSE,
  UNIQUE (role_id, module)
);

CREATE INDEX IF NOT EXISTS idx_org_role_perms_role ON org_role_permissions(role_id);

-- ============================================================
-- PASO 4: organization_members
-- Vincula usuarios a orgs con un rol personalizado (role_id).
-- El OWNER identificado en organizations.owner_user_id
-- tiene acceso total en el código, independiente de permisos.
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id         BIGSERIAL PRIMARY KEY,
  org_id     BIGINT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    BIGINT    NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
  role_id    BIGINT    NOT NULL REFERENCES org_roles(id)     ON DELETE RESTRICT,
  is_active  BOOLEAN   NOT NULL DEFAULT TRUE,
  invited_at TIMESTAMP,
  joined_at  TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org  ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ============================================================
-- PASO 5: org_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS org_subscriptions (
  id                       BIGSERIAL   PRIMARY KEY,
  org_id                   BIGINT      NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                  BIGINT      NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status                   VARCHAR(20) NOT NULL DEFAULT 'TRIAL'
                             CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED')),
  trial_start_date         TIMESTAMP,
  trial_end_date           TIMESTAMP,
  current_period_start     TIMESTAMP,
  current_period_end       TIMESTAMP,
  cancel_at_period_end     BOOLEAN     NOT NULL DEFAULT FALSE,
  cancelled_at             TIMESTAMP,
  provider                 VARCHAR(30) CHECK (provider IN ('STRIPE','PAYPAL','MANUAL','NONE')),
  provider_customer_id     TEXT,
  provider_subscription_id TEXT,
  created_at               TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org    ON org_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON org_subscriptions(status);

-- ============================================================
-- MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================

-- PASO 6: Crear una organización por cada usuario existente
-- Toma business_name de user_profile; si no tiene, usa display_name o email.

INSERT INTO organizations (name, slug, timezone, currency, locale, owner_user_id, created_at, updated_at)
SELECT
  COALESCE(NULLIF(TRIM(up.business_name), ''), u.display_name, u.email),
  LOWER(
    REGEXP_REPLACE(
      COALESCE(NULLIF(TRIM(up.business_name), ''), u.display_name, u.email),
      '[^a-z0-9]+', '-', 'gi'
    )
  ) || '-' || u.id,
  COALESCE(up.timezone, 'America/Tegucigalpa'),
  COALESCE(up.currency, 'HNL'),
  COALESCE(up.locale, 'es-HN'),
  u.id,
  u.created_at,
  u.created_at
FROM users u
LEFT JOIN user_profile up ON up.user_id = u.id
WHERE u.id NOT IN (SELECT owner_user_id FROM organizations);

-- PASO 7: Crear el rol "Dueño" (is_owner=true) para cada organización.
-- Este rol tiene acceso total y es el que se asigna al fundador.

INSERT INTO org_roles (org_id, name, is_owner, created_at, updated_at)
SELECT o.id, 'Dueño', TRUE, o.created_at, o.created_at
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM org_roles WHERE org_id = o.id AND is_owner = TRUE
);

-- PASO 8: Agregar todos los permisos al rol "Dueño" (acceso total a todos los módulos)

INSERT INTO org_role_permissions (role_id, module, can_view, can_edit, can_delete, show_costs, show_profit)
SELECT
  r.id,
  m.module,
  TRUE, TRUE, TRUE, TRUE, TRUE
FROM org_roles r
CROSS JOIN (VALUES
  ('PRODUCTS'), ('INVENTORY'), ('SALES'), ('CUSTOMERS'),
  ('FINANCES'), ('EVENTS'), ('REPORTS'), ('ADMIN')
) AS m(module)
WHERE r.is_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM org_role_permissions
    WHERE role_id = r.id AND module = m.module
  );

-- PASO 9: Agregar al owner de cada org como miembro con el rol "Dueño"

INSERT INTO organization_members (org_id, user_id, role_id, joined_at, created_at)
SELECT o.id, o.owner_user_id, r.id, o.created_at, o.created_at
FROM organizations o
JOIN org_roles r ON r.org_id = o.id AND r.is_owner = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members
  WHERE org_id = o.id AND user_id = o.owner_user_id
);

-- PASO 10: Migrar suscripciones activas a org_subscriptions

INSERT INTO org_subscriptions (
  org_id, plan_id, status,
  trial_start_date, trial_end_date,
  current_period_start, current_period_end,
  cancel_at_period_end, cancelled_at,
  provider, provider_customer_id, provider_subscription_id,
  created_at, updated_at
)
SELECT DISTINCT ON (o.id)
  o.id,
  us.plan_id,
  us.status,
  us.trial_start_date,
  us.trial_end_date,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  us.cancelled_at,
  us.provider,
  us.provider_customer_id,
  us.provider_subscription_id,
  us.created_at,
  us.updated_at
FROM user_subscriptions us
JOIN organizations o ON o.owner_user_id = us.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM org_subscriptions WHERE org_id = o.id
)
ORDER BY o.id, us.created_at DESC;

-- ============================================================
-- VERIFICACIÓN DE INTEGRIDAD
-- Todos los conteos deben ser iguales (un registro por usuario).
-- ============================================================

SELECT
  (SELECT COUNT(*) FROM users)                                   AS total_users,
  (SELECT COUNT(*) FROM organizations)                           AS total_orgs,
  (SELECT COUNT(*) FROM org_roles        WHERE is_owner = TRUE)  AS total_owner_roles,
  (SELECT COUNT(*) FROM organization_members)                    AS total_memberships,
  (SELECT COUNT(*) FROM org_subscriptions)                       AS total_org_subs;

-- Usuarios sin organización (debe devolver 0 filas):
SELECT u.id, u.email FROM users u
WHERE u.id NOT IN (SELECT owner_user_id FROM organizations);

-- Organizaciones sin suscripción:
SELECT o.id, o.name FROM organizations o
WHERE o.id NOT IN (SELECT org_id FROM org_subscriptions);
