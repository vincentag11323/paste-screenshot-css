/**
 * Prefixes every line after the first with the given indent, so pasted
 * multi-line code lines up with the cursor's line instead of starting at
 * column 0. Pure string logic — no `vscode` dependency — so it's testable
 * with plain node:test outside a real Extension Host.
 */
export function indentContinuationLines(code: string, indent: string): string {
  return code
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n');
}
