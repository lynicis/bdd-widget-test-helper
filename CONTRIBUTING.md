# Contributing

Thanks for wanting to improve BDD Widget Test Helper. This is a VS Code /
VSCodium / Zed extension that resolves Gherkin `.feature` steps for Flutter
projects practising A-TDD with the `bdd_widget_test` pub package.

## The one rule that matters most: port fidelity

`src/naming.ts` is a **line-by-line port** of `bdd_widget_test`'s
`string_utils.dart`, `step_generator.dart` and the `diacritic` package. The
extension deliberately resolves steps _offline_, without Dart tooling, so the
only thing keeping its answers correct is staying identical to upstream.

If you touch `src/naming.ts`, `src/bddOptions.ts` (settings/option precedence),
or the resolution order in `src/stepResolver.ts`:

- Keep the behaviour identical to `bdd_widget_test`. If upstream changed, port
  the change — do not invent a better rule.
- Update `src/test/unit/naming.test.ts` with the upstream fixture that proves
  it (existing examples: `'los diacríticos son útil'` →
  `los_diacriticos_son_util`, `'there are <start> cucumbers'` →
  `thereAreCucumbers`, `'2FA is on'` → rejected).
- Update `README.md`. The README is the fidelity contract: behaviour documented
  there is a promise to users, and diverging behaviour without a README change
  is a bug.

## Host constraint

The extension runs on both **VS Code and VSCodium**, so only the open-source
`vscode` API may be used — never Microsoft-proprietary APIs. The shared core
(`naming.ts`, `featureParser.ts`, `bddOptions.ts`, `simpleYaml.ts`, `stepIndex.ts`,
`stepResolver.ts`) must not import `vscode` at all; it backs both the VS Code
extension and the Zed LSP server. Inject host glue (`extension.ts` for VS Code,
`zed/server/src/lsp.ts` for Zed) instead of importing, and never mock `vscode`
in a test — extract the pure part instead.

## Generated files — do not hand-edit

| File                          | Regenerate with                   |
| ----------------------------- | --------------------------------- |
| `src/diacritics.generated.ts` | port from the `diacritic` package |
| `src/gherkin/dialects.json`   | official Gherkin dialect table    |
| `zed/server/server.cjs`       | `npm run build:zed`               |

## Development

See the [Development section of the README](README.md#development) for the
full command list and project layout. In short:

```bash
npm install
npm run lint
npm run check-types
npm run test:unit        # vitest, plain Node
npx tsc --project tsconfig.test.json && node test/runTests.js   # integration, needs a display
```

`npm run build:zed` must have been run at least once or the `zedServer` unit
test skips itself.

## Before opening a pull request

- [ ] `npm run lint`, `npm run check-types` and `npm run test:unit` all pass.
- [ ] Integration tests pass (`node test/runTests.js`, or `xvfb-run -a node …`
      on Linux).
- [ ] Behaviour changes come with tests; naming/option changes also update the
      README.
- [ ] Changed behaviour is noted under `## Unreleased` in `CHANGELOG.md`
      ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sections:
      Added / Changed / Fixed / Documentation).
- [ ] No new runtime dependencies. `dependencies` exists only to keep the VSIX
      minimal — the extension must stay dependency-light.
- [ ] Generated files were regenerated, not edited by hand.

## Code style

- TypeScript with `strict`, `noUnusedLocals`, `noImplicitOverride`; ES2022,
  `Node16` modules. Type-check with `tsc --noEmit` — nothing is emitted by it,
  runtime JS comes from the esbuild bundle.
- Files `camelCase.ts`; classes `PascalCase`; constants `SCREAMING_SNAKE`.
  Named exports only, no default exports.
- Dependency injection via constructor parameter properties. Discriminated
  unions with a `kind` field for state (`StepResolution`). No custom `Error`
  classes; error handling is defensive and silent.
- Core is synchronous; file I/O uses sync `fs`. Only `createStepFile` is async.
- Formatting is checked through ESLint (`prettier/prettier` in
  `eslint.config.mts`), so `npm run lint --fix` is the formatter. Match the
  surrounding style and never reformat unrelated files in a behaviour change.
  `npm run lint` covers JS, TS, JSON and Markdown.

## Commits and branches

- `master` is the default branch; open pull requests against it.
- Commit subjects follow [Conventional Commits](https://www.conventionalcommits.org/):
  `docs:`, `ci:`, `chore(release):`, `fix(scope):`, `feat(scope):`.
- CI (`.github/workflows/publish.yml`) runs the full suite and publishes to the
  VS Code Marketplace and Open VSX, but only on a published GitHub release —
  not on every push. Please run the checks locally.

## Reporting bugs and requesting features

Open an issue at <https://github.com/lynicis/bdd-widget-test-helper/issues>.
Include your editor and version, the `bdd_widget_test` version your project
uses, and a minimal `.feature` + `step/*.dart` reproduction where possible.
For anything security-related, follow [SECURITY.md](SECURITY.md) instead.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE), the same terms as the project.
