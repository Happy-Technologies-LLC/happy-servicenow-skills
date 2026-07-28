import { afterEach, describe, expect, test } from '@jest/globals';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SkillLoader } from '../src/loader.js';

const testPaths = [];
const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');

afterEach(async () => {
  await Promise.all(testPaths.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('SkillLoader.load', () => {
  test('loads a normal category/name skill path', async () => {
    const skill = await SkillLoader.load('itsm/incident-triage');

    expect(skill.path).toBe('itsm/incident-triage');
    expect(skill.category).toBe('itsm');
    expect(skill.name).toBeTruthy();
  });

  test('rejects an in-catalog symlink whose canonical target is outside the skills directory', async () => {
    const outsideDir = await mkdtemp(join(tmpdir(), 'happy-platform-skills-loader-'));
    const categoryDir = join(skillsDir, `loader-test-${process.pid}`);
    const linkedSkill = join(categoryDir, 'outside-link');
    testPaths.push(categoryDir, outsideDir);

    await writeFile(join(outsideDir, 'SKILL.md'), [
      '---',
      'name: outside-link',
      'version: 1.0.0',
      'description: Must not load',
      '---',
      '## Procedure',
      'This content lives outside the published skills catalog.'
    ].join('\n'));
    await mkdir(categoryDir);
    await symlink(outsideDir, linkedSkill, 'dir');

    await expect(
      SkillLoader.load(`loader-test-${process.pid}/outside-link`)
    ).rejects.toThrow('outside the skills directory');
  });
});
