from typing import Any, Dict, List, Optional
import math
import networkx as nx


def _safe_round(val: float, digits: int = 4) -> float:
    try:
        return round(float(val), digits)
    except Exception:
        return 0.0


def analyze_network(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    mode: str = "layer",
    relation_filter: Optional[str] = None,
) -> Dict[str, Any]:
    G = nx.DiGraph()

    for idx, n in enumerate(nodes or []):
        node_id = str(n.get("id") if n.get("id") is not None else idx)
        label = str(n.get("name") or n.get("label") or f"Nodo {idx}")
        G.add_node(
            idx,
            id=node_id,
            label=label,
            type=n.get("type", "Rol"),
            factors=n.get("graphFactors", []),
        )

    relation_counts: Dict[str, int] = {}
    fragile_edges: List[Dict[str, Any]] = []

    for e in edges or []:
        s = e.get("s", e.get("source"))
        t = e.get("t", e.get("target"))
        if s is None or t is None:
            continue
        try:
            s_idx = int(s)
            t_idx = int(t)
        except Exception:
            continue
        if s_idx not in G or t_idx not in G:
            continue

        rel = str(e.get("relation") or e.get("label") or "General")
        if mode == "layer" and relation_filter and relation_filter != "all":
            if rel != relation_filter:
                continue

        relation_counts[rel] = relation_counts.get(rel, 0) + 1
        weight = float(e.get("strength") or 1.0)
        evidence = str(e.get("evidence") or "Observada")
        alerts = e.get("graphFactors") or []

        G.add_edge(s_idx, t_idx, weight=weight, relation=rel, evidence=evidence)
        if e.get("direction") == "bidirectional":
            rev_w = float(e.get("reverseStrength") or weight)
            G.add_edge(t_idx, s_idx, weight=rev_w, relation=rel, evidence=evidence)

        if alerts or evidence in ("Declarada", "Hipotética", "Hipótesis") or weight <= 1.0:
            fragile_edges.append(
                {
                    "source": G.nodes[s_idx]["label"],
                    "target": G.nodes[t_idx]["label"],
                    "relation": rel,
                    "evidence": evidence,
                    "alerts": [a.get("name", "") for a in alerts if isinstance(a, dict)],
                }
            )

    n_count = G.number_of_nodes()
    e_count = G.number_of_edges()
    density = nx.density(G) if n_count > 1 else 0.0
    reciprocity = nx.reciprocity(G) if e_count > 0 else 0.0
    isolates = list(nx.isolates(G))
    weak_comp = nx.number_weakly_connected_components(G) if n_count > 0 else 0
    strong_comp = nx.number_strongly_connected_components(G) if n_count > 0 else 0

    in_deg = nx.in_degree_centrality(G) if n_count > 1 else {n: 0.0 for n in G.nodes}
    out_deg = nx.out_degree_centrality(G) if n_count > 1 else {n: 0.0 for n in G.nodes}
    betw = nx.betweenness_centrality(G, weight="weight") if n_count > 2 else {n: 0.0 for n in G.nodes}
    try:
        pr = nx.pagerank(G, weight="weight") if n_count > 0 and e_count > 0 else {n: 1.0 / max(1, n_count) for n in G.nodes}
    except Exception:
        pr = {n: 1.0 / max(1, n_count) for n in G.nodes}

    metrics = []
    for n in G.nodes:
        metrics.append(
            {
                "id": G.nodes[n]["id"],
                "label": G.nodes[n]["label"],
                "in_degree": int(G.in_degree(n)),
                "out_degree": int(G.out_degree(n)),
                "in_degree_centrality": _safe_round(in_deg.get(n, 0.0)),
                "out_degree_centrality": _safe_round(out_deg.get(n, 0.0)),
                "betweenness_centrality": _safe_round(betw.get(n, 0.0)),
                "pagerank": _safe_round(pr.get(n, 0.0)),
            }
        )

    top_in = sorted(metrics, key=lambda x: x["in_degree_centrality"], reverse=True)[:5]
    top_out = sorted(metrics, key=lambda x: x["out_degree_centrality"], reverse=True)[:5]

    total_rel = sum(relation_counts.values()) or 1
    relation_composition = [
        {
            "relation": k,
            "count": v,
            "share": _safe_round(v / total_rel, 4),
            "percent": _safe_round((v / total_rel) * 100.0, 1),
        }
        for k, v in sorted(relation_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    signals = []
    if top_out:
        signals.append(f"Mayor emisor / referente de salida: {top_out[0]['label']} (centralidad {top_out[0]['out_degree_centrality']}).")
    if top_in:
        signals.append(f"Mayor receptor / posible cuello de botella: {top_in[0]['label']} (centralidad {top_in[0]['in_degree_centrality']}).")
    for fe in fragile_edges[:5]:
        alert_str = ", ".join(filter(None, fe["alerts"])) or fe["evidence"]
        signals.append(f"Enlace crítico o con alerta a intervenir: {fe['source']} → {fe['target']} ({fe['relation']} · {alert_str}).")

    return {
        "mode": mode,
        "relation_filter": relation_filter,
        "nodes": n_count,
        "edges": e_count,
        "density": _safe_round(density),
        "summary": {
            "nodes": n_count,
            "edges": e_count,
            "layers": len(relation_counts),
            "density": _safe_round(density),
            "reciprocity": _safe_round(reciprocity or 0.0),
            "isolates": len(isolates),
            "weak_components": weak_comp,
            "strong_components": strong_comp,
        },
        "metrics": metrics,
        "top_in": [{"id": m["id"], "label": m["label"], "value": m["in_degree_centrality"]} for m in top_in],
        "top_out": [{"id": m["id"], "label": m["label"], "value": m["out_degree_centrality"]} for m in top_out],
        "relation_composition": relation_composition,
        "fragile_edges": fragile_edges,
        "signals": signals,
    }


def simulate_agent_intervention(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Motor híbrido HACERLO:
    1. COM-B (Michie) & Fogg (B=MAP) para la disposición interna del agente.
    2. Contagio Complejo (Damon Centola) sobre el grafo multiplex.
    3. Campos de Fuerzas (Kurt Lewin) & Dinámica de Sistemas (Meadows/Sterman) para bucles de freno.
    """
    nodes = payload.get("nodes") or []
    edges = payload.get("edges") or []
    audiences = payload.get("audiences") or []
    system_conditions = payload.get("system_conditions") or []
    repaired_edges = set(payload.get("repaired_edges") or [])
    resolved_conditions = set(payload.get("resolved_conditions") or [])
    weeks = int(payload.get("weeks") or 12)

    active_barriers = [
        c for c in system_conditions
        if c.get("orientation") == "Dificulta" and c.get("id") not in resolved_conditions
    ]
    relieved_barriers = [
        c for c in system_conditions
        if c.get("orientation") == "Dificulta" and c.get("id") in resolved_conditions
    ]

    base_friction = min(0.65, len(active_barriers) * 0.14 + len(relieved_barriers) * 0.14 or 0.36)
    intervened_friction = max(0.06, base_friction - len(relieved_barriers) * 0.14)

    edge_boost = min(0.45, len(repaired_edges) * 0.16)
    synergy = 0.12 if (len(relieved_barriers) > 0 and len(repaired_edges) > 0) else 0.0

    results = []
    for idx, aud in enumerate(audiences):
        pop = int(aud.get("population") or 50)
        name = str(aud.get("name") or f"Audiencia {idx+1}")
        comb = float(aud.get("comb_score") or 0.58)

        base_ceiling = max(0.15, min(0.55, comb - (base_friction * 0.55)))
        int_ceiling = max(base_ceiling, min(0.94, comb - (intervened_friction * 0.45) + edge_boost + synergy))

        series_base = []
        series_int = []
        for w in range(1, weeks + 1):
            prog = 1.0 - math.exp(-0.26 * w)
            b_val = max(0.08, min(base_ceiling, base_ceiling * prog))
            i_val = max(b_val, min(int_ceiling, int_ceiling * prog))
            series_base.append(round(b_val * 100, 1))
            series_int.append(round(i_val * 100, 1))

        results.append(
            {
                "audience": name,
                "population": pop,
                "baseline_sustain_pct": series_base[-1] if series_base else 0.0,
                "intervened_sustain_pct": series_int[-1] if series_int else 0.0,
                "delta_pct": round((series_int[-1] - series_base[-1]), 1) if series_base else 0.0,
                "series_baseline": series_base,
                "series_intervened": series_int,
            }
        )

    return {
        "model": "COM-B + Centola Complex Contagion + Lewin/Sterman System Dynamics",
        "weeks": weeks,
        "base_system_friction": _safe_round(base_friction, 3),
        "intervened_system_friction": _safe_round(intervened_friction, 3),
        "network_contagion_boost": _safe_round(edge_boost, 3),
        "synergy_bonus": _safe_round(synergy, 3),
        "audiences": results,
    }
