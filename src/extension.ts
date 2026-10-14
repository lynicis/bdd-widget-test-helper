import * as path from "path";
import * as vscode from "vscode";
import {
  CREATE_STEP_FILE_COMMAND,
  BddCodeActionProvider,
  BDD_DIAGNOSTIC_SOURCE,
  createStepFile,
  diagnosticsFor,
} from "./codeActions";
import { BddDefinitionProvider, BddDocumentLinkProvider } from "./providers";
import { defaultOptions } from "./bddOptions";
import { StepIndex, StepFolderWatcher } from "./stepIndex";

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // Read per call so settings changes apply without a reload.
  const getDefaults = () => {
    const c = vscode.workspace.getConfiguration("bddWidgetTestHelper");
    return {
      stepFolderName:
        c.get<string>("stepFolderName") ?? defaultOptions.stepFolderName,
      relativeToTestFolder:
        c.get<boolean>("relativeToTestFolder") ??
        defaultOptions.relativeToTestFolder,
      externalSteps: c.get<string[]>("externalSteps") ?? [],
    };
  };

  const watchFolder: StepFolderWatcher = (folder, h) => {
    const w = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(path.dirname(folder)),
        `${path.basename(folder)}/**/*.dart`,
      ),
    );
    w.onDidCreate((u) => h.add(u.fsPath));
    w.onDidChange((u) => {
      h.remove(u.fsPath);
      h.add(u.fsPath);
    });
    w.onDidDelete((u) => h.remove(u.fsPath));
    return () => w.dispose();
  };

  const index = new StepIndex(workspaceRoot, getDefaults, watchFolder);

  const selector: vscode.DocumentSelector = {
    language: "feature",
    scheme: "file",
  };

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selector,
      new BddDefinitionProvider(index),
    ),
    vscode.languages.registerDocumentLinkProvider(
      selector,
      new BddDocumentLinkProvider(index),
    ),
    vscode.languages.registerCodeActionsProvider(
      selector,
      new BddCodeActionProvider(index),
    ),
    vscode.commands.registerCommand(
      CREATE_STEP_FILE_COMMAND,
      (uri: vscode.Uri, line: number) => createStepFile(index, uri, line),
    ),
    vscode.commands.registerCommand("bddWidgetTest.rebuildStepIndex", () =>
      index.rebuild(),
    ),
  );

  const diagnostics = vscode.languages.createDiagnosticCollection(
    BDD_DIAGNOSTIC_SOURCE,
  );
  context.subscriptions.push(diagnostics);

  const refresh = (document: vscode.TextDocument | undefined): void => {
    if (document && document.languageId === "feature") {
      diagnostics.set(document.uri, diagnosticsFor(document, index));
    }
  };

  if (vscode.window.activeTextEditor)
    refresh(vscode.window.activeTextEditor.document);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => e && refresh(e.document)),
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document)),
  );
  // Match the Zed server: clear diagnostics when a feature file closes.
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((d) => {
      if (d.languageId === "feature") diagnostics.delete(d.uri);
    }),
  );
  // Re-diagnose when step files appear/disappear (the watcher fires this).
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = index.onDidChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.languageId === "feature") {
          diagnostics.set(
            editor.document.uri,
            diagnosticsFor(editor.document, index),
          );
        }
      }
    }, 200);
  });

  context.subscriptions.push(
    { dispose: unsubscribe },
    { dispose: () => clearTimeout(debounce) },
    { dispose: () => index.dispose() },
  );
}

export function deactivate(): void {
  // nothing: index disposed via subscriptions
}
