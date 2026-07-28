import { describe, expect, jest, test } from '@jest/globals';
import * as actualFs from 'fs/promises';

const readdir = jest.fn(actualFs.readdir);

jest.unstable_mockModule('fs/promises', () => ({ ...actualFs, readdir }));

const { SkillRegistry } = await import('../src/registry.js');

describe('SkillRegistry.discover failure recovery', () => {
  test('allows discovery to retry after an in-flight failure', async () => {
    const registry = new SkillRegistry();
    readdir.mockRejectedValueOnce(new Error('temporary discovery failure'));

    await expect(registry.discover()).rejects.toThrow('temporary discovery failure');
    await expect(registry.discover()).resolves.toBeUndefined();

    expect(registry.discovered).toBe(true);
    expect(registry.getStats().totalSkills).toBe(184);
  });
});
