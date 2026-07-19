export type Fraction = { numerator: bigint; denominator: bigint };

const MAXIMUM_THRESHOLD_LENGTH = 1_000;
const MAXIMUM_DECIMAL_SCALE = 1_000;
export const ZERO: Fraction = { numerator: 0n, denominator: 1n };

export function compareFraction(left: Fraction, right: Fraction): number {
  const leftValue = left.numerator * right.denominator;
  const rightValue = right.numerator * left.denominator;
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

export function add(left: Fraction, right: Fraction): Fraction {
  return normalize({ numerator: left.numerator * right.denominator + right.numerator * left.denominator, denominator: left.denominator * right.denominator });
}

export function divide(left: Fraction, right: Fraction): Fraction {
  return normalize({ numerator: left.numerator * right.denominator, denominator: left.denominator * right.numerator });
}

export function subtract(left: Fraction, right: Fraction): Fraction {
  return normalize({ numerator: left.numerator * right.denominator - right.numerator * left.denominator, denominator: left.denominator * right.denominator });
}

export function asNumber(value: Fraction): number {
  return Number(value.numerator) / Number(value.denominator);
}

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function normalize(value: Fraction): Fraction {
  if (value.denominator === 0n) throw new Error('cannot divide by zero');
  const sign = value.denominator < 0n ? -1n : 1n;
  const divisor = gcd(value.numerator, value.denominator);
  return { numerator: sign * value.numerator / divisor, denominator: sign * value.denominator / divisor };
}

function ratioFraction(text: string): Fraction | undefined {
  const ratio = /^(\d+)\/(\d+)$/.exec(text);
  if (!ratio) return undefined;
  const denominator = BigInt(ratio[2]);
  return denominator === 0n ? undefined : normalize({ numerator: BigInt(ratio[1]), denominator });
}

function numericFraction(text: string): Fraction | undefined {
  const numeric = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!numeric) return undefined;
  const fraction = numeric[2] ?? '';
  const exponent = Number(numeric[3] ?? 0);
  const scale = fraction.length - exponent;
  if (!Number.isSafeInteger(scale) || Math.abs(scale) > MAXIMUM_DECIMAL_SCALE) return undefined;
  const digits = BigInt(`${numeric[1]}${fraction}`);
  return scale >= 0
    ? normalize({ numerator: digits, denominator: 10n ** BigInt(scale) })
    : normalize({ numerator: digits * (10n ** BigInt(-scale)), denominator: 1n });
}

export function parseFraction(value: number | string): Fraction | undefined {
  const text = String(value);
  if (text.length > MAXIMUM_THRESHOLD_LENGTH) return undefined;
  return ratioFraction(text) ?? numericFraction(text);
}

export function median(values: Fraction[]): Fraction {
  const sorted = [...values].sort(compareFraction);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : divide(add(sorted[middle - 1], sorted[middle]), { numerator: 2n, denominator: 1n });
}
