-- v4.3 — Agrega DASHBOARD como módulo de permisos
-- Ejecutar en Neon una sola vez.

-- 1. Actualizar el CHECK constraint para incluir DASHBOARD
ALTER TABLE org_role_permissions
  DROP CONSTRAINT IF EXISTS org_role_permissions_module_check;

ALTER TABLE org_role_permissions
  ADD CONSTRAINT org_role_permissions_module_check
  CHECK (module IN (
    'DASHBOARD', 'PRODUCTS', 'INVENTORY', 'SALES', 'CUSTOMERS',
    'FINANCES', 'EVENTS', 'REPORTS', 'ADMIN'
  ));

-- 2. Insertar DASHBOARD con acceso total para roles de dueño
INSERT INTO org_role_permissions (role_id, module, can_view, can_edit, can_delete, show_costs, show_profit)
SELECT r.id, 'DASHBOARD', TRUE, TRUE, TRUE, TRUE, TRUE
FROM org_roles r
WHERE r.is_owner = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM org_role_permissions
    WHERE role_id = r.id AND module = 'DASHBOARD'
  );

-- 3. Insertar DASHBOARD con acceso denegado para roles personalizados existentes
INSERT INTO org_role_permissions (role_id, module, can_view, can_edit, can_delete, show_costs, show_profit)
SELECT r.id, 'DASHBOARD', FALSE, FALSE, FALSE, FALSE, FALSE
FROM org_roles r
WHERE r.is_owner = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM org_role_permissions
    WHERE role_id = r.id AND module = 'DASHBOARD'
  );
