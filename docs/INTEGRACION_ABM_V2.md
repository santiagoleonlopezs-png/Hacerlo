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
