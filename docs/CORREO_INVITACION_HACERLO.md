# Correo de invitación · HACERLO — Fábrica del Comportamiento

**Estado:** diseño preparado en GitHub; metadatos dinámicos desplegados en la función de invitación de Supabase. **La plantilla de correo de Supabase Auth alojado solo cambia cuando se configura en el Dashboard o en la API de administración.** Un commit en GitHub no modifica por sí solo el correo que envía Supabase.

## Lenguaje de marca aplicado

Basado en el aplicativo y los documentos internos de HACERLO:

- Nombre: **HACERLO — Fábrica del Comportamiento**.
- Propósito: **Creamos sistemas organizacionales inteligentes.**
- Orientación: **de la evidencia a la acción**; conectar evidencia y decisiones.
- Metodología de cinco momentos: **Resultados · Diseño · Análisis · Implementación · Medición**.
- Mensaje al invitado: trabajar en el espacio de su empresa para comprender comportamientos y audiencias, diseñar intervenciones, analizar sistemas y medir avances.

Se conservó el símbolo **✣ HACERLO** de la interfaz actual. El correo no depende de una fuente externa o una imagen que pueda bloquear el cliente de correo.

## Plantilla lista para Supabase Auth

- **Asunto**: `Te damos la bienvenida a HACERLO · Activa tu acceso`
- **Archivo HTML**: `supabase/templates/invite.html`
- **Botón**: `Activar mi acceso a HACERLO`
- **URL segura**: `{{ .ConfirmationURL }}` (no modificar el marcador).
- **Empresa**: `{{ .Data.organization_name }}` (la función segura consulta el nombre real en `public.organizations`).
- **Rol**: `{{ .Data.role_label }}` (Administrador, Editor o Consulta).

## Activación necesaria en el proyecto alojado

1. Abre [Supabase · Authentication → Email Templates](https://supabase.com/dashboard/project/mflakxgdkpuhemgslgsa/auth/templates).
2. Selecciona **Invite user**.
3. Cambia el asunto por el indicado arriba.
4. Copia el contenido completo de `supabase/templates/invite.html` en el cuerpo **HTML** y guarda.
5. Comprueba que el redireccionamiento a `https://santiagoleonlopezs-png.github.io/Hacerlo/` esté permitido en **Authentication → URL Configuration**.
6. Envía una invitación de prueba a un correo de prueba que no tenga cuenta. Confirma que aparece la fábrica, el rol y el formulario para crear contraseña.

No se requiere enviar contraseñas ni datos sensibles por email. El enlace es de un solo uso y puede expirar.

**Nota de funcionamiento:** el sistema envía un correo de Supabase a cuentas nuevas; en cuentas ya existentes únicamente asigna la membresía, sin correo automático. Si se desea cambiar el remitente del correo por un dominio de HACERLO se debe configurar SMTP de marca, por separado.

**Documentación oficial:** https://supabase.com/docs/guides/auth/auth-email-templates
