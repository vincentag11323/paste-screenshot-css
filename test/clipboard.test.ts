import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { readClipboardImageMac } from '../src/clipboard.js';

const execFileAsync = promisify(execFile);

// Real test: puts a known PNG on the actual macOS clipboard, then reads it back
// through the real osascript path. Side effect: overwrites the user's clipboard.
test('readClipboardImageMac reads back a real PNG placed on the clipboard', { skip: process.platform !== 'darwin' }, async () => {
  const fixture = path.join(__dirname, '..', '..', 'test', 'fixtures', 'sample.png');
  await execFileAsync('osascript', ['-e', `set the clipboard to (read (POSIX file ${JSON.stringify(fixture)}) as «class PNGf»)`]);

  const buf = await readClipboardImageMac();

  assert.ok(buf.length > 100, 'expected a non-trivial PNG byte buffer');
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'expected the PNG signature');
});

test('readClipboardImageMac rejects when the clipboard has no image', { skip: process.platform !== 'darwin' }, async () => {
  await execFileAsync('osascript', ['-e', 'set the clipboard to "just some text"']);
  await assert.rejects(readClipboardImageMac(), /No image found in clipboard/);
});
