# Security Policy

## Supported versions

Only the latest published release (`0.1.x`) receives fixes. Older versions are
not maintained; please update the extension before reporting.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

- Preferred: use GitHub's private reporting —
  <https://github.com/lynicis/bdd-widget-test-helper/security/advisories/new>
- Or email <lynicis@protonmail.com> with `SECURITY` in the subject.

Please include:

- The affected version and editor (VS Code, VSCodium, or Zed) with its version.
- What an attacker would need (e.g. a malicious `.feature`, `step/*.dart`,
  `bdd_options.yaml`, or a crafted workspace opened by the user).
- Steps to reproduce, a minimal workspace if possible, and the impact you
  believe it has.

This is a one-maintainer project with no SLA. You will normally get an
acknowledgement within a few days; you will be credited in the advisory unless
you prefer otherwise, and I will coordinate disclosure with you.

## Scope

The extension runs entirely inside your editor and its local file system. It
has no telemetry, no network access, and does not invoke Dart or any other
tooling at runtime. Relevant areas:

- Parsing of untrusted workspace content (`.feature`, `step/*.dart`,
  `bdd_options.yaml`, `build.yaml`, `.dart_tool/package_config.json`).
- Path resolution and file creation: `createStepFile` writes to the `step/`
  folder derived from settings and project layout — path traversal, writing
  outside the workspace, or overwriting an existing file is in scope.
- Symlink and recursion handling while indexing step folders.
- The bundled Zed LSP server (`zed/server/server.cjs`) and its Rust launcher.
- Supply chain: the published `.vsix` / Open VSX build and its dependency tree
  should contain only what is expected.

Out of scope here: vulnerabilities in VS Code, VSCodium or Zed themselves, in
the `bdd_widget_test` pub package or `bdd_widget_test`'s generator, and social
engineering of the maintainer.
