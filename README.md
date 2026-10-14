# BDD Widget Test Helper

[![Visual Studio Marketplace Version](https://vsmarketplacebadges.dev/version/lynicis.bdd-widget-test-helper.svg)](https://marketplace.visualstudio.com/items?itemName=lynicis.bdd-widget-test-helper)

VS Code / VSCodium extension for Flutter developers practicing A-TDD with the
[`bdd_widget_test`](https://pub.dev/packages/bdd_widget_test) package. Jump
from any Gherkin step in a `.feature` file straight to the Dart step
definition — and scaffold the ones that don't exist yet.

Works in both **VS Code** and **VSCodium** (only the open-source `vscode` API,
no proprietary Microsoft services), so it is publishable to
[Open VSX](https://open-vsx.org/).

## Features

- **Go to definition (F12 / Ctrl+Click)** on every step line
  (`Given` / `When` / `Then` / `And` / `But`, any Gherkin dialect) jumps to
  the matching Dart step file — and to the function inside it. Also exposed
  as document links (Ctrl+Click underline).
- **Faithful name mapping** — the extension replicates `bdd_widget_test`'s
  generator exactly:
  - step text → snake_case file name (`I tap text` → `step/i_tap_text.dart`)
  - step text → camelCase function name (`I tap text` → `iTapText`)
  - `{...}` parameters are stripped from the name; quoted / int / double /
    bool parameters become `String` / `num` / `bool` in the scaffold
  - `<placeholder>` from Scenario Outlines is stripped from the name and
    becomes a `dynamic` parameter
  - accented Latin is folded to ASCII (`çalışıyor` → `calisiyor`), so
    Turkish (and every other Latin-script Gherkin dialect) works
  - built-in steps (`the app is running`, `I see {..} text`, …) are known
    and never reported missing
  - steps that cannot produce a valid Dart identifier (non-Latin scripts,
    leading digit/underscore) are reported with a rename hint
- **"Create step file" quick-fix** — on an unresolved step, the lightbulb
  offers to scaffold the missing step file with the exact content
  `bdd_widget_test` would generate.
- **Diagnostics** — unresolved steps are reported as warnings.
- **Step index cache** — step folders are indexed once and updated
  incrementally through a `FileSystemWatcher`; nothing is rescanned per
  keystroke.
- **Syntax highlighting** — TextMate grammar for `.feature` files with
  keyword, tag, placeholder, parameter, table and docstring scopes,
  including Turkish and other common dialect keywords.

## Step file lookup

Mirrors `bdd_widget_test`'s resolution order:

1. `step/` folder next to the feature file (or the folder configured via
   `stepFolderName`, relative to the feature when it starts with `./` or
   `../`, otherwise relative to the test folder per `relativeToTestFolder`),
   searched recursively — the nearest match to the feature wins.
2. `externalSteps` entries (e.g. `package:my_lib/step/i_tap_text.dart`),
   resolved through `.dart_tool/package_config.json` when possible.
3. The built-in step set shipped with `bdd_widget_test`.

Options are read from `bdd_options.yaml` (nearest one walking up from the
feature file) and `build.yaml`
(`targets → … → builders → bdd_widget_test → options`), falling back to the
extension settings:

| Setting | Default | Meaning |
|---|---|---|
| `bddWidgetTestHelper.stepFolderName` | `./step` | Step folder location |
| `bddWidgetTestHelper.relativeToTestFolder` | `true` | Interpret non-`./` folders relative to `test/` |
| `bddWidgetTestHelper.externalSteps` | `[]` | Extra `package:` step locations |
| `bddWidgetTestHelper.showUnresolvedStepWarnings` | `true` | Warn on unresolved steps |

Commands: **BDD: Create step file** (also available as quick-fix),
**BDD: Rebuild step index**.

## Multilingual Gherkin

All 80 dialects of the official Gherkin dialect table are supported
(`# language: tr` header et al.), including Turkish:

```gherkin
# language: tr
Özellik: Türkçe özellik
  Senaryo: Türkçe senaryo
    Diyelim ki uygulama çalışıyor
    Eğer ki butaya basarım
    O zaman ekranı görürüm
```

`Diyelim ki uygulama çalışıyor` resolves to `step/uygulama_calisiyor.dart`
and function `uygulamaCalisiyor` — the exact names `bdd_widget_test`
generates.

## And/But inheritance, Background, Outlines

- `And` / `But` / `*` steps inherit the effective keyword of the previous
  step in the same block, exactly as Gherkin specifies.
- Steps in `Background:` sections are resolved like any other step.
- `Examples:` tables are never mistaken for steps; `<param>` placeholders
  inside outline steps map to `dynamic` parameters in scaffolds.
- Steps inside docstrings (`"""` / ` ``` `) and `# comments` are ignored.

## Development

```bash
npm install
npm run compile        # type-check + esbuild bundle
npm run test:unit      # vitest unit tests (naming, parser, yaml)
npm test               # integration tests in VS Code (@vscode/test-electron)
npm run package        # production bundle
npm run package:vsix   # build a .vsix with vsce
```

Project layout:

```text
src/
  extension.ts            activation, providers, diagnostics wiring
  featureParser.ts        Gherkin parser (dialects, And/But inheritance)
  gherkin/dialects.json   official Gherkin dialect table (80 languages)
  naming.ts               port of bdd_widget_test step naming (verified)
  diacritics.generated.ts port of the diacritic package's folding map
  bddOptions.ts           bdd_options.yaml / build.yaml reader
  simpleYaml.ts           minimal YAML subset parser
  stepIndex.ts            cached, watcher-updated step file index
  stepResolver.ts         step → file resolution chain
  providers.ts            DefinitionProvider + DocumentLinkProvider
  codeActions.ts          "Create step file" quick-fix + diagnostics
  test/unit/              vitest unit tests
  test/integration/       @vscode/test-electron integration tests
  test/fixtures/          sample feature project used by tests
syntaxes/feature.tmLanguage.json   TextMate grammar
```

### Port fidelity

`src/naming.ts` is a line-by-line port of `bdd_widget_test`'s
`string_utils.dart` + `step_generator.dart` (underscore/camelize/parseRawStepLine/
stepIdentifier) and the `diacritic` package's replacement map. The unit
tests assert the upstream package's own fixtures, e.g.
`'los diacríticos son útil'` → `los_diacriticos_son_util`,
`"I see {'0'} text"` → `i_see_text`, `'there are <start> cucumbers'` →
`thereAreCucumbers`, `'2FA is on'` → rejected.

## License

MIT
