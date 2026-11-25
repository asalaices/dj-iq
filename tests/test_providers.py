import unittest
from providers import plan
class ProviderTests(unittest.TestCase):
    def test_offline(self):
        self.assertIn("crossfader",plan("offline","","",""))
    def test_loopback_only(self):
        with self.assertRaises(ValueError): plan("ollama","http://example.com","x","x")
    def test_remote_tls(self):
        with self.assertRaises(ValueError): plan("remote-ollama","http://example.com","x","x")
    def test_unknown(self):
        with self.assertRaises(ValueError): plan("copilot","https://example.com","x","x")
