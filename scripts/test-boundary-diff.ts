#!/usr/bin/env tsx
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  boundaryDiffExitCode,
  inspectBoundaryDiff,
  renderBoundaryDiff,
  type BoundaryDiffReport,
} from '../src/boundary-diff.js';

const MAX_VISIBLE_EDGES = 20;
const EXPECTED_DEPENDENCY_CHANGES = 4;
const CAP_EDGE_COUNT = 1;
const INVALID_REF_MAX_EDGES = 5;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function runGit(cwd: string, args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function initRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'boundary-diff-'));
  runGit(cwd, ['init']);
  runGit(cwd, ['config', 'user.email', 'test@example.com']);
  runGit(cwd, ['config', 'user.name', 'Test User']);
  return cwd;
}

function commitAll(cwd: string, message: string): void {
  runGit(cwd, ['add', '.']);
  runGit(cwd, ['commit', '-m', message]);
}

function writeBaseFixture(cwd: string): void {
  mkdirSync(join(cwd, 'src', 'fixtures', 'nested path'), { recursive: true });
  mkdirSync(join(cwd, 'tests'), { recursive: true });
  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      dependencies: { alpha: '^1.0.0' },
      devDependencies: { beta: '^1.0.0' },
      peerDependencies: { gamma: '^1.0.0' },
      optionalDependencies: { delta: '^1.0.0' },
    }, null, 2) + '\n',
  );
  writeFileSync(
    join(cwd, 'src', 'app.ts'),
    [
      "import alpha from './alpha.js';",
      "import './side-effect.js';",
      "export { beta } from './beta.js';",
      "const mod = import('./dyn.js');",
      "const leak = import('../tests/fixture.js');",
      "const spaced = import('./fixtures/nested path/space module.js');",
      'console.log(alpha, mod, leak, spaced);',
      '',
    ].join('\n'),
  );
  writeFileSync(join(cwd, 'src', 'alpha.js'), 'export default 1;\n');
  writeFileSync(join(cwd, 'src', 'beta.js'), 'export const beta = 2;\n');
  writeFileSync(join(cwd, 'src', 'side-effect.js'), 'export default 0;\n');
  writeFileSync(join(cwd, 'src', 'dyn.js'), 'export default 3;\n');
  writeFileSync(join(cwd, 'tests', 'fixture.js'), 'export default 4;\n');
  writeFileSync(join(cwd, 'src', 'fixtures', 'nested path', 'space module.js'), 'export default 5;\n');
  commitAll(cwd, 'base');
}

function mutateWorkingTree(cwd: string): void {
  writeFileSync(
    join(cwd, 'package.json'),
    [
      '{',
      '  "name": "fixture",',
      '  "dependencies": {',
      '    "alpha": "^2.0.0",',
      '    "epsilon": "^1.0.0"',
      '  },',
      '  "devDependencies": {},',
      '  "peerDependencies": {',
      '    "gamma": "^1.0.0"',
      '  },',
      '  "optionalDependencies": {}',
      '}',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(cwd, 'src', 'added.ts'),
    [
      "import alpha from './alpha.js';",
      "import alphaAgain from './alpha.js';",
      "import './side-effect.js';",
      "export { beta } from './beta.js';",
      "export { beta as betaAgain } from './beta.js';",
      "const mod = import('./dyn.js');",
      "const leak = import('../tests/fixture.js');",
      "const spaced = import('./fixtures/nested path/space module.js');",
      'console.log(alpha, alphaAgain, mod, leak, spaced);',
      '',
    ].join('\n'),
  );
}

function assertEdgeTexts(report: BoundaryDiffReport, expected: string[]): void {
  const texts = report.edges.map((edge) => `${edge.kind}:${edge.sourcePath}:${edge.targetText}`);
  for (const item of expected) assert(texts.includes(item), `missing edge ${item}\n${texts.join('\n')}`);
}

function main(): void {
  const cwd = initRepo();
  try {
    writeBaseFixture(cwd);
    mutateWorkingTree(cwd);

    const report = inspectBoundaryDiff({ cwd, baseRef: 'HEAD', maxEdges: MAX_VISIBLE_EDGES });
    assert(report.version === 1, 'expected versioned report');
    assert(boundaryDiffExitCode(report) === 1, 'expected candidate exit code');
    assert(report.status === 'candidate', 'expected candidate status');
    assert(report.omittedEdges === 0, 'expected no omitted edges');
    assertEdgeTexts(report, [
      "static-import:src/added.ts:./alpha.js",
      "export-from:src/added.ts:./beta.js",
      "dynamic-import:src/added.ts:./dyn.js",
      "dynamic-import:src/added.ts:../tests/fixture.js",
    ]);
    const leak = report.edges.find((edge) => edge.targetText === '../tests/fixture.js');
    assert(leak?.status === 'candidate', 'expected test leakage candidate');
    const spaced = report.edges.find((edge) => edge.targetText === './fixtures/nested path/space module.js');
    assert(!!spaced, 'expected spaced path to be preserved');
    const dependency = report.edges.filter((edge) => edge.kind === 'dependency');
    assert(dependency.length === EXPECTED_DEPENDENCY_CHANGES, 'expected dependency changes');

    const json = renderBoundaryDiff(report, 'json');
    assert(json.includes('"status": "candidate"'), 'expected json output');
    const text = renderBoundaryDiff(report, 'text');
    assert(text.includes('Boundary diff report'), 'expected text output');

    const capped = inspectBoundaryDiff({ cwd, baseRef: 'HEAD', maxEdges: CAP_EDGE_COUNT });
    assert(capped.edges.length === 1, 'expected cap to apply');
    assert(capped.omittedEdges > 0, 'expected omitted count');
    assert(capped.status === 'candidate', 'expected hidden candidates to preserve blocking status');
    assert(boundaryDiffExitCode(capped) === 1, 'expected hidden candidate exit code');

    const invalid = inspectBoundaryDiff({ cwd, baseRef: 'definitely-not-a-ref', maxEdges: INVALID_REF_MAX_EDGES });
    assert(boundaryDiffExitCode(invalid) === 2, 'expected invalid ref exit code');
    assert(invalid.status === 'invalid', 'expected invalid status');

    const shellProbe = inspectBoundaryDiff({ cwd, baseRef: 'HEAD', maxEdges: MAX_VISIBLE_EDGES });
    assert(shellProbe.edges.some((edge) => edge.targetText === './fixtures/nested path/space module.js'), 'expected literal spaced specifier');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main();
