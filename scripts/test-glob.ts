#!/usr/bin/env tsx
import { strictEqual } from "node:assert";
import { test, reportResults } from "./test-cli-helpers.js";
import { matchGlob, globToRegex } from "../src/glob.js";

console.log("glob matching rules");

test("globToRegex handles leading, double, and nested wildcards correctly", () => {
  strictEqual(globToRegex("**/*.ts").test("index.ts"), true);
  strictEqual(globToRegex("**/*.ts").test("src/index.ts"), true);
  strictEqual(globToRegex("**/*.ts").test("src/components/button.ts"), true);

  strictEqual(globToRegex("src/**/*.ts").test("src/index.ts"), true);
  strictEqual(globToRegex("src/**/*.ts").test("src/lib/index.ts"), true);
  strictEqual(globToRegex("src/**/*.ts").test("index.ts"), false);

  strictEqual(globToRegex("src/*.ts").test("src/index.ts"), true);
  strictEqual(globToRegex("src/*.ts").test("src/components/index.ts"), false);
});

test("matchGlob normalizes paths and resolves exact matches", () => {
  strictEqual(matchGlob("src/index.ts", "src/**/*.ts"), true);
  strictEqual(matchGlob("./src/index.ts", "src/**/*.ts"), true);
  strictEqual(matchGlob("src\\index.ts", "src/**/*.ts"), true);
  
  strictEqual(matchGlob("tsconfig.json", "tsconfig.json"), true);
  strictEqual(matchGlob("src/tsconfig.json", "tsconfig.json"), false);
});

reportResults();
