import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripCodeFences, buildSystemPrompt } from '../src/vision.js';

test('stripCodeFences removes a single markdown fence the model adds despite instructions', () => {
  const wrapped = '```html\n<div class="card">Hi</div>\n```';
  assert.equal(stripCodeFences(wrapped), '<div class="card">Hi</div>');
});

test('stripCodeFences leaves unfenced output untouched', () => {
  const plain = '<div class="card">Hi</div>';
  assert.equal(stripCodeFences(plain), plain);
});

test('stripCodeFences trims surrounding whitespace either way', () => {
  assert.equal(stripCodeFences('\n\n  <p>x</p>  \n\n'), '<p>x</p>');
});

test('buildSystemPrompt appends the more-detail instruction only when requested', () => {
  const base = buildSystemPrompt('css');
  const detailed = buildSystemPrompt('css', true);
  assert.ok(!base.includes('regeneration pass'));
  assert.ok(detailed.includes('regeneration pass'));
  assert.ok(detailed.startsWith(base.slice(0, 20))); // same prompt otherwise, just appended
});
