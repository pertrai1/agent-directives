import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { repoRoot, test, reportResults } from "./test-cli-helpers.js";

const packageJsonPath = join(repoRoot, "package.json");
const releaseWorkflowPath = join(repoRoot, ".github", "workflows", "release.yml");
const changesetConfigPath = join(repoRoot, ".changeset", "config.json");
const buildTsconfigPath = join(repoRoot, "tsconfig.build.json");

interface PackageJson {
  private?: boolean;
  bin?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  publishConfig?: Record<string, unknown>;
  repository?: { type?: string; url?: string };
  homepage?: string;
  bugs?: { url?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function packageJson(): PackageJson {
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

test("package metadata is publishable and points the CLI at built output", () => {
  const pkg = packageJson();
  assert(!pkg.private, "package must not be private");
  assert(pkg.bin?.["agent-directives"] === "./dist/cli.js", "agent-directives bin must point to ./dist/cli.js");
  assert(pkg.publishConfig?.access === "public", "publishConfig.access must be public");
  assert(Boolean(pkg.publishConfig?.provenance), "publishConfig.provenance must be true");
  assert(pkg.repository?.url === "git+https://github.com/pertrai1/agent-directives.git", "repository url is missing or wrong");
  assert(pkg.homepage === "https://github.com/pertrai1/agent-directives#readme", "homepage is missing or wrong");
  assert(pkg.bugs?.url === "https://github.com/pertrai1/agent-directives/issues", "bugs.url is missing or wrong");
});

test("package scripts and files support build, changesets, and pack verification", () => {
  const pkg = packageJson();
  const requiredScripts = ["build", "changeset", "version", "release", "pack:check", "prepare"];
  for (const script of requiredScripts) {
    assert(Boolean(pkg.scripts?.[script]), `missing npm script: ${script}`);
  }
  for (const file of ["dist/", "directives/", "skills/", "templates/", "manifest.json", "README.md"]) {
    assert(Boolean(pkg.files?.includes(file)), `package files must include ${file}`);
  }
  assert(pkg.dependencies?.tsx === undefined, "tsx should not be a runtime dependency for the packaged CLI");
  assert(Boolean(pkg.devDependencies?.tsx), "tsx should remain a dev dependency for repo scripts");
  assert(Boolean(pkg.devDependencies?.["@changesets/cli"]), "@changesets/cli dev dependency is required");
  assert(Boolean(pkg.devDependencies?.["@changesets/changelog-github"]), "@changesets/changelog-github dev dependency is required");
});

test("changesets config matches the repository and public npm release policy", () => {
  assert(existsSync(changesetConfigPath), ".changeset/config.json must exist");
  const config = JSON.parse(readText(changesetConfigPath)) as {
    changelog?: [string, { repo?: string }];
    access?: string;
    baseBranch?: string;
  };
  assert(config.changelog?.[0] === "@changesets/changelog-github", "changesets must use the GitHub changelog generator");
  assert(config.changelog?.[1]?.repo === "pertrai1/agent-directives", "changesets changelog repo is wrong");
  assert(config.access === "public", "changesets access must be public");
  assert(config.baseBranch === "main", "changesets baseBranch must be main");
});

test("release workflow builds, checks, publishes with provenance, and creates GitHub releases", () => {
  assert(existsSync(releaseWorkflowPath), ".github/workflows/release.yml must exist");
  const workflow = readText(releaseWorkflowPath);
  for (const expected of [
    "branches: [main]",
    "id-token: write",
    "uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
    "persist-credentials: false",
    "uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
    "uses: changesets/action@63a615b9cd06ba9a3e6d13796c7fbcb080a60a0b",
    "npm run build",
    "npm run check",
    "npm pack --dry-run",
    "npm view agent-directives version",
    "NPM_PUBLISH_CLI: npm@11.18.0",
    'npx -y "$NPM_PUBLISH_CLI" publish --access public --provenance',
    "gh release create",
  ]) {
    assert(workflow.includes(expected), `release workflow must contain: ${expected}`);
  }
});

test("build tsconfig emits only src TypeScript into dist for the packaged CLI", () => {
  assert(existsSync(buildTsconfigPath), "tsconfig.build.json must exist");
  const config = JSON.parse(readText(buildTsconfigPath)) as {
    extends?: string;
    compilerOptions?: { noEmit?: boolean; declaration?: boolean; outDir?: string; rootDir?: string };
    include?: string[];
  };
  assert(config.extends === "./tsconfig.json", "build tsconfig should extend the base tsconfig");
  assert(Object.is(config.compilerOptions?.noEmit, false), "build tsconfig must emit files");
  assert(Boolean(config.compilerOptions?.declaration), "build tsconfig should emit declarations");
  assert(config.compilerOptions?.outDir === "dist", "build output must be dist");
  assert(config.compilerOptions?.rootDir === "src", "build rootDir must be src");
  assert(Boolean(config.include?.includes("src/**/*.ts")), "build should include src TypeScript only");
});

reportResults();
