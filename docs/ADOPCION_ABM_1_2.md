# Adopción ABM 1.2: punto inicial y contraste retrospectivo

La versión 1.2 fortalece el motor existente para Inside y Outside. No incorpora
PyMC, servicios nuevos ni pantallas adicionales. Continúa siendo exploratoria.

## Cambios

- La tasa inicial determina un conteo fijo, redondeado al agente más cercano.
  La selección de identidades iniciales es aleatoria, compartida por los dos
  escenarios. No se infiere quién adoptó realmente. Se informa la tasa solicitada,
  la representada y la resolución de la población simulada. Esta precisión no
  supone conocer la composición de los adoptantes iniciales de cada audiencia.
- El ajuste mantiene los dos periodos finales fuera de la búsqueda. Se compara
  con persistencia y con una tendencia de incremento medio calculada solamente
  en entrenamiento, acotada a 100 %. No se selecciona ni reajusta el modelo con
  esas comparaciones. Superar ambas referencias no demuestra causalidad ni
  validación prospectiva; tampoco se exige superarlas para explorar hipótesis.
- La interfaz muestra cuando el ajuste no supera ambas referencias. Las series
  y errores de cada referencia quedan guardados en el resultado de calibración.
- Las huellas de configuración incluyen la versión científica. Los ajustes de
  1.1 se conservan como históricos, pero requieren recalibración para reutilizarlos.
  Las comparaciones nuevas no se mezclan con escenarios de la versión anterior.
- Los endpoints de simulación, calibración y sensibilidad informan `abm-1.2`.
  El frontend verifica la versión antes de guardar un cálculo nuevo. Los
  periodos mal formados en los registros producen un error de validación.

## Verificación

Suite Python: `PYTHONPATH=backend python -m unittest discover -s backend/tests -v`.
Requiere `backend/requirements.txt` y `httpx` (o el cliente compatible con la
versión de Starlette instalada). La integración HTTP usa autenticación simulada.

Pruebas JavaScript: `node tests/abm_v2_frontend.cjs`,
`node tests/abm_v2_integration.cjs`, `node tests/abm_v2_evidence.cjs` y
`node tests/abm_v2_audiences.cjs`.

Se comprueban conteo inicial fijo, límites 0 y 100 %, resolución finita,
reproducibilidad, comparaciones pareadas, separación temporal, tendencia sin
acceso a los periodos reservados, saturación y mensajes cuando no hay mejora.

## Publicación coordinada

Este cambio requiere actualizar tanto el backend Python como el frontend.
Publicar el frontend solo contra un backend 1.1 bloqueará cálculos nuevos con
un mensaje de actualización requerida. Comprobar `/api/health` y los tres
endpoints con una sesión de ensayo antes de dar el despliegue por completado.
Coordinar la actualización para evitar reutilizar ajustes antiguos durante
la transición; conservar ambos despliegues anteriores para una reversión.

Esta entrega verifica código y contratos con datos ficticios. No acredita
despliegue en Render ni validación científica con una iniciativa real.

Permanencia, abandono, costes y efectos de las intervenciones continúan fuera
de este cambio. Añadirlos requiere definir el comportamiento, mediciones y
supuestos correspondientes; no se introducen tasas arbitrarias nuevas.
