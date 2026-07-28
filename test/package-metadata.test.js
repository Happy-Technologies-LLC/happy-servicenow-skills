import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

describe('published dependency safety', () => {
  test('pins a non-vulnerable js-yaml version as a direct production dependency', () => {
    expect(packageJson.dependencies['js-yaml']).toBe('3.15.0');
    expect(packageJson.overrides).toBeUndefined();
  });

  test('ships the package verification script referenced by npm scripts', () => {
    expect(packageJson.files).toContain('scripts/verify-package.mjs');
  });
});
