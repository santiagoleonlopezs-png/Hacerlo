"""Integración API real (FastAPI) con autenticación Supabase simulada.

No se accede a Supabase ni a Render; las pruebas incluyen el contrato HTTP
y el cálculo Python de punta a punta usando datos ficticios.
"""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
import app as api

AUDIENCES = [
    {"id": "a", "name": "Asesores", "population": 80,
     "capability": .60, "opportunity": .45, "motivation": .55},
    {"id": "b", "name": "Operaciones", "population": 20,
     "capability": .50, "opportunity": .55, "motivation": .55},
]
SAMPLE = {
    "audiences": AUDIENCES, "mode": "synthetic", "sample_size": 50,
    "scenario": "friction", "initial_adoption": .10, "behavior": "Registrar interacción",
    "periods": 5, "runs": 6, "seed": 2026,
}
MEASURES = [
    {"period": n, "adopted_count": count, "eligible_count": 100, "source": "Piloto simulado"}
    for n, count in enumerate([10, 13, 19, 24, 28, 33])
]
HEADERS = {"Authorization": "Bearer token-ficticio",
           "X-Supabase-Apikey": "clave-publica-ficticia"}


class SimulatedInitiativeAPITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(api.app)
        api._simulation_requests.clear()

    def test_missing_and_invalid_session_rejected(self):
        for path in ("/api/simulation/adoption", "/api/simulation/calibrate",
                     "/api/simulation/sensitivity"):
            payload = {**SAMPLE}
            if path.endswith("/calibrate"):
                payload["observations"] = MEASURES
            response = self.client.post(path, json=payload)
            self.assertEqual(response.status_code, 401, path)
            with patch.object(api, "get_json", side_effect=ValueError("token inválido")):
                response = self.client.post(path, json=payload, headers=HEADERS)
            self.assertEqual(response.status_code, 401, path)

    @patch.object(api, "get_json", return_value={"id": "usuario-prueba"})
    def test_complete_api_pipeline(self, _fake_auth):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertIn("abm", health.json())

        result = self.client.post("/api/simulation/adoption",
                                  json=SAMPLE, headers=HEADERS)
        self.assertEqual(result.status_code, 200, result.text)
        outcome = result.json()
        self.assertEqual(outcome["behavior"], "Registrar interacción")
        self.assertEqual(outcome["agent_count"], 50)
        self.assertEqual(len(outcome["series"]), 6)
        self.assertEqual(outcome["status"], "experimental_not_calibrated")

        fitted = self.client.post("/api/simulation/calibrate",
                                  json={**SAMPLE, "observations": MEASURES},
                                  headers=HEADERS)
        self.assertEqual(fitted.status_code, 200, fitted.text)
        calibration = fitted.json()
        self.assertEqual(calibration["holdout_periods"], [4, 5])
        self.assertEqual(calibration["searched_candidates"], 16)
        self.assertEqual(calibration["provenance"]["denominator"], 100)

        sensitivity = self.client.post("/api/simulation/sensitivity",
                                       json={**SAMPLE, "parameters": calibration["parameters"],
                                             "target_effect_pp": 5},
                                       headers=HEADERS)
        self.assertEqual(sensitivity.status_code, 200, sensitivity.text)
        result = sensitivity.json()
        self.assertEqual(result["summary"]["total"], 9)
        self.assertEqual(len(result["configurations"]), 9)
        self.assertLessEqual(result["summary"]["min_effect_pp"], result["summary"]["max_effect_pp"])

        # Comprobación de regresión para el motor existente NetworkX.
        network = self.client.post("/api/network/analyze", json={
            "nodes": [{"id":0, "label":"Agente A"}, {"id":1,"label":"Agente B"}],
            "edges": [{"s":0,"t":1,"relation":"Influye en"}],
            "mode":"layer",
        })
        self.assertEqual(network.status_code, 200, network.text)
        self.assertEqual(network.json()["summary"]["edges"], 1)

    @patch.object(api, "get_json", return_value={"id": "usuario-prueba"})
    def test_invalid_data_and_rate_limits(self, _fake_auth):
        invalid = self.client.post("/api/simulation/calibrate",
                                   json={**SAMPLE, "observations": [
                                       {**entry, "eligible_count": 200} if entry["period"] == 3 else entry
                                       for entry in MEASURES
                                   ]}, headers=HEADERS)
        self.assertEqual(invalid.status_code, 422)
        self.assertIn("denominador", invalid.text)

        for _ in range(19):
            r = self.client.post("/api/simulation/adoption", json=SAMPLE, headers=HEADERS)
            self.assertEqual(r.status_code, 200, r.text)
        denied = self.client.post("/api/simulation/adoption", json=SAMPLE, headers=HEADERS)
        self.assertEqual(denied.status_code, 429)


if __name__ == "__main__":
    unittest.main()
