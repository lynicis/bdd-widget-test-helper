/**
 * DefinitionProvider + DocumentLinkProvider for .feature files.
 */
import * as vscode from 'vscode';
import { parseFeature, withDataTables, ParsedStep } from './featureParser';
import { resolveStep, stepDefinitionLocation } from './stepResolver';
import { StepIndex } from './stepIndex';

export class BddDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private index: StepIndex) {}

  provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.Definition | undefined {
    const step = stepAt(document, position);
    if (!step) return undefined;
    const resolution = resolveStep(step.text, document.uri.fsPath, this.index);
    return stepDefinitionLocation(resolution);
  }
}

export class BddDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private index: StepIndex) {}

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const parsed = parseFeature(document.getText());
    const steps = withDataTables(parsed.steps, document.getText());
    const links: vscode.DocumentLink[] = [];
    for (const step of steps) {
      const resolution = resolveStep(step.text, document.uri.fsPath, this.index);
      const loc = stepDefinitionLocation(resolution);
      if (loc) {
        const range = new vscode.Range(step.line, step.textStart, step.line, step.textEnd);
        links.push(new vscode.DocumentLink(range, loc.uri));
      }
    }
    return links;
  }
}

export function stepAt(document: vscode.TextDocument, position: vscode.Position): ParsedStep | undefined {
  const parsed = parseFeature(document.getText());
  return parsed.steps.find((s) => s.line === position.line);
}
