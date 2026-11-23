"""Elapsed-time regressions using real HTTPX request handling with a fake network."""
import asyncio
import time
import unittest
from urllib.error import HTTPError

import httpx
from interpretation import post_interpretation_json


class InterpretationHTTPTests(unittest.TestCase):
    def test_keepalive_bytes_cannot_extend_the_deadline(self):
        class KeepAlive(httpx.AsyncByteStream):
            closed = False

            async def __aiter__(self):
                for _ in range(1000):
                    await asyncio.sleep(.005)
                    yield b' '

            async def aclose(self):
                self.closed = True

        stream = KeepAlive()
        transport = httpx.MockTransport(lambda _: httpx.Response(200, stream=stream))
        started = time.monotonic()
        with self.assertRaises(TimeoutError):
            post_interpretation_json('https://fixture.invalid', {}, {},
                                     timeout=.05, transport=transport)
        self.assertLess(time.monotonic() - started, .5)
        self.assertTrue(stream.closed)

    def test_slow_response_headers_are_also_cancelled(self):
        async def delayed(_request):
            await asyncio.sleep(5)
            return httpx.Response(200, json={})

        with self.assertRaises(TimeoutError):
            post_interpretation_json('https://fixture.invalid', {}, {}, timeout=.05,
                                     transport=httpx.MockTransport(delayed))

    def test_success_and_provider_error_keep_their_original_bodies(self):
        response = {'choices': [{'message': {'content': 'respuesta ficticia'}}]}
        result = post_interpretation_json('https://fixture.invalid', {}, {},
                                         transport=httpx.MockTransport(lambda _: httpx.Response(200, json=response)))
        self.assertEqual(result, response)
        with self.assertRaises(HTTPError) as caught:
            post_interpretation_json('https://fixture.invalid', {}, {},
                                     transport=httpx.MockTransport(lambda _: httpx.Response(429, json={'error': {'code': 429}})))
        self.assertEqual(caught.exception.code, 429)
        self.assertIn(b'429', caught.exception.read())


if __name__ == '__main__':
    unittest.main()
