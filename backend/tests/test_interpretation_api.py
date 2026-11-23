"""Exercise the interpretation endpoint without real sessions or provider calls."""
import io
import json
import os
import time
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from fastapi.testclient import TestClient
import app as api
from test_interpretation import REPORT, reply


HEADERS = {'Authorization': 'Bearer sesion-ficticia', 'X-Supabase-Apikey': 'publica-ficticia'}
PAYLOAD = {'initiative': {'id': 'iniciativa-ficticia', 'name': 'Prueba'},
           'network_analysis': {'summary': {'nodes': 3}},
           'methodological_rules': ['No confundir comentarios con personas.']}


class InterpretationAPITests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(api.app)
        api._requests.clear()
        self.environment = patch.dict(os.environ, {'OPENROUTER_API_KEY': 'clave-ficticia'})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.auth = patch.object(api, 'get_json', return_value={'id': 'usuario-ficticio'})
        self.auth.start()
        self.addCleanup(self.auth.stop)

    def test_exact_empty_length_failure_recovers_and_keeps_context(self):
        failed = reply('', finish='length')
        failed['model'] = 'dots-studio/dots-3-note-preview:free'
        with patch.object(api, 'post_interpretation_json', side_effect=[failed, reply()]) as send:
            response = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['system_reading'], REPORT['system_reading'])
        self.assertEqual(send.call_count, 2)
        self.assertEqual(json.loads(send.call_args_list[0].args[1]['messages'][1]['content']), PAYLOAD)
        self.assertEqual(len(api._requests['usuario-ficticio']), 1)

    def test_two_bad_replies_return_clear_failure_without_a_fake_report(self):
        with patch.object(api, 'post_interpretation_json', return_value=reply('', finish='length')) as send:
            response = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
        self.assertEqual(response.status_code, 502)
        self.assertEqual(send.call_count, 2)
        self.assertIn('vacía o incompleta', response.json()['detail'])
        self.assertNotIn('system_reading', response.json())
        self.assertNotIn('Render Logs', response.json()['detail'])

    def test_authentication_context_and_rate_limit_still_apply(self):
        with patch.object(api, 'post_interpretation_json') as send:
            denied = self.client.post('/api/ai/interpret', json=PAYLOAD)
            self.assertEqual(denied.status_code, 401)
            oversized = self.client.post('/api/ai/interpret', json={
                **PAYLOAD, 'initiative': {'name': 'x' * 36000}}, headers=HEADERS)
            self.assertEqual(oversized.status_code, 413)
            api._requests['usuario-ficticio'].extend([time.monotonic()] * 15)
            limited = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
            self.assertEqual(limited.status_code, 429)
        send.assert_not_called()

    def test_http_provider_errors_and_timeouts_keep_their_status(self):
        for error, status in (
            (HTTPError('https://fixture.invalid', 429, 'Límite', {},
                       io.BytesIO(b'{"error":{"message":"Limite temporal"}}')), 429),
            (TimeoutError(), 504),
        ):
            with self.subTest(status=status), patch.object(api, 'post_interpretation_json', side_effect=error) as send:
                response = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
            self.assertEqual(response.status_code, status)
            self.assertEqual(send.call_count, 2 if status == 504 else 1)

    def test_provider_429_recovers_without_sending_an_error_to_the_browser(self):
        error = HTTPError('https://fixture.invalid', 429, 'Capacity', {},
                          io.BytesIO(b'{"error":{"code":429,"message":"Provider returned error"}}'))
        with patch.object(api, 'post_interpretation_json', side_effect=[error, reply()]) as send:
            response = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['system_reading'], REPORT['system_reading'])
        self.assertEqual(send.call_count, 2)

    def test_provider_capacity_and_daily_quota_messages_are_plain_spanish(self):
        for message, expected_calls, expected_text in (
            ('Provider returned error', 2, 'ocupados'),
            ('Rate limit exceeded: free-models-per-day.', 1, 'límite diario'),
        ):
            errors = [HTTPError('https://fixture.invalid', 429, 'Quota', {},
                                io.BytesIO(json.dumps({'error': {'message': message}}).encode()))
                      for _ in range(2)]
            with self.subTest(message=message), patch.object(api, 'post_interpretation_json', side_effect=errors) as send:
                response = self.client.post('/api/ai/interpret', json=PAYLOAD, headers=HEADERS)
            self.assertEqual(response.status_code, 429)
            self.assertEqual(send.call_count, expected_calls)
            self.assertIn(expected_text, response.json()['detail'])
            self.assertNotIn('Provider returned error', response.json()['detail'])


if __name__ == '__main__':
    unittest.main()
