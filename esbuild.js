const esbuild = require("esbuild");

/** @type {import('esbuild').BuildOptions} */
const config = {
  bundle: true,
  format: "cjs",
  minify: process.argv.includes("--production"),
  sourcemap: !process.argv.includes("--production"),
  sourcesContent: false,
  platform: "node",
  outfile: "dist/extension.js",
  external: ["vscode"],
  logLevel: "info",
  target: "node18",
  entryPoints: ["src/extension.ts"],
};

async function main() {
  const watch = process.argv.includes("--watch");
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
  } else {
    await esbuild.build(config);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
