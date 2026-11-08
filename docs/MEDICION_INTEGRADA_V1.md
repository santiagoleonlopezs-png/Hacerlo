# Medición integrada

La entrada de RDAIM/Medición y la ruta Analítica comparten la misma vista.
El resultado global se contrasta con un indicador asociado explícitamente.
Los comportamientos reúnen sus indicadores (incluida Gestión), estados de
adopción, intervenciones, encuestas, hipótesis sistémicas y revisión humana.

Las fuentes no asociadas quedan en Evidencia general, junto con INS/CNPS,
dimensiones históricas y el consolidado del portafolio plegado. Se conservan
los módulos de edición originales. El historial contextual reúne registros
fechados; no reconstruye eventos que nunca se registraron.

## Fuentes y persistencia

- Indicadores: `indicators`, `behaviorIds`, historial y revisiones existentes.
- Intervenciones: vínculos explícitos `behaviorIds`, `behaviorId` o scope del
  análisis que originó la acción. Guardar vínculos utiliza `behaviorIds` y
  conserva las demás propiedades de la acción.
- Encuestas: puntuación y momentos desde el motor EE; comparaciones entre
  encuestas vinculadas desde su comparador existente. Las asociaciones con
  comportamientos se guardan en `measurementV1.surveyLinks`.
- Aprendizaje: `measurementV1.reviews`, por comportamiento y audiencia;
  conserva hasta 40 revisiones anteriores y referencias a valores consultados.
  Las revisiones globales y por audiencia se mantienen separadas.
- Hipótesis: se actualiza el registro original de `systemV23.hypotheses`
  mediante la función existente y su historial, sin estados automáticos.
- Resultado global: `measurementV1.globalIndicatorId` identifica la medida
  elegida. No se crea una puntuación agregada ni se deduce por nombres.

Todo lo anterior usa el `app_state` de la iniciativa existente. No requiere
migraciones ni modificaciones de políticas de acceso.

La tarjeta INS/CNPS y su historial usan una misma fuente. Las encuestas sin
respuestas o eliminadas no recurren silenciosamente a valores manuales.
Cambiar de fuente conserva las mediciones anteriores. Los nuevos registros
manuales conservan la definición; un historial con definiciones distintas no
se conecta como una tendencia comparable. Las fechas tienen espaciado real
y las filas sin fecha válida quedan visibles en la tabla.

## Fuentes externas

Se consultan en lectura `activation_sends` (últimos 30 envíos) y
`lab_experience_results` (últimos 100 resultados agregados), con el cliente
autenticado existente, filtros por organización e iniciativa y RLS vigente.
No se consulta contenido de correos ni respuestas individuales del Laboratorio.
La caché es efímera, se invalida por identidad y se verifica antes de pintar
una respuesta asíncrona. Los errores se muestran como ausencia de consulta,
sin convertirlos en ceros. El botón de actualización no envía mensajes.

## Alcance de lectura

La audiencia filtra estados individuales y respuestas de encuestas. Los
indicadores generales, contexto y ejecución conservan su alcance original,
indicado en pantalla. No se inventa una segmentación de registros agregados.
Las simulaciones se presentan como escenarios y las comunicaciones como
ejecución; ninguna se convierte en evidencia de adopción o de causalidad.

## Verificación

`tests/medicion_integrada_v1.cjs` usa datos ficticios y jsdom para verificar
fuentes, ceros/missing, fechas, categorías, vínculos, segmentación, revisión
humana, aislamiento de consultas, cierre de sesión y contenido escapado.
Forma parte de los flujos de revisión y publicación. Se mantienen las pruebas
de navegación, encuestas, ABM y edición de acciones existentes.
