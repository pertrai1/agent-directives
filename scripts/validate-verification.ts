import { parseFrontmatterBlock } from './frontmatter.js';

/** Context functions passed from the global validator runner. */
export interface ValidationContext {
  /** Reports a validation failure message. */
  fail: (message: string) => void;
  /** Asserts that a field matches a list of string elements. */
  validateStringArrayShape: (opts: { path: string; keyPath: string; value: unknown }) => void;
}

/** Options for validating verification metadata on an entry. */
export interface ValidateVerificationOptions {
  /** The filesystem path to the file under test. */
  path: string;
  /** Raw frontmatter content text block. */
  fm: string;
  /** The execution context callbacks for reporting lints. */
  ctx: ValidationContext;
}

/** Options for validating a single command gate object. */
interface ValidateCommandOptions {
  path: string;
  cmd: unknown;
  index: number;
  ctx: ValidationContext;
}

/** Options for parsing raw verification source field block. */
interface ParseVerificationSourceOptions {
  verification: unknown;
  path: string;
  ctx: ValidationContext;
}

/** Helper function to check if a value is a valid JSON mapping. */
function isMapping(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Parsed verification block content safely, handling both parsed mappings and inline JSON string.
 */
function getParsedVerification(options: ParseVerificationSourceOptions): Record<string, unknown> | undefined {
  const { verification, path, ctx } = options;
  if (verification === undefined) return undefined;
  if (typeof verification === 'string') {
    try {
      const parsed = JSON.parse(verification);
      if (isMapping(parsed)) return parsed;
      ctx.fail(`${path}: optional 'verification' must be a mapping`);
      return undefined;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.fail(`${path}: optional 'verification' is not a valid JSON string: ${message}`);
      return undefined;
    }
  }
  if (isMapping(verification)) return verification;
  ctx.fail(`${path}: optional 'verification' must be a mapping`);
  return undefined;
}

/**
 * Validates the verification gate blocks in rules and directives frontmatter.
 *
 * @param options Options detailing path, raw frontmatter, and reporting context.
 */
export function validateVerificationMetadata(options: ValidateVerificationOptions): void {
  const { path, fm, ctx } = options;
  const parsed = parseFrontmatterBlock(fm);
  const parsedVerification = getParsedVerification({ verification: parsed.verification, path, ctx });
  if (!parsedVerification) return;

  const commands = parsedVerification.commands;
  if (commands === undefined) return;
  if (!Array.isArray(commands) || commands.length === 0) {
    ctx.fail(`${path}: optional 'verification.commands' must be a non-empty array`);
    return;
  }
  for (let i = 0; i < commands.length; i++) {
    validateSingleCommand({ path, cmd: commands[i], index: i, ctx });
  }
}

/** Validates the structure and properties of an individual command gate object. */
function validateSingleCommand(options: ValidateCommandOptions): void {
  const { path, cmd, index, ctx } = options;
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) {
    ctx.fail(`${path}: 'verification.commands[${index}]' must be a mapping`);
    return;
  }
  const c = cmd as Record<string, unknown>;
  if (typeof c.name !== 'string' || !c.name) {
    ctx.fail(`${path}: 'verification.commands[${index}].name' must be a non-empty string`);
  }
  if (typeof c.run !== 'string' || !c.run) {
    ctx.fail(`${path}: 'verification.commands[${index}].run' must be a non-empty string`);
  }
  if (c.files !== undefined) {
    ctx.validateStringArrayShape({ path, keyPath: `verification.commands[${index}].files`, value: c.files });
  }
}
