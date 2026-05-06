# Eval Results

This directory stores manually judged eval results and generated health reports.

## Result formats

The report generator reads two result formats:

1. Legacy Markdown files directly under `evals/results/*.md` with YAML
   frontmatter and judge output.
2. Structured JSON files under `evals/results/runs/*.json`.

Prefer JSON for new runs because it gives the dashboard enough structure to group
results by directive/skill target, verdict, failure tags, and routing evidence.

## JSON run schema

Minimal example:

```json
{
  "scenario": "skill-routing-boundaries",
  "date": "2026-05-06T12:10:33Z",
  "model": "claude-sonnet-4.5",
  "judge_model": "claude-haiku-4.5",
  "commit": "adb6b59",
  "targets": [
    "AGENTS.md",
    "skills/test-reviewer/SKILL.md"
  ],
  "verdict": "partial",
  "expected": { "passed": 7, "failed": 1, "unclear": 0, "total": 8 },
  "anti": { "passed": 4, "failed": 1, "unclear": 0, "total": 5 },
  "quality": { "passed": 3, "failed": 1, "unclear": 0, "total": 4 },
  "routing": [
    {
      "target": "skills/test-reviewer/SKILL.md",
      "expected_load": true,
      "actual_load": false
    }
  ],
  "failure_tags": ["missed-load", "wrong-path"],
  "judge_summary": "The agent treated eval scenarios as ordinary docs."
}
```

### Verdicts

Use one of:

- `pass` — all critical expected behavior, anti-behavior, and quality checks pass.
- `partial` — useful behavior is present, but at least one non-blocking or
  localized check failed.
- `fail` — a critical route, anti-behavior, or quality requirement failed.
- `invalid` — the run cannot be scored because the scenario, setup, transcript,
  or judge output was invalid.

## Failure tags

Use short, repeatable tags so patterns are visible across scenarios:

- `missed-load`
- `off-target-load`
- `load-all-ceremony`
- `wrong-path`
- `missing-evidence`
- `invented-command`
- `edits-during-exploration`
- `fixes-before-reproduce`
- `too-vague`
- `too-verbose`
- `scenario-ambiguous`

## Generating the report

```bash
python3 evals/report-results.py
```

This writes:

```text
evals/results/report.html
```

The report is generated output. Regenerate it locally when reviewing eval health;
do not treat the percentage columns as global accuracy. They are covered-scenario
telemetry and should be read with the raw `n` counts shown beside them.
