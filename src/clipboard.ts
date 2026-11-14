import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const execFileAsync = promisify(execFile);

/**
 * Reads the current image on the macOS clipboard as PNG bytes.
 *
 * VS Code's own clipboard API (`vscode.env.clipboard`) is text-only, so this
 * shells out to osascript — the confirmed-working approach from the PRD's
 * platform-fragility note. macOS only; Windows/Linux are out of scope for this pass.
 */
export async function readClipboardImageMac(): Promise<Buffer> {
  const outFile = path.join(os.tmpdir(), `paste-screenshot-css-${Date.now()}-${process.pid}.png`);
  const script = [
    'set imgData to the clipboard as «class PNGf»',
    `set outFile to open for access POSIX file ${JSON.stringify(outFile)} with write permission`,
    'write imgData to outFile',
    'close access outFile',
  ].join('\n');

  try {
    await execFileAsync('osascript', ['-e', script]);
  } catch {
    // osascript throws when the clipboard has no PNG-coercible image (e.g. plain text).
    throw new Error('No image found in clipboard — copy a screenshot first.');
  }

  const buf = await fs.readFile(outFile);
  await fs.unlink(outFile).catch(() => {});
  return buf;
}
