"""HACERLO ABM v1: exploración reproducible de adopción conductual.

Mecanismos: condiciones COM-B, umbrales heterogéneos y refuerzo social.
Los parámetros son hipótesis configurables, NO coeficientes validados.
Una unidad de tiempo representa un periodo de decisión, no necesariamente una semana real.
"""
from __future__ import annotations

import math
import random
from collections import defaultdict
from statistics import mean
from typing import Any

import networkx as nx

MAX_AGENTS = 500
MAX_EDGES = 5000

DEFAULT_PARAMETERS = {"threshold_mean": 0.62, "peer_weight": 0.25, "adoption_rate": 0.28}
PARAMETER_BOUNDS = {"threshold_mean": (0.35, 0.85), "peer_weight": (0.0, 0.6), "adoption_rate": (0.05, 0.5)}


def validated_parameters(values=None):
    """Solo permite parámetros explícitamente modelados y con límites auditables."""
    if values is None:
        values = {}
    if not isinstance(values, dict) or any(k not in DEFAULT_PARAMETERS for k in values):
        raise ValueError("Parámetros no reconocidos por el modelo ABM.")
    result = DEFAULT_PARAMETERS.copy()
    for key, value in values.items():
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Parámetro inválido: {key}.") from exc
        low, high = PARAMETER_BOUNDS[key]
        if not math.isfinite(number) or not low <= number <= high:
            raise ValueError(f"{key} debe estar entre {low} y {high}.")
        result[key] = number
    return result



def clamp(value, low=0.0, high=1.0):
    return min(high, max(low, float(value)))


def quantile(values, q):
    ordered = sorted(values)
    if not ordered:
        return 0.0
    position = (len(ordered) - 1) * q
    low, high = math.floor(position), math.ceil(position)
    return ordered[low] * (high - position) + ordered[high] * (position - low) if low != high else ordered[low]


def build_population(data: dict[str, Any], seed: int):
    """Construye agentes sintéticos estratificados o usa personas explícitas.

    La red sintética es un supuesto de trabajo, no una red inferida.
    Una red observada requiere ID de audiencia para cada persona.
    """
    rng = random.Random(seed)
    audiences = data["audiences"]
    aud_map = {str(a["id"]): a for a in audiences}
    if not audiences or len(aud_map) != len(audiences):
        raise ValueError("Define audiencias únicas para el comportamiento seleccionado.")
    mode = data.get("mode", "synthetic")
    agents = []
    if mode == "observed":
        raw = data.get("agents", [])
        if len(raw) < 2 or len(raw) > MAX_AGENTS:
            raise ValueError("La red registrada debe contener entre 2 y 500 personas.")
        ids = set()
        for item in raw:
            aid = str(item.get("audience_id", ""))
            identity = str(item.get("id", ""))
            if not identity or identity in ids or aid not in aud_map:
                raise ValueError("Cada persona requiere un ID único y una audiencia existente.")
            ids.add(identity)
            agents.append({
                "id": identity, "audience_id": aid,
                "capability": clamp(item.get("capability", aud_map[aid].get("capability", 0.5))),
                "opportunity": clamp(item.get("opportunity", aud_map[aid].get("opportunity", 0.5))),
                "motivation": clamp(item.get("motivation", aud_map[aid].get("motivation", 0.5))),
            })
        edges = []
        for edge in data.get("edges", []):
            source, target = str(edge.get("source")), str(edge.get("target"))
            if source in ids and target in ids and source != target:
                edges.append((source, target, clamp(edge.get("weight", 1))))
        if len(edges) > MAX_EDGES:
            raise ValueError("Se excede el límite de 5.000 vínculos.")
    elif mode == "synthetic":
        total = int(data.get("sample_size", 150))
        if not 2 <= total <= MAX_AGENTS:
            raise ValueError("La muestra debe estar entre 2 y 500 agentes.")
        sizes = [max(0, int(a.get("population", 0))) for a in audiences]
        if not sum(sizes):
            raise ValueError("Las audiencias deben tener población mayor que cero.")
        allocations = [total * s / sum(sizes) for s in sizes]
        counts = [math.floor(v) for v in allocations]
        order = sorted(range(len(counts)), key=lambda i: (-(allocations[i] - counts[i]), i))
        for i in order[:total - sum(counts)]:
            counts[i] += 1
        for audience, count in zip(audiences, counts):
            for j in range(count):
                agents.append({
                    "id": f"{audience['id']}:{j}",
                    "audience_id": str(audience["id"]),
                    "capability": clamp(rng.gauss(float(audience.get("capability", 0.5)), 0.12)),
                    "opportunity": clamp(rng.gauss(float(audience.get("opportunity", 0.5)), 0.12)),
                    "motivation": clamp(rng.gauss(float(audience.get("motivation", 0.5)), 0.12)),
                })
        # Watts-Strogatz: vecindad local con algunos enlaces reconectados.
        # Solo un supuesto exploratorio; no representa el Grafo registrado.
        n = len(agents)
        k = min(6, n - 1)
        if k % 2:
            k -= 1
        graph = nx.watts_strogatz_graph(n, k, 0.15, seed=seed) if k >= 2 else nx.Graph()
        edges = []
        for u, v in graph.edges():
            edges.extend([(agents[u]["id"], agents[v]["id"], 1.0),
                          (agents[v]["id"], agents[u]["id"], 1.0)])
    else:
        raise ValueError("El modo debe ser 'synthetic' u 'observed'.")
    return agents, edges


def single_run(agents, incoming, scenario, initial_adoption, periods, rng_seed, parameters=None):
    """Actualización síncrona: todos deciden con estados del periodo anterior.

    Los uniformes se comparten entre control e intervención (common random numbers).
    Adopción absorbente durante el horizonte v1; retención se modelará aparte.
    """
    rng = random.Random(rng_seed)
    params = validated_parameters(parameters)
    ids = [a["id"] for a in agents]
    draws = {name: rng.random() for name in ids}
    thresholds = {name: clamp(rng.gauss(params["threshold_mean"], 0.13), 0.25, 0.9) for name in ids}
    adopted = {name: draws[name] < initial_adoption for name in ids}
    effects = {"capability": 0.18, "opportunity": 0.18, "motivation": 0.18}
    if scenario == "ambassadors":
        # Embajadores: un 10% de agentes de mayor entrada social, como intervención hipotética.
        # Se eligen por conexiones de salida; en la red sintética NO son referentes observados.
        out_counts = defaultdict(float)
        for target, sources in incoming.items():
            for source, weight in sources:
                out_counts[source] += weight
        leaders = sorted(ids, key=lambda i: (-out_counts[i], i))
        for identity in leaders[:max(1, math.ceil(len(ids) * 0.1))]:
            adopted[identity] = True
    history = [sum(adopted.values()) / len(ids)]
    audience_history = defaultdict(list)
    groups = defaultdict(list)
    for agent in agents:
        groups[agent["audience_id"]].append(agent["id"])
    for aid, members in groups.items():
        audience_history[aid].append(sum(adopted[i] for i in members) / len(members))
    for _ in range(periods):
        following = adopted.copy()
        for a in agents:
            identity = a["id"]
            # Consumir el mismo sorteo por agente y periodo en ambos escenarios.
            draw = rng.random()
            if adopted[identity]:
                continue
            c = clamp(a["capability"] + (effects["capability"] if scenario == "training" else 0))
            o = clamp(a["opportunity"] + (effects["opportunity"] if scenario == "friction" else 0))
            m = clamp(a["motivation"] + (effects["motivation"] if scenario == "incentives" else 0))
            neighbors = incoming.get(identity, [])
            weight_sum = sum(w for _, w in neighbors)
            peer = sum(w for s, w in neighbors if adopted[s]) / weight_sum if weight_sum else 0.0
            drive = 0.35 * c + 0.35 * o + 0.30 * m + params["peer_weight"] * peer
            # Forma funcional y coeficientes son supuestos falsables; no parámetros estimados.
            p = params["adoption_rate"] / (1 + math.exp(-8 * (drive - thresholds[identity])))
            if draw < p:
                following[identity] = True
        adopted = following
        history.append(sum(adopted.values()) / len(ids))
        for aid, members in groups.items():
            audience_history[aid].append(sum(adopted[i] for i in members) / len(members))
    return history, audience_history


def simulate_adoption(data: dict[str, Any]) -> dict[str, Any]:
    """Ejecuta escenarios apareados para estimar variabilidad, no probabilidades reales."""
    periods = int(data.get("periods", 12))
    runs = int(data.get("runs", 40))
    seed = int(data.get("seed", 2026))
    if not 1 <= periods <= 24 or not 5 <= runs <= 80:
        raise ValueError("Usa 1–24 periodos y 5–80 repeticiones.")
    initial_adoption = clamp(data.get("initial_adoption", 0.10))
    scenario = data.get("scenario", "training")
    if scenario not in {"training", "friction", "incentives", "ambassadors"}:
        raise ValueError("Escenario desconocido.")
    parameters = validated_parameters(data.get("parameters"))
    agents, edges = build_population(data, seed)
    incoming = defaultdict(list)
    for source, target, weight in edges:
        if weight > 0:
            incoming[target].append((source, weight))

    baseline, treatment = [], []
    by_group_base = defaultdict(list)
    by_group_treat = defaultdict(list)
    for rep in range(runs):
        run_seed = seed + 7919 * (rep + 1)
        b, b_groups = single_run(agents, incoming, "baseline", initial_adoption, periods, run_seed, parameters)
        t, t_groups = single_run(agents, incoming, scenario, initial_adoption, periods, run_seed, parameters)
        baseline.append(b)
        treatment.append(t)
        for aid in b_groups:
            by_group_base[aid].append(b_groups[aid][-1])
            by_group_treat[aid].append(t_groups[aid][-1])

    def interval(rows, t):
        vals = [r[t] for r in rows]
        return {"mean": round(mean(vals), 4), "p10": round(quantile(vals, 0.10), 4),
                "p90": round(quantile(vals, 0.90), 4)}

    series = [{"period": t, "baseline": interval(baseline, t),
               "intervention": interval(treatment, t)}
              for t in range(periods + 1)]
    differences = [t[-1] - b[-1] for t, b in zip(treatment, baseline)]
    groups = []
    for aud in data["audiences"]:
        aid = str(aud["id"])
        if aid not in by_group_base:
            continue
        groups.append({
            "id": aid, "name": str(aud.get("name", aid)),
            "agents": sum(a["audience_id"] == aid for a in agents),
            "baseline": round(mean(by_group_base[aid]), 4),
            "intervention": round(mean(by_group_treat[aid]), 4),
        })
    return {
        "status": "experimental_not_calibrated",
        "behavior": str(data.get("behavior", "Comportamiento objetivo"))[:160],
        "scenario": scenario, "periods": periods, "runs": runs, "seed": seed,
        "mode": data.get("mode", "synthetic"), "agent_count": len(agents), "edge_count": len(edges),
        "parameters": parameters,
        "parameter_origin": "provided_unvalidated" if data.get("parameters") else "hypothetical_defaults",
        "series": series,
        "final": {
            "baseline": series[-1]["baseline"],
            "intervention": series[-1]["intervention"],
            "difference": {"mean": round(mean(differences), 4),
                           "p10": round(quantile(differences, .10), 4),
                           "p90": round(quantile(differences, .90), 4)}
        },
        "audiences": groups,
        "limitations": [
            "Parámetros de transición y umbrales hipotéticos, todavía sin calibración empírica.",
            "Las bandas p10–p90 expresan variabilidad de Monte Carlo condicionada al modelo, no intervalos de confianza de una predicción real.",
            "Adopción absorbente: v1 no estima abandono ni sostenibilidad del comportamiento.",
            "Las audiencias sin datos individuales se representan mediante supuestos, no personas identificables."
        ],
    }
