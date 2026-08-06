export {
  type HandoffFormat,
  type HandoffOptions,
  type HandoffReport,
  collectHandoffState,
  renderHandoffState,
  validateHandoffCapsule,
} from "./handoff-state-report.js";
export {
  type DecisionListOptions,
  type DecisionListReport,
  type DecisionRecord,
  type ValidationFinding,
  buildDecisionTemplate,
  listDecisionRecords,
  renderDecisionIndex,
  validateDecisionRecord,
} from "./decision-records.js";
import type { HandoffReport } from "./handoff-state-report.js";
import type { DecisionListReport } from "./decision-records.js";
import type { ValidationFinding } from "./decision-records.js";

export type AgentStateReportModule = {
  handoff: true;
  decisions: true;
};

export function agentStateExitCode(report: HandoffReport | DecisionListReport, findings?: ValidationFinding[]): 0 | 1 | 2 {
  if (findings?.length) return 1;
  if ("diagnostics" in report && report.diagnostics.length > 0) return 2;
  if ("records" in report && report.records.some((record: { findings: string[] }) => record.findings.length > 0)) return 1;
  return 0;
}
