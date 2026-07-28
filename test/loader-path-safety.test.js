import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const readFile = jest.fn();
const realpath = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({ readFile, realpath }));

const { SkillLoader } = await import('../src/loader.js');

describe('SkillLoader.load path confinement', () => {
  beforeEach(() => {
    readFile.mockReset();
    realpath.mockReset();
  });

  test.each([
    ['traversal', '../outside'],
    ['absolute path', '/tmp/outside'],
    ['category-only path', 'itsm'],
    ['extra path segment', 'itsm/incident-triage/extra'],
    ['empty segment', 'itsm//incident-triage'],
    ['non-string input', null]
  ])('rejects %s before reading the filesystem', async (_label, skillPath) => {
    await expect(SkillLoader.load(skillPath)).rejects.toThrow('Invalid skill path');
    expect(readFile).not.toHaveBeenCalled();
    expect(realpath).not.toHaveBeenCalled();
  });
});
