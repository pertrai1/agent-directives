import { strictEqual, ok } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentStateExitCode, collectHandoffState, listDecisionRecords } from "../src/agent-state-report.js";

const missingRoot = join(mkdtempSync(join(tmpdir(), "agent-state-unavailable-")), "missing");

const handoff = collectHandoffState({ cwd: missingRoot });
ok(handoff.diagnostics.length > 0, "unavailable git state should produce diagnostics");
strictEqual(agentStateExitCode(handoff), 2);

const decisions = listDecisionRecords({ cwd: missingRoot, dir: "docs/decisions" });
ok(decisions.diagnostics.length > 0, "unavailable decision state should produce diagnostics");
strictEqual(agentStateExitCode(decisions), 2);
