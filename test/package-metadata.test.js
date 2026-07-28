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

describe('2.4.0 package metadata', () => {
  test('ships the canonical root skill with synchronized release metadata', async () => {
    const rootSkill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');

    expect(packageJson.version).toBe('2.4.0');
    expect(packageJson.files).toContain('SKILL.md');
    expect(packageJson.files).toContain('CHANGELOG.md');
    expect(rootSkill).toMatch(/^version: 2\.4\.0$/m);
    expect(rootSkill).toMatch(/184 skills across 23 categories/);
    expect(rootSkill).toMatch(/exactly 55 live MCP tools/);
    expect(rootSkill).toMatch(/six docs-only tools/);
  });
});
