import { afterEach, describe, expect, test } from '@jest/globals';
import { mkdir, rm, writeFile } from 'fs/promises';
import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePaths = [];

afterEach(async () => {
  await Promise.all(fixturePaths.splice(0).map(path =>
    rm(path, { recursive: true, force: true })));
});

describe('hps validate <skill-path>', () => {
  test('uses catalog context for local and Related Skills references', async () => {
    const category = `cli-validation-${process.pid}`;
    const skillPath = `${category}/broken-references`;
    const categoryPath = join(repositoryRoot, 'skills', category);
    const sourcePath = join(categoryPath, 'broken-references', 'SKILL.md');
    fixturePaths.push(categoryPath);
    await mkdir(dirname(sourcePath), { recursive: true });
    await writeFile(sourcePath, [
      '---',
      'name: broken-references',
      'version: 1.0.0',
      'description: CLI validation fixture.',
      '---',
      '',
      '## Overview',
      '',
      'Read the [missing guide](references/missing.md).',
      '',
      '## Prerequisites',
      '',
      '- Read access',
      '',
      '## Procedure',
      '',
      '1. Validate the skill and inspect every reported reference.',
      '',
      '## Related Skills',
      '',
      '- `missing-related-skill`',
      ''
    ].join('\n'));

    const result = spawnSync(process.execPath, ['src/cli.js', 'validate', skillPath], {
      cwd: repositoryRoot,
      encoding: 'utf8'
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(
      new RegExp(`${sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:9:.*broken local Markdown link`, 'i')
    );
    expect(result.stdout).toMatch(
      new RegExp(`${sourcePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:21:.*unknown related skill`, 'i')
    );
  });

  test('reports a missing single skill concisely without a stack trace', () => {
    const result = spawnSync(process.execPath, [
      'src/cli.js',
      'validate',
      'missing-category/missing-skill'
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8'
    });

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/Skill not found: missing-category\/missing-skill/);
    expect(`${result.stdout}\n${result.stderr}`).not.toMatch(/\bat SkillValidator\.|src\/validator\.js:\d+/);
  });
});
