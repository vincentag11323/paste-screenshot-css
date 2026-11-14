import * as vscode from 'vscode';
import { readClipboardImageMac } from './clipboard';
import { callVisionApi, OutputFlavor } from './vision';

const CENT_AI_BASE_URL = 'https://api.cent-ai.dev/v1';
// claude-haiku-5.5 chosen after smoke-testing 3 candidates against a real screenshot — see .env comment for numbers.
const MODEL = 'claude-haiku-5.5';
const SECRET_KEY = 'pasteScreenshotAsCss.centAiApiKey';
const FLAVOR_KEY = 'pasteScreenshotAsCss.outputFlavor';

const FLAVOR_PICKS: { label: string; flavor: OutputFlavor }[] = [
  { label: 'Tailwind classes', flavor: 'tailwind' },
  { label: 'Plain CSS', flavor: 'css' },
  { label: 'Inline style attributes', flavor: 'inline' },
];

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('pasteScreenshotAsCss.setApiKey', () => setApiKey(context)),
    vscode.commands.registerCommand('pasteScreenshotAsCss.setOutputFlavor', () => pickOutputFlavor(context)),
    vscode.commands.registerCommand('pasteScreenshotAsCss.run', () => run(context)),
  );
}

async function pickOutputFlavor(context: vscode.ExtensionContext): Promise<OutputFlavor | undefined> {
  const choice = await vscode.window.showQuickPick(FLAVOR_PICKS, {
    placeHolder: 'Output style for generated code',
  });
  if (!choice) {
    return undefined;
  }
  await context.globalState.update(FLAVOR_KEY, choice.flavor);
  return choice.flavor;
}

async function getOutputFlavor(context: vscode.ExtensionContext): Promise<OutputFlavor | undefined> {
  const stored = context.globalState.get<OutputFlavor>(FLAVOR_KEY);
  return stored ?? pickOutputFlavor(context);
}

async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: 'Cent AI API key (stored in VS Code SecretStorage, never written to settings.json)',
    password: true,
    ignoreFocusOut: true,
  });
  if (key) {
    await context.secrets.store(SECRET_KEY, key);
    vscode.window.showInformationMessage('Cent AI API key saved.');
  }
}

async function run(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('Open a file first — nowhere to insert the generated code.');
    return;
  }
  if (process.platform !== 'darwin') {
    vscode.window.showErrorMessage('Paste Screenshot as CSS currently supports macOS only.');
    return;
  }

  let apiKey = await context.secrets.get(SECRET_KEY);
  if (!apiKey) {
    const choice = await vscode.window.showInformationMessage(
      'Paste Screenshot as CSS needs your Cent AI API key.',
      'Add it now',
    );
    if (choice === 'Add it now') {
      await setApiKey(context);
      apiKey = await context.secrets.get(SECRET_KEY);
    }
    if (!apiKey) {
      return;
    }
  }

  const flavor = await getOutputFlavor(context);
  if (!flavor) {
    return;
  }

  let imageBuffer: Buffer;
  try {
    imageBuffer = await readClipboardImageMac();
  } catch (err) {
    vscode.window.showErrorMessage((err as Error).message);
    return;
  }

  try {
    const code = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Generating UI from screenshot…', cancellable: true },
      (_progress, token) =>
        Promise.race([
          callVisionApi({ apiKey: apiKey!, baseUrl: CENT_AI_BASE_URL, model: MODEL, flavor, imageBase64: imageBuffer.toString('base64') }),
          new Promise<string>((_resolve, reject) => {
            token.onCancellationRequested(() => reject(new Error('Cancelled')));
          }),
        ]),
    );

    if (code === 'NOT_A_UI_SCREENSHOT') {
      vscode.window.showWarningMessage("That doesn't look like a UI screenshot.");
      return;
    }

    await insertAtCursor(editor, code);
  } catch (err) {
    if ((err as Error).message === 'Cancelled') {
      return;
    }
    const choice = await vscode.window.showErrorMessage(
      `Paste Screenshot as CSS failed: ${(err as Error).message}`,
      'Retry',
    );
    if (choice === 'Retry') {
      await run(context);
    }
  }
}

async function insertAtCursor(editor: vscode.TextEditor, code: string): Promise<void> {
  const position = editor.selection.active;
  const currentLine = editor.document.lineAt(position.line).text;
  const indent = currentLine.match(/^\s*/)?.[0] ?? '';
  const indented = code
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n');
  await editor.edit((editBuilder) => editBuilder.insert(position, indented));
}
