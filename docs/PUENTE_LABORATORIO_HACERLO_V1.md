# HACERLO ↔ Laboratorio · Puente de evidencia v1

## Decisión arquitectónica
Dos productos independientes con un contrato de intercambio versionado. HACERLO no replica ni ejecuta los juegos. El Laboratorio sigue administrando sus salas, participantes, simulaciones y autenticación.

## Flujo habilitado
1. Un facilitador ejecuta **Radar de Cultura** en Laboratorio y reúne al menos tres respuestas válidas.
2. En el tablero del facilitador, **Llevar resultados a HACERLO** descarga un JSON agregado.
3. En **HACERLO → Implementación → Laboratorio**, el usuario elige la iniciativa e importa ese JSON.
4. La app valida el contrato y escribe en `public.lab_experience_results`, con controles por organización, permisos de edición y unicidad por iniciativa, simulador y sala.
5. **Inteligencia integrada** muestra el perfil y puede incorporarlo en la siguiente interpretación de IA. Una carga nueva cambia la huella del contexto y permite solicitar actualización.
6. Las sugerencias de experiencias por necesidades de la iniciativa siguen siendo orientativas; nunca reemplazan el juicio profesional.

## Contrato v1
```json
{
  "schema": "hacerlo.lab-result/1",
  "simulator_id": "cultura-cvf",
  "session_id": "CODIGO",
  "captured_at": "2026-11-06T00:00:00.000Z",
  "sample_size": 3,
  "scope": "aggregate",
  "methodology": "Adaptación educativa CVF; no equivale al OCAI oficial",
  "data": {
    "orientations": ["Colaborar","Crear","Lograr","Organizar"],
    "current": [25,25,25,25],
    "preferred": [30,20,30,20],
    "dimensions": [
      {"name":"Dimensión 1","current":[25,25,25,25],"preferred":[30,20,30,20]}
    ]
  }
}
```
Nota: en producción hay seis dimensiones y las cuatro ponderaciones por perfil suman aproximadamente 100.

## Estados de procedencia
- `facilitator_export_unverified`: importación realizada por usuario autorizado de HACERLO. **No prueba** que un archivo provenga genuinamente de Firebase. Es el estado real de esta versión.
- `server_verified`: reservado para una futura sincronización autenticada de servidor a servidor. El navegador no puede asignarlo mediante las políticas actuales.

## Seguridad y evidencia
- Solo resultados colectivos de tamaño mínimo 3, sin UID, nombre, correo, documento ni respuestas individuales.
- Cargar un archivo no da acceso a Firebase desde HACERLO.
- Acceso a filas protegido por RLS de Supabase y el vínculo entre iniciativa y organización.
- La IA interpreta perfiles de percepción o métricas de simulación, no confunde esos datos con adopción observada ni infiere causalidad.
- El Radar es una **adaptación educativa independiente**, no un diagnóstico validado del OCAI oficial.
- La tabla de resultados es fuente de verdad; `app_state` puede almacenar una copia de lectura usada para el contexto de IA.

## Evolución prevista sin duplicar plataformas
- Crear adaptadores de salida `hacerlo.lab-result/1` para NEXUS (decisiones, puntajes, deuda y tendencias agregadas), SaberON (conocimiento y resultados por grupo), Talento & Riesgo (decisiones y efectos simulados), SATURNO (coordinación y dependencias), El Flaco (aprendizaje), y Las reglas del juego (cooperación/negociación), preservando sus diferencias metodológicas.
- Vincular la sesión mediante identificadores de iniciativa e intervención **autorizados por HACERLO**; no confiar en códigos de sala públicos como credenciales.
- Preparar sincronización automática solo mediante backend verificador: validación de token, autorización del facilitador y propiedad de la sala en Firebase; escritura del agregado en Supabase con control de organización. Nunca colocar claves administrativas Firebase ni service_role Supabase en JavaScript público.
- Versionar el contrato y registrar cambios por sala/fecha para conservar históricos.

## Fuera de alcance v1
- No hay transferencia automática de resultados entre Firebase y Supabase.
- No hay inicio de sesión único.
- No se han conectado automáticamente las otras seis experiencias.
- No hay medición causal del efecto de las experiencias.

## Comprobaciones
- `node tests/laboratorio_resultados_v1.cjs`
- `node tests/laboratorio_acceso_v2.cjs`
- Workflow de publicación de HACERLO incluye ambas pruebas.
