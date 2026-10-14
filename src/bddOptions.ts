/**
 * Reads bdd_options.yaml / build.yaml the way bdd_widget_test's
 * GeneratorOptions does (defaulting merged over included), for locating
 * step folders and external steps.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseSimpleYaml } from './simpleYaml';


export interface BddOptions {
  stepFolderName: string;
  relativeToTestFolder: boolean;
  externalSteps: string[];
}

const DEFAULT_STEP_FOLDER = './step';
const DEFAULT_RELATIVE_TO_TEST = true;

export const defaultOptions: BddOptions = {
  stepFolderName: DEFAULT_STEP_FOLDER,
  relativeToTestFolder: DEFAULT_RELATIVE_TO_TEST,
  externalSteps: [],
};

function asString(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asArray(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [v];
  return [];
}

/**
 * Finds the options for a feature file: walks up from the feature to the
 * workspace/package root, reading bdd_options.yaml then build.yaml
 * (build.yaml: targets -> * -> builders -> bdd_widget_test -> options).
 */
export function findOptions(featurePath: string, workspaceRoot: string | undefined): BddOptions {
  let options = defaultsFromConfig();
  const roots = candidateRoots(featurePath, workspaceRoot);
  for (const root of roots) {
    const bddOptionsPath = path.join(root, 'bdd_options.yaml');
    if (fs.existsSync(bddOptionsPath)) {
      try {
        const raw = parseSimpleYaml(fs.readFileSync(bddOptionsPath, 'utf8'));
        options = mergeOptions(options, yamlToOptions(raw));
        break; // nearest bdd_options.yaml wins
      } catch {
        // unreadable: keep defaults
      }
    }
    const buildYamlPath = path.join(root, 'build.yaml');
    if (fs.existsSync(buildYamlPath)) {
      try {
        const raw = fs.readFileSync(buildYamlPath, 'utf8');
        const optionsBlock = extractBuildYamlOptions(raw);
        if (optionsBlock) {
          options = mergeOptions(options, yamlToOptions(parseSimpleYaml(optionsBlock)));
          break;
        }
      } catch {
        // keep defaults
      }
    }
  }
  return options;
}

function defaultsFromConfig(): BddOptions {
  const config = vscode.workspace.getConfiguration('bddWidgetTestHelper');
  return {
    stepFolderName: config.get<string>('stepFolderName') ?? DEFAULT_STEP_FOLDER,
    relativeToTestFolder: config.get<boolean>('relativeToTestFolder') ?? DEFAULT_RELATIVE_TO_TEST,
    externalSteps: config.get<string[]>('externalSteps') ?? [],
  };
}

function yamlToOptions(raw: Record<string, string | string[]>): BddOptions {
  return {
    stepFolderName: asString(raw['stepFolderName']) ?? DEFAULT_STEP_FOLDER,
    relativeToTestFolder: raw['relativeToTestFolder'] === undefined ? DEFAULT_RELATIVE_TO_TEST : asString(raw['relativeToTestFolder']) === 'true',
    externalSteps: asArray(raw['externalSteps']),
  };
}

/** build.yaml nests the same options under builders -> bdd_widget_test -> options. */
function extractBuildYamlOptions(buildYaml: string): string | null {
  const re = /bdd_widget_test:[\s\S]*?options:\s*\n((?:[ \t]+[^\n]*\n?)*)/;
  const m = re.exec(buildYaml);
  return m ? m[1] : null;
}

function mergeOptions(a: BddOptions, b: BddOptions): BddOptions {
  return {
    stepFolderName: a.stepFolderName !== DEFAULT_STEP_FOLDER ? a.stepFolderName : b.stepFolderName,
    relativeToTestFolder: a.relativeToTestFolder && b.relativeToTestFolder,
    externalSteps: [...a.externalSteps, ...b.externalSteps],
  };
}

function candidateRoots(featurePath: string, workspaceRoot: string | undefined): string[] {
  const roots: string[] = [];
  let dir = path.dirname(featurePath);
  const stop = workspaceRoot ? path.resolve(workspaceRoot) : path.parse(featurePath).root;
  for (let guard = 0; guard < 64; guard++) {
    roots.push(dir);
    if (path.resolve(dir) === path.resolve(stop)) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (workspaceRoot && !roots.includes(path.resolve(workspaceRoot))) roots.push(path.resolve(workspaceRoot));
  return roots;
}

/**
 * Resolves the base directory that a stepFolderName is relative to, per
 * get_path_to_step_folder.dart: `./`-prefixed folders sit next to the feature
 * file; everything else is relative to the test folder (relativeToTestFolder).
 */
export function stepFolderBaseDir(featurePath: string, options: BddOptions, workspaceRoot: string | undefined): string {
  if (options.stepFolderName.startsWith('./') || options.stepFolderName.startsWith('../')) {
    return path.dirname(featurePath);
  }
  if (options.relativeToTestFolder) {
    const testDir = findEnclosingDir(path.dirname(featurePath), 'test', workspaceRoot) ?? path.join(workspaceRoot ?? path.dirname(featurePath), 'test');
    return testDir;
  }
  return workspaceRoot ?? path.dirname(featurePath);
}

function findEnclosingDir(start: string, name: string, stopAt: string | undefined): string | undefined {
  let dir = start;
  const stop = stopAt ? path.resolve(stopAt) : undefined;
  for (let guard = 0; guard < 64; guard++) {
    if (fs.existsSync(path.join(dir, name)) && fs.statSync(path.join(dir, name)).isDirectory()) return path.join(dir, name);
    if (stop && path.resolve(dir) === stop) return undefined;
    if (stop && path.resolve(dir).length < stop.length) return undefined;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

/**
 * Resolves a `package:foo/bar.dart` external step to a file path using the
 * workspace's Dart package layout (package_config.json / lib dirs).
 */
export function resolvePackageUri(uri: string, workspaceRoot: string | undefined): string | undefined {
  if (!uri.startsWith('package:')) return uri;
  const rest = uri.slice('package:'.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return undefined;
  const pkg = rest.slice(0, slash);
  const rel = rest.slice(slash + 1);
  const roots = workspaceRoot ? [workspaceRoot] : [];
  for (const root of roots) {
    // .dart_tool/package_config.json
    const configPath = path.join(root, '.dart_tool', 'package_config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { packages?: Array<{ name: string; rootUri: string }> };
        const entry = config.packages?.find((p) => p.name === pkg);
        if (entry) {
          const rootUri = entry.rootUri.startsWith('file://') ? vscode.Uri.parse(entry.rootUri).fsPath : path.resolve(root, entry.rootUri);
          return path.join(rootUri, 'lib', rel);
        }
      } catch {
        // fall through to layout guess
      }
    }
    // layout guess: <root>/<pkg>/lib/<rel> or <root>/packages/<pkg>/lib/<rel>
    for (const guess of [path.join(root, pkg, 'lib', rel), path.join(root, 'packages', pkg, 'lib', rel)]) {
      if (fs.existsSync(guess)) return guess;
    }
  }
  return undefined;
}
