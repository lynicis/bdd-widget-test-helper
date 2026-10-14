const path = require("path");

async function main() {
  const { runTests } = require("@vscode/test-electron");
  const root = path.resolve(__dirname, "..");
  await runTests({
    extensionDevelopmentPath: root,
    extensionTestsPath: path.resolve(
      root,
      "out/test/integration/extension.test.js",
    ),
    launchArgs: [path.resolve(root, "src/test/fixtures")],
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
