#!/usr/bin/env python3
"""Validate the agent-directives sync manifest and script behavior."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "agent-directives-manifest.json"
SYNC_SCRIPT = ROOT / "scripts" / "sync-agent-directives.py"


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def run(*args: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(args),
        cwd=cwd or ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )


def load_manifest() -> dict:
    if not MANIFEST.exists():
        fail("agent-directives-manifest.json is missing")
    try:
        data = json.loads(MANIFEST.read_text())
    except json.JSONDecodeError as exc:
        fail(f"manifest is invalid JSON: {exc}")
    return data


def validate_manifest(data: dict) -> None:
    files = data.get("files")
    if not isinstance(files, list) or not files:
        fail("manifest.files must be a non-empty list")
    if files != sorted(files):
        fail("manifest.files must be sorted for stable diffs")
    required = {
        "directives/adaptive-routing.md",
        "skills/code-reviewer/SKILL.md",
        "templates/AGENTS.md",
    }
    missing_required = sorted(required - set(files))
    if missing_required:
        fail(f"manifest missing required files: {missing_required}")
    for rel in files:
        if not isinstance(rel, str) or rel.startswith("/") or ".." in Path(rel).parts:
            fail(f"manifest contains unsafe path: {rel!r}")
        if not (ROOT / rel).is_file():
            fail(f"manifest references missing file: {rel}")


def validate_script_behavior(files: list[str]) -> None:
    if not SYNC_SCRIPT.exists():
        fail("scripts/sync-agent-directives.py is missing")

    with tempfile.TemporaryDirectory() as tmp:
        target = Path(tmp) / "consumer"
        target.mkdir()

        dry = run(
            sys.executable,
            str(SYNC_SCRIPT),
            "--source-dir",
            str(ROOT),
            "--target",
            str(target),
            "--only",
            "skills",
            "--dry-run",
        )
        if dry.returncode != 0:
            fail(f"dry-run failed unexpectedly:\n{dry.stdout}")
        if (target / "skills" / "code-reviewer" / "SKILL.md").exists():
            fail("dry-run created files")
        if "ADD skills/code-reviewer/SKILL.md" not in dry.stdout:
            fail("dry-run did not report adding code-reviewer skill")

        sync = run(
            sys.executable,
            str(SYNC_SCRIPT),
            "--source-dir",
            str(ROOT),
            "--target",
            str(target),
            "--only",
            "skills",
        )
        if sync.returncode != 0:
            fail(f"sync failed unexpectedly:\n{sync.stdout}")
        copied = target / "skills" / "code-reviewer" / "SKILL.md"
        if not copied.exists():
            fail("sync did not copy code-reviewer skill")
        if copied.read_text() != (ROOT / "skills" / "code-reviewer" / "SKILL.md").read_text():
            fail("copied code-reviewer skill content differs from source")

        copied.write_text("local customization\n")
        changed = run(
            sys.executable,
            str(SYNC_SCRIPT),
            "--source-dir",
            str(ROOT),
            "--target",
            str(target),
            "--only",
            "skills/code-reviewer",
        )
        if changed.returncode != 0:
            fail(f"changed-file sync failed unexpectedly:\n{changed.stdout}")
        if copied.read_text() != "local customization\n":
            fail("sync overwrote local customization without --force")
        if "CHANGED skills/code-reviewer/SKILL.md" not in changed.stdout:
            fail("sync did not report changed local file")

        forced = run(
            sys.executable,
            str(SYNC_SCRIPT),
            "--source-dir",
            str(ROOT),
            "--target",
            str(target),
            "--only",
            "skills/code-reviewer",
            "--force",
        )
        if forced.returncode != 0:
            fail(f"force sync failed unexpectedly:\n{forced.stdout}")
        if copied.read_text() != (ROOT / "skills" / "code-reviewer" / "SKILL.md").read_text():
            fail("--force did not update changed local file")


def main() -> None:
    data = load_manifest()
    validate_manifest(data)
    validate_script_behavior(data["files"])
    print("sync workflow validation OK")


if __name__ == "__main__":
    main()
