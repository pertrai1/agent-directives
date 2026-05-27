#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { buildContextAudit, renderContextAudit } from './context-audit.js';
import { filterEntries, findEntry, loadManifest, packageRoot, type ManifestEntry, type ManifestEntryType } from './manifest.js';
import { installEntry, isEntryInstalled, type InstallResult } from './install.js';
import { renderEntryList } from './renderEntryList.js';
import { selectMultiple } from './prompt.js';
import { parseRuleCategories } from './rules.js';
import { KNOWN_TOOLS, detectTool, isTool, type Tool } from './targets.js';

const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as { version: string };

const DECIMAL_RADIX = 10;
type InstallSummary = { installed: number; identical: number; conflict: number };

function resolveTool(provided?: string): Tool {
  if (provided) {
    if (!isTool(provided)) {
      console.error(`Unknown tool '${provided}'. Expected one of: ${KNOWN_TOOLS.join(', ')}`);
      process.exit(1);
    }
    return provided;
  }
  const detected = detectTool(process.cwd());
  if (!detected) {
    console.error(`Unable to auto-detect tool from current directory.`);
    console.error(`Use --tool with one of: ${KNOWN_TOOLS.join(', ')}`);
    process.exit(1);
  }
  return detected;
}

function reportInstall(entry: ManifestEntry, result: InstallResult): void {
  switch (result.status) {
    case 'installed':
      console.log(`  ✓ ${entry.id}`);
      break;
    case 'skipped-identical':
      console.log(`  = ${entry.id} (already up-to-date)`);
      break;
    case 'skipped-conflict':
      console.error(`  ✗ ${entry.id} (conflict: ${result.path})`);
      break;
  }
}

function parseIntegerOption(value: string, opts: { flag: string; minimum: number }): number {
  const { flag, minimum } = opts;
  if (!/^[+-]?\d+$/.test(value)) {
    console.error(`Invalid ${flag} '${value}'. Expected an integer.`);
    process.exit(1);
  }
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    console.error(`Invalid ${flag} '${value}'. Expected an integer >= ${minimum}.`);
    process.exit(1);
  }
  return parsed;
}

const program = new Command();

program
  .name('agent-directives')
  .description('Install agent directives, skills, and rules into your project')
  .version(pkg.version);

function isManifestEntryType(value: string): value is ManifestEntryType {
  return value === 'directive' || value === 'skill' || value === 'rule';
}

function validateListOptions(opts: { tool?: string; type?: string }): void {
  if (opts.type && !isManifestEntryType(opts.type)) {
    console.error(`Invalid --type '${opts.type}'. Expected 'directive', 'skill', or 'rule'.`);
    process.exit(1);
  }
  if (opts.tool && !isTool(opts.tool)) {
    console.error(`Unknown tool '${opts.tool}'. Expected one of: ${KNOWN_TOOLS.join(', ')}`);
    process.exit(1);
  }
}

function applyEntries(entries: ManifestEntry[], opts: { cwd: string; tool: Tool; force?: boolean; summary: InstallSummary }): void {
  for (const entry of entries) {
    const result = installEntry(entry, { cwd: opts.cwd, tool: opts.tool, force: opts.force });
    reportInstall(entry, result);
    if (result.status === 'installed') opts.summary.installed += 1;
    else if (result.status === 'skipped-identical') opts.summary.identical += 1;
    else opts.summary.conflict += 1;
  }
}

function applySelectedRules(opts: { entries: ManifestEntry[]; categories: string[]; apply: (entries: ManifestEntry[]) => void; mode?: string }): void {
  const { entries, categories, apply, mode } = opts;
  if (!mode || mode === 'none') return;
  if (entries.length === 0) {
    console.log(`\nNo matching rule entries selected${mode === 'auto' ? ' by auto-detection' : ''}.`);
    return;
  }
  console.log(`\nInstalling ${entries.length} selected rule entr${entries.length === 1 ? 'y' : 'ies'} (${categories.join(', ')})...`);
  apply(entries);
}

async function promptForOptionalEntries(entries: ManifestEntry[], apply: (entries: ManifestEntry[]) => void): Promise<void> {
  if (entries.length === 0) return;
  const categories = Array.from(new Set(entries.map((entry) => entry.category))).sort();
  const chosen = await selectMultiple('\nOptional categories:', categories);
  const toInstall = entries.filter((entry) => chosen.includes(entry.category));
  if (toInstall.length === 0) return;
  console.log(`\nInstalling ${toInstall.length} optional entr${toInstall.length === 1 ? 'y' : 'ies'}...`);
  apply(toInstall);
}

program
  .command('list')
  .description('List available directives, skills, and rules')
  .option('-c, --category <category>', 'Filter by category')
  .option('-r, --required', 'Only show required entries')
  .option('-t, --tool <tool>', `Filter by tool (${KNOWN_TOOLS.join(', ')})`)
  .option('--type <type>', 'Filter by type (directive, skill, or rule)')
  .action((opts: { category?: string; required?: boolean; tool?: string; type?: string }) => {
    validateListOptions(opts);
    const manifest = loadManifest();
    const typeFilter = opts.type && isManifestEntryType(opts.type) ? opts.type : undefined;
    const filtered = filterEntries(manifest.entries, {
      category: opts.category,
      required: opts.required,
      tool: opts.tool,
      type: typeFilter,
    });
    if (filtered.length === 0) {
      console.log('No entries match the filters.');
      return;
    }
    console.log(renderEntryList(filtered));
    console.log(`\n${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'} (★ = required)`);
  });

program
  .command('context-audit')
  .description('Estimate prompt weight for directives, skills, and rules')
  .option('-t, --tool <tool>', `Filter by target tool (${KNOWN_TOOLS.join(', ')})`)
  .option('-r, --required', 'Only include always-loaded required entries')
  .option('--max-tokens <tokens>', 'Fail when the estimated token count exceeds this budget')
  .option('--largest <count>', 'Number of largest entries to show', '10')
  .action((opts: { tool?: string; required?: boolean; maxTokens?: string; largest?: string }) => {
    if (opts.tool && !isTool(opts.tool)) {
      console.error(`Unknown tool '${opts.tool}'. Expected one of: ${KNOWN_TOOLS.join(', ')}`);
      process.exit(1);
    }
    const maxTokens = opts.maxTokens === undefined ? undefined : parseIntegerOption(opts.maxTokens, { flag: '--max-tokens', minimum: 0 });
    const largest = opts.largest === undefined ? undefined : parseIntegerOption(opts.largest, { flag: '--largest', minimum: 1 });

    const manifest = loadManifest();
    const result = buildContextAudit(manifest.entries, {
      tool: opts.tool,
      requiredOnly: opts.required,
      maxTokens,
      largest,
    });
    const rendered = renderContextAudit(result);
    if (result.overBudget) {
      console.error(rendered);
      console.error(`Context budget exceeded: ${result.estimatedTokens.toLocaleString()} > ${result.maxTokens?.toLocaleString()} tokens.`);
      process.exit(1);
    }
    console.log(rendered);
  });

program
  .command('add <id>')
  .description('Install a single directive, skill, or rule into the current project')
  .option('-t, --tool <tool>', `Target tool (${KNOWN_TOOLS.join(', ')})`)
  .option('-f, --force', 'Overwrite an existing file with different content')
  .action((id: string, opts: { tool?: string; force?: boolean }) => {
    const manifest = loadManifest();
    const entry = findEntry(manifest.entries, id);
    if (!entry) {
      console.error(`No such entry: ${id}`);
      console.error(`Run 'agent-directives list' to see available entries.`);
      process.exit(1);
    }
    const tool = resolveTool(opts.tool);
    if (!entry.tools.includes(tool)) {
      console.error(`Entry '${id}' does not support tool '${tool}' (supports: ${entry.tools.join(', ')}).`);
      process.exit(1);
    }
    const result = installEntry(entry, { cwd: process.cwd(), tool, force: opts.force });
    reportInstall(entry, result);
    if (result.status === 'skipped-conflict') {
      console.error(`Use --force to overwrite.`);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Report missing required directives, skills, and rules for the target tool')
  .option('-t, --tool <tool>', `Target tool (${KNOWN_TOOLS.join(', ')})`)
  .action((opts: { tool?: string }) => {
    const manifest = loadManifest();
    const tool = resolveTool(opts.tool);
    const required = filterEntries(manifest.entries, { required: true, tool });
    const missing = required.filter((entry) => !isEntryInstalled(entry, { tool, cwd: process.cwd() }));
    if (missing.length === 0) {
      console.log(`✓ All ${required.length} required entries are installed for ${tool}.`);
      return;
    }
    console.error(`✗ Missing ${missing.length} of ${required.length} required entries for ${tool}:`);
    for (const entry of missing) {
      console.error(`  - ${entry.id} (${entry.type}, category: ${entry.category})`);
    }
    console.error(`\nRun 'agent-directives sync --tool ${tool}' to install them.`);
    process.exit(1);
  });

program
  .command('sync')
  .description('Install all required entries and prompt for optional categories')
  .option('-t, --tool <tool>', `Target tool (${KNOWN_TOOLS.join(', ')})`)
  .option('-y, --yes', 'Skip prompts; install required entries only')
  .option('-f, --force', 'Overwrite files with different content')
  .option('--rules <mode>', "Install rule categories: 'auto', 'none', or comma-separated categories such as 'angular'", 'none')
  .action(async (opts: { tool?: string; yes?: boolean; force?: boolean; rules?: string }) => {
    const manifest = loadManifest();
    const tool = resolveTool(opts.tool);
    const required = filterEntries(manifest.entries, { required: true, tool });
    const optional = filterEntries(manifest.entries, { required: false, tool });
    const requestedRuleCategories = parseRuleCategories(opts.rules, process.cwd());
    const selectedRules = optional.filter((entry) => entry.type === 'rule' && requestedRuleCategories.includes(entry.category));
    const promptableOptional = optional.filter((entry) => entry.type !== 'rule' || !requestedRuleCategories.includes(entry.category));

    console.log(`Tool: ${tool}`);
    console.log(`Installing ${required.length} required entr${required.length === 1 ? 'y' : 'ies'}...`);

    const summary = { installed: 0, identical: 0, conflict: 0 };
    const apply = (entries: ManifestEntry[]): void => applyEntries(entries, { cwd: process.cwd(), tool, force: opts.force, summary });

    apply(required);

    applySelectedRules({ entries: selectedRules, categories: requestedRuleCategories, apply, mode: opts.rules });

    if (!opts.yes) {
      await promptForOptionalEntries(promptableOptional, apply);
    }

    console.log(`\nSummary: ${summary.installed} installed, ${summary.identical} already up-to-date, ${summary.conflict} conflicts`);
    if (summary.conflict > 0 && !opts.force) {
      console.error(`Re-run with --force to overwrite conflicting files.`);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
