# HACERLO V2 · Experiencias por audiencia y lectura visual del sistema

## Contexto

La implementación parte de la rama **`hacerlo-v2-modular`** y mantiene la estructura RDAIM: Resultados, Diseño, Análisis, Implementación y Medición. No modifica el motor numérico Python, las colecciones del grafo, ni el modelo persistido `systemV23`.

## Mejora 1. Selección de audiencias en Simulación de agentes

La pantalla permite escoger qué **audiencias pertenecientes al comportamiento** se incluirán en la simulación. El conjunto se obtiene de `behavior.scope` y `behavior.audienceIds`; no se puede agregar desde aquí una audiencia no autorizada por Diseño.

**Reglas:**

- Sin selección previa, están seleccionadas todas las audiencias aplicables.
- Se puede seleccionar una, varias o restaurar «Seleccionar todas».
- La selección se conserva por identificador del comportamiento en `initiative.abmAudienceSelection`; se descartan IDs que dejen de pertenecer al comportamiento.
- Si no queda ninguna audiencia seleccionada, se deshabilita «Simular esta decisión».
- El payload a FastAPI contiene **solo** las audiencias escogidas. En modo Grafo, solo incluye personas de esas audiencias y conexiones de influencia observadas/registradas entre ellas.
- La calibración científica usa exactamente el mismo subconjunto. No se permite aplicar parámetros previamente calibrados a una red o cohorte diferente: el fingerprint anterior ya rechaza el cambio.
- La tasa de adopción documentada desde Gestión de audiencias se vuelve a agregar para las audiencias elegidas, sin transmitir identidades individuales al backend.
- Se asocia cada corrida a `settings.selectedAudienceIds`. Al cambiar la selección, la vista no exhibe una corrida histórica de otra cohorte como si fuera la actual.
- Los modelos sintéticos recalculan proporciones de agentes bajo la nueva selección. Los resultados no equivalen a efectos extrapolables a audiencias omitidas.

## Mejora 2. Lectura guiada de Pensamiento sistémico

Se agrega el renderer independiente `src/modules/analisis/sistemico-experiencia.js`, con estilos aislados en `assets/css/sistemico-experiencia.css`.

La pantalla principal pasa a tener:

1. **Comportamiento y momento**: Antes, Durante, Después, Todos.
2. **Indicadores del sistema**: condiciones activas, restricciones, mecanismos e hipótesis para contrastar.
3. **Tarjetas de lectura**: «Lo que favorece», «Lo que dificulta», «Lo que mantiene el patrón» y «Lo que debemos contrastar». Los registros se abren en el editor completo; no hay cuantificaciones inventadas.
4. **Relaciones y patrones**: representa mecanismos que ya fueron documentados y su condición relacionada, sin dibujar bucles causales inexistentes.
5. **Evolución del sistema**: historial de decisiones y observaciones con fecha, evento y, cuando se haya registrado, momento de análisis.
6. **Acción fundamentada**: un acceso a las hipótesis existentes asociables a acciones de Implementación.

El **editor anterior permanece íntegro**, dentro del panel «Explorar y editar el modelo completo»: mapa, importación desde Diagnóstico/Grafo/Audiencias, registro y actualización de condiciones, clasificación de mecanismos reforzadores y compensadores, hipótesis, vínculos a iniciativas de Implementación y comparación entre fechas.

**Importante:** el momento Antes/Durante/Después se escribe en los eventos nuevos cuando el usuario lo ha seleccionado. Los eventos históricos existentes no reciben etiquetas inferidas; permanecen en la vista «Todos» como «Momento no clasificado». Tampoco se debe interpretar la asignación de un momento como demostración de causalidad.

## Arquiectura y pruebas

- `src/modules/analisis/agentes-experiencia.js`: selector de audiencias.
- `src/modules/analisis/agentes-abm.js`, `agentes-calibracion.js` y `agentes-evidencia-v2.js`: payload y cobertura coherentes.
- `src/modules/analisis/sistemico-experiencia.js`: capa visual de lectura sistémica.
- `src/modules/analisis/sistemico.js`: solo vínculo al nuevo renderer, etiquetado de momento para registros nuevos y preservación del editor original.
- `assets/css/agentes.css` y `assets/css/sistemico-experiencia.css`: estilos encapsulados.
- `index.html`: carga módulos con `defer` antes de bootstrap.
- `tests/abm_v2_audiences.cjs` y `tests/system_v2_visual.cjs`: pruebas dedicadas que evitan regresiones en contexto/sesiones anteriores.

**Límites:** los bucles y conexiones del sistema son evidencias e hipótesis registradas por el analista, no un motor general de dinámica de sistemas ni predicciones científicas. La simulación de agentes mantiene sus limitaciones prospectivas y sus supuestos explícitos. Las validaciones automatizadas no sustituyen pruebas reales en navegador, accesibilidad y persistencia en Supabase/Render.
