import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PYTHON_EVIDENCE_FILES = [
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  '.python-version',
  'environment.yml',
  'Pipfile',
  'poetry.lock',
  'uv.lock',
];

function hasPythonEvidence(cwd: string): boolean {
  return PYTHON_EVIDENCE_FILES.some((file) => existsSync(join(cwd, file)));
}

function hasAngularEvidence(cwd: string): boolean {
  if (existsSync(join(cwd, 'angular.json'))) return true;

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = readPackageJson(packageJsonPath);
    return !!(pkg?.dependencies?.['@angular/core'] || pkg?.devDependencies?.['@angular/core']);
  }
  return false;
}

export function detectRuleCategories(cwd: string): string[] {
  const categories: string[] = [];
  if (hasAngularEvidence(cwd)) categories.push('angular');
  if (hasPythonEvidence(cwd)) categories.push('python');
  return categories.sort();
}

export function parseRuleCategories(value: string | undefined, cwd: string): string[] {
  if (!value || value === 'none') return [];
  if (value === 'auto') return detectRuleCategories(cwd);
  return Array.from(new Set(value.split(',').map((category) => category.trim()).filter(Boolean))).sort();
}

function readPackageJson(path: string): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}
