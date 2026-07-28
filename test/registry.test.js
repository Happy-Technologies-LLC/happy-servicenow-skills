import { describe, expect, test } from '@jest/globals';
import { SkillRegistry } from '../src/registry.js';

function snapshotIndexes(registry) {
  return Object.fromEntries(
    Object.entries(registry.index).map(([indexName, index]) => [
      indexName,
      Object.fromEntries(
        [...index.entries()].map(([key, values]) => [key, [...values]])
      )
    ])
  );
}

describe('SkillRegistry.discover', () => {
  test('is idempotent across repeated discovery', async () => {
    const registry = new SkillRegistry();
    await registry.discover();
    const firstSkills = registry.getAll();
    const firstStats = registry.getStats();
    const firstIndexes = snapshotIndexes(registry);

    await registry.discover();

    expect(registry.getAll()).toEqual(firstSkills);
    expect(registry.getStats()).toEqual(firstStats);
    expect(snapshotIndexes(registry)).toEqual(firstIndexes);
  });
});
