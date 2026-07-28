import { describe, expect, jest, test } from '@jest/globals';
import * as actualFs from 'fs/promises';

const readdir = jest.fn(actualFs.readdir);

jest.unstable_mockModule('fs/promises', () => ({ ...actualFs, readdir }));

const { SkillRegistry } = await import('../src/registry.js');

describe('SkillRegistry.discover failure recovery', () => {
  test('keeps the last complete snapshot when a refresh fails', async () => {
    const registry = new SkillRegistry();
    await registry.discover();
    const skillsBeforeFailure = registry.getAll();
    const statsBeforeFailure = registry.getStats();

    readdir.mockRejectedValueOnce(new Error('temporary refresh failure'));

    await expect(registry.discover()).rejects.toThrow('temporary refresh failure');
    expect(registry.getAll()).toEqual(skillsBeforeFailure);
    expect(registry.getStats()).toEqual(statsBeforeFailure);
    expect(registry.discovered).toBe(true);
  });

  test('allows discovery to retry after an in-flight failure', async () => {
    const registry = new SkillRegistry();
    readdir.mockRejectedValueOnce(new Error('temporary discovery failure'));

    await expect(registry.discover()).rejects.toThrow('temporary discovery failure');
    await expect(registry.discover()).resolves.toBeUndefined();

    expect(registry.discovered).toBe(true);
    expect(registry.getStats().totalSkills).toBe(184);
  });
});
