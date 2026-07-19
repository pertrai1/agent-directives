import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const policy = readFileSync(new URL('../directives/project-policy.md', import.meta.url), 'utf8');
const checklist = readFileSync(new URL('../skills/reviewer-checklist.md', import.meta.url), 'utf8');
assert.match(policy, /exact validation commands/i);
assert.match(checklist, /exact validation commands/i);
