# HACERLO V2 · Selector de encuestas compacto

## Cambio de experiencia

Antes, «Encuestas y experiencias» mostraba permanentemente una columna con todas las encuestas de la iniciativa, el acceso a la papelera y dos formularios de creación/importación. Cuando se elegía un instrumento, el panel de trabajo quedaba estrecho y el título de la encuesta se repetía.

Ahora, la pantalla presenta una **barra compacta a todo el ancho debajo del banner**, con:

- **Selector desplegable** de instrumentos existentes. Al cambiar de instrumento, se conserva el comportamiento de `eeOpen(id)`: inicializa la pestaña Diseño y restablece los filtros de medición.
- Metadatos mínimos del instrumento: tipo, versión, estado y cantidad de respuestas.
- Botón **«＋ Crear o importar»** que abre, cuando se necesita, dos opciones visibles: cargar Excel/CSV o crear instrumento manual. Con cero instrumentos se muestra automáticamente la creación.
- La **papelera** aparece en el panel de gestión, solo cuando tiene elementos.
- La gestión de versiones, eliminación, edición de nombre, momento e histórico de importaciones permanece disponible en **«Opciones del instrumento»**, contraído inicialmente.
- Las **cinco pestañas de trabajo** (Diseño, Responder, Importar, Resultados y Compartir) permanecen visibles y accesibles.
- El contenido principal de la encuesta ahora ocupa **todo el ancho**; no existe columna lateral fija ni desplazamiento independiente del selector.

## Compatibilidad

La refactorización afecta solo la función `eePage(x)`, el estado inicial del selector y estilos de `assets/css/encuestas.css`. Conserva las funciones `eeOpen`, `eeCreate`, `eeQuickRead`, `eeDeleteSurvey`, `eeClone`, `eeRenameSurvey`, `eeMomentEditor`, `eeImportHistory`, `eeTrashPanel` y todos los tipos de encuesta. No introduce cambios de esquema, API ni persistencia Supabase.

`tests/ee_v2_compact_selector.cjs` valida cambio entre instrumentos, selector contraído inicialmente, creación/importación bajo demanda, papelera, opciones conservadas, pestañas y el caso sin instrumentos. La suite CI existente prueba regresión modular y API.

**Pendiente:** recorrido visual en navegador, especialmente etiquetas de instrumentos muy largas, pantallas pequeñas y formularios reales; verificar que la rama publicada incluya el cambio.
