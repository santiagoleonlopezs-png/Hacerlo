"""Pruebas sin llamadas a usuarios, Supabase ni proveedores de IA."""
import unittest
from activation_drafting import activation_context, activation_sources, decode_activation_reply


class ActivationDraftingTests(unittest.TestCase):
    def setUp(self):
        self.state = {
            "objective": "Incrementar reportes oportunos",
            "actions": [{
                "id": "act-01", "name": "Facilitar el reporte de incidentes",
                "description": "Desplegar comunicación para reportar incidentes",
                "hypothesis": "Si disminuye la incertidumbre se mejora el reporte",
                "behaviorId": "be-1",
            }],
            "behaviors": [
                {"id": "be-1", "name": "Reportar el incidente dentro de 24 horas",
                 "adoptionCriteria": "Registro verificable"},
                {"id": "be-2", "name": "Otra conducta no vinculada"},
            ],
            "audiences": [
                {"id": "a-1", "name": "Operaciones", "barriers": "Falta claridad en la ruta",
                 "changeRole": "Ejecutor"},
                {"id": "a-2", "name": "Dirección", "barriers": "Prioridades"},
            ],
            "audiencePeople": [
                {"id": "p-01", "name": "Nombre Privado", "email": "privado@empresa.com",
                 "audienceId": "a-1"},
            ],
            "diagnosisFindings": [
                {"role": "Barrera", "text": "No saben a quién escribir. Correo privado@empresa.com"},
                {"role": "Facilitador", "text": "Referentes del equipo conocen el canal"},
            ],
            "behaviorDiagnosis": {
                "f1": {"role": "Barrera", "factor": "Demasiados pasos", "dimension": "Oportunidad"},
            },
        }

    def test_uses_real_diagnosis_and_only_selected_audiences(self):
        result = activation_context(
            self.state, 0, "comunicacion", "activar", ["a-1"],
            {"subject": "Hola", "message": "Ayudar a reportar", "cta": "Registrar"},
        )
        self.assertEqual(result["intervencion"]["nombre"], "Facilitar el reporte de incidentes")
        self.assertEqual(result["comportamientos_vinculados"][0]["objetivo"],
                         "Reportar el incidente dentro de 24 horas")
        self.assertEqual(len(result["comportamientos_vinculados"]), 1)
        self.assertEqual(len(result["audiencias_seleccionadas"]), 1)
        self.assertIn("Falta claridad", result["audiencias_seleccionadas"][0]["barreras"])
        self.assertIn("[correo omitido]", result["hallazgos_relevantes"][0]["hallazgo"])
        self.assertEqual(activation_sources(result), {
            "audiencias": 1, "comportamientos": 1, "hallazgos": 2, "factores": 1
        })
        self.assertNotIn("privado@empresa.com", str(result))
        self.assertNotIn("Nombre Privado", str(result))
        self.assertNotIn("Otra conducta", str(result))

    def test_unselected_audiences_and_unknown_action(self):
        result = activation_context(self.state, 0, "reconocimiento", "sostener", [],
                                    {"message": "Reconocer"})
        self.assertEqual(result["audiencias_seleccionadas"], [])
        with self.assertRaisesRegex(ValueError, "intervención"):
            activation_context(self.state, 5, "comunicacion", "activar", [], {})

    def test_ai_proposal_is_structured_and_validated(self):
        raw = '{"subject":"Un nuevo paso","message":"Hagamos el reporte con claridad y sin pasos innecesarios.","cta":"Registrar el incidente","reason":"Aborda falta de claridad"}'
        output = decode_activation_reply(raw)
        self.assertEqual(output["subject"], "Un nuevo paso")
        self.assertEqual(output["cta"], "Registrar el incidente")
        self.assertEqual(output["reason"], "Aborda falta de claridad")
        with self.assertRaises(ValueError):
            decode_activation_reply('{"subject":"Incompleto","message":"Texto"}')
        with self.assertRaises(ValueError):
            decode_activation_reply("no result")
        with self.assertRaises(ValueError):
            decode_activation_reply('{"subject":"x","message":"corto","cta":"x","reason":""}')


if __name__ == "__main__":
    unittest.main()
