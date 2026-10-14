/**
 * End-to-end test of the Zed LSP server (zed/server/server.cjs): spawns the
 * real bundled server and drives it over stdio with hand-rolled JSON-RPC
 * framing. Catches framing regressions plus the shared-core resolution wiring
 * (diagnostics + go-to-definition + create-step-file quick-fix) that the Zed
 * extension depends on. Requires `npm run build:zed` first.
 */
import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const serverPath = path.join(root, "zed", "server", "server.cjs");
const fixtures = path.join(root, "src", "test", "fixtures");
const fixturesUri = pathToFileURL(fixtures).href;

interface Rpc {
  jsonrpc?: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

interface Diag {
  severity: number;
  message: string;
  source: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

interface InitResult {
  capabilities: {
    definitionProvider: boolean;
    textDocumentSync: number;
    codeActionProvider: { codeActionKinds: string[] };
  };
}

interface LocationResult {
  uri: string;
  range: { start: { line: number; character: number } };
}

interface Action {
  title: string;
  kind: string;
  edit: {
    documentChanges: Array<{
      kind: string;
      uri: string;
      edits?: Array<{ newText: string }>;
    }>;
  };
}

describe("zed LSP server", () => {
  if (!fs.existsSync(serverPath)) {
    it.skip("zed/server/server.cjs missing — run `npm run build:zed` first", () => {});
    return;
  }

  let proc: ChildProcess;
  let nextId = 1;
  const responses = new Map<number, (v: unknown) => void>();
  const notifications: Rpc[] = [];
  const waiters: Array<{ pred: () => boolean; resolve: () => void }> = [];

  const settle = (): void => {
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].pred()) {
        waiters[i].resolve();
        waiters.splice(i, 1);
      }
    }
  };

  const onMessage = (msg: Rpc): void => {
    if (
      msg.id !== undefined &&
      (msg.result !== undefined || msg.error !== undefined)
    ) {
      responses.get(msg.id)?.(msg.result);
      responses.delete(msg.id);
    } else if (msg.method) {
      notifications.push(msg);
    }
    settle();
  };

  const write = (msg: Rpc): void => {
    const json = JSON.stringify(msg);
    proc.stdin!.write(
      `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`,
    );
  };

  const call = <T>(method: string, params: unknown): Promise<T> =>
    new Promise<T>((resolve) => {
      const id = nextId++;
      responses.set(id, (v) => resolve(v as T));
      write({ jsonrpc: "2.0", id, method, params });
    });

  const waitUntil = (pred: () => boolean, ms = 5000): Promise<void> =>
    new Promise((resolve, reject) => {
      if (pred()) return resolve();
      const timer = setTimeout(
        () => reject(new Error("timeout waiting for condition")),
        ms,
      );
      waiters.push({
        pred,
        resolve: () => {
          clearTimeout(timer);
          resolve();
        },
      });
    });

  const diagnosticsFor = (suffix: string): Diag[] | undefined => {
    for (let i = notifications.length - 1; i >= 0; i--) {
      const n = notifications[i];
      if (n.method === "textDocument/publishDiagnostics") {
        const p = n.params as { uri: string; diagnostics: Diag[] };
        if (p.uri.endsWith(suffix)) return p.diagnostics;
      }
    }
    return undefined;
  };

  const open = (rel: string): void => {
    const uri = pathToFileURL(path.join(fixtures, rel)).href;
    write({
      jsonrpc: "2.0",
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "feature",
          version: 1,
          text: fs.readFileSync(path.join(fixtures, rel), "utf8"),
        },
      },
    });
  };

  const docUri = (rel: string): string =>
    pathToFileURL(path.join(fixtures, rel)).href;

  beforeAll(async () => {
    proc = spawn(process.execPath, [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buf = Buffer.alloc(0);
    proc.stdout!.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        const idx = buf.indexOf("\r\n\r\n");
        if (idx < 0) return;
        const m = /Content-Length: (\d+)/.exec(buf.subarray(0, idx).toString());
        if (!m) {
          buf = buf.subarray(idx + 4);
          continue;
        }
        const len = parseInt(m[1], 10);
        if (buf.length < idx + 4 + len) return;
        const msg = JSON.parse(
          buf.subarray(idx + 4, idx + 4 + len).toString(),
        ) as Rpc;
        buf = buf.subarray(idx + 4 + len);
        onMessage(msg);
      }
    });
    proc.stderr!.on("data", () => {});

    const init = await call<InitResult>("initialize", {
      rootUri: fixturesUri,
      initializationOptions: {},
    });
    expect(init.capabilities.definitionProvider).toBe(true);
    expect(init.capabilities.textDocumentSync).toBe(1);
    expect(init.capabilities.codeActionProvider.codeActionKinds).toContain(
      "quickfix",
    );
    write({ jsonrpc: "2.0", method: "initialized", params: {} });
  });

  afterAll(() => {
    if (proc && !proc.killed) proc.kill();
  });

  it("resolves all steps of the Turkish fixture (no diagnostics)", async () => {
    open("test/turkish.feature");
    await waitUntil(() => diagnosticsFor("turkish.feature") !== undefined);
    expect(diagnosticsFor("turkish.feature")).toEqual([]);
  });

  it("warns about the unresolved step in basic.feature", async () => {
    open("test/basic.feature");
    await waitUntil(() => (diagnosticsFor("basic.feature")?.length ?? 0) > 0);
    const diags = diagnosticsFor("basic.feature")!;
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain(
      "Step file not found: i_fill_the_form.dart",
    );
    expect(diags[0].severity).toBe(2);
    expect(diags[0].source).toBe("bdd-widget-test");
    expect(diags[0].range).toEqual({
      start: { line: 5, character: 8 },
      end: { line: 5, character: 23 },
    });
  });

  it("go-to-definition points at the resolved step .dart file", async () => {
    const loc = await call<LocationResult | null>("textDocument/definition", {
      textDocument: { uri: docUri("test/turkish.feature") },
      position: { line: 3, character: 20 },
    });
    expect(loc).not.toBeNull();
    expect(loc!.uri.endsWith("uygulama_calisiyor.dart")).toBe(true);
    expect(loc!.range.start).toEqual({ line: 3, character: 0 }); // the Future<void> line
  });

  it("offers a Create step file quick-fix carrying the workspace edit", async () => {
    const actions = await call<Action[]>("textDocument/codeAction", {
      textDocument: { uri: docUri("test/basic.feature") },
      range: {
        start: { line: 5, character: 0 },
        end: { line: 5, character: 0 },
      },
      context: { diagnostics: [] },
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].title).toBe("Create step file");
    expect(actions[0].kind).toBe("quickfix");
    const creates = actions[0].edit.documentChanges;
    expect(creates[0].kind).toBe("create");
    expect(creates[0].uri.endsWith("/test/step/i_fill_the_form.dart")).toBe(
      true,
    );
    expect(creates[1].edits![0].newText).toContain(
      "Future<void> iFillTheForm(WidgetTester tester)",
    );
  });
});
