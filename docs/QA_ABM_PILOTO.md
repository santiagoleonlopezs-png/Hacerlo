# HACERLO — Informe de verificación integral del motor ABM v1.1

## Estado y alcance

Esta verificación se ejecuta en GitHub Actions sobre la rama de desarrollo `feature/abm-adopcion-v1`, antes de cualquier fusión a `main`.

**Se ha probado:** comportamiento de los endpoints FastAPI con autenticación de Supabase simulada, calidad y reproducibilidad del motor Python, estructura de la interfaz JavaScript, y persistencia y lectura utilizando una implementación simulada de las tablas de Supabase en memoria.

**No se ha probado aún:** autenticación real de un usuario en Supabase, políticas RLS reales, conexión real con Render desplegado, ni recorrido manual con un navegador auténtico. No debe afirmarse que la producción está disponible.

## Iniciativa ficticia

- Nombre: Piloto ficticio: adopción CRM
- Ámbito: Inside
- Comportamiento: Registrar interacciones en CRM
- Audiencias: Asesores (40), Operaciones (20)
- Comportamiento asociado exclusivamente a Asesores
- Grafo de prueba: 25 nodos Persona; 22 corresponden a audiencia objetivo y 3 a otra audiencia
- Vínculos: 21 «Influye en» dirigidos entre asesores y 1 «Colabora con» externo
- Regla de entrada: solo las aristas «Influye en» entre personas de la audiencia objetivo llegan al motor
- Escenario simulado: reducción de fricciones
- Serie agregada ficticia con cohorte constante de 40 personas: [4, 6, 10, 12, 15, 18] adoptantes en seis periodos. Archivo: `examples/abm_piloto_ficticio.csv`.

## Contratos automatizados

El flujo en `tests/abm_integration.cjs` ejecuta:

1. Autenticación simulada y carga de una organización ficticia.
2. Creación de iniciativa con el formulario de la aplicación.
3. Creación de audiencia y comportamiento ligado a audiencia.
4. Configuración de una red con personas y varios tipos de relación.
5. Selección de comportamiento, audiencia y generación del payload para simular, excluyendo otras audiencias y relaciones.
6. Envío de la simulación con encabezados de sesión falsos hacia un servidor HTTP simulado.
7. Importación de mediciones agregadas, calibración retrospectiva y sensibilidad, inspeccionando las solicitudes.
8. Reutilización opcional de parámetros calibrados cuando se conserva la configuración.
9. Ejecución de la función real de sincronización `syncAll()` de `index.html` contra tablas falsas.
10. Vaciado del estado local y recuperación con la función real `loadCloud()`, verificando que sobreviven los resultados, la serie importada y la calibración.

El flujo en `backend/tests/test_integration_api.py` usa un cliente HTTP de prueba para FastAPI y parchea solamente la consulta de identidad de Supabase: comprueba el cálculo real de adopción, calibración, sensibilidad, la continuidad de NetworkX, la respuesta 401 a sesiones inválidas, las validaciones 422 y la cuota 429.

Los tests científicos restantes verifican reproducibilidad de las semillas, validez de cantidades y fuentes, separación de entrenamiento y holdout, rechazo de configuraciones excesivas y variación de parámetros.

## Criterios de aceptación para un piloto auténtico

- [x] Entradas compatibles con Diseño y Grafo en el contrato de datos.
- [x] Simulación, calibración y sensibilidad disponibles vía FastAPI de pruebas.
- [x] Compatibilidad con guardado y recuperación de iniciativa en Supabase simulada.
- [x] Pruebas de errores de autenticación, parámetros y límites.
- [ ] Desplegar FastAPI actualizado en Render; confirmar `/api/health`.
- [ ] Fusionar pull request solo después de revisión.
- [ ] Autenticar una cuenta de prueba y confirmar políticas de acceso a la organización real.
- [ ] Comprobar visualmente en navegadores escritorio/móvil, crear iniciativa piloto y guardar/recargar.
- [ ] Revisar que únicamente información anonimizada/agregada autorizada ingrese a los modelos.
- [ ] Validar científicamente con datos prospectivos, distintas cohortes y fuentes verificables.

**Importante:** no introduzcas en el proyecto datos de personas reales hasta verificar la autorización organizacional y el gobierno de datos. El modelo es exploratorio sin validación prospectiva.

## Cómo hacer la prueba manual posterior al despliegue

1. Entrar a HACERLO con una cuenta autorizada de pruebas.
2. Crear una iniciativa Inside llamada «Piloto ficticio: adopción CRM».
3. Registrar Asesores (40) y Operaciones (20) en Diseño.
4. Crear el comportamiento «Registrar interacciones en CRM» aplicable solo a Asesores.
5. Entrar a Simulación de agentes, seleccionar red sintética y comparar escenario de fricciones contra base.
6. Importar el CSV ficticio que está en `examples/abm_piloto_ficticio.csv`, ejecutar calibración y revisar MAE del holdout.
7. Ejecutar sensibilidad, abrir la matriz de nueve configuraciones y distinguir robustez condicional de probabilidad real.
8. Activar parámetros calibrados para comparar nuevamente, regresar a Inicio y volver a abrir la iniciativa.
9. Cerrar e iniciar sesión y comprobar que se preservaron las corridas y mediciones agregadas.
10. Revisar políticas de Supabase/RLS y que ninguna otra organización puede acceder a la iniciativa.

Las pruebas automáticas no sustituyen estos pasos. No fusionar y desplegar sin cumplir la verificación manual.
