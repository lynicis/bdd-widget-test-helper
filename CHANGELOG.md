# Changelog

All notable changes to the **BDD Widget Test Helper** extension are documented
in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0 - 2026-10-14

### Added

- **Zed extension** (`zed/`): unresolved-step diagnostics, go-to-definition
  and the "Create step file" quick-fix for `.feature` files in
  [Zed](https://zed.dev), served over LSP by a bundled zero-dependency Node
  server that reuses the same TypeScript core. Zed has no document-link API, so
  navigation there is go-to-definition only. See `zed/README.md`.
- File icon (cucumber) for `.feature` files in the explorer and editor tabs.
- `CHANGELOG.md`, and `.vscodeignore` now keeps it in the VSIX so the
  Marketplace renders this file.

### Fixed

- Go to definition / document links landed on line 1 of the step file instead
  of the `Future<void>` line: the function lookup built a PascalCase identifier
  (`I_tap_text` → `ITapText`) that never matched the generated lowerCamelCase
  name. It now uses the same `camelize` mapping as the generator.

### Documentation

- README: added the VS Code Marketplace badge and synced the feature list with
  current behaviour.

## 0.1.1 - 2026-10-14

### Fixed

- `repository.url` in `package.json` pointed at a repo that does not exist
  (`lynicis/vscode-bdd-dart`), which broke the Marketplace "Repository" link.
  It now points at `lynicis/bdd-widget-test-helper`.

### Changed

- Packaging switched from a denylist to an allowlist in `.vscodeignore`. The
  VSIX now ships only `dist/`, `media/`, `syntaxes/`,
  `language-configuration.json` and `LICENSE`; 0.1.0 shipped 22
  files / 226 KB unpacked and leaked `src/` and `esbuild.js` into the package,
  0.1.1 ships 9 files / 93 KB.
- The publish workflow now publishes to Open VSX alongside the VS Code
  Marketplace: it creates the `lynicis` namespace on first release (no-op
  afterwards), and passes `--skip-duplicate` to both `vsce` and `ovsx` so a
  re-run after a partial failure completes instead of failing on the already
  published version.
- DevDependency upgrades: `@vscode/vsce` ^3 → ^4, `esbuild` ^0.21 → ^0.28,
  `vitest` ^1.6 → ^5, `@types/node` 20.x → ^24.

### Notes

- Extension id is unchanged (`lynicis.bdd-widget-test-helper`) — no settings
  or keybindings need to be re-created after upgrading.

## 0.1.0 - 2026-10-14

Initial release. No Dart tooling is needed at runtime: the extension
re-implements `bdd_widget_test`'s naming, parsing and option lookup in
TypeScript, and runs on both VS Code and VSCodium (open-source `vscode` API
only).

### Added

- **Go to definition** on every step line (`Given` / `When` / `Then` / `And` /
  `But`), in all 80 Gherkin dialects, jumping to the matching Dart step file
  and to the function inside it. The same targets are exposed as document
  links.
- **Faithful name mapping**, ported line-by-line from `bdd_widget_test`'s
  `string_utils.dart`, `step_generator.dart` and the `diacritic` package:
  step text to snake_case file name (`I tap text` → `step/i_tap_text.dart`) and
  camelCase function name (`iTapText`); `{...}` parameters stripped from the
  name and typed in the scaffold (quoted → `String`, numeric → `num`,
  `true`/`false` → `bool`, otherwise `dynamic`); Scenario Outline
  `<placeholder>`s stripped and typed `dynamic`; accented Latin folded to ASCII
  (`çalışıyor` → `calisiyor`); steps with a data table get the
  `bdd.DataTable dataTable` parameter and import.
- **Built-in step set** — the 20 `predefinedSteps` of `bdd_widget_test` (e.g.
  `the app is running`, `I see {..} text`) are recognised and never reported
  missing.
- **Rename hint** — steps that cannot produce a valid Dart identifier
  (non-Latin scripts, leading digit or underscore) are reported instead of
  silently scaffolded to a broken name.
- **"Create step file" quick-fix** — scaffolds the missing step file with the
  exact content `bdd_widget_test` would generate.
- **Diagnostics** — unresolved steps are reported as warnings.
- **Step lookup order**: the `step/` folder next to the feature file
  (recursive, nearest wins) → `externalSteps` `package:` URIs resolved through
  `.dart_tool/package_config.json` → built-in steps.
- **Option precedence**: `bdd_options.yaml` (nearest, walking up to the
  workspace root) → `build.yaml` (`builders → bdd_widget_test → options`) →
  `bddWidgetTestHelper.*` settings.
- **Step index cache** — step folders are indexed once and refreshed
  incrementally from a `FileSystemWatcher`, with diagnostics recomputed on a
  200 ms debounce rather than per keystroke.
- **Syntax highlighting** — TextMate grammar for `.feature` files covering
  keywords, tags, placeholders, parameters, tables and docstrings, including
  Turkish and other common dialect keywords.
- **Tests** — Vitest unit suites for the parser, naming and options modules
  (asserting upstream `bdd_widget_test` fixtures), plus a
  `@vscode/test-electron` integration suite exercising activation, the
  definition provider, document links and the `createStepFile` command.
