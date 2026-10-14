import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "out/**",
      ".vscode-test/**",
      ".agents/**",
      "zed/target/**",
      "zed/server/server.cjs",
      "graphify-out/**",
      "package-lock.json",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  // root-level build/test scripts are CommonJS
  eslintPluginPrettierRecommended,
  {
    files: ["*.js", "test/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
    // prettier/prettier cannot run on .md here: @eslint/markdown v8 is a
    // language plugin (no processor/virtual filenames), so the plugin's
    // worker infers the markdown parser but its eslint-plugin-markdown@1
    // compatibility heuristic forces parser "babel" on the prose.
    rules: { "prettier/prettier": "off" },
  },
]);
