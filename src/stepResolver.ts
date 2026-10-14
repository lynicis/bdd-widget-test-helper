/**
 * Resolves a step line to its target: the built-in step set, an existing
 * step file (indexed), an external step, or a not-yet-created file.
 */
import * as vscode from 'vscode';
import { getStepFilename, predefinedSteps, stepIdentifier } from './naming';
import { StepIndex, StepIndexEntry } from './stepIndex';

export type StepResolution =
  | { kind: 'builtin'; identifier: string }
  | { kind: 'existing'; entry: StepIndexEntry; identifier: string }
  | { kind: 'external'; entry: StepIndexEntry; identifier: string }
  | { kind: 'missing'; folder: string; fileStem: string; identifier: string }
  | { kind: 'unnamed' };

export function resolveStep(stepText: string, featurePath: string, index: StepIndex): StepResolution {
  const identifier = stepIdentifier(stepText);
  if (identifier === null) return { kind: 'unnamed' };
  const fileStem = getStepFilename(stepText);
  if (fileStem === null) return { kind: 'unnamed' };

  if (predefinedSteps.has(identifier)) {
    return { kind: 'builtin', identifier };
  }

  index.ensureIndexed(featurePath);
  const existing = index.lookup(fileStem, featurePath);
  if (existing) return { kind: 'existing', entry: existing, identifier };

  const external = index.findExternalStep(fileStem, featurePath);
  if (external) return { kind: 'external', entry: external, identifier };

  const { folder } = index.targetPathForNewStep(featurePath);
  return { kind: 'missing', folder, fileStem, identifier };
}

export function stepDefinitionLocation(resolution: StepResolution): vscode.Location | undefined {
  if (resolution.kind === 'existing' || resolution.kind === 'external') {
    const pos = new vscode.Position((resolution.entry.functionLine ?? 1) - 1, 0);
    return new vscode.Location(vscode.Uri.file(resolution.entry.filePath), pos);
  }
  return undefined;
}
