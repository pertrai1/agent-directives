#!/usr/bin/env python3
"""Sync agent-directives files into a consuming repository.

By default this script reads the canonical manifest from GitHub and copies the
listed files into the current directory. It is intentionally conservative:
missing files are added, unchanged files are skipped, and changed local files are
reported but not overwritten unless --force is passed.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

DEFAULT_REPO = "pertrai1/agent-directives"
DEFAULT_REF = "main"
DEFAULT_MANIFEST = "agent-directives-manifest.json"


class SyncError(RuntimeError):
    """Raised for user-facing sync failures."""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync directives, skills, and templates from agent-directives."
    )
    parser.add_argument(
        "--target",
        default=".",
        help="Directory to sync into (default: current directory).",
    )
    parser.add_argument(
        "--repo",
        default=DEFAULT_REPO,
        help=f"GitHub owner/repo for remote sync (default: {DEFAULT_REPO}).",
    )
    parser.add_argument(
        "--ref",
        default=DEFAULT_REF,
        help=f"Git ref, branch, tag, or SHA for remote sync (default: {DEFAULT_REF}).",
    )
    parser.add_argument(
        "--manifest",
        default=DEFAULT_MANIFEST,
        help=f"Manifest path inside the source repo (default: {DEFAULT_MANIFEST}).",
    )
    parser.add_argument(
        "--source-dir",
        help="Use a local agent-directives checkout instead of GitHub raw URLs.",
    )
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        metavar="PATH_PREFIX",
        help="Only sync files matching this path prefix. May be passed multiple times.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned actions without writing files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite changed local files. Without this, local customizations are preserved.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero when files are missing or changed. Does not write files.",
    )
    return parser.parse_args()


def safe_relative_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute() or ".." in path.parts or not value or value.endswith("/"):
        raise SyncError(f"Unsafe manifest path: {value!r}")
    return path


def raw_url(repo: str, ref: str, rel: str) -> str:
    return f"https://raw.githubusercontent.com/{repo}/{ref}/{rel}"


def fetch_text(repo: str, ref: str, rel: str) -> str:
    url = raw_url(repo, ref, rel)
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise SyncError(f"Failed to fetch {url}: HTTP {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise SyncError(f"Failed to fetch {url}: {exc.reason}") from exc


def read_source_text(args: argparse.Namespace, rel: str) -> str:
    safe = safe_relative_path(rel)
    if args.source_dir:
        source = Path(args.source_dir).resolve() / safe
        if not source.is_file():
            raise SyncError(f"Source file is missing: {source}")
        return source.read_text()
    return fetch_text(args.repo, args.ref, rel)


def load_manifest(args: argparse.Namespace) -> dict:
    text = read_source_text(args, args.manifest)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise SyncError(f"Manifest is invalid JSON: {exc}") from exc
    files = data.get("files")
    if not isinstance(files, list) or not all(isinstance(item, str) for item in files):
        raise SyncError("Manifest must contain a string list at .files")
    for rel in files:
        safe_relative_path(rel)
    return data


def matches_only(rel: str, prefixes: Iterable[str]) -> bool:
    normalized = [prefix.strip("/") for prefix in prefixes if prefix.strip("/")]
    if not normalized:
        return True
    return any(rel == prefix or rel.startswith(prefix + "/") for prefix in normalized)


def ensure_parent(path: Path, dry_run: bool) -> None:
    if not dry_run:
        path.parent.mkdir(parents=True, exist_ok=True)


def sync_file(args: argparse.Namespace, target: Path, rel: str) -> str:
    destination = target / safe_relative_path(rel)
    source_text = read_source_text(args, rel)

    if not destination.exists():
        if not args.dry_run and not args.check:
            ensure_parent(destination, args.dry_run)
            destination.write_text(source_text)
        return f"ADD {rel}"

    current_text = destination.read_text()
    if current_text == source_text:
        return f"OK {rel}"

    if args.force:
        if not args.dry_run and not args.check:
            ensure_parent(destination, args.dry_run)
            destination.write_text(source_text)
        return f"UPDATE {rel}"

    return f"CHANGED {rel} (local file differs; rerun with --force to overwrite)"


def main() -> int:
    args = parse_args()
    if args.check:
        args.dry_run = True

    try:
        manifest = load_manifest(args)
        target = Path(args.target).resolve()
        selected = [rel for rel in manifest["files"] if matches_only(rel, args.only)]
        if not selected:
            raise SyncError("No manifest files matched --only filters")

        results = [sync_file(args, target, rel) for rel in selected]
    except SyncError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    for line in results:
        print(line)

    adds = sum(line.startswith("ADD ") for line in results)
    updates = sum(line.startswith("UPDATE ") for line in results)
    changed = sum(line.startswith("CHANGED ") for line in results)
    ok = sum(line.startswith("OK ") for line in results)
    print(f"Summary: {adds} add, {updates} update, {changed} changed, {ok} ok")

    if args.check and (adds or updates or changed):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
