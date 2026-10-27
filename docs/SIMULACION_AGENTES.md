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


## Versión 1.1 — Calibración retrospectiva y sensibilidad (26 de octubre de 2026)

La pantalla **Análisis → Simulación de agentes** añade dos subapartados a los escenarios exploratorios. No se genera una IA aparte: los cálculos son métodos transparentes y reproducibles.

### A. Medición y calibración

CSV esperado (los números de este ejemplo son exclusivamente ficticios):

~~~csv
periodo,adoptados,poblacion_elegible,fuente
0,5,50,Medición base de prueba
1,7,50,Medición agregada 1
2,9,50,Medición agregada 2
3,11,50,Medición agregada 3
4,13,50,Medición agregada 4
5,16,50,Medición agregada 5
~~~

**Definiciones:**
- adoptados = personas de la misma cohorte que ya ejecutaron el comportamiento observable por primera vez hasta el periodo indicado;
- poblacion_elegible = denominador fijo del conjunto de personas elegibles;
- fuente = instrumento o registro verificable, sin nombres ni otros identificadores sensibles;
- periodo = número entero consecutivo desde 0, con una misma duración entre periodos.

Usa como mínimo 6 y máximo 16 mediciones, coherentes con una definición única de adopción acumulada, obtenidas **antes de introducir las intervenciones que se desean comparar**. Si cambia el denominador, alguien puede abandonar o cambia la definición operacional, el modelo v1.1 NO es adecuado; no modifiques los datos para forzar un ajuste.

La calibración:
1. Conserva la primera observación como porcentaje inicial.
2. Reserva los **últimos dos periodos** como holdout temporal sin usarlos para elegir parámetros.
3. Evalúa una grilla fija de 16 candidatos: umbral medio 0,48/0,58/0,68/0,78 × peso social 0,05/0,20/0,35/0,50. El resto de parámetros permanece fijo.
4. Calcula error absoluto medio de adopción en el periodo de ajuste; selecciona el candidato con menor error.
5. Evalúa nuevamente con **nuevas semillas aleatorias** y reporta MAE en periodo de ajuste y de holdout.
6. Compara holdout con la persistencia ingenua de la última tasa de adopción conocida y con los parámetros originales.
7. Reporta cantidad de soluciones casi tan buenas como la mejor (indicador limitado de no identificabilidad).

Si se obtiene menor error en holdout que la persistencia, ello **no valida causalidad, eficacia de la intervención ni predicción futura**. Es un control interno de plausibilidad, con apenas dos periodos reservados. Requiere validación prospectiva adicional con múltiples cohortes.

### B. Robustez y sensibilidad

Se ensayan 9 combinaciones: umbral medio ±0,08 y peso social ±0,12 alrededor de los valores elegidos (o defaults si no hay calibración), recortados a límites válidos. Cada combinación ejecuta escenario base e intervención con semillas apareadas. Se informa la diferencia en puntos porcentuales y cuántas combinaciones superan un umbral de decisión aportado por la persona analista.

**Nueve combinaciones no forman una distribución probabilística.** Que 7/9 cumplan una meta NO significa un 77,8 % de probabilidad de éxito. No modela cambios estructurales de red, costos, sesgos de selección, abandono ni conflictos de implementación.

### C. API, versiones y auditoría

Rutas adicionales:
- POST /api/simulation/calibrate: mismas audiencias, nodos y relaciones que el motor base, más observations (conteos agregados y fuente);
- POST /api/simulation/sensitivity: mismas entradas del simulador y target_effect_pp; parameters opcional en ambos modelos de simulación.

Se requiere sesión autenticada. Cuota experimental compartida: 20 peticiones por hora y usuario en cada proceso. El código de visualización guarda en la iniciativa parámetros, serie ingresada, fecha y resultados agregados. **No se deben registrar datos personales en las fuentes textuales o archivos CSV**. La producción debe reforzar autorización por organización, cuotas distribuidas y protección de información comercial.

Cada corrida tiene semilla y versión de modelo. Para trazabilidad externa, conserva también identificador del instrumento, cohorte, definición operacional, periodicidad, registro de las intervenciones vigentes y un conjunto de validación prospectivo.

### D. Decisión metodológica pendiente

Esta fase es **calibración agregada** y evaluación retrospectiva, no calibración individual ni aprendizaje automático. Un patrón temporal por sí solo no separa inequívocamente los efectos de umbrales, influencia social, condiciones de entorno y otros cambios externos. El siguiente paso científico requiere campañas de medición comparables, varias cohortes y experimentación ética para comprobar generalización.

