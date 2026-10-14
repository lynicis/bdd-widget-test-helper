/**
 * "Create step file" CodeAction + command, and unresolved-step diagnostics.
 */
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { parseFeature, withDataTables } from "./featureParser";
import { scaffoldStepDart, stepIdentifier } from "./naming";
import { resolveStep, unresolvedSteps } from "./stepResolver";
import { StepIndex } from "./stepIndex";
import { stepAt } from "./providers";

export const CREATE_STEP_FILE_COMMAND = "bddWidgetTest.createStepFile";

export class BddCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private index: StepIndex) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const text = document.getText();
    const steps = withDataTables(parseFeature(text).steps, text);
    for (let line = range.start.line; line <= range.end.line; line++) {
      const step = steps.find((s) => s.line === line);
      if (!step) continue;
      const resolution = resolveStep(
        step.text,
        document.uri.fsPath,
        this.index,
      );
      if (resolution.kind === "missing") {
        const action = new vscode.CodeAction(
          "Create step file",
          vscode.CodeActionKind.QuickFix,
        );
        action.command = {
          title: "Create step file",
          command: CREATE_STEP_FILE_COMMAND,
          arguments: [document.uri, line],
        };
        action.diagnostics = [...diagnosticsFor(document, this.index)].filter(
          (d) => d.range.start.line === line,
        );
        actions.push(action);
      }
    }
    return actions;
  }
}

export async function createStepFile(
  index: StepIndex,
  documentUri: vscode.Uri,
  line: number,
): Promise<void> {
  const document = await vscode.workspace.openTextDocument(documentUri);
  const step = stepAt(document, new vscode.Position(line, 0));
  if (!step) {
    vscode.window.showWarningMessage(
      "bdd-widget-test-helper: no step on this line.",
    );
    return;
  }
  const identifier = stepIdentifier(step.text);
  if (identifier === null) {
    vscode.window.showWarningMessage(
      `bdd-widget-test-helper: step '${step.text.trim()}' produces no valid Dart identifier. Rename the step.`,
    );
    return;
  }
  const resolution = resolveStep(step.text, documentUri.fsPath, index);
  if (resolution.kind !== "missing") {
    vscode.window.showInformationMessage(
      "bdd-widget-test-helper: step file already exists.",
    );
    return;
  }
  const filePath = path.join(resolution.folder, `${resolution.fileStem}.dart`);
  fs.mkdirSync(resolution.folder, { recursive: true });
  const content = scaffoldStepDart(step.text, step.hasDataTable);
  fs.writeFileSync(filePath, content);
  // Update the index directly: FileSystemWatcher delivery is async.
  index.add(filePath);
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.file(filePath),
  );
  await vscode.window.showTextDocument(doc);
}

export const BDD_DIAGNOSTIC_SOURCE = "bdd-widget-test-helper";

export function diagnosticsFor(
  document: vscode.TextDocument,
  index: StepIndex,
): vscode.Diagnostic[] {
  const config = vscode.workspace.getConfiguration("bddWidgetTestHelper");
  if (!config.get<boolean>("showUnresolvedStepWarnings", true)) return [];
  return unresolvedSteps(document.getText(), document.uri.fsPath, index).map(
    (d) => {
      const diag = new vscode.Diagnostic(
        new vscode.Range(d.line, d.startCol, d.line, d.endCol),
        d.message,
        vscode.DiagnosticSeverity.Warning,
      );
      diag.source = BDD_DIAGNOSTIC_SOURCE;
      return diag;
    },
  );
}
