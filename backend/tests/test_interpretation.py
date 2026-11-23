"""Regressions for empty, truncated and differently wrapped OpenRouter reports."""
import copy
import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import Mock
from urllib.error import HTTPError

from interpretation import (InterpretationError, INTERPRETATION_MODELS,
                            decode_interpretation, request_interpretation)


REPORT = {
    'system_reading': 'El equipo necesita una ruta clara para registrar solicitudes.',
    'audience_reading': 'Operaciones registra y el líder resuelve dudas.',
    'structural_findings': ['Hay dudas sobre el paso de revisión.'],
    'hypotheses': [{'title': '¿Falta claridad?', 'rationale': 'Hay dudas registradas.',
                    'evidence_limit': 'Observar la siguiente prueba.'}],
    'interventions': [{'name': 'Probar una guía', 'why': 'Aclara el paso inicial.',
                       'measure': 'Contar registros completos.'}],
    'what_to_measure': ['Registros completos por semana.'],
    'traceability': 'Diagnóstico ficticio; queda por observar la práctica.',
}


def reply(content=None, finish='stop', **extras):
    return {'model': 'modelo-ficticio:free', 'choices': [{
        'finish_reason': finish,
        'message': {'content': json.dumps(REPORT) if content is None else content, **extras},
    }]}


class InterpretationTests(unittest.TestCase):
    def test_complete_reports_with_common_wrappers(self):
        raw = json.dumps(REPORT, ensure_ascii=False)
        before, after = raw.split(', ', 1)
        for content in (raw, REPORT, '```JSON\n' + raw + '\n```',
                        'Aquí está el informe:\n' + raw,
                        [{'type': 'text', 'text': before + ','}, {'type': 'text', 'text': after}]):
            with self.subTest(content=type(content).__name__):
                self.assertEqual(decode_interpretation(reply(content)), REPORT)

    def test_reasoning_is_never_used_as_the_report(self):
        response = reply('', finish='length', reasoning='Razonamiento interno que no es un informe')
        with self.assertRaisesRegex(InterpretationError, 'output_limit'):
            decode_interpretation(response)
        with self.assertRaisesRegex(InterpretationError, 'empty_content'):
            decode_interpretation(reply([{'type': 'reasoning', 'text': json.dumps(REPORT)}]))

    def test_partial_or_wrongly_typed_reports_are_not_successes(self):
        malformed = [
            {}, [], {'system_reading': 'Informe sin las otras secciones.'},
            {**REPORT, 'system_reading': ''}, {**REPORT, 'interventions': [None]},
            {**REPORT, 'structural_findings': 'No es una lista'},
            {**REPORT, 'hypotheses': [{'title': 'Falta explicación'}]},
        ]
        for report in malformed:
            with self.subTest(report=report), self.assertRaises(InterpretationError):
                decode_interpretation(reply(json.dumps(report)))
        for content in ('Una explicación narrativa sin las secciones del informe. ' * 3,
                        json.dumps(REPORT)[:-3], ''):
            with self.subTest(content=content), self.assertRaises(InterpretationError):
                decode_interpretation(reply(content))
        with self.assertRaisesRegex(InterpretationError, 'output_limit'):
            decode_interpretation(reply(finish='length'))

    def test_incomplete_envelopes_are_rejected(self):
        for data in (None, [], {}, {'choices': [None]}, {'choices': [{'message': None}]}):
            with self.subTest(data=data), self.assertRaises(InterpretationError):
                decode_interpretation(data)

    def test_retries_empty_length_response_using_same_context(self):
        failed = reply('', finish='length', reasoning='NO_DEBE_APARECER_EN_LOGS')
        failed['usage'] = {'completion_tokens': 5000, 'completion_tokens_details': {'reasoning_tokens': 5000}}
        sender = Mock(side_effect=[failed, reply()])
        body = {'model': INTERPRETATION_MODELS[0], 'messages': [
            {'role': 'system', 'content': 'Instrucción ficticia'},
            {'role': 'user', 'content': 'CONTEXTO_PRIVADO_DE_PRUEBA'},
        ], 'response_format': {'type': 'json_schema'}}
        original = copy.deepcopy(body)
        output = io.StringIO()
        with redirect_stdout(output):
            result = request_interpretation(body, {}, sender, deadline=64, clock=lambda: 0)
        self.assertEqual(result['system_reading'], REPORT['system_reading'])
        self.assertEqual(result['provider'], 'OpenRouter')
        self.assertEqual(sender.call_count, 2)
        self.assertEqual(body, original)
        first, second = [call.args[1] for call in sender.call_args_list]
        self.assertGreater(first['max_tokens'], 0)
        self.assertEqual(first['reasoning']['enabled'], False)
        self.assertEqual(second['reasoning']['enabled'], False)
        self.assertNotEqual(first['model'], second['model'])
        self.assertTrue(all(model.endswith(':free') for model in INTERPRETATION_MODELS))
        self.assertEqual(second['messages'][:2], body['messages'])
        self.assertEqual(second['model'], INTERPRETATION_MODELS[1])
        self.assertIn('"reasoning_tokens": 5000', output.getvalue())
        self.assertNotIn('NO_DEBE_APARECER_EN_LOGS', output.getvalue())
        self.assertNotIn('CONTEXTO_PRIVADO_DE_PRUEBA', output.getvalue())

    def test_success_does_not_retry(self):
        sender = Mock(return_value=reply())
        request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                               deadline=64, clock=lambda: 0)
        self.assertEqual(sender.call_count, 1)

    def test_stops_after_two_unusable_replies(self):
        sender = Mock(return_value=reply('', finish='length'))
        with self.assertRaisesRegex(InterpretationError, 'output_limit'):
            request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                                   deadline=64, clock=lambda: 0)
        self.assertEqual(sender.call_count, 2)

    def test_refusal_and_provider_rate_limits_do_not_retry(self):
        for response in (reply('', refusal='No se puede elaborar.'), {'error': {'code': 429}}):
            sender = Mock(return_value=response)
            with self.assertRaises(InterpretationError):
                request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                                       deadline=64, clock=lambda: 0)
            self.assertEqual(sender.call_count, 1)
        sender = Mock(side_effect=HTTPError('https://fixture.invalid', 429, 'Límite', {}, None))
        with self.assertRaises(HTTPError):
            request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                                   deadline=64, clock=lambda: 0)
        self.assertEqual(sender.call_count, 1)

    def test_timeout_switches_to_a_different_model(self):
        sender = Mock(side_effect=[TimeoutError(), reply()])
        result = request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []},
                                        {}, sender, deadline=64, clock=lambda: 0)
        self.assertEqual(result['system_reading'], REPORT['system_reading'])
        first, second = [call.args[1] for call in sender.call_args_list]
        self.assertNotEqual(first['model'], second['model'])
        self.assertEqual(first['reasoning'], {'enabled': False, 'exclude': True})

    def test_retry_uses_only_time_remaining_before_gateway_deadline(self):
        sender = Mock(side_effect=[reply('', finish='length'), reply()])
        clock = Mock(side_effect=[0, 55, 55])
        request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                               deadline=64, clock=clock)
        self.assertEqual(sender.call_args_list[1].kwargs['timeout'], 9)
        sender = Mock(return_value=reply('', finish='length'))
        with self.assertRaises(InterpretationError):
            request_interpretation({'model': INTERPRETATION_MODELS[0], 'messages': []}, {}, sender,
                                   deadline=64, clock=Mock(side_effect=[0, 61]))
        self.assertEqual(sender.call_count, 1)
        sender = Mock()
        with self.assertRaises(TimeoutError):
            request_interpretation({}, {}, sender, deadline=64, clock=lambda: 65)
        sender.assert_not_called()


if __name__ == '__main__':
    unittest.main()
