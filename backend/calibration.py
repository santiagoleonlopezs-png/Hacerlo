"""Evaluación retrospectiva y sensibilidad del motor HACERLO.

Sin ajustes por datos individuales ni afirmaciones causales. Las observaciones
representan una cohorte de denominador constante y una adopción acumulada.
"""
from __future__ import annotations

import math
from collections import defaultdict
from statistics import mean, median
from typing import Any

from simulation import (
    DEFAULT_PARAMETERS, PARAMETER_BOUNDS, build_population, single_run,
    validated_parameters,
)


def observations_as_series(records):
    """Verifica procedencia, orden temporal y compatibilidad con el modelo absorbente."""
    if not isinstance(records, list) or not 6 <= len(records) <= 25:
        raise ValueError("Se necesitan entre 6 y 25 mediciones, incluido el periodo 0.")
    ordered = sorted(records, key=lambda row: row.get("period", -1))
    periods = [r.get("period") for r in ordered]
    if periods != list(range(len(ordered))):
        raise ValueError("Los periodos deben ser enteros y consecutivos desde 0.")
    counts, sizes, sources = [], [], []
    for r in ordered:
        n, population = r.get("adopted_count"), r.get("eligible_count")
        if type(n) is not int or type(population) is not int:
            raise ValueError("Los conteos de adopción y población deben ser enteros.")
        if population < 2 or not 0 <= n <= population:
            raise ValueError("Conteos fuera de rango.")
        source = str(r.get("source") or "").strip()
        if not source or len(source) > 160:
            raise ValueError("Cada medición requiere fuente comprobable (máx. 160 caracteres).")
        counts.append(n)
        sizes.append(population)
        sources.append(source)
    if len(set(sizes)) != 1:
        raise ValueError("La población elegible debe conservar el mismo denominador entre periodos.")
    if any(b < a for a, b in zip(counts, counts[1:])):
        raise ValueError("La serie desciende: este modelo v1 solo representa adopción acumulada. Para abandono se requiere otro modelo.")
    if counts[0] == sizes[0]:
        raise ValueError("Toda la cohorte ya adoptó en el periodo inicial; no hay nada que calibrar.")
    return [v / sizes[0] for v in counts], {"denominator": sizes[0], "sources": sources}


def _evaluate_ensemble(agents, incoming, adoption_initial, periods, parameters, repeats, seed):
    series = []
    for rep in range(repeats):
        values, _ = single_run(
            agents, incoming, "baseline", adoption_initial,
            periods, seed + 7919 * (rep + 1), parameters
        )
        series.append(values)
    return [mean(row[t] for row in series) for t in range(periods + 1)]


def _mae(expected, observed, indices):
    return mean(abs(expected[t] - observed[t]) for t in indices)


def calibrate_adoption(data: dict[str, Any]) -> dict[str, Any]:
    """Ajuste en entrenamiento con holdout temporal intacto para evaluación.

    Variación de solo dos parámetros; el resto permanece fijado. No infiere
    identificabilidad de los parámetros ni generalización entre iniciativas.
    """
    obs, provenance = observations_as_series(data.get("observations", []))
    periods = len(obs) - 1
    if data.get("scenario", "training") not in {"training", "friction", "incentives", "ambassadors"}:
        raise ValueError("Escenario inválido.")
    initial = obs[0]
    input_data = dict(data)
    input_data["periods"] = periods
    input_data["initial_adoption"] = initial
    sample = int(data.get("sample_size", 150))
    if not 20 <= sample <= 300 and data.get("mode", "synthetic") == "synthetic":
        raise ValueError("Para calibrar utiliza entre 20 y 300 agentes sintéticos.")
    agents, edges = build_population(input_data, int(data.get("seed", 2026)))
    incoming = defaultdict(list)
    for src, dst, weight in edges:
        if weight > 0:
            incoming[dst].append((src, weight))
    if not 20 <= len(agents) <= 300:
        raise ValueError("La calibración requiere entre 20 y 300 agentes.")
    if not 6 <= len(obs) <= 16:
        raise ValueError("Calibra con 6 a 16 periodos; usa ventanas separadas para series más largas.")

    # Reserva los DOS últimos periodos como holdout temporal. No intervienen
    # en el ordenamiento de candidatos ni en la selección de parámetros.
    train = list(range(1, len(obs) - 2))
    holdout = list(range(len(obs) - 2, len(obs)))
    fit_runs = 12
    seed = int(data.get("seed", 2026))
    grid = [
        (theta, peer)
        for theta in (0.48, 0.58, 0.68, 0.78)
        for peer in (0.05, 0.20, 0.35, 0.50)
    ]
    candidates = []
    for theta, peer in grid:
        params = {**DEFAULT_PARAMETERS, "threshold_mean": theta, "peer_weight": peer}
        curve = _evaluate_ensemble(agents, incoming, initial, periods, params, fit_runs, seed)
        score = _mae(curve, obs, train)
        candidates.append({"parameters": params, "training_mae": score})
    candidates.sort(key=lambda row: (row["training_mae"],
                                    row["parameters"]["threshold_mean"],
                                    row["parameters"]["peer_weight"]))
    best = candidates[0]["parameters"]
    # Fuera de muestra usamos otras semillas para reducir la coincidencia
    # accidental por ruido Monte Carlo durante la búsqueda.
    final_runs = 32
    predicted = _evaluate_ensemble(agents, incoming, initial, periods, best, final_runs, seed + 1_000_003)
    uncalibrated = _evaluate_ensemble(
        agents, incoming, initial, periods, DEFAULT_PARAMETERS, final_runs, seed + 1_000_003
    )
    # Persistencia ingenua: mantener fija la última tasa conocida del entrenamiento.
    # Este comparador usa exclusivamente el último punto de entrenamiento.
    naive = [obs[train[-1]]] * len(obs)
    valid_mae = _mae(predicted, obs, holdout)
    naive_mae = _mae(naive, obs, holdout)
    default_mae = _mae(uncalibrated, obs, holdout)
    tolerance = max(0.015, candidates[0]["training_mae"] * 0.20)
    plausible = sum(c["training_mae"] <= candidates[0]["training_mae"] + tolerance for c in candidates)
    return {
        "status": "retrospective_not_prospective_validation",
        "model_version": "abm-1.1",
        "parameters": best,
        "fixed_parameters": {"adoption_rate": DEFAULT_PARAMETERS["adoption_rate"],
                             "weights": {"capability": 0.35, "opportunity": 0.35, "motivation": 0.30},
                             "threshold_sd": 0.13},
        "method": "grid_search_train_only_temporal_holdout",
        "searched_candidates": len(candidates),
        "near_optimal_candidates": plausible,
        "training_periods": train,
        "holdout_periods": holdout,
        "initial_adoption": initial,
        "provenance": provenance,
        "number_of_agents": len(agents),
        "network_mode": data.get("mode", "synthetic"),
        "fit_runs": fit_runs, "evaluation_runs": final_runs, "seed": seed,
        "training_mae_pp": round(_mae(predicted, obs, train) * 100, 2),
        "holdout_mae_pp": round(valid_mae * 100, 2),
        "naive_holdout_mae_pp": round(naive_mae * 100, 2),
        "default_model_holdout_mae_pp": round(default_mae * 100, 2),
        "better_than_naive": valid_mae < naive_mae,
        "series": [
            {"period": t, "observed": round(obs[t], 5),
             "calibrated": round(predicted[t], 5),
             "default": round(uncalibrated[t], 5),
             "set": "holdout" if t in holdout else "training"}
            for t in range(len(obs))
        ],
        "limitations": [
            "Backtest retrospectivo; no demuestra validación prospectiva ni causalidad.",
            "Un solo agregado temporal no identifica de manera única los mecanismos.",
            "La calibración minimiza error para dos parámetros; los demás permanecen hipotéticos.",
            "Las últimas dos mediciones se reservan como holdout sin reentrenamiento.",
            "La extrapolación a otras audiencias, redes y comportamientos no está validada.",
        ],
    }


def sensitivity_adoption(data: dict[str, Any]) -> dict[str, Any]:
    """Explora perturbaciones paramétricas frente a un umbral decisional explícito."""
    from simulation import simulate_adoption

    p = validated_parameters(data.get("parameters"))
    target = float(data.get("target_effect_pp", 5))
    if not math.isfinite(target) or not 0 <= target <= 100:
        raise ValueError("El umbral decisional debe estar entre 0 y 100 puntos porcentuales.")
    if int(data.get("periods", 12)) > 18:
        raise ValueError("Sensibilidad admite hasta 18 periodos.")
    if int(data.get("sample_size", 150)) > 300 and data.get("mode", "synthetic") == "synthetic":
        raise ValueError("Sensibilidad admite hasta 300 agentes.")
    if len(data.get("agents", [])) > 300:
        raise ValueError("Sensibilidad admite hasta 300 agentes.")
    if int(data.get("runs", 12)) > 20:
        raise ValueError("Sensibilidad admite hasta 20 repeticiones por combinación.")

    steps = [-1, 0, 1]
    results = []
    for t in steps:
        for n in steps:
            theta = min(PARAMETER_BOUNDS["threshold_mean"][1],
                        max(PARAMETER_BOUNDS["threshold_mean"][0],
                            p["threshold_mean"] + t * 0.08))
            peer = min(PARAMETER_BOUNDS["peer_weight"][1],
                       max(PARAMETER_BOUNDS["peer_weight"][0],
                           p["peer_weight"] + n * 0.12))
            variant = {**p, "threshold_mean": round(theta, 4), "peer_weight": round(peer, 4)}
            inp = {**data, "parameters": variant, "runs": min(20, int(data.get("runs", 12)))}
            sim = simulate_adoption(inp)
            delta = 100 * sim["final"]["difference"]["mean"]
            results.append({"parameters": variant,
                            "effect_pp": round(delta, 2),
                            "baseline_final": sim["final"]["baseline"]["mean"],
                            "intervention_final": sim["final"]["intervention"]["mean"],
                            "meets_target": delta >= target})
    return {
        "status": "local_parameter_sensitivity_not_prediction",
        "scenario": data.get("scenario", "training"),
        "reference_parameters": p,
        "target_effect_pp": target,
        "runs_per_configuration": min(20, int(data.get("runs", 12))),
        "configurations": results,
        "summary": {
            "min_effect_pp": min(v["effect_pp"] for v in results),
            "median_effect_pp": round(median(v["effect_pp"] for v in results), 2),
            "max_effect_pp": max(v["effect_pp"] for v in results),
            "meeting_target": sum(v["meets_target"] for v in results),
            "total": len(results),
        },
        "limitations": [
            "Porcentaje de escenarios que cumple el objetivo NO equivale a probabilidad real de éxito.",
            "Solo varían dos parámetros; no se exploran errores de estructura de red ni supuestos COM-B.",
            "La adopción es absorbente; no considera abandono ni efectos no deseados.",
        ],
    }
