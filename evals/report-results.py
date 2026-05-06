#!/usr/bin/env python3
"""Generate a static HTML health view for directive/skill eval results.

The report intentionally treats percentages as covered-scenario telemetry, not
statistical accuracy. It reads structured JSON run files from
`evals/results/runs/*.json` and legacy Markdown result files directly under
`evals/results/*.md`, then writes `evals/results/report.html`.

Usage:
    python3 evals/report-results.py
    python3 evals/report-results.py --output /tmp/eval-report.html
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = REPO_ROOT / "evals" / "results"
RUNS_DIR = RESULTS_DIR / "runs"
DEFAULT_OUTPUT = RESULTS_DIR / "report.html"

VERDICT_ORDER = {"pass": 0, "partial": 1, "fail": 2, "invalid": 3, "unknown": 4}


@dataclass
class ChecklistCounts:
    passed: int = 0
    failed: int = 0
    unclear: int = 0
    total: int = 0

    @classmethod
    def from_mapping(cls, value: dict[str, Any] | None) -> "ChecklistCounts":
        if not value:
            return cls()
        passed = safe_int(value.get("passed", value.get("pass", 0)))
        failed = safe_int(value.get("failed", value.get("fail", 0)))
        unclear = safe_int(value.get("unclear", 0))
        total = safe_int(value.get("total", passed + failed + unclear))
        if not total:
            total = passed + failed + unclear
        return cls(passed=passed, failed=failed, unclear=unclear, total=total)

    def as_dict(self) -> dict[str, int]:
        return {
            "passed": self.passed,
            "failed": self.failed,
            "unclear": self.unclear,
            "total": self.total,
        }


@dataclass
class RoutingEvent:
    target: str
    expected_load: bool
    actual_load: bool


@dataclass
class EvalRun:
    source: Path
    scenario: str
    date: str = ""
    model: str = ""
    judge_model: str = ""
    commit: str = ""
    verdict: str = "unknown"
    targets: list[str] = field(default_factory=list)
    expected: ChecklistCounts = field(default_factory=ChecklistCounts)
    anti: ChecklistCounts = field(default_factory=ChecklistCounts)
    quality: ChecklistCounts = field(default_factory=ChecklistCounts)
    routing: list[RoutingEvent] = field(default_factory=list)
    failure_tags: list[str] = field(default_factory=list)
    judge_summary: str = ""

    @property
    def display_name(self) -> str:
        return f"{self.scenario} ({self.model or 'model unknown'})"


def normalize_verdict(value: Any) -> str:
    raw = str(value or "unknown").strip().lower()
    if raw in {"passed", "pass", "ok", "success"}:
        return "pass"
    if raw in {"partial", "warn", "warning", "mixed"}:
        return "partial"
    if raw in {"failed", "fail", "failure"}:
        return "fail"
    if raw == "invalid":
        return "invalid"
    return "unknown"


def safe_int(value: Any) -> int:
    if value in (None, ""):
        return 0
    return int(value)


def require_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    raise ValueError(f"{field_name} must be an object")


def optional_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if value in (None, ""):
        return {}
    return require_mapping(value, field_name)


def optional_string_list(value: Any, field_name: str) -> list[str]:
    if value in (None, ""):
        return []
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list")
    items: list[str] = []
    for item in value:
        if isinstance(item, (str, int, float, bool)) or item is None:
            items.append(str(item))
            continue
        raise ValueError(f"{field_name} items must be scalar values")
    return items


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value in (None, ""):
        return False
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "1"}:
            return True
        if normalized in {"false", "no", "0"}:
            return False
    return bool(value)


def current_commit() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"], cwd=REPO_ROOT, text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}, text
    raw = text[4:end]
    data: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" not in line or line.startswith(" "):
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"\'')
    return data, text[end + 5 :]


def parse_markdown_result(path: Path) -> EvalRun:
    text = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(text)
    scenario = meta.get("scenario") or path.stem
    verdict = normalize_verdict(meta.get("verdict"))
    run = EvalRun(
        source=path,
        scenario=scenario,
        date=meta.get("date", ""),
        model=meta.get("agent_model", meta.get("model", "")),
        judge_model=meta.get("judge_model", ""),
        commit=meta.get("directive_sha", meta.get("commit", "")),
        verdict=verdict,
    )

    rule_match = re.search(r"## Rule Under Test\s*\n(?P<rule>[\s\S]*?)(?=\n## |\Z)", body)
    if rule_match:
        rule_text = re.sub(r"\s+", " ", rule_match.group("rule")).strip()
        for target in re.findall(r"`([^`]+(?:\.md|SKILL\.md))`", rule_text):
            run.targets.append(target)
        if not run.targets:
            run.targets.extend(targets_from_scenario_file(scenario))
        if not run.targets:
            run.targets.append(rule_text.split(" — ", 1)[0][:120])

    summary_match = re.search(r"\*\*Pass:\*\*\s*(\d+)\s*/\s*\*\*?Total:\*\*?\s*(\d+)", body, re.I)
    if not summary_match:
        summary_match = re.search(r"Pass:\s*(\d+)\s*/\s*Total:\s*(\d+)", body, re.I)
    if summary_match:
        passed = int(summary_match.group(1))
        total = int(summary_match.group(2))
        failed = max(total - passed, 0)
        run.expected = ChecklistCounts(passed=passed, failed=failed, total=total)

    section_counts = extract_markdown_section_counts(body)
    if section_counts.get("Expected Behaviors").total:
        run.expected = section_counts["Expected Behaviors"]
    if section_counts.get("Anti-Behaviors").total:
        run.anti = section_counts["Anti-Behaviors"]
    if section_counts.get("Quality Criteria").total:
        run.quality = section_counts["Quality Criteria"]

    signal_match = re.search(r"\*\*Signal:\*\*\s*(.+)", body)
    if not signal_match:
        signal_match = re.search(r"^Signal:\s*(.+)$", body, re.M)
    if signal_match:
        run.judge_summary = signal_match.group(1).strip()

    return run


def extract_markdown_section_counts(body: str) -> dict[str, ChecklistCounts]:
    sections = {"Expected Behaviors": ChecklistCounts(), "Anti-Behaviors": ChecklistCounts(), "Quality Criteria": ChecklistCounts()}
    for name in list(sections):
        match = re.search(rf"### {re.escape(name)}\s*\n(?P<section>[\s\S]*?)(?=\n### |\n## |\Z)", body)
        if not match:
            continue
        counts = ChecklistCounts()
        for status in re.findall(r"\[(PASS|FAIL|UNCLEAR)\]", match.group("section"), re.I):
            status = status.lower()
            counts.total += 1
            if status == "pass":
                counts.passed += 1
            elif status == "fail":
                counts.failed += 1
            else:
                counts.unclear += 1
        sections[name] = counts
    return sections


def targets_from_scenario_file(scenario: str) -> list[str]:
    scenario_path = REPO_ROOT / "evals" / "scenarios" / f"{scenario}.md"
    if not scenario_path.exists():
        return []
    text = scenario_path.read_text(encoding="utf-8")
    match = re.search(r"## Directive Under Test\s*\n(?P<section>[\s\S]*?)(?=\n## |\Z)", text)
    if not match:
        return []
    return re.findall(r"`([^`]+(?:\.md|SKILL\.md))`", match.group("section"))


def parse_json_result(path: Path) -> EvalRun:
    data = require_mapping(json.loads(path.read_text(encoding="utf-8")), "JSON result")
    scores = optional_mapping(data.get("scores"), "scores")
    checklists = optional_mapping(data.get("checklists"), "checklists")

    expected = ChecklistCounts.from_mapping(
        optional_mapping(data.get("expected"), "expected")
        or optional_mapping(checklists.get("expected"), "checklists.expected")
        or optional_mapping(scores.get("expected"), "scores.expected")
    )
    anti = ChecklistCounts.from_mapping(
        optional_mapping(data.get("anti"), "anti")
        or optional_mapping(checklists.get("anti"), "checklists.anti")
        or optional_mapping(scores.get("anti"), "scores.anti")
    )
    quality = ChecklistCounts.from_mapping(
        optional_mapping(data.get("quality"), "quality")
        or optional_mapping(checklists.get("quality"), "checklists.quality")
        or optional_mapping(scores.get("quality"), "scores.quality")
    )

    # Support the compact shape discussed in docs: scores.expected_passed, etc.
    if not expected.total:
        expected = ChecklistCounts(
            passed=safe_int(scores.get("expected_passed", 0)),
            total=safe_int(scores.get("expected_total", 0)),
        )
        expected.failed = max(expected.total - expected.passed, 0)
    if not anti.total:
        anti = ChecklistCounts(
            passed=safe_int(scores.get("anti_passed", scores.get("anti_behavior_passed", 0))),
            failed=safe_int(scores.get("anti_failed", scores.get("anti_behavior_failed", 0))),
            total=safe_int(scores.get("anti_total", scores.get("anti_behavior_total", 0))),
        )
        if not anti.total:
            anti.total = anti.passed + anti.failed + anti.unclear
    if not quality.total:
        quality = ChecklistCounts(
            passed=safe_int(scores.get("quality_passed", 0)),
            total=safe_int(scores.get("quality_total", 0)),
        )
        quality.failed = max(quality.total - quality.passed, 0)

    routing = []
    routing_data = data.get("routing")
    if routing_data in (None, ""):
        routing_data = []
    if not isinstance(routing_data, list):
        raise ValueError("routing must be a list")
    for index, event in enumerate(routing_data):
        if not isinstance(event, dict):
            raise ValueError(f"routing[{index}] must be an object")
        routing.append(
            RoutingEvent(
                target=str(event.get("target", "")),
                expected_load=parse_bool(event.get("expected_load", False)),
                actual_load=parse_bool(event.get("actual_load", False)),
            )
        )

    return EvalRun(
        source=path,
        scenario=str(data.get("scenario") or path.stem),
        date=str(data.get("date") or data.get("timestamp") or ""),
        model=str(data.get("model") or data.get("agent_model") or ""),
        judge_model=str(data.get("judge_model") or ""),
        commit=str(data.get("commit") or data.get("directive_sha") or ""),
        verdict=normalize_verdict(data.get("verdict")),
        targets=optional_string_list(data.get("targets"), "targets"),
        expected=expected,
        anti=anti,
        quality=quality,
        routing=routing,
        failure_tags=optional_string_list(data.get("failure_tags"), "failure_tags"),
        judge_summary=str(data.get("judge_summary") or data.get("summary") or ""),
    )


def invalid_run(path: Path, message: str) -> EvalRun:
    return EvalRun(
        source=path,
        scenario=path.stem,
        verdict="invalid",
        targets=["Invalid result file"],
        failure_tags=["invalid-result-file"],
        judge_summary=message,
    )


def discover_runs() -> list[EvalRun]:
    runs: list[EvalRun] = []
    if RUNS_DIR.exists():
        for path in sorted(RUNS_DIR.glob("*.json")):
            try:
                runs.append(parse_json_result(path))
            except (json.JSONDecodeError, OSError, TypeError, ValueError) as exc:
                print(f"warning: could not parse {display_path(path)}: {exc}", file=sys.stderr)
                runs.append(invalid_run(path, str(exc)))
    for path in sorted(RESULTS_DIR.glob("*.md")):
        if path.name.upper() == "README.MD":
            continue
        try:
            runs.append(parse_markdown_result(path))
        except (OSError, ValueError) as exc:
            print(f"warning: could not parse {display_path(path)}: {exc}", file=sys.stderr)
            runs.append(invalid_run(path, str(exc)))
    runs.sort(key=lambda run: (run.date or "9999", run.scenario, run.model))
    return runs


def all_targets(run: EvalRun) -> list[str]:
    targets = list(run.targets)
    for event in run.routing:
        if event.target:
            targets.append(event.target)
    # Preserve order while deduplicating.
    return list(dict.fromkeys(t for t in targets if t)) or ["Unmapped"]


def pct(numerator: int, denominator: int) -> str:
    if not denominator:
        return "—"
    return f"{(100 * numerator / denominator):.0f}%"


def verdict_label(verdict: str) -> str:
    labels = {"pass": "PASS", "partial": "PARTIAL", "fail": "FAIL", "invalid": "INVALID", "unknown": "UNKNOWN"}
    return labels.get(verdict, verdict.upper())


def build_target_rows(runs: list[EvalRun]) -> list[dict[str, Any]]:
    grouped: dict[str, list[EvalRun]] = defaultdict(list)
    for run in runs:
        for target in all_targets(run):
            grouped[target].append(run)

    rows = []
    for target, target_runs in grouped.items():
        verdicts = Counter(run.verdict for run in target_runs)
        expected_loads = actual_loads = true_positive = 0
        tags = Counter()
        for run in target_runs:
            tags.update(run.failure_tags)
            for event in run.routing:
                if event.target != target:
                    continue
                if event.expected_load:
                    expected_loads += 1
                if event.actual_load:
                    actual_loads += 1
                if event.expected_load and event.actual_load:
                    true_positive += 1
        rows.append(
            {
                "target": target,
                "runs": len(target_runs),
                "pass": verdicts["pass"],
                "partial": verdicts["partial"],
                "fail": verdicts["fail"],
                "invalid": verdicts["invalid"],
                "unknown": verdicts["unknown"],
                "pass_rate": pct(verdicts["pass"], len(target_runs)),
                "routing_recall": pct(true_positive, expected_loads),
                "routing_recall_n": f"{true_positive}/{expected_loads}" if expected_loads else "—",
                "routing_precision": pct(true_positive, actual_loads),
                "routing_precision_n": f"{true_positive}/{actual_loads}" if actual_loads else "—",
                "tags": ", ".join(tag for tag, _ in tags.most_common(4)) or "—",
            }
        )
    return sorted(rows, key=lambda row: (VERDICT_ORDER.get("fail" if row["fail"] else "pass", 9), row["target"]))


def status_for_target(row: dict[str, Any]) -> str:
    if row["runs"] == 0:
        return "Unknown"
    if row["fail"]:
        return "Weak"
    if row["partial"] or row["unknown"] or row["invalid"]:
        return "Watch"
    return "Strong"


def generate_html(runs: list[EvalRun]) -> str:
    generated = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    commit = current_commit()
    verdicts = Counter(run.verdict for run in runs)
    target_rows = build_target_rows(runs)
    tags = Counter(tag for run in runs for tag in run.failure_tags)

    run_rows = []
    for run in sorted(runs, key=lambda r: (VERDICT_ORDER.get(r.verdict, 9), r.scenario, r.model)):
        run_rows.append(
            f"""
            <tr>
              <td><code>{e(run.scenario)}</code></td>
              <td><span class="badge {e(run.verdict)}">{e(verdict_label(run.verdict))}</span></td>
              <td>{e(run.model or '—')}</td>
              <td>{e(run.date or '—')}</td>
              <td>{checklist_cell(run.expected)}</td>
              <td>{checklist_cell(run.anti)}</td>
              <td>{checklist_cell(run.quality)}</td>
              <td>{', '.join(f'<code>{e(t)}</code>' for t in all_targets(run))}</td>
              <td>{e(run.judge_summary or '—')}</td>
              <td><code>{e(display_path(run.source))}</code></td>
            </tr>
            """
        )

    target_table = []
    for row in target_rows:
        status = status_for_target(row)
        target_table.append(
            f"""
            <tr>
              <td><code>{e(row['target'])}</code></td>
              <td><span class="status {e(status.lower())}">{e(status)}</span></td>
              <td>{row['runs']}</td>
              <td>{row['pass']} / {row['partial']} / {row['fail']} / {row['invalid']}</td>
              <td>{row['pass_rate']}</td>
              <td>{row['routing_recall']} <small>({e(row['routing_recall_n'])})</small></td>
              <td>{row['routing_precision']} <small>({e(row['routing_precision_n'])})</small></td>
              <td>{e(row['tags'])}</td>
            </tr>
            """
        )

    tag_items = "".join(f"<li><code>{e(tag)}</code>: {count}</li>" for tag, count in tags.most_common()) or "<li>None recorded</li>"

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Directive Eval Health</title>
  <style>
    :root {{ color-scheme: light dark; --bg:#0f172a; --panel:#111827; --muted:#94a3b8; --text:#e5e7eb; --border:#334155; --pass:#16a34a; --partial:#ca8a04; --fail:#dc2626; --unknown:#64748b; }}
    body {{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--text); }}
    header {{ padding:2rem; border-bottom:1px solid var(--border); background:linear-gradient(135deg,#111827,#1e293b); }}
    h1 {{ margin:0 0 .5rem; font-size:1.7rem; }}
    h2 {{ margin-top:0; }}
    main {{ padding:1.5rem 2rem 3rem; display:grid; gap:1.25rem; }}
    .grid {{ display:grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap:1rem; }}
    .card, section {{ background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:1rem; box-shadow:0 10px 25px rgba(0,0,0,.18); }}
    .metric {{ font-size:2rem; font-weight:700; }}
    .muted, small {{ color:var(--muted); }}
    table {{ width:100%; border-collapse:collapse; font-size:.92rem; }}
    th, td {{ padding:.65rem .55rem; border-bottom:1px solid var(--border); vertical-align:top; text-align:left; }}
    th {{ color:var(--muted); font-weight:600; white-space:nowrap; }}
    code {{ background:rgba(148,163,184,.16); padding:.1rem .25rem; border-radius:4px; }}
    .badge, .status {{ display:inline-block; border-radius:999px; padding:.18rem .55rem; font-size:.75rem; font-weight:700; letter-spacing:.03em; }}
    .pass, .strong {{ background:rgba(22,163,74,.18); color:#86efac; }}
    .partial, .watch {{ background:rgba(202,138,4,.18); color:#fde68a; }}
    .fail, .weak {{ background:rgba(220,38,38,.20); color:#fecaca; }}
    .invalid, .unknown {{ background:rgba(100,116,139,.22); color:#cbd5e1; }}
    .scroll {{ overflow-x:auto; }}
    .note {{ border-left:4px solid #38bdf8; padding:.75rem 1rem; background:rgba(56,189,248,.08); color:#dbeafe; }}
  </style>
</head>
<body>
  <header>
    <h1>Agent Directive Eval Health</h1>
    <div class="muted">Generated {e(generated)} from commit <code>{e(commit or 'unknown')}</code>. Percentages are covered-scenario telemetry; use the raw n counts before drawing conclusions.</div>
  </header>
  <main>
    <div class="grid">
      <div class="card"><div class="muted">Runs</div><div class="metric">{len(runs)}</div></div>
      <div class="card"><div class="muted">Pass</div><div class="metric">{verdicts['pass']}</div></div>
      <div class="card"><div class="muted">Partial</div><div class="metric">{verdicts['partial']}</div></div>
      <div class="card"><div class="muted">Fail</div><div class="metric">{verdicts['fail']}</div></div>
      <div class="card"><div class="muted">Unknown/Invalid</div><div class="metric">{verdicts['unknown'] + verdicts['invalid']}</div></div>
    </div>

    <section class="note">
      <strong>Interpretation:</strong> Pass rate is <em>passing runs / covered runs</em>. Routing recall is <em>true expected loads / expected loads</em>. Routing precision is <em>true expected loads / actual loads</em>. These are health indicators for the eval corpus, not global skill accuracy.
    </section>

    <section>
      <h2>Target Health</h2>
      <div class="scroll">
        <table>
          <thead><tr><th>Target</th><th>Status</th><th>Runs</th><th>Pass / Partial / Fail / Invalid</th><th>Pass rate</th><th>Routing recall</th><th>Routing precision</th><th>Failure tags</th></tr></thead>
          <tbody>{''.join(target_table) or '<tr><td colspan="8">No target data found.</td></tr>'}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Failure Tags</h2>
      <ul>{tag_items}</ul>
    </section>

    <section>
      <h2>Runs</h2>
      <div class="scroll">
        <table>
          <thead><tr><th>Scenario</th><th>Verdict</th><th>Model</th><th>Date</th><th>Expected</th><th>Anti</th><th>Quality</th><th>Targets</th><th>Signal</th><th>Source</th></tr></thead>
          <tbody>{''.join(run_rows) or '<tr><td colspan="10">No eval runs found.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>
"""


def checklist_cell(counts: ChecklistCounts) -> str:
    if not counts.total:
        return "—"
    return f"{counts.passed}/{counts.total} <small>pass</small>"


def e(value: Any) -> str:
    return html.escape(str(value), quote=True)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def print_summary(runs: list[EvalRun], output: Path) -> None:
    verdicts = Counter(run.verdict for run in runs)
    print("Eval health summary")
    print("===================")
    print(f"Runs: {len(runs)}")
    print(f"Pass / Partial / Fail / Invalid / Unknown: {verdicts['pass']} / {verdicts['partial']} / {verdicts['fail']} / {verdicts['invalid']} / {verdicts['unknown']}")
    print(f"Report: {display_path(output)}")
    rows = build_target_rows(runs)
    if rows:
        print("\nTargets:")
        for row in rows:
            print(
                f"- {row['target']}: {status_for_target(row)}; runs={row['runs']}; "
                f"pass/partial/fail/invalid={row['pass']}/{row['partial']}/{row['fail']}/{row['invalid']}; "
                f"routing recall={row['routing_recall_n']}; routing precision={row['routing_precision_n']}"
            )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="HTML report output path")
    args = parser.parse_args()

    runs = discover_runs()
    html_text = generate_html(runs)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(html_text, encoding="utf-8")
    print_summary(runs, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
