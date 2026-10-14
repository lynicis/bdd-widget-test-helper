/**
 * Resolves a step line to its target: the built-in step set, an existing
 * step file (indexed), an external step, or a not-yet-created file.
 */
import { parseFeature, withDataTables } from "./featureParser";
import { getStepFilename, predefinedSteps, stepIdentifier } from "./naming";
import { StepIndex, StepIndexEntry } from "./stepIndex";

export type StepResolution =
  | { kind: "builtin"; identifier: string }
  | { kind: "existing"; entry: StepIndexEntry; identifier: string }
  | { kind: "external"; entry: StepIndexEntry; identifier: string }
  | { kind: "missing"; folder: string; fileStem: string; identifier: string }
  | { kind: "unnamed" };

export function resolveStep(
  stepText: string,
  featurePath: string,
  index: StepIndex,
): StepResolution {
  const identifier = stepIdentifier(stepText);
  if (identifier === null) return { kind: "unnamed" };
  const fileStem = getStepFilename(stepText);
  if (fileStem === null) return { kind: "unnamed" };

  if (predefinedSteps.has(identifier)) {
    return { kind: "builtin", identifier };
  }

  index.ensureIndexed(featurePath);
  const existing = index.lookup(fileStem, featurePath);
  if (existing) return { kind: "existing", entry: existing, identifier };

  const external = index.findExternalStep(fileStem, featurePath);
  if (external) return { kind: "external", entry: external, identifier };

  const { folder } = index.targetPathForNewStep(featurePath);
  return { kind: "missing", folder, fileStem, identifier };
}

/** A resolvable step position: 1-based line, absolute file path. */
export interface StepLocation {
  filePath: string;
  line: number;
}

export function stepDefinitionLocation(
  resolution: StepResolution,
): StepLocation | undefined {
  if (resolution.kind === "existing" || resolution.kind === "external") {
    return {
      filePath: resolution.entry.filePath,
      line: resolution.entry.functionLine ?? 1,
    };
  }
  return undefined;
}

/** An unresolved-step warning, line/columns 0-based (document coordinates). */
export interface StepDiagnostic {
  line: number;
  startCol: number;
  endCol: number;
  message: string;
}

/** Unresolved-step diagnostics shared by the VS Code host and the Zed LSP server. */
export function unresolvedSteps(
  text: string,
  featurePath: string,
  index: StepIndex,
): StepDiagnostic[] {
  const steps = withDataTables(parseFeature(text).steps, text);
  const diagnostics: StepDiagnostic[] = [];
  for (const step of steps) {
    const resolution = resolveStep(step.text, featurePath, index);
    if (resolution.kind === "unnamed") {
      diagnostics.push({
        line: step.line,
        startCol: step.textStart,
        endCol: step.textEnd,
        message: `Step '${step.text.trim()}' produces no valid Dart identifier: rename the step.`,
      });
    } else if (resolution.kind === "missing") {
      diagnostics.push({
        line: step.line,
        startCol: step.textStart,
        endCol: step.textEnd,
        message: `Step file not found: ${resolution.fileStem}.dart (expected in ${resolution.folder}). Use "Create step file" to scaffold it.`,
      });
    }
  }
  return diagnostics;
}
