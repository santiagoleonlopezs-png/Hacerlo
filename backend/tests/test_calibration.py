"""Pruebas de separación temporal, calidad de datos y sensibilidad del ABM."""
import unittest

from calibration import calibrate_adoption, observations_as_series, sensitivity_adoption
from simulation import DEFAULT_PARAMETERS, simulate_adoption, validated_parameters

BASE = {
    "audiences": [{"id": "ops", "name": "Operaciones", "population": 50,
                   "capability": .55, "opportunity": .55, "motivation": .55}],
    "mode": "synthetic", "sample_size": 30, "seed": 101, "runs": 8,
    "periods": 5, "initial_adoption": .10, "scenario": "training",
}
COUNTS = [5, 7, 9, 11, 13, 16]
OBSERVATIONS = [
    {"period": i, "adopted_count": count, "eligible_count": 50, "source": "Medición agregada"}
    for i, count in enumerate(COUNTS)
]


class ModelValidationTests(unittest.TestCase):
    def test_parameter_defaults_and_explicit_controls(self):
        self.assertEqual(validated_parameters(), DEFAULT_PARAMETERS)
        custom = validated_parameters({"threshold_mean": .48, "peer_weight": .35})
        self.assertEqual(custom["threshold_mean"], .48)
        self.assertEqual(custom["adoption_rate"], .28)
        with self.assertRaises(ValueError):
            validated_parameters({"peer_weight": float("nan")})
        with self.assertRaises(ValueError):
            validated_parameters({"undocumented": .22})
        with self.assertRaises(ValueError):
            validated_parameters({"peer_weight": 30})

    def test_observations_require_fixed_denominator_monotone_and_sources(self):
        rates, meta = observations_as_series(OBSERVATIONS)
        self.assertEqual(rates[0], .1)
        self.assertEqual(meta["denominator"], 50)
        changed = [dict(x) for x in OBSERVATIONS]
        changed[3]["eligible_count"] = 60
        with self.assertRaisesRegex(ValueError, "denominador"):
            observations_as_series(changed)
        changed = [dict(x) for x in OBSERVATIONS]
        changed[4]["adopted_count"] = 8
        with self.assertRaisesRegex(ValueError, "desciende"):
            observations_as_series(changed)
        changed = [dict(x) for x in OBSERVATIONS]
        changed[2]["source"] = ""
        with self.assertRaisesRegex(ValueError, "fuente"):
            observations_as_series(changed)

    def test_holdout_changes_never_change_selected_parameters(self):
        first = calibrate_adoption({**BASE, "observations": OBSERVATIONS})
        later = [dict(x) for x in OBSERVATIONS]
        later[-2]["adopted_count"] = 20
        later[-1]["adopted_count"] = 25
        second = calibrate_adoption({**BASE, "observations": later})
        self.assertEqual(first["parameters"], second["parameters"])
        self.assertEqual(first["training_periods"], [1, 2, 3])
        self.assertEqual(first["holdout_periods"], [4, 5])
        self.assertNotEqual(first["holdout_mae_pp"], second["holdout_mae_pp"])
        self.assertEqual(first["status"], "retrospective_not_prospective_validation")
        self.assertEqual(first["searched_candidates"], 16)

    def test_calibration_reproducible(self):
        inp = {**BASE, "observations": OBSERVATIONS}
        self.assertEqual(calibrate_adoption(inp), calibrate_adoption(inp))

    def test_sensitivity_reproducible_and_bounded(self):
        inp = {**BASE, "target_effect_pp": 5, "runs": 5}
        first=sensitivity_adoption(inp)
        self.assertEqual(first,sensitivity_adoption(inp))
        self.assertEqual(first["summary"]["total"],9)
        self.assertEqual(len(first["configurations"]),9)
        self.assertTrue(all(0 <= row["intervention_final"] <= 1 for row in first["configurations"]))

    def test_simulation_uses_calibrated_parameter_object(self):
        baseline=simulate_adoption(BASE)
        changed=simulate_adoption({**BASE,"parameters":{"threshold_mean":.48}})
        self.assertNotEqual(baseline["final"]["baseline"]["mean"],
                            changed["final"]["baseline"]["mean"])
        self.assertEqual(changed["parameters"]["threshold_mean"], .48)


if __name__=="__main__":
    unittest.main()
