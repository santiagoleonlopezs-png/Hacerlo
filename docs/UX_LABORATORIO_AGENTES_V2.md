# HACERLO V2 · Laboratorio visual y guiado de decisiones

## Qué problema se resolvió

La primera interfaz ABM agrupaba COM-B por audiencia, muestras, semilla, 40 repeticiones, red observada/sintética y panel de calibración en una vista de alta densidad. Aunque esos controles son metodológicamente útiles, no corresponden al vocabulario ni a la secuencia de decisión de usuarios no expertos.

Esta versión implementa **divulgación progresiva**: entender → decidir → comparar; los detalles técnicos se ofrecen cuando realmente se necesitan.

## Nueva experiencia

1. **¿Qué quieres que cambie?** Selector del comportamiento, asociado automáticamente a las audiencias que ya existen en Diseño.
2. **¿Qué harías para impulsar el cambio?** Cuatro tarjetas visuales con lenguaje cotidiano: **Ayudar a aprender**, **Quitar obstáculos**, **Cambiar incentivos** y **Activar referentes**. Cada tarjeta corresponde exactamente a uno de los escenarios que el backend ya implementa (training, friction, incentives, ambassadors). No se crean motores artificiales o alternativas sin implementación.
3. **¿Desde dónde empezamos?** Control deslizante de adopción inicial. Por defecto es una **estimación hipotética**, no un dato certificado; se puede sustituir por la tasa documentada desde Gestión de audiencias solo cuando existe cobertura completa de la cohorte elegible.
4. **Simular esta decisión.** La aplicación llama al endpoint de simulación autenticado, conserva parámetros iniciales y guarda la respuesta bajo la iniciativa seleccionada. Se comparan el escenario base y el escenario propuesto mediante los mecanismos existentes.
5. **Resultados prioritarios:** diferencia en puntos porcentuales, dos barras comparativas y curva de evolución. El panel distingue explícitamente resultados simulados de predicciones reales. Detalles por audiencia y dispersión Monte Carlo continúan accesibles.
6. **Comparación de decisiones:** cuando el usuario prueba dos o más intervenciones con los mismos supuestos, aparece un tablero compacto que compara los resultados entre tarjetas. Una huella corta integra las condiciones de la red, audiencia, horizonte, semilla, parámetros y punto de partida; el cambio de escenario se excluye deliberadamente. No se mezclan corridas con configuraciones distintas.
7. **Solo para quien necesita más detalle:** secciones plegadas «Ajustar el modelo», «¿Con qué evidencia contamos?» y «Profundizar con datos y ciencia», que conservan COM-B, red registrada, calibración retrospectiva, sensibilidad y trazabilidad.

## Arquitectura modular

- `src/modules/analisis/agentes-experiencia.js` — nueva capa gráfica / interacciones de selección, controles de simulación y comparación.
- `assets/css/agentes.css` — estilos aislados y responsivos; no altera los estilos de otros módulos.
- `src/modules/analisis/agentes-abm.js` — motor de presentación heredado, adaptado para resultados visuales y huella de escenario sin modificar la lógica científica ni endpoints.
- `src/modules/analisis/agentes-evidencia-v2.js` — conserva evidencia observada, sincroniza el deslizador de adopción inicial.
- `src/modules/analisis/agentes-calibracion.js` — permanece intacto en el nivel científico avanzado.
- `src/core/app.js` — enruta la pantalla de Simulación al nuevo renderer visual.
- `index.html` — añade scripts diferidos y una hoja CSS, con versión para evitar caché.
- `backend/` — **sin cambios**: FastAPI, Monte Carlo, calibración, seguridad de sesión y motor de agentes permanecen iguales.

## Límites científicos mantenidos

El motor es exploratorio y no ha recibido validación prospectiva. La selección de una tarjeta no prueba causalidad. Barreras y condiciones cualitativas no se convierten automáticamente en coeficientes cuantitativos. Si se elige red registrada, se usan exclusivamente influencias declaradas como Observada/Registrada conforme al adaptador V2; no se envían nombres, correos ni historiales individuales.

La comparación automática entre decisiones conserva supuestos idénticos por construcción, pero sigue sin demostrar que una intervención vaya a producir esos resultados sobre una organización o mercado real.

## Criterios de validación

- [x] Vista de un comportamiento, cuatro tarjetas y un deslizador.
- [x] Escenarios conectados al backend Python existente.
- [x] Tabla técnica COM-B y ajustes ocultos al inicio, pero utilizables.
- [x] Comparación gráfica y evidencia científica desplegable.
- [x] Historial de múltiples decisiones sin comparar configuraciones distintas.
- [x] Pruebas JavaScript del renderer y del flujo con Supabase simulada.
- [x] Pruebas Python existentes intactas.
- [ ] Verificación de experiencia con usuarios no expertos en navegador real.
- [ ] Pruebas de contraste visual en pantallas móviles reales.
- [ ] Confirmación de Render/Supabase con cuenta autorizada en una sesión real.

Esta entrega puede incorporarse a la rama `hacerlo-v2-modular` una vez estén verdes las verificaciones automatizadas. Su fusión de código no certifica por sí sola que el sitio o el backend desplegados estén actualizados.
