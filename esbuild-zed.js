const esbuild = require("esbuild");

// Bundles the Zed LSP server from the shared TypeScript core. Unlike
// esbuild.js there is deliberately NO `external: ['vscode']` — the build must
// fail if a `vscode` import leaks into the server's import graph (the server
// runs under plain Node, not the VS Code extension host).
/** @type {import('esbuild').BuildOptions} */
const config = {
  bundle: true,
  format: "cjs",
  sourcesContent: false,
  platform: "node",
  target: "node18",
  logLevel: "info",
  entryPoints: ["zed/server/src/lsp.ts"],
  outfile: "zed/server/server.cjs",
  banner: { js: "// GENERATED — run npm run build:zed; do not edit" },
};

esbuild.build(config).catch((e) => {
  console.error(e);
  process.exit(1);
});
