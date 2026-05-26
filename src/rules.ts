import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function detectRuleCategories(cwd: string): string[] {
  const categories = new Set<string>();
  if (existsSync(join(cwd, 'angular.json'))) categories.add('angular');

  const packageJsonPath = join(cwd, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = readPackageJson(packageJsonPath);
    if (pkg?.dependencies?.['@angular/core'] || pkg?.devDependencies?.['@angular/core']) {
      categories.add('angular');
    }
  }

  return Array.from(categories).sort();
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
