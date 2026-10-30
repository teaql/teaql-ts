#!/usr/bin/env python3
"""Verify npm release absence or exact published tarball bytes."""

import base64
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]


def release_identity(package_file=ROOT / "package.json"):
    package = json.loads(package_file.read_text())
    name, version = package["name"], package["version"]
    if (not re.fullmatch(r"@[A-Za-z0-9._-]+/[A-Za-z0-9._-]+", name)
            or not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?", version)):
        raise ValueError("Invalid npm release identity")
    return name, version


def metadata_request(name, version):
    url = f"https://registry.npmjs.org/{quote(name, safe='')}/{quote(version, safe='')}"
    return Request(url, headers={"Accept": "application/json",
                                 "User-Agent": "teaql-release-integrity/1"})


def require_absent(name, version, opener=urlopen):
    request = metadata_request(name, version)
    try:
        with opener(request, timeout=20) as response:
            status = response.status
    except HTTPError as exc:
        if exc.code == 404:
            exc.close()
            return
        exc.close()
        raise RuntimeError(f"Could not prove npm version absent: HTTP {exc.code}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError("Could not prove npm version absent") from exc
    if status == 200:
        raise RuntimeError(f"npm version already exists: {name}@{version}")
    raise RuntimeError(f"Could not prove npm version absent: HTTP {status}")


def require_published_exact(name, version, candidate, opener=urlopen, sleeper=time.sleep):
    local = candidate.read_bytes()
    expected_sri = "sha512-" + base64.b64encode(hashlib.sha512(local).digest()).decode("ascii")
    expected_sha1 = hashlib.sha1(local).hexdigest()
    request = metadata_request(name, version)
    for attempt in range(5):
        try:
            with opener(request, timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f"Unexpected npm metadata HTTP {response.status}")
                raw = response.read(1_000_001)
            if len(raw) > 1_000_000:
                raise RuntimeError("Oversized npm version metadata")
            data = json.loads(raw)
            if (data["name"], data["version"]) != (name, version):
                raise RuntimeError("Unexpected npm version identity")
            dist = data["dist"]
            if dist["integrity"] != expected_sri or dist["shasum"] != expected_sha1:
                raise RuntimeError("npm published tarball digest mismatch")
            tarball = dist["tarball"]
            parsed = urlparse(tarball)
            if (parsed.scheme, parsed.netloc) != ("https", "registry.npmjs.org"):
                raise RuntimeError("Unexpected npm tarball origin")
            if not parsed.path.startswith(f"/{name}/-/") or parsed.query or parsed.fragment:
                raise RuntimeError("Unexpected npm tarball path")
            with opener(Request(tarball, headers={"User-Agent": "teaql-release-integrity/1"}),
                        timeout=20) as response:
                if response.status != 200:
                    raise RuntimeError(f"Unexpected npm tarball HTTP {response.status}")
                remote = response.read(len(local) + 1)
            if remote != local:
                raise RuntimeError("npm public tarball byte mismatch")
            return
        except HTTPError as exc:
            if exc.code != 404:
                exc.close()
                raise RuntimeError(f"Could not verify npm release: HTTP {exc.code}") from exc
            exc.close()
        except (URLError, TimeoutError) as exc:
            raise RuntimeError("Could not verify npm release") from exc
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError("Malformed npm version metadata") from exc
        if attempt == 4:
            raise RuntimeError("npm release not visible after retries")
        sleeper(3)


def main(argv):
    if len(argv) != 3 or argv[1] not in ("--absent", "--published"):
        raise SystemExit("Usage: verify_public_release_integrity.py --absent|--published <candidate.tgz>")
    candidate = Path(argv[2])
    if not candidate.is_file() or candidate.is_symlink() or candidate.suffix != ".tgz":
        raise ValueError("Missing exact npm candidate tarball")
    name, version = release_identity()
    if argv[1] == "--absent":
        require_absent(name, version)
        print(f"PASS npm version absent: {name}@{version}")
    else:
        require_published_exact(name, version, candidate)
        print(f"PASS exact public npm tarball bytes: {name}@{version}")


if __name__ == "__main__":
    try:
        main(sys.argv)
    except (OSError, ValueError, RuntimeError, KeyError, TypeError) as exc:
        raise SystemExit(str(exc)) from exc
