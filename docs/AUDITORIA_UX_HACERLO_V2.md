# HACERLO V2 · Auditoría transversal de experiencia de usuario

**Rama destino:** `hacerlo-v2-modular` · **Alcance:** coherencia visual, jerarquía de información y reducción de fricción sin rediseñar la arquitectura RDAIM.

## Hallazgos

1. Los encabezados de cada módulo habían evolucionado de manera desigual. Algunos utilizaban banners con gradientes, otros cajas planas y otros presentaban dos cabeceras simultáneas (banner global y cabecera local).
2. La **Inteligencia integrada** mostraba de entrada siete secciones extensas: panorama, registro de evidencia, endpoint local del motor de redes, tabla de audiencias, laboratorio de hipótesis, portafolio, aprendizaje e interpretación con IA al final. En una sola vista, lo técnico competía con el objetivo del usuario.
3. Los instrumentos de encuesta mostraban detalles de configuración técnica (IDs y rangos numéricos) junto a campos normales de cada pregunta.
4. Gestión de audiencias exigía desplegar la creación de audiencia cuando ya había registros; no había acceso directo desde la cabecera.
5. Intervenciones mostraba el cronograma Gantt completo además del tablero y formulario de tareas, incluso cuando el usuario solo necesitaba actualizar acciones.
6. Diagnóstico repetía explicaciones sobre la independencia de sus submódulos en lugares donde las pestañas ya mostraban esa estructura.

## Reglas aplicadas

**Una jerarquía:** Qué hacer → qué muestra el resultado → cómo profundizar. **Una sola cabecera visual:** cada módulo debe ocupar el lugar del banner global, no apilarse sobre él. **Tarea principal visible:** no esconder la acción más frecuente tras varias capas de `details`. **Detalle a demanda:** explicaciones extensas, conexión técnica histórica, tablas secundarias e ID de preguntas se consultan cuando se necesitan. **Trazabilidad científica preservada:** las advertencias sobre límites de causalidad, procedencia de datos y análisis generativo permanecen disponibles y no se cambian por falsas predicciones.

## Cambios entregados por pantalla

| Área | Antes | Ahora | Qué se conserva |
| --- | --- | --- | --- |
| Inicio y RDAIM | Gradiente histórico plano | Profundidad visual y bordes consistentes | Contenidos, navegación y rutas |
| Diseño de comportamientos | Cabecera genérica de iniciativa | Identidad visual de Diseño, foco en conductas observables | Crear, editar, eliminar y asociar indicadores |
| Gestión de audiencias | Cabecera plana y mucha instrucción | Banner claro y CTA de creación en un clic; formulario nuevo abierto en la primera visita | Registro, importación, filtros, cuadrantes y fichas de personas |
| Diagnóstico | Título y párrafo explicativo extenso | Banner consistente y pestañas legibles con menos texto | Factores, hallazgos, micronarrativas, tríada y tablero |
| Encuestas y experiencias | Banner con versión interna y aviso lateral repetido | Banner con identificación RDAIM y estilo unificado; rango e ID de pregunta bajo detalle opcional | Tipos, preguntas, respuestas, importación y NPS/CNPS |
| Indicadores | Cabecera genérica | Banner de Resultados, con acción Crear indicador existente | Definiciones, asociaciones, metas y registros |
| Intervenciones | Cabecera genérica, ayuda larga y Gantt abierto | Banner de Implementación, seguimiento visible, cronograma opcional | Tablero, edición, estado, creación y Gantt |
| Grafo de adopción | Cabecera genérica de iniciativa | Banner coherente manteniendo visualización de relaciones | Redes, nodos, alertas, métricas y NetworkX |
| Pensamiento sistémico | Ya contaba con experiencia visual propia | Se conserva el rediseño existente; no se duplica cabecera | Condiciones, bucles hipotéticos, hipótesis, historia |
| Simulación de agentes | Ya contaba con laboratorio guiado | Se conserva el rediseño existente | ABM, audiencias, calibración, sensibilidad |
| Analítica | Cabecera de iniciativa genérica | Banner de Medición sin repetir la cabecera global | Indicadores, mediciones y gráficos |
| Inteligencia integrada | IA tras tablas, formularios y configuración local | Banner unificado + panorama compacto + interpretación IA destacada + opciones de decisión; datos y utilidades secundarias plegados | IA existente, contexto de datos, exportaciones, redes, escenarios, aprendizajes |

## Cambios técnicos

- `src/core/experiencia-ui.js` ofrece el constructor común del banner y de paneles secundarios. Son funciones de presentación; no modifican datos.
- `assets/css/experiencia-ui.css` unifica gradientes, contenido, tipografía y responsive. La regla `main:has(#app .hcx-hero)>.hero` elimina el banner duplicado de las pantallas con cabecera propia.
- `src/core/app.js` cambia únicamente textos y cabeceras de las rutas existentes. No altera los nombres de las etapas RDAIM ni la barra lateral. Gantt sigue disponible en panel plegable.
- `src/modules/inteligencia/integrada.js` reordena la presentación. Las funciones `addEvidenceRecord`, `addExperiment`, `addObservation` y `analyzeCurrentNetwork` se conservan sin cambios.
- `src/modules/inteligencia/ia.js` resalta primero la interpretación ejecutiva, las lecturas de audiencia y las primeras opciones de intervención; el resto queda disponible en expandibles. No introduce una IA diferente ni modifica la solicitud al backend.
- `src/modules/encuestas/encuestas.js` conserva todos los campos en el DOM, incluidos identificadores y valores numéricos, aunque agrupa los técnicos.
- `src/modules/diseno/audiencias.js` conserva sus formularios y agrega acceso directo a la creación de audiencia.
- `tests/ux_v2_consistency.cjs` verifica banners, orden de carga, entrada IA, conservación de formularios, navegación y visualización condicional.

## Límites de esta revisión

**Sí comprobado:** validaciones de sintaxis JavaScript, tests existentes del motor ABM, API con autenticación simulada, persistencia de ensayo y contratos de markup de la interfaz; no se cambiaron esquemas de datos de Supabase ni endpoints.

**Pendiente:** recorrido visual y funcional con navegador auténtico, accesibilidad con teclado/lector de pantalla, tamaños móviles reales y entrevistas breves a usuarios no expertos. Las pruebas automatizadas no demuestran por sí solas una reducción medible de clics o esfuerzo cognitivo.

## Próximas mejoras de usabilidad (a evaluar con personas)

- Confirmar tiempos y clics reales para las tres tareas frecuentes: registrar un hallazgo, crear una audiencia y ejecutar una simulación.
- En encuestas, mostrar controles distintos según tipo de pregunta, sin esconder los campos esenciales ni perder valores al cambiar el tipo.
- En Gestión de audiencias, estudiar una barra única de acciones frecuentes y un patrón consistente de ficha lateral, evitando anidar paneles.
- En Analítica, personalizar resúmenes por objetivo e indicador en lugar de mostrar todas las métricas en cada situación.

Las siguientes mejoras se priorizan con pruebas de tareas y no por estética solamente.
