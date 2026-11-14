import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indentContinuationLines } from '../src/indent.js';

test('indentContinuationLines leaves the first line alone, indents the rest', () => {
  const code = '<div>\n  <p>hi</p>\n</div>';
  assert.equal(
    indentContinuationLines(code, '    '),
    '<div>\n      <p>hi</p>\n    </div>',
  );
});

test('indentContinuationLines is a no-op for single-line code', () => {
  assert.equal(indentContinuationLines('<span>x</span>', '  '), '<span>x</span>');
});

test('indentContinuationLines is a no-op with empty indent', () => {
  const code = 'a\nb\nc';
  assert.equal(indentContinuationLines(code, ''), code);
});
