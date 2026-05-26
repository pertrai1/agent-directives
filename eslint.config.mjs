import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import llmCore from "eslint-plugin-llm-core";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules/**", "evals/results/**", "package-lock.json"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  tseslint.configs.recommended,
  ...llmCore.configs.recommended,
  {
    rules: {
      "no-nested-ternary": "error",
      "preserve-caught-error": "error",
      "no-useless-assignment": "error",
      "llm-core/max-function-length": "off",
      "llm-core/max-params": "off",
      "llm-core/no-magic-numbers": "off",
      "llm-core/prefer-nullish-coalescing": "off",
      "llm-core/structured-logging": "off",
    },
  },
  {
    files: ["scripts/**/*.ts", "evals/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
    rules: {
      "markdown/fenced-code-language": "off",
      "markdown/no-missing-label-refs": "off",
      "markdown/no-multiple-h1": "off",
    },
  },
]);
