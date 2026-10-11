# HACERLO V2 — Primer paquete modular

## Alcance
Separamos CSS y JavaScript en archivos organizados por responsabilidades, manteniendo los identificadores globales para preservar los manejadores `onclick` existentes. Es una **modularización incremental mediante scripts clásicos**, no módulos ES todavía. El backend se conserva en dos archivos y se adapta el prompt de IA para interpretar la iniciativa completa.

## Cambios
- Inicio de sesión: eliminado «piloto conectado a Supabase».
- Pie de página de autoría de Santiago León en acceso y aplicación.
- RDAIM: I = Implementación. Se conserva el menú histórico «Intervenciones» como nombre operativo de las acciones.
- IA: trasladada desde el resultado de Grafos hacia Inteligencia integrada; no exige ejecutar NetworkX previamente.
- Contexto IA: iniciativa seleccionada con resultados, diseño, red y análisis disponible, variables sistémicas, escenarios, implementación y mediciones. No agrega datos de otras iniciativas.
- Modelo OpenRouter: permanece `openrouter/free`, sin fallback de pago.

## Instalación
1. Crear una rama nueva en GitHub.
2. Subir **todo el contenido de esta carpeta**, preservando las rutas. GitHub Pages sirve `index.html` y archivos `src/` y `assets/`.
3. Backend Render: colocar `backend/app.py`, `backend/engine.py` y `backend/requirements.txt` en las mismas rutas de la implementación actual. Confirmar comando de inicio de Render (`uvicorn app:app` desde `backend/` o equivalente).
4. **No cambiar** la base Supabase ni borrar datos.
5. Probar en una URL de ensayo con el origen permitido en CORS, o temporalmente probar en el origen actual tras respaldar y poder revertir.

## Limitaciones / pruebas pendientes
- Verificación estática de sintaxis realizada; no se han probado credenciales, llamadas reales a Supabase/Render/OpenRouter ni persistencia extremo a extremo.
- La IA tiene límite de 35.000 caracteres en backend: iniciativas grandes podrían requerir reducción adicional de contexto.
- La IA envía información de la iniciativa a un proveedor externo: revisar datos personales y políticas aplicables antes de usarla.
- El límite de 15 interpretaciones/hora está en memoria del proceso; no es un control distribuido.
- No se implementa todavía Diagnóstico ni modelos científicos nuevos; se preparan para siguientes entregas.
- No se ha rediseñado la lógica de sincronización existente; requiere pruebas de regresión.

## Pruebas mínimas
Inicio de sesión, recuperación de contraseña, creación/cambio de iniciativa, guardado, recarga, Inside/Outside, RDAIM, CSV de audiencias, grafo y análisis NetworkX, inteligencia integrada e IA, conversión de intervención sugerida, Kanban/Gantt, mediciones, exportación/importación JSON.
