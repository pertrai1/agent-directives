import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const DECIMAL_RADIX = 10;

export async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

export async function selectMultiple(question: string, options: string[]): Promise<string[]> {
  if (options.length === 0) return [];
  stdout.write(`${question}\n`);
  options.forEach((opt, i) => stdout.write(`  ${i + 1}) ${opt}\n`));
  const answer = (await ask('Select numbers separated by space (or "all", "none"): ')).toLowerCase();
  if (answer === 'all') return [...options];
  if (answer === '' || answer === 'none') return [];
  const indices = answer
    .split(/\s+/)
    .map((token) => Number.parseInt(token, DECIMAL_RADIX) - 1)
    .filter((index) => Number.isInteger(index) && index >= 0 && index < options.length);
  return [...new Set(indices)].map((index) => options[index]);
}
