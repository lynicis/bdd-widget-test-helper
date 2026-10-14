# Repository Guidelines

## Project Overview

BDD Widget Test Helper (`bdd-widget-test-helper`) is a VS Code/VSCodium extension for Flutter developers practicing A-TDD with the pub.dev package `bdd_widget_test`. It adds Go-to-Definition, document links, quick-fix step scaffolding, and unresolved-step diagnostics for Gherkin `.feature` files, in all 80 official dialects (Turkish is a first-class case).

Core constraint: the extension **re-implements `bdd_widget_test`'s naming, parsing, and option lookup faithfully in TypeScript** so the editor resolves steps offline — no Dart tooling at runtime. `src/naming.ts` is a line-by-line port of `string_utils.dart` + `step_generator.dart` + the `diacritic` package. Any behavior change to naming, resolution order, or settings must keep parity with `bdd_widget_test` and be reflected in `README.md` (the fidelity contract).

Host constraint: runs on both VS Code and VSCodium — use only the open-source `vscode` API, never Microsoft-proprietary APIs.

## Architecture & Data Flow

```text
.feature text
  └─ parseFeature (featureParser) ── uses src/gherkin/dialects.json (80 languages)
        → ParsedStep[] (+ withDataTables second pass)
  └─ resolveStep (stepResolver) ── uses naming (stepIdentifier / getStepFilename / predefinedSteps)
        ├─ builtin   (naming.predefinedSteps — 20 built-in bdd_widget_test steps)
        ├─ existing/external → StepIndex.lookup / findExternalStep
        │     └─ StepIndex ── uses bddOptions (findOptions / stepFolderBaseDir / resolvePackageUri)
        │                        └─ bddOptions ── uses simpleYaml.parseSimpleYaml
        └─ missing → targetPathForNewStep → naming.scaffoldStepDart (VS Code: codeActions.createStepFile)
Consumers: providers.ts (Definition + DocumentLink) · codeActions.ts (CodeAction, diagnostics, command)
  · zed/server/src/lsp.ts (Zed: diagnostics, definition, codeAction over LSP — same core)
Wiring: extension.ts (activate, subscriptions, debounced index.onDidChange) · zed/src/lib.rs (launches the server)
```

- `extension.ts` builds one shared `StepIndex` rooted at the first workspace folder (constructed with injected `getDefaults` + `watchFolder` glue), registers providers/commands against `{ language: 'feature', scheme: 'file' }`, and recomputes diagnostics on editor change, text change, and `index.onDidChange` (200 ms debounce).
- Resolution order for a step: `step/` folder next to the feature file (recursive, nearest wins) → `externalSteps` `package:` URIs via `.dart_tool/package_config.json` → built-in set.
- Options precedence: `bdd_options.yaml` (nearest, walking up to workspace root) → `build.yaml` (`builders → bdd_widget_test → options`) → VS Code settings (`bddWidgetTestHelper.*`).

## Key Directories

| Path                      | Purpose                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/`                    | Extension source; `extension.ts` is the entry point                                                                                                                      |
| `src/gherkin/`            | Bundled dialect data (`dialects.json`) — generated, do not hand-edit                                                                                                     |
| `src/test/unit/`          | Vitest unit tests (`*.test.ts`)                                                                                                                                          |
| `src/test/integration/`   | VS Code integration test (compiled to `out/`)                                                                                                                            |
| `src/test/fixtures/test/` | Worked `.feature` + `step/*.dart` examples; used as the integration-test workspace                                                                                       |
| `zed/`                    | Zed editor extension: Rust shim (`src/lib.rs`), manifest (`extension.toml`), tree-sitter queries (`languages/gherkin/`), and the LSP server source (`server/src/lsp.ts`) |
| `zed/server/server.cjs`   | GENERATED LSP bundle (committed) — build with `npm run build:zed`, do not hand-edit                                                                                      |
| `test/`                   | `runTests.js` integration launcher only                                                                                                                                  |
| `syntaxes/`               | TextMate grammar for `.feature` highlighting                                                                                                                             |

## Development Commands

```bash
npm install               # npm is the package manager (package-lock.json, no pnpm/yarn)
npm run compile           # tsc --noEmit type-check + esbuild bundle → dist/extension.js
npm run watch             # parallel esbuild --watch + tsc --watch
npm run lint              # ESLint (flat config eslint.config.mts: JS + TS + JSON + Markdown)
npm run check-types       # tsc --noEmit only (tsconfig.json, excludes src/test)
npm run build:zed         # type-check + esbuild bundle → zed/server/server.cjs (Zed LSP server)
npm run test:unit         # vitest unit tests (Node, no VS Code)
npx tsc --project tsconfig.test.json   # compile integration tests → out/ (required before runTests.js)
node test/runTests.js     # integration tests (@vscode/test-electron; opens src/test/fixtures)
npm test                  # compile + integration only — does NOT compile tests or run vitest
npm run package           # production bundle (minified, no sourcemap)
npm run package:vsix      # vsce package → .vsix
```

Full suite (what CI in `.github/workflows/publish.yml` runs):

```bash
npm run compile && npx tsc --project tsconfig.test.json && npx vitest run && xvfb-run -a node test/runTests.js
```

(`xvfb-run` is Linux/CI-only; on macOS run `node test/runTests.js` directly. Integration tests download a VS Code instance into `.vscode-test/` on first run.)

## Code Conventions & Common Patterns

- **Naming**: files `camelCase.ts`; classes `PascalCase` (`StepIndex`, `BddDefinitionProvider`); constants `SCREAMING_SNAKE` (`CREATE_STEP_FILE_COMMAND`, `BDD_DIAGNOSTIC_SOURCE`). Named exports only — no default exports.
- **TypeScript**: `strict: true`, `noUnusedLocals`, `noImplicitOverride`, `Node16` modules, ES2022, `resolveJsonModule`. Type-check via `tsc --noEmit`; runtime JS comes solely from the esbuild bundle (`dist/extension.js`, CJS, `external: ['vscode']`).
- **Dependency injection**: constructor parameter properties (`constructor(private index: StepIndex)`) — no framework, no single-impl interfaces.
- **Discriminated unions** with a `kind` field for state machines (`StepResolution`: `builtin | existing | external | missing | unnamed`).
- **Error handling**: defensive and silent — `try { … } catch { /* keep defaults */ }`, `null` returns, unreadable dirs skipped; user-facing failures via `vscode.window.showWarningMessage`/`showInformationMessage`. No custom Error classes.
- **Async**: providers are synchronous; file I/O uses sync `fs` (`readFileSync`, `existsSync`, `mkdirSync`). Only `createStepFile` is `async`. Events via a plain listener set — `StepIndex.onDidChange(cb)` returns an unsubscribe function (the VS Code host wraps it in a `Disposable`).
- **State**: class-encapsulated `Map`/`Set` updated through an injected file watcher (`StepFolderWatcher`); no module-global singletons.
- **vscode-free pure modules**: the whole core (`naming.ts`, `bddOptions.ts`, `stepIndex.ts`, `stepResolver.ts`, `featureParser.ts`, `simpleYaml.ts`) never imports `vscode`, so the same code backs the VS Code extension and the Zed LSP server (`zed/server/src/lsp.ts`). `stepIndex` takes an injected `StepFolderWatcher` + `getDefaults`, and `stepDefinitionLocation`/`unresolvedSteps` are pure — inject host glue (`extension.ts` for VS Code, `lsp.ts` for Zed) instead of importing `vscode`. Never mock `vscode` — extract instead.
- **Generated files — do not hand-edit**: `src/diacritics.generated.ts`, `src/gherkin/dialects.json`, `zed/server/server.cjs` (build with `npm run build:zed`).
- **Known dead exports** (candidates for removal, not reuse): `featureParser.readFeatureFile`, `stepResolver.stepTextRange`; `.vscode-test.js` is unused by the current runner.

## Important Files

| File                   | Role                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/extension.ts`     | Entry point; activation, provider/command registration, diagnostics wiring                                                                 |
| `src/featureParser.ts` | Dialect-aware Gherkin parser (`parseFeature`, `withDataTables`)                                                                            |
| `src/naming.ts`        | Faithful port of `bdd_widget_test` naming + `scaffoldStepDart` — the core of the contract                                                  |
| `src/stepResolver.ts`  | Step → `StepResolution` chain + `stepDefinitionLocation` / `unresolvedSteps` (shared by both hosts)                                        |
| `src/stepIndex.ts`     | Cached step-file index; updates via an injected `StepFolderWatcher`                                                                        |
| `src/bddOptions.ts`    | `bdd_options.yaml` / `build.yaml` / settings resolution                                                                                    |
| `src/providers.ts`     | `BddDefinitionProvider`, `BddDocumentLinkProvider`                                                                                         |
| `src/codeActions.ts`   | Quick-fix, `createStepFile` command, diagnostics (over `stepResolver.unresolvedSteps`)                                                     |
| `package.json`         | Manifest + all scripts; commands `bddWidgetTest.createStepFile` / `bddWidgetTest.rebuildStepIndex`; settings under `bddWidgetTestHelper.*` |
| `esbuild.js`           | Bundler (entry `src/extension.ts` → `dist/extension.js`)                                                                                   |
| `esbuild-zed.js`       | Bundler (entry `zed/server/src/lsp.ts` → `zed/server/server.cjs`); no `external: ['vscode']`, so a leaked import fails the build           |
| `test/runTests.js`     | Integration launcher; hardcodes `out/test/integration/extension.test.js`                                                                   |
| `README.md`            | Doc of record and fidelity contract against `bdd_widget_test`                                                                              |

## Runtime/Tooling Preferences

- **Node**, not Bun: scripts run via `node`; `test:unit` needs `node --experimental-vm-modules`. `@types/node` is 20.x, esbuild targets node18, CI uses Node 24.
- **Lint**: ESLint 10 flat config in `eslint.config.mts` — `js/recommended` + `typescript-eslint/recommended` for TS/JS, `@eslint/json` for JSON, `@eslint/markdown` (GFM) for Markdown. Run `npm run lint`. No formatter (Prettier/Biome) — match existing style. Config ignores `dist/`, `out/`, `.vscode-test/`, `.agents/`, and `package-lock.json`; root `*.js` and `test/*.js` are `sourceType: commonjs`. CI does not run lint.
- Host engine: `vscode ^1.85.0`, desktop Node host only (no `browser`/web entry).
- Production `dependencies` contains only `mocha` — known to be unnecessary at runtime (integration tests are assert-based; `@types/mocha` + `tsconfig.test.json` cover types). Don't add runtime deps; extension must stay dependency-light.

## Testing & QA

- **Unit** (Vitest, plain Node): `src/test/unit/*.test.ts` — `featureParser`, `naming`, `bddOptions`, and `zedServer` (drives the built `zed/server/server.cjs` over stdio; run `npm run build:zed` first, else it skips). Run: `npm run test:unit`. These assert upstream `bdd_widget_test` fixtures (e.g. `'los diacríticos son útil'` → `los_diacriticos_son_util`, `'there are <start> cucumbers'` → `thereAreCucumbers`, `'2FA is on'` → rejected). Naming changes MUST keep these passing — they encode the parity contract.
- **Integration** (`@vscode/test-electron` + Node `assert`, no mocha runtime): `src/test/integration/extension.test.ts`, compiled with `tsconfig.test.json` → `out/`, launched by `test/runTests.js` with `src/test/fixtures` as the workspace. Exercises activation, definition provider, document links, and the `createStepFile` command. The extension id `lynicis.bdd-widget-test-helper` is hardcoded there — must match `package.json`.
- Add or update tests for behavior changes; run `npm run lint`, `npm run check-types`, `npm run test:unit`, and the integration suite before merging.
