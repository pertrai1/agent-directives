import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

assert.equal(readFileSync(new URL('../README.md', import.meta.url), 'utf8'), '# Example package\n\nThis package documents the supported command.\n');
