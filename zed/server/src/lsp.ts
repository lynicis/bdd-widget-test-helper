// bdd-widget-test — zero-dependency Node LSP server for Flutter
// bdd_widget_test .feature files. Single file, Node stdio, no npm install.
//
// Generated entry point for the Zed extension: bundled by `npm run build:zed`
// (esbuild-zed.js) into zed/server/server.cjs. All step resolution/naming comes
// from the shared TypeScript core under src/ — the same code the VS Code
// extension uses, so the bdd_widget_test parity contract stays single-sourced.
//
// Supported:
//   - textDocument/publishDiagnostics  (unresolved-step warnings)
//   - textDocument/definition          (step -> step .dart file/line)
//   - textDocument/codeAction          ("Create step file" quick-fix with edit)
//
// Configuration comes from workspace/configuration section "bddWidgetTestHelper"
// (Zed shim: lsp.bdd-widget-test.settings):
//   { stepFolderName, relativeToTestFolder, externalSteps, showUnresolvedStepWarnings }
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { BddOptions, defaultOptions } from "../../../src/bddOptions";
import {
  ParsedStep,
  parseFeature,
  withDataTables,
} from "../../../src/featureParser";
import { scaffoldStepDart } from "../../../src/naming";
import { StepIndex } from "../../../src/stepIndex";
import {
  resolveStep,
  stepDefinitionLocation,
  unresolvedSteps,
} from "../../../src/stepResolver";

const SERVER_NAME = "bdd-widget-test";
const SECTION = "bddWidgetTestHelper";

interface Settings {
  stepFolderName?: string;
  relativeToTestFolder?: boolean;
  externalSteps?: string[];
  showUnresolvedStepWarnings?: boolean;
}

interface JsonRpcMessage {
  jsonrpc?: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string };
}

interface LspRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

interface LspDiagnostic {
  severity: number;
  range: LspRange;
  message: string;
  source: string;
}

interface CodeAction {
  title: string;
  kind: string;
  diagnostics: LspDiagnostic[];
  edit: { documentChanges: unknown[] };
}

/** Narrow an unknown JSON value to a plain object. */
function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

/** Copies the recognized settings keys out of an untrusted JSON value. */
function mergeSettings(base: Settings, raw: unknown): Settings {
  const o = asRecord(raw);
  const next: Settings = { ...base };
  if (typeof o.stepFolderName === "string")
    next.stepFolderName = o.stepFolderName;
  if (typeof o.relativeToTestFolder === "boolean")
    next.relativeToTestFolder = o.relativeToTestFolder;
  if (Array.isArray(o.externalSteps))
    next.externalSteps = o.externalSteps.filter(
      (x): x is string => typeof x === "string",
    );
  if (typeof o.showUnresolvedStepWarnings === "boolean")
    next.showUnresolvedStepWarnings = o.showUnresolvedStepWarnings;
  return next;
}

// ------------------------------------------------------------------- state ---

let rootPath = process.cwd();
let settings: Settings = {};
let index = new StepIndex(rootPath);

function getDefaults(): BddOptions {
  return {
    stepFolderName: settings.stepFolderName ?? defaultOptions.stepFolderName,
    relativeToTestFolder:
      settings.relativeToTestFolder ?? defaultOptions.relativeToTestFolder,
    externalSteps: settings.externalSteps ?? [],
  };
}

/** Rebuilds the index (fresh settings/root) and re-indexes. */
function makeIndex(): void {
  index.dispose();
  index = new StepIndex(rootPath, getDefaults);
}

/** Set when the server asks the client for its `workspace/configuration`. */
let onConfig: ((result: unknown) => void) | undefined;

const documents = new Map<string, string>();

// -------------------------------------------------------------- lsp plumbing ---

let buf = Buffer.alloc(0);
process.stdin.on("data", (chunk: Buffer) => {
  buf = Buffer.concat([buf, chunk]);
  while (true) {
    const idx = buf.indexOf("\r\n\r\n");
    if (idx < 0) break;
    const m = /Content-Length: (\d+)/.exec(buf.subarray(0, idx).toString());
    if (!m) {
      buf = buf.subarray(idx + 4);
      continue;
    }
    const len = parseInt(m[1], 10);
    if (buf.length < idx + 4 + len) break;
    const raw = buf.subarray(idx + 4, idx + 4 + len).toString();
    buf = buf.subarray(idx + 4 + len);
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(raw) as JsonRpcMessage;
    } catch (e) {
      console.error(`[${SERVER_NAME}] bad JSON:`, e);
      continue;
    }
    if (msg.id === 1 && (msg.result !== undefined || msg.error !== undefined)) {
      const cb = onConfig;
      onConfig = undefined;
      cb?.(msg.result);
      continue;
    }
    handle(msg).catch((e) =>
      console.error(`[${SERVER_NAME}] handler error:`, e),
    );
  }
});

function send(obj: JsonRpcMessage): void {
  const json = JSON.stringify(obj);
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`,
  );
}

function reply(id: number, result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id: number, code: number, message: string): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function notify(method: string, params: unknown): void {
  send({ jsonrpc: "2.0", method, params });
}

// ------------------------------------------------------------------- uri ---

function uriToPath(uri: string): string {
  try {
    return fileURLToPath(uri);
  } catch {
    return uri.replace(/^file:\/\//, "");
  }
}

function pathToUri(p: string): string {
  return pathToFileURL(p).href;
}

function isFeature(uri: string): boolean {
  return uri.endsWith(".feature");
}

// ------------------------------------------------------------- diagnostics ---

function toRange(d: {
  line: number;
  startCol: number;
  endCol: number;
}): LspRange {
  return {
    start: { line: d.line, character: d.startCol },
    end: { line: d.line, character: d.endCol },
  };
}

function diagnosticsOf(uri: string): LspDiagnostic[] {
  const text = documents.get(uri);
  if (text === undefined || !isFeature(uri)) return [];
  if (settings.showUnresolvedStepWarnings === false) return [];
  return unresolvedSteps(text, uriToPath(uri), index).map((d) => ({
    severity: 2, // warning
    range: toRange(d),
    message: d.message,
    source: SERVER_NAME,
  }));
}

function publishDiagnostics(uri: string): void {
  if (!isFeature(uri)) return;
  notify("textDocument/publishDiagnostics", {
    uri,
    diagnostics: diagnosticsOf(uri),
  });
}

function stepsOf(uri: string): ParsedStep[] {
  const text = documents.get(uri) ?? "";
  return withDataTables(parseFeature(text).steps, text);
}

// ----------------------------------------------------------------- handlers ---

async function handle(msg: JsonRpcMessage): Promise<void> {
  const id = msg.id;
  const params = asRecord(msg.params);
  switch (msg.method) {
    case "initialize": {
      if (typeof params.rootUri === "string")
        rootPath = uriToPath(params.rootUri);
      settings = mergeSettings(settings, params.initializationOptions);
      makeIndex();
      reply(id!, {
        capabilities: {
          textDocumentSync: 1, // full
          definitionProvider: true,
          codeActionProvider: { codeActionKinds: ["quickfix"] },
        },
        serverInfo: { name: SERVER_NAME },
      });
      return;
    }
    case "initialized": {
      onConfig = (result) => {
        const s = Array.isArray(result) ? result[0] : result;
        settings = mergeSettings(settings, s);
        makeIndex();
        for (const uri of documents.keys()) publishDiagnostics(uri);
      };
      send({
        jsonrpc: "2.0",
        id: 1,
        method: "workspace/configuration",
        params: {
          items: [{ scopeUri: pathToUri(rootPath), section: SECTION }],
        },
      });
      return;
    }
    case "textDocument/didOpen": {
      const td = asRecord(params.textDocument);
      const uri = td.uri as string;
      documents.set(uri, td.text as string);
      // ponytail: no file watcher — rebuild on open/save; add didChangeWatchedFiles if stale diagnoses show up.
      index.rebuild(); // pick up step files created outside the editor
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didChange": {
      const uri = asRecord(params.textDocument).uri as string;
      const changes = Array.isArray(params.contentChanges)
        ? params.contentChanges
        : [];
      const last = asRecord(changes[changes.length - 1]);
      if (last.range === undefined && typeof last.text === "string")
        documents.set(uri, last.text);
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didSave": {
      const uri = asRecord(params.textDocument).uri as string;
      if (typeof params.text === "string") documents.set(uri, params.text);
      index.rebuild();
      publishDiagnostics(uri);
      return;
    }
    case "textDocument/didClose": {
      const uri = asRecord(params.textDocument).uri as string;
      documents.delete(uri);
      notify("textDocument/publishDiagnostics", { uri, diagnostics: [] });
      return;
    }
    case "textDocument/definition": {
      const uri = asRecord(params.textDocument).uri as string;
      const position = asRecord(params.position);
      const lineNo = position.line as number;
      const step = stepsOf(uri).find((s) => s.line === lineNo);
      if (!step) return reply(id!, null);
      const loc = stepDefinitionLocation(
        resolveStep(step.text, uriToPath(uri), index),
      );
      if (!loc) return reply(id!, null);
      reply(id!, {
        uri: pathToUri(loc.filePath),
        range: {
          start: { line: loc.line - 1, character: 0 },
          end: { line: loc.line - 1, character: 0 },
        },
      });
      return;
    }
    case "textDocument/codeAction": {
      const uri = asRecord(params.textDocument).uri as string;
      const range = asRecord(params.range);
      const startLine = asRecord(range.start).line as number;
      const endLine = asRecord(range.end).line as number;
      const diagnostics = diagnosticsOf(uri);
      const actions: CodeAction[] = [];
      for (const step of stepsOf(uri).filter(
        (s) => s.line >= startLine && s.line <= endLine,
      )) {
        const resolution = resolveStep(step.text, uriToPath(uri), index);
        if (resolution.kind !== "missing") continue;
        const newUri = pathToUri(
          path.join(resolution.folder, `${resolution.fileStem}.dart`),
        );
        actions.push({
          title: "Create step file",
          kind: "quickfix",
          diagnostics: diagnostics.filter(
            (d) => d.range.start.line === step.line,
          ),
          edit: {
            documentChanges: [
              {
                kind: "create",
                uri: newUri,
                options: { ignoreIfExists: true },
              },
              {
                textDocument: { uri: newUri, version: null },
                edits: [
                  {
                    range: {
                      start: { line: 0, character: 0 },
                      end: { line: 0, character: 0 },
                    },
                    newText: scaffoldStepDart(step.text, step.hasDataTable),
                  },
                ],
              },
            ],
          },
        });
      }
      reply(id!, actions);
      return;
    }
    case "workspace/didChangeConfiguration": {
      const raw = asRecord(params.settings);
      settings = mergeSettings(settings, SECTION in raw ? raw[SECTION] : raw);
      makeIndex();
      for (const uri of documents.keys()) publishDiagnostics(uri);
      return;
    }
    case "shutdown": {
      reply(id!, null);
      return;
    }
    case "exit": {
      process.exit(0);
      return;
    }
    default: {
      if (id !== undefined)
        replyError(id, -32601, `Method not found: ${msg.method}`);
    }
  }
}

console.error(`[${SERVER_NAME}] LSP server started`);
