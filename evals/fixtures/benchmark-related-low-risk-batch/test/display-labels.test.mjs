import assert from 'node:assert/strict';
import { primaryLabel } from '../src/primary-label.mjs';
import { secondaryLabel } from '../src/secondary-label.mjs';
import { tertiaryLabel } from '../src/tertiary-label.mjs';

assert.equal(primaryLabel(''), 'Primary unavailable');
assert.equal(secondaryLabel(''), 'Secondary unavailable');
assert.equal(tertiaryLabel(''), 'Tertiary unavailable');
assert.equal(primaryLabel('Ready'), 'Ready');
assert.equal(secondaryLabel('Queued'), 'Queued');
assert.equal(tertiaryLabel('Done'), 'Done');
