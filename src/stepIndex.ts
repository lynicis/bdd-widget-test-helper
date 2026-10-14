/**
 * Indexed map of existing step files, cached per workspace root and updated
 * incrementally through a FileSystemWatcher.
 *
 * Key: step file base name (e.g. `i_see_text.dart`) — exactly what
 * getStepFilename produces; value: absolute paths (a name may exist in
 * several folders; nearest-to-feature wins at lookup time).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BddOptions, findOptions, resolvePackageUri, stepFolderBaseDir } from './bddOptions';

export interface StepIndexEntry {
  /** Absolute file path of the step .dart file. */
  filePath: string;
  /** 1-based line of the step function definition, if found. */
  functionLine?: number;
}

export class StepIndex {
  private index = new Map<string, StepIndexEntry[]>();
  private watchers: vscode.FileSystemWatcher[] = [];
  private indexedRoots = new Set<string>();
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  constructor(private workspaceRoot: string | undefined) {}

  /** Looks up a step by its filename stem (e.g. `i_see_text`). */
  lookup(fileStem: string, featurePath: string): StepIndexEntry | undefined {
    const entries = (this.index.get(`${fileStem}.dart`) ?? []).filter((e) => fs.existsSync(e.filePath));
    if (entries.length === 0) return undefined;
    // Nearest to the feature file wins (mirrors getExistingStepSubfolders
    // resolving the first folder hit relative to the feature dir).
    let best = entries[0];
    let bestDist = Infinity;
    for (const e of entries) {
      const d = path.relative(path.dirname(featurePath), path.dirname(e.filePath));
      const dist = d.split(path.sep).filter((p) => p !== '.').length;
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  }

  /** Indexes the step folder(s) for a feature file, if not done yet. */
  ensureIndexed(featurePath: string): void {
    const options = findOptions(featurePath, this.workspaceRoot);
    const baseDir = stepFolderBaseDir(featurePath, options, this.workspaceRoot);
    const stepFolder = path.resolve(baseDir, options.stepFolderName);
    const rootKey = stepFolder;
    if (this.indexedRoots.has(rootKey)) return;
    this.indexFolder(stepFolder);
    this.indexedRoots.add(rootKey);
    this.watch(stepFolder);
    this.onDidChangeEmitter.fire();
  }

  /** Adds a single file to the index (used after scaffolding a new step). */
  add(filePath: string): void {
    this.addFile(filePath);
    this.onDidChangeEmitter.fire();
  }

  /** Full rebuild of everything indexed so far. */
  rebuild(): void {
    const roots = [...this.indexedRoots];
    this.index.clear();
    this.indexedRoots.clear();
    for (const r of roots) {
      this.indexedRoots.add(r);
      this.indexFolder(r);
    }
    this.onDidChangeEmitter.fire();
  }

  /** Resolves where a NEW step file for a feature would be created. */
  targetPathForNewStep(featurePath: string): { folder: string; options: BddOptions } {
    const options = findOptions(featurePath, this.workspaceRoot);
    const baseDir = stepFolderBaseDir(featurePath, options, this.workspaceRoot);
    return { folder: path.resolve(baseDir, options.stepFolderName), options };
  }

  /** An external step (package: uri) that matches the file name, if any. */
  findExternalStep(fileStem: string, featurePath: string): StepIndexEntry | undefined {
    const options = findOptions(featurePath, this.workspaceRoot);
    const file = `${fileStem}.dart`;
    const external = options.externalSteps.find((l) => l.endsWith(file) || l.includes(`/${file}`));
    if (!external) return undefined;
    const resolved = resolvePackageUri(external, this.workspaceRoot);
    if (resolved && fs.existsSync(resolved)) {
      return { filePath: resolved, functionLine: findFunctionLine(resolved, stemToIdentifier(fileStem)) };
    }
    return undefined;
  }

  private indexFolder(stepFolder: string): void {
    for (const entry of walk(stepFolder)) {
      this.addFile(entry);
    }
  }

  private addFile(filePath: string): void {
    if (!filePath.endsWith('.dart')) return;
    const base = path.basename(filePath);
    const list = this.index.get(base) ?? [];
    if (!list.some((e) => e.filePath === filePath)) {
      list.push({ filePath, functionLine: findFunctionLine(filePath, stemToIdentifier(base.replace(/\.dart$/, ''))) });
      this.index.set(base, list);
    }
  }

  private removeFile(filePath: string): void {
    const base = path.basename(filePath);
    const list = this.index.get(base);
    if (!list) return;
    const remaining = list.filter((e) => e.filePath !== filePath);
    if (remaining.length === 0) this.index.delete(base);
    else this.index.set(base, remaining);
  }

  private watch(stepFolder: string): void {
    const relPattern = new vscode.RelativePattern(vscode.Uri.file(path.dirname(stepFolder)), `${path.basename(stepFolder)}/**/*.dart`);
    const watcher = vscode.workspace.createFileSystemWatcher(relPattern);
    watcher.onDidCreate((uri) => {
      this.addFile(uri.fsPath);
      this.onDidChangeEmitter.fire();
    });
    watcher.onDidChange((uri) => {
      this.removeFile(uri.fsPath);
      this.addFile(uri.fsPath);
      this.onDidChangeEmitter.fire();
    });
    watcher.onDidDelete((uri) => {
      this.removeFile(uri.fsPath);
      this.onDidChangeEmitter.fire();
    });
    this.watchers.push(watcher);
  }

  dispose(): void {
    for (const w of this.watchers) w.dispose();
    this.watchers = [];
    this.onDidChangeEmitter.dispose();
  }
}

function* walk(dir: string): Generator<string> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p;
  }
}

/** i_see_text.dart -> iSeeText */
function stemToIdentifier(stem: string): string {
  return stem.replace(/(^|_)(\w)/g, (_m, _a, c: string) => c.toUpperCase());
}

/** Finds `Future<void> <identifier>(` in a step file. */
export function findFunctionLine(filePath: string, identifier: string): number | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const re = new RegExp(`Future<\\s*void\\s*>\\s*${escapeRegExp(identifier)}\\s*\\(`);
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) return i + 1;
    }
  } catch {
    // unreadable
  }
  return undefined;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
