import * as vscode from 'vscode';
import { CREATE_STEP_FILE_COMMAND, BddCodeActionProvider, BDD_DIAGNOSTIC_SOURCE, createStepFile, diagnosticsFor } from './codeActions';
import { BddDefinitionProvider, BddDocumentLinkProvider } from './providers';
import { StepIndex } from './stepIndex';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const index = new StepIndex(workspaceRoot);

  const selector: vscode.DocumentSelector = { language: 'feature', scheme: 'file' };

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(selector, new BddDefinitionProvider(index)),
    vscode.languages.registerDocumentLinkProvider(selector, new BddDocumentLinkProvider(index)),
    vscode.languages.registerCodeActionsProvider(selector, new BddCodeActionProvider(index)),
    vscode.commands.registerCommand(CREATE_STEP_FILE_COMMAND, (uri: vscode.Uri, line: number) => createStepFile(index, uri, line)),
    vscode.commands.registerCommand('bddWidgetTest.rebuildStepIndex', () => index.rebuild()),
  );

  const diagnostics = vscode.languages.createDiagnosticCollection(BDD_DIAGNOSTIC_SOURCE);
  context.subscriptions.push(diagnostics);

  const refresh = (document: vscode.TextDocument | undefined): void => {
    if (document && document.languageId === 'feature') {
      diagnostics.set(document.uri, diagnosticsFor(document, index));
    }
  };

  if (vscode.window.activeTextEditor) refresh(vscode.window.activeTextEditor.document);
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => e && refresh(e.document)));
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
  );
  // Re-diagnose when step files appear/disappear (the watcher fires this).
  let debounce: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    index.onDidChange(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.languageId === 'feature') {
            diagnostics.set(editor.document.uri, diagnosticsFor(editor.document, index));
          }
        }
      }, 200);
    }),
  );

  context.subscriptions.push(index);
}

export function deactivate(): void {
  // nothing: index disposed via subscriptions
}
