# HACERLO Admin — implementación multiempresa

Rama de trabajo aislada de `hacerlo-v2-modular`. No desplegar ni modificar datos existentes hasta validar migraciones, RLS y pruebas.

## Diagnóstico verificado
- Frontend estático con Supabase JS 2 en `index.html`.
- `src/core/app.js` usa Supabase Auth (correo/contraseña y recuperación).
- `memberships` ya contiene `organization_id` y `role`.
- `initiatives` usa `organization_id`, `app_state` y grafos relacionados.
- `loadCloud()` toma la primera membresía (`limit(1)`), sin selector de organización.
- Existe respaldo local bajo una clave global `hacerlo_v15_backup`: debe aislarse por usuario y organización y limpiarse al cerrar sesión.
- `syncAll()` y operaciones de grafos requieren auditoría de autorización/RLS y pertenencia de cada iniciativa.

## Contrato funcional MVP
1. HACERLO Admin separado de la fábrica; solo superadministradores explícitos, sin lectura ordinaria de datos de clientes.
2. Una organización = una fábrica vacía. Sin tipos, demos, ni clonación de bases.
3. Crear organización: nombre, correo administrador, vencimiento opcional.
4. Invitar por backend seguro (Supabase Edge Function con service role exclusivamente en servidor); no crear contraseñas ni exponer secretos al navegador.
5. Membresías por usuario/organización y roles admin/editor/lector. Selector solo cuando existen varias membresías.
6. RLS para organizaciones, membresías, iniciativas, nodos, aristas y demás tablas/Storage. Nunca confiar solo en el filtro de UI.
7. Vencimiento bloquea operaciones mediante política del servidor; suspensión, archivo y eliminación con confirmación, auditoría y retención.
8. Migración sin alterar ni borrar la organización actual. Probar con usuarios de organizaciones distintas y validar denegación cruzada.
9. Backups locales segregados por `user_id` y `organization_id`; evitar escritura cruzada al cambiar de fábrica.
10. Revisar funciones externas (hacerlo-engine) para impedir accesos cruzados y privilegios implícitos.

## Orden de implementación
- Inventario de esquema y políticas Supabase actuales (no visibles en este repositorio).
- Migraciones SQL reversibles y políticas RLS.
- Funciones administrativas seguras y auditoría.
- Interfaz Admin e invitaciones.
- Selector de fábrica y aislamiento de estado local.
- Pruebas de seguridad, regresión RDAIM y despliegue controlado.

## Bloqueos
No ejecutar migraciones ni habilitar altas reales hasta verificar esquema, políticas RLS, funciones y permisos de Supabase. Este documento es el primer cambio seguro de la rama, no una implementación operativa.
