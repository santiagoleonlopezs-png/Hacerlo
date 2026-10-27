# HACERLO V2 — Integración segura del motor científico de agentes

## Rama y alcance

**Destino de los cambios:** `hacerlo-v2-modular` (no `main`).
**Rama propuesta:** `feature/v2-motor-agentes-cientifico`.

Se trasladan las capacidades científicas del experimento ABM previo a la arquitectura modular actual sin reemplazar el resto del frontend ni los servicios existentes de IA, NetworkX o Supabase.

## Archivos conectados

- `src/core/app.js`: sustituye solamente el contenido antiguo de la pantalla **Análisis → Simulación de agentes** por la llamada a `renderAgentSimulationPage(x)`.
- `index.html`: incluye `src/modules/analisis/agentes-abm.js` y `agentes-calibracion.js` como scripts clásicos diferidos antes del bootstrap.
- `src/modules/analisis/agentes-abm.js`: experiencia científica con selección de comportamiento, audiencia, COM-B editable, escenarios base e intervenido y resultados Monte Carlo.
- `src/modules/analisis/agentes-calibracion.js`: carga de CSV agregado, validación retrospectiva por holdout y sensibilidad paramétrica.
- `backend/simulation.py` y `backend/calibration.py`: motores científicos.
- `backend/app.py`: tres rutas nuevas bajo /api/simulation, preservando el código V2 de NetworkX e Inteligencia integrada/OpenRouter.
- `backend/tests/` y `tests/`: pruebas Python y JavaScript adaptadas a V2.

## Hallazgo importante de la revisión

En la rama V2 existente está el archivo `src/modules/analisis/simulacion.js`, identificado como **V2.7.3** y con una interfaz conceptual de palancas sistémicas, relaciones y acciones. El archivo observado **termina en mitad de un fragmento HTML y no cierra la función render**; además no figura entre los scripts cargados por `index.html`. Activarlo sin repararlo rompería el JavaScript de la aplicación.

Este PR **no lo borra ni lo sobreescribe**. Conecta en su lugar el motor científico probado a la ruta actual de Simulación de agentes. La revisión del simulador histórico debe hacerse en un cambio separado, identificando qué lógica conceptual se conserva y distinguiendo sus porcentajes hipotéticos de salidas de un ABM efectivamente ejecutado.

## Integración RDAIM

1. **Resultados**: objetivo observable y métricas de adopción, no tasas inventadas.
2. **Diseño**: comportamientos y audiencias existentes, incluyendo su relación específica.
3. **Análisis**: red de influencia del Grafo, modelación probabilística y escenarios.
4. **Implementación**: las intervenciones continúan gestionándose en su módulo existente. V1.1 aún no genera automáticamente acciones.
5. **Medición**: importación de serie observada agregada con fuente; contraste temporal, sin atribuir causalidad.

**Inside y Outside:** el motor funciona con los dos ámbitos de iniciativa, sin reducir el enfoque a colaboradores internos.

## Evidencia, método y riesgos

La red sintética es un supuesto; el grafo observado usa únicamente nodos Persona conectados por relaciones expresamente «Influye en» que pertenecen a las audiencias del comportamiento. No se convierten relaciones de otro tipo en vínculos de influencia. Condiciones COM-B inician en valores hipotéticos editables, no se infiere una valoración cuantitativa de los hallazgos cualitativos sin un instrumento de calibración.

Se realizan escenarios pareados y se informa dispersión Monte Carlo, no intervalos predictivos ni probabilidades reales de éxito. El ajuste retrospectivo exige al menos seis mediciones con denominador constante y deja los dos periodos finales fuera del entrenamiento. No representa abandono ni uso sostenido.

## Verificación automatizada

GitHub Actions comprueba:

- 16 tests Python, incluyendo autenticación simulada y los endpoints de FastAPI con TestClient.
- Pruebas de render y de integración de los módulos ABM V2.
- Caso ficticio con audiencias, comportamiento específico, grafo, simulación, calibración y sensibilidad; persistencia y carga posterior con simulación de Supabase.
- Regresión de NetworkX: el backend V2 utiliza índices numéricos de nodos, contrato diferente al motor anterior.
- Sintaxis del código cargado y la integridad del resto de archivos del frontend.

No se han usado ni modificado datos de usuarios reales. La sincronización real con Supabase, políticas RLS y Render **aún requieren pruebas en una instancia de ensayo** antes de fusionar o publicar.

## Despliegue

Fusionar solo después de revisar el diff y de disponer de un entorno de ensayo.
El frontend V2 se publica desde `hacerlo-v2-modular`; el backend continúa usando Render y puede requerir configuración del despliegue desde la rama correspondiente. Modificar código en GitHub no significa que el servicio activo ya lo esté ejecutando.

**No fusionar el antiguo PR dirigido a main; este es su reemplazo específico para V2.**


## V2.1 — Integración con evidencia propia de Gestión de audiencias

**Adaptador dedicado:** \`src/modules/analisis/agentes-evidencia-v2.js\`. El adaptador se carga en \`index.html\` antes de los scripts del modelo y de calibración. No se reescribe \`audiencias.js\` ni se requiere duplicar los datos de personas.

- Recupera \`audiencePeople\` y los \`adoptionHistory\` que HACERLO V2 ya registra para cada persona y comportamiento.
- Respeta \`behavior.scope\` y \`behavior.audienceIds\` para no mezclar audiencias fuera del comportamiento.
- Selecciona el registro más reciente por \`observedOn\` y \`recordedAt\`; no suma entradas repetidas por persona.
- Cuenta **Realiza** o **Sostiene** como ejecución documentada. **Comprende**, **Prueba** o **Sin evidencia suficiente** no equivalen a la ejecución autónoma de ese comportamiento.
- Distingue dos denominadores: elegibles registrados para el comportamiento y elegibles con un estado distinto de \`unknown\` basado en una evidencia registrada. Las personas con evidencia insuficiente permanecen en el denominador, pero no en la cobertura.
- Solo permite pulsar **Usar el porcentaje documentado como referencia inicial** cuando todas las personas elegibles tienen estado registrado suficiente. El usuario lo acepta explícitamente; usar esa tasa no demuestra que los coeficientes del ABM estén calibrados.
- No convierte historias individuales en series acumuladas para el calibrador: un último estado \`Sostiene\` no es equivalente a una fecha de primera adopción ni a una serie con cohorte estable.
- El historial individual se procesa localmente en el navegador. Los cálculos de adopción se envían al backend en forma agregada, sin nombre, código, correo ni narrativa personal.

### Integración exacta con Grafo de adopción V2

El Grafo V2 tiene objetos vinculados por \`sourceKind='audiencia'\` y \`sourceId\`; el motor resuelve la audiencia a partir de esos IDs, salvo asignación explícita distinta del analista. No intenta inferir audiencias de nombres.

Una arista forma parte de una **red registrada de influencia** únicamente cuando:

1. Su relación es explícitamente \`Influye en\`.
2. Ambos extremos son nodos \`Persona\` elegibles para el comportamiento.
3. \`evidence\` es \`Observada\` o \`Registrada\`.
4. No es autoconexión.

\`Declarada\`, \`Estimada\`, \`Hipótesis\` o ausencia de evidencia no permiten presentarla como observada. Para conexiones aceptadas se usa \`measureType='influence'\` con \`measureValue\` entero de 1 a 5, normalizado como valor/5. Se tolera la etiqueta legacy \`scale\`. Sin intensidad válida, se imputa 0,5 **explícitamente hipotético**, nunca la máxima fuerza. No se usa \`Colabora con\` como si significara influencia.

El análisis sigue siendo exploratorio; evidencia registrada de un vínculo no implica que se haya identificado causalidad social ni que los pesos individuales sean parámetros estimados estadísticamente.

### Identificación y trazabilidad de corridas

- Los resultados ABM se asocian a \`behaviorId\` y nombre de comportamiento; al navegar entre comportamientos ya no se muestra por error la última corrida de otro comportamiento.
- La procedencia de la tasa inicial distingue \`manual_hypothesis\` de \`audience-adoption-history\`.
- El backend explicita \`parameter_origin = hypothetical_defaults | provided_unvalidated\`. El hecho de usar un ajuste retrospectivo no se convierte en una etiqueta de predicción validada.

### Pruebas añadidas

\`tests/abm_v2_evidence.cjs\`: cambios de estado más recientes, desconocidos/no oportunidad, exclusión de otras audiencias, cobertura y adopción observada, vínculos \`sourceId\`, precedencia de mapeo manual, filtrado por procedencia, rechazo de autoconexiones, uso de intensidad 1–5 y valor hipotético explícito.

GitHub Actions ejecuta esta prueba junto con la suite científica Python y las pruebas de integración V2.

**Pendiente:** validación de UX en navegador con datos de prueba y conexión real autorizada a Supabase/Render. No se ha publicado este PR.


### Contexto integrado de Resultados y Pensamiento sistémico

El panel plegable «Hipótesis para interpretar escenarios» recoge hasta 16 factores con rol \`Barrera\` desde \`behaviorDiagnosis\` y hasta 16 condiciones \`Dificulta\` no resueltas desde \`systemV23.conditions\`. Si la condición declara \`behaviorId\`, se filtra por el comportamiento seleccionado; las condiciones sin asociación explícita se presentan como contexto general de iniciativa.

**Estas entradas no se convierten en probabilidades ni alteran parámetros del ABM.** Una barrera cualitativa no se traduce sin evidencia a una supuesta reducción cuantitativa del 18 % o similar. La selección de escenarios sigue a cargo del analista y requiere comprobar posteriormente el cambio observado. Esta es una integración de trazabilidad, no una causalidad inferida.

Prueba: \`tests/abm_v2_evidence.cjs\` verifica que se excluyan facilitadores, condiciones resueltas y comportamientos no relacionados.
