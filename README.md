# BDD Widget Test Helper

[![Visual Studio Marketplace Version](https://vsmarketplacebadges.dev/version/lynicis.bdd-widget-test-helper.svg)](https://marketplace.visualstudio.com/items?itemName=lynicis.bdd-widget-test-helper)
![Open VSX Version](https://img.shields.io/open-vsx/v/lynicis/bdd-widget-test-helper)

**Ctrl+Click any Gherkin step in a `.feature` file and land on its Dart step
function — or scaffold the file that is missing.** Works offline, with no Dart
tooling, in VS Code, VSCodium and Zed.

`bdd_widget_test` generates those step files at build time and gives you no way
to navigate them from the `.feature` file. This extension does that navigation
(go-to-definition, document links), plus missing-step warnings and a one-click
"Create step file" quick-fix, by re-implementing the package's naming rules in
TypeScript. No generator run, no analyzer, no network.

Status: **0.2.x, pre-1.0, actively maintained.** Published to the VS Code
Marketplace and Open VSX; the Zed extension is installed from `zed/` as a dev
extension. [Issues and pull
requests](https://github.com/lynicis/bdd-widget-test-helper/issues) are welcome.

> This resolves **`bdd_widget_test` naming only**. Projects using a different
> step generator or runner (`flutter_gherkin`, custom step folders with their
> own naming) get no matches here — use their tooling instead.

## Install

| Editor            | How                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| VS Code           | Extensions view → search **BDD Widget Test Helper**, or `code --install-extension bdd-widget-test-helper-<version>.vsix` |
| VSCodium          | Extensions view (Open VSX is the default registry) → search **BDD Widget Test Helper**                                    |
| Zed               | **Extensions → Install Dev Extension → `zed/`** (after `bun run build:zed`) — see [`zed/README.md`](zed/README.md)         |

The extension activates on `.feature` files and needs no configuration.

## Try it in a minute

1. Open any `.feature` file in a Flutter project that already uses
   `bdd_widget_test`.
2. Put the cursor on a step line and press **F12** (or Ctrl/Cmd+Click). The
   matching `step/*.dart` file opens at its `Future<void>` line.
3. On a step with no file yet, a warning appears. Open the lightbulb and choose
   **Create step file** — the generated content is what `bdd_widget_test` would
   write, with the same imports, parameter types and `/// Usage:` comment.

## What you get

- **Go to definition and document links** on every step line (`Given`, `When`,
  `Then`, `And`, `But`, `*`) in all 80 official Gherkin dialects, including
  every `# language:` header.
- **Faithful names** — ported line-by-line from `bdd_widget_test`, not guessed:
  - `I tap text` → `step/i_tap_text.dart`, function `iTapText`
  - `{...}` parameters are removed from the name and typed `String` / `num` /
    `bool` / `dynamic` in the scaffold
  - Scenario Outline `<placeholders>` are removed and become `dynamic`
    parameters
  - accented Latin folds to ASCII (`çalışıyor` → `calisiyor`)
  - steps with a data table get `bdd.DataTable dataTable` and its import
  - the 20 built-in steps (`the app is running`, `I see {..} text`, …) are
    recognised and never reported missing
  - steps that cannot form a Dart identifier (non-Latin script, leading digit
    or underscore) get a rename warning instead of a broken file
- **Unresolved-step diagnostics**, recomputed on edit and on step-file changes
  (200 ms debounce), with a quick-fix that scaffolds the file.
- **Step index cache** — step folders are indexed once and kept current through
  a file watcher, not rescanned per keystroke.
- **Syntax highlighting and a cucumber file icon** for `.feature` files.

## Which step file is used

Resolution order mirrors `bdd_widget_test`:

1. The 20 built-in steps — always resolve as built-ins, so a local
   `i_see_text.dart` is *not* used for `I see {..} text`.
2. The `step/` folder for the feature (recursive; the nearest match wins).
3. `externalSteps` entries such as `package:my_lib/step/i_tap_text.dart`,
   resolved through `.dart_tool/package_config.json`.

Step-folder location comes from `bdd_options.yaml` (nearest file walking up to
the workspace root), then `build.yaml`
(`targets → … → builders → bdd_widget_test → options`), then these settings:

| Setting                                          | Default  | Meaning                                        |
| ------------------------------------------------ | -------- | ---------------------------------------------- |
| `bddWidgetTestHelper.stepFolderName`             | `./step` | Step folder location                           |
| `bddWidgetTestHelper.relativeToTestFolder`       | `true`   | Interpret non-`./` folders relative to `test/` |
| `bddWidgetTestHelper.externalSteps`              | `[]`     | Extra `package:` step locations                |
| `bddWidgetTestHelper.showUnresolvedStepWarnings` | `true`   | Warn on unresolved steps                       |

Commands: **BDD: Create step file** (also the quick-fix) and **BDD: Rebuild
step index**.

## Gherkin details

- `And` / `But` / `*` inherit the previous step keyword, exactly as Gherkin
  specifies.
- `Background:` steps resolve like any other step.
- `Examples:` rows are never mistaken for steps; `<param>` placeholders map to
  `dynamic` parameters in scaffolds.
- Steps inside docstrings (triple-quoted or triple-backtick fences) and `#`
  comments are ignored.

## Zed

Zed has no extension API for diagnostics, go-to-definition or quick-fixes, so
the same TypeScript core is served over LSP by a bundled zero-dependency Node
server (`zed/server/server.cjs`). Settings live under
`lsp.bdd-widget-test.settings` with the same keys as above. Document links do
not exist in Zed; go-to-definition covers the same navigation. Details:
[`zed/README.md`](zed/README.md).

## Development

```bash
bun install               # bun is the package manager (bun.lock)
bun run compile           # type-check + esbuild bundle → dist/extension.js
bun run check-types       # tsc --noEmit only
bun run lint              # ESLint (TS, JS, JSON, Markdown)
bun run test:unit         # vitest unit tests (plain Node, no VS Code)
bun run build:zed         # rebuild zed/server/server.cjs (committed, generated)
bun run test              # compile + integration tests in a real VS Code window
bun run package:vsix      # build a .vsix
```

Integration tests need a display: `node test/runTests.js` on macOS, or
`xvfb-run -a node test/runTests.js` on Linux; the first run downloads VS Code
into `.vscode-test/`. The full CI sequence is in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

| Path                                         | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `src/`                                       | VS Code extension; `extension.ts` is the entry point              |
| `src/gherkin/dialects.json`                  | Bundled Gherkin dialect table (80 languages, generated)           |
| `src/test/unit/`, `src/test/integration/`    | Vitest and `@vscode/test-electron` suites                         |
| `zed/`                                       | Zed extension, Rust shim and the LSP server source                |
| `syntaxes/`, `language-configuration.json`   | `.feature` grammar and editor behaviour                           |
| `esbuild.js`, `esbuild-zed.js`, `test/`      | Bundlers and the integration-test launcher                        |

The naming and option-lookup code is a deliberate port of `bdd_widget_test`;
read the port-fidelity rule in [`CONTRIBUTING.md`](CONTRIBUTING.md) before
changing it. `src/naming.ts`, `bddOptions.ts`, `stepIndex.ts`,
`stepResolver.ts`, `featureParser.ts` and `simpleYaml.ts` must stay free of
`vscode` imports — they also back the Zed server.

## More

- Contributing, port-fidelity rules and the PR checklist:
  [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Reporting a vulnerability: [`SECURITY.md`](SECURITY.md)
- Community standards: [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)
- Changelog: [`CHANGELOG.md`](CHANGELOG.md)

## License

MIT — see [`LICENSE`](LICENSE).
