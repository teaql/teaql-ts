#!/usr/bin/env python3
"""Exercise npm release checks with mocked public registry responses."""

import base64
import hashlib
import importlib.util
from io import BytesIO
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError, URLError


SCRIPT = Path(__file__).with_name("verify_public_release_integrity.py")
SPEC = importlib.util.spec_from_file_location("teaql_npm_integrity", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
NAME, VERSION = "@teaql/teaql", "9.8.7"
METADATA_URL = MODULE.metadata_request(NAME, VERSION).full_url
TARBALL_URL = f"https://registry.npmjs.org/{NAME}/-/teaql-{VERSION}.tgz"


class Response(BytesIO):
    def __init__(self, status, body=b""):
        super().__init__(body)
        self.status = status


class NpmIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="teaql-npm-integrity-")
        self.candidate = Path(self.temporary.name) / "candidate.tgz"
        self.candidate.write_bytes(b"exact npm candidate tarball")
        self.observed = []

    def tearDown(self):
        self.temporary.cleanup()

    def metadata(self):
        raw = self.candidate.read_bytes()
        return {"name": NAME, "version": VERSION,
                "dist": {"integrity": "sha512-" + base64.b64encode(hashlib.sha512(raw).digest()).decode(),
                         "shasum": hashlib.sha1(raw).hexdigest(),
                         "tarball": TARBALL_URL}}

    def opener(self, responses):
        def open_request(request, timeout):
            self.assertEqual(timeout, 20)
            self.observed.append(request.full_url)
            values = responses[request.full_url]
            value = values[min(self.observed.count(request.full_url) - 1, len(values) - 1)]
            if isinstance(value, Exception):
                raise value
            if isinstance(value, dict):
                value = json.dumps(value).encode()
            return Response(200, value)
        return open_request

    def error(self, code):
        return HTTPError(METADATA_URL, code, "mock", None, None)

    def test_current_source_identity(self):
        name, version = MODULE.release_identity()
        self.assertEqual(name, "@teaql/teaql")
        self.assertRegex(version, r"^[0-9]+\.[0-9]+\.[0-9]+")

    def test_absent_version(self):
        MODULE.require_absent(NAME, VERSION, self.opener({METADATA_URL: [self.error(404)]}))
        self.assertEqual(self.observed, [METADATA_URL])

    def test_occupied_version(self):
        with self.assertRaisesRegex(RuntimeError, "already exists"):
            MODULE.require_absent(NAME, VERSION, self.opener({METADATA_URL: [b"{}"]}))

    def test_registry_or_network_failure_fails_closed(self):
        for failure in (self.error(503), URLError("offline")):
            with self.subTest(failure=failure), self.assertRaisesRegex(RuntimeError, "Could not prove"):
                MODULE.require_absent(NAME, VERSION, self.opener({METADATA_URL: [failure]}))

    def test_exact_published_tarball(self):
        MODULE.require_published_exact(NAME, VERSION, self.candidate,
            self.opener({METADATA_URL: [self.metadata()],
                         TARBALL_URL: [self.candidate.read_bytes()]}), lambda _: None)
        self.assertEqual(self.observed, [METADATA_URL, TARBALL_URL])

    def test_metadata_digest_mismatch(self):
        wrong = self.metadata()
        wrong["dist"]["integrity"] = "sha512-" + "A" * 88
        with self.assertRaisesRegex(RuntimeError, "digest mismatch"):
            MODULE.require_published_exact(NAME, VERSION, self.candidate,
                self.opener({METADATA_URL: [wrong]}), lambda _: None)

    def test_public_tarball_byte_mismatch(self):
        with self.assertRaisesRegex(RuntimeError, "byte mismatch"):
            MODULE.require_published_exact(NAME, VERSION, self.candidate,
                self.opener({METADATA_URL: [self.metadata()],
                             TARBALL_URL: [b"different tarball bytes"]}), lambda _: None)

    def test_delayed_metadata_visibility(self):
        MODULE.require_published_exact(NAME, VERSION, self.candidate,
            self.opener({METADATA_URL: [self.error(404), self.metadata()],
                         TARBALL_URL: [self.candidate.read_bytes()]}), lambda _: None)
        self.assertEqual(self.observed.count(METADATA_URL), 2)

    def test_unexpected_tarball_origin(self):
        wrong = self.metadata()
        wrong["dist"]["tarball"] = "https://example.invalid/teaql.tgz"
        with self.assertRaisesRegex(RuntimeError, "tarball origin"):
            MODULE.require_published_exact(NAME, VERSION, self.candidate,
                self.opener({METADATA_URL: [wrong]}), lambda _: None)

    def test_metadata_never_appears(self):
        with self.assertRaisesRegex(RuntimeError, "not visible after retries"):
            MODULE.require_published_exact(NAME, VERSION, self.candidate,
                self.opener({METADATA_URL: [self.error(404)]}), lambda _: None)
        self.assertEqual(self.observed.count(METADATA_URL), 5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
