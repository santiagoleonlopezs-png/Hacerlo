# HACERLO — Simulación de agentes: adopción conductual (v1 experimental)

**Objetivo:** comparar mecanismos hipotéticos de adopción de un comportamiento definido en **Diseño**, para apoyar decisiones en **Análisis** y contrastarlas después en **Medición**. Aplica a **Inside** (colaboradores) y **Outside** (usuarios/mercado).

> **Estado científico:** prototipo reproducible SIN calibración empírica. No estima probabilidades predictivas reales, impactos causales ni efectos económicos. El objetivo del MVP es generar hipótesis explícitas y comparables.

## Fundamentos

- **COM-B** (Michie, van Stralen y West, 2011): capacidad, oportunidad y motivación habilitan un comportamiento. La combinación numérica usada aquí es una hipótesis de HACERLO, no una fórmula publicada de COM-B.
- **Umbrales heterogéneos** (Granovetter, 1978): personas distintas requieren grados diferentes de presión/refuerzo antes de adoptar.
- **Contagio complejo** (Centola y Macy, 2007): importan la estructura y los contactos de refuerzo. La versión 1 usa una aproximación simple con proporción ponderada de vecinos adoptantes; no reproduce el experimento original.
- **Protocolo ODD** (Grimm et al., 2020): describe el modelo para revisión, replicación y futura evaluación.

Fuentes: [Michie et al. 2011](https://doi.org/10.1186/1748-5908-6-42), [Granovetter 1978](https://doi.org/10.1086/226707), [Centola y Macy 2007](https://doi.org/10.1086/521848) y [Grimm et al. 2020](https://doi.org/10.18564/jasss.4259).

## Protocolo ODD resumido

**Propósito:** explorar cómo capacitación, menores fricciones, incentivos o agentes embajadores podrían cambiar la adopción acumulada bajo supuestos explícitos.

**Entidades y variables:** agente con identificador, audiencia, capacidad C, oportunidad O, motivación M, umbral individual θ y estado adoptante/no adoptante. Las audiencias tienen población y valores COM-B definidos como hipótesis. Los enlaces dirigidos transportan influencia hipotética del origen al destino.

**Tiempo:** 1–24 periodos de decisión. Un periodo no equivale automáticamente a una semana. La adopción es absorbente: el modelo no contempla abandono en v1.

**Secuencia:** inicializar agentes y estados con una semilla → observar contactos adoptantes del periodo anterior → actualizar decisiones en forma síncrona → calcular adopción. Cada alternativa se compara con un escenario base mediante 5–80 repeticiones apareadas.

**Entradas:** audiencias y comportamientos de Diseño. Opcionalmente, nodos explícitos tipo Persona y conexiones «Influye en» del Grafo, con asignación explícita a audiencia. Se excluyen automáticamente nodos de barreras, equipos, documentos, etc. de la categoría de persona.

**Red sintética:** muestra proporcional por tamaño de audiencia y red Watts–Strogatz hipotética. No se presenta como observación real ni como reconstrucción del Grafo de la iniciativa.

**Submodelo (elección de diseño, coeficientes NO estimados):**

    d_i(t) = 0.35*C_i + 0.35*O_i + 0.30*M_i + 0.25*R_i(t)
    p_i(t) = 0.28 / [1 + exp(-8 * (d_i(t) - theta_i))]

R es la proporción ponderada de conexiones entrantes que adoptaron. Sin conexiones entrantes R = 0. El agente no adoptante cambia de estado cuando un sorteo uniforme resulta menor que p. Los umbrales son heterogéneos. TODOS los pesos, intensidades, pendientes y distribuciones son supuestos que deben calibrarse y analizarse.

**Intervenciones hipotéticas:** formación (+0.18 capacidad), reducción de fricción (+0.18 oportunidad), incentivos (+0.18 motivación), embajadores (siembra inicial de adopción entre el 10 % de nodos de mayor salida ponderada). No implican eficacia validada de dichas intervenciones.

**Salidas:** trayectorias simuladas control/intervención, bandas p10–p90, diferencia final de repeticiones apareadas y resultados por audiencia. Las bandas reflejan variabilidad de Monte Carlo *condicionada al modelo*, no intervalos de confianza de adopción real. El prototipo no identifica causalidad ni estima uso sostenido.

## Relación con RDAIM

| Etapa | Papel |
| --- | --- |
| Resultados | Comportamiento objetivo, línea base e indicadores |
| Diseño | Comportamiento y audiencias objetivo |
| Análisis | Comparación de escenarios y redes |
| Implementación | Vinculación futura con acciones de intervención |
| Medición | Contraste futuro con datos Base/Durante/Después |

No se crea otra IA: **Inteligencia integrada** sigue siendo la única IA transversal de HACERLO.

## Integración técnica

- API: POST /api/simulation/adoption dentro de FastAPI existente (Render).
- Autenticación: token de sesión de Supabase; clave pública de Supabase en cabecera. No introducir secretos en el repositorio.
- Límites: 500 agentes, 5000 aristas, 80 repeticiones, 24 periodos, 20 solicitudes/hora/usuario por proceso.
- En modo Grafo se transmiten IDs de nodos, no nombres de personas.
- Los resultados se guardan en el campo modelRuns del estado actual de iniciativa mediante el mecanismo Supabase ya integrado.

**Seguridad:** la validación de sesión no sustituye la autorización por iniciativa y organización. Antes de producción hace falta probar control de acceso a cada iniciativa, políticas de Supabase, cuotas distribuidas, trazabilidad y protección de datos. La cuota actual en memoria es por proceso.

**Ejecutar pruebas localmente:** instalar backend/requirements.txt, establecer PYTHONPATH=backend, ejecutar python -m unittest discover -s backend/tests -v; iniciar desde backend con uvicorn app:app --reload. La web publicada seguirá llamando a Render; los cambios no estarán disponibles hasta desplegar el backend actualizado.

## Plan de validación

1. **Verificación computacional:** pruebas de reproducción con semilla, límites, segmentación, errores de entrada y monotonicidad del tratamiento.
2. **Calidad de evidencia:** distinguir dato registrado/observado, declarado, estimado e hipotético; no mezclar relaciones no causales con influencia conductual.
3. **Calibración:** estimar condiciones y parámetros con mediciones previas; contrastar en un periodo futuro separado. No entrenar y evaluar con los mismos datos.
4. **Sensibilidad:** analizar robustez frente a cambio de umbrales, pesos, densidad/conectividad y efectos de intervención.
5. **Validación por contexto:** evaluar por separado Inside y Outside, y comprobar resultados observados.
6. **Evolución científica:** modelar intención, adopción, uso sostenido y abandono como estados distintos; versionar modelo, fuentes y errores predictivos.

La versión 1 constituye un **laboratorio de hipótesis**, no un gemelo digital validado de una población.
