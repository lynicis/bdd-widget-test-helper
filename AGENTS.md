# Agent Instructions

VS Code/VSCodium/Zed extension that resolves Gherkin `.feature` steps for
Flutter projects using the `bdd_widget_test` pub package. No Dart tooling at
runtime.

## Package Manager

- Use **bun** (`bun install`); the lockfile is `bun.lock`. Do not add runtime
  dependencies — `dependencies` stays empty.

## Commands

| Task            | Command                                  |
| --------------- | ---------------------------------------- |
| Type-check      | `bun run check-types`                    |
| Lint            | `bun run lint`                           |
| Unit tests      | `bun run test:unit`                      |
| One unit file   | `bunx vitest run src/test/unit/naming.test.ts` |
| Integration     | `bun run test` (needs a display)         |
| Compile         | `bun run compile`                        |
| Rebuild Zed LSP | `bun run build:zed`                      |

CI (`.github/workflows/publish.yml`) runs compile, test compile, vitest and the
integration suite, then publishes on a GitHub release. It does not run lint.

## Key Conventions

- The core (`naming.ts`, `featureParser.ts`, `bddOptions.ts`, `simpleYaml.ts`,
  `stepIndex.ts`, `stepResolver.ts`) must never import `vscode`; it also backs
  the Zed LSP server.
- Never mock `vscode`: inject host glue (`extension.ts`, `zed/server/src/lsp.ts`)
  or extract a pure function.
- `src/naming.ts` is a line-by-line port of `bdd_widget_test`'s
  `string_utils.dart`, `step_generator.dart` and the `diacritic` package.
  Behaviour changes must keep parity and update `README.md` and the upstream
  fixtures in `src/test/unit/naming.test.ts`.
- Option precedence is `bdd_options.yaml` → `build.yaml` → editor settings
  (`bddWidgetTestHelper.*`); keep it consistent in both hosts.
- Only open-source `vscode` APIs (VSCodium support); desktop host only.
- Sync `fs` I/O in the core; only `createStepFile` is async.
- Integration tests hardcode the extension id `lynicis.bdd-widget-test-helper`
  (keep it equal to `package.json`) and use `src/test/fixtures` as the
  workspace; keep its `.feature` and `step/*.dart` examples in sync.

## Generated Files

| File                          | Regenerate with                   |
| ----------------------------- | --------------------------------- |
| `src/diacritics.generated.ts` | port from the `diacritic` package |
| `src/gherkin/dialects.json`   | official Gherkin dialect table    |
| `zed/server/server.cjs`       | `bun run build:zed`               |

Run `bun run build:zed` after changing the shared core, or the committed Zed
bundle stays stale.

## External References

| Need                  | File                |
| --------------------- | ------------------- |
| Behaviour contract    | `README.md`         |
| Setup, PR checklist   | `CONTRIBUTING.md`   |
| Security reporting    | `SECURITY.md`       |
| Zed server details    | `zed/README.md`     |
| Release history       | `CHANGELOG.md`      |
