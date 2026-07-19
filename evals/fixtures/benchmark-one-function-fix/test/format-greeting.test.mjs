import assert from 'node:assert/strict';
import { formatGreeting } from '../src/format-greeting.mjs';

assert.equal(formatGreeting(''), 'Hello, friend!');
assert.equal(formatGreeting('Ada'), 'Hello, Ada!');
