"""Pruebas de reproducibilidad y restricciones de HACERLO ABM v1."""
import unittest
from simulation import simulate_adoption, build_population, single_run

BASE = {
    "audiences": [
        {"id": "a", "name": "Operaciones", "population": 80, "capability": 0.4, "opportunity": 0.6, "motivation": 0.5},
        {"id": "b", "name": "Comercial", "population": 20, "capability": 0.7, "opportunity": 0.4, "motivation": 0.6},
    ],
    "behavior": "Registrar el uso de una herramienta",
    "mode": "synthetic",
    "sample_size": 80,
    "initial_adoption": 0.12,
    "scenario": "training",
    "periods": 8,
    "runs": 12,
    "seed": 42,
}


class SimulationTests(unittest.TestCase):
    def test_initial_count_is_fixed_but_identities_can_vary(self):
        agents, _ = build_population(BASE, seed=42)
        for seed in (1, 19, 2026):
            for rate in (0, .12, .5, 1):
                curve, _ = single_run(agents, {}, 'baseline', rate, 3, seed)
                expected = int(rate * len(agents) + .5) / len(agents)
                self.assertEqual(curve[0], expected)
                self.assertLessEqual(abs(curve[0] - rate), .5 / len(agents))
                self.assertTrue(all(b >= a for a, b in zip(curve, curve[1:])))

    def test_initial_resolution_and_model_version_are_explicit(self):
        result = simulate_adoption(BASE)
        self.assertEqual(result['model_version'], 'abm-1.2')
        self.assertEqual(result['initialization']['requested_rate'], .12)
        self.assertEqual(result['initialization']['represented_rate'], .125)
        self.assertEqual(result['initialization']['resolution_pp'], 1.25)
        start = result['series'][0]['baseline']
        self.assertEqual(start['mean'], start['p10'])
        self.assertEqual(start['mean'], start['p90'])

    def test_same_seed_reproduces_every_result(self):
        self.assertEqual(simulate_adoption(BASE), simulate_adoption(BASE))

    def test_intervention_is_monotonic_under_paired_randomness(self):
        for name in ("training", "friction", "incentives", "ambassadors"):
            with self.subTest(scenario=name):
                result = simulate_adoption({**BASE, "scenario": name})
                self.assertGreaterEqual(result["final"]["difference"]["mean"], -1e-6)
                self.assertEqual(len(result["series"]), BASE["periods"] + 1)

    def test_population_allocation_is_stratified(self):
        agents, edges = build_population(BASE, seed=42)
        self.assertEqual(len(agents), 80)
        self.assertEqual(sum(x["audience_id"] == "a" for x in agents), 64)
        self.assertEqual(sum(x["audience_id"] == "b" for x in agents), 16)
        self.assertTrue(edges)

    def test_no_false_claim_of_calibration(self):
        result = simulate_adoption(BASE)
        self.assertEqual(result["status"], "experimental_not_calibrated")
        self.assertEqual(result["mode"], "synthetic")
        self.assertTrue(result["limitations"])
        for item in result["series"]:
            for k in ("baseline", "intervention"):
                self.assertLessEqual(item[k]["p10"], item[k]["p90"])
                self.assertGreaterEqual(item[k]["mean"], 0)
                self.assertLessEqual(item[k]["mean"], 1)

    def test_observed_network_uses_only_supplied_edges(self):
        payload = {
            **BASE, "mode": "observed",
            "agents": [
                {"id": "p1", "audience_id": "a"},
                {"id": "p2", "audience_id": "a"},
                {"id": "p3", "audience_id": "b"},
            ],
            "edges": [
                {"source": "p1", "target": "p2", "weight": .8},
                {"source": "p2", "target": "p3", "weight": .5}
            ],
        }
        result = simulate_adoption(payload)
        self.assertEqual(result["agent_count"], 3)
        self.assertEqual(result["edge_count"], 2)
        self.assertEqual(result["mode"], "observed")

    def test_incomplete_node_audience_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "audiencia"):
            simulate_adoption({
                **BASE, "mode": "observed",
                "agents": [{"id": "p1", "audience_id": "a"}, {"id": "p2", "audience_id": "unknown"}],
                "edges": []
            })

    def test_rejects_excessive_computation(self):
        with self.assertRaisesRegex(ValueError, "periodos"):
            simulate_adoption({**BASE, "periods": 900})
        with self.assertRaisesRegex(ValueError, "repeticiones"):
            simulate_adoption({**BASE, "runs": 1000})
        with self.assertRaisesRegex(ValueError, "muestra"):
            simulate_adoption({**BASE, "sample_size": 900})


if __name__ == "__main__":
    unittest.main()
