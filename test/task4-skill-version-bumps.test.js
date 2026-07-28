import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';
import matter from 'gray-matter';

function compareSemver(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

async function versionContract() {
  return JSON.parse(await readFile(
    new URL('../contracts/task4-skill-version-baseline.json', import.meta.url),
    'utf8'
  ));
}

async function olderVersionFailures(skills) {
  const failures = [];
  for (const { path, version: base } of skills) {
    const current = matter(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).data.version;
    if (compareSemver(current, base) <= 0) failures.push(`${path}: ${base} -> ${current}`);
  }
  return failures;
}

describe('Task 4 skill version migration', () => {
  test('every changed skill is newer than its Task 4 base version', async () => {
    const { schemaVersion, task4 } = await versionContract();
    expect(schemaVersion).toBe(1);
    expect(task4.base).toBe('b5462ef');
    expect(task4.skills).toHaveLength(130);
    expect(new Set(task4.skills.map(skill => skill.path)).size).toBe(130);
    expect(await olderVersionFailures(task4.skills)).toEqual([]);
  });

  test('every semantic-rewrite skill receives another patch bump', async () => {
    const { semanticRewrite } = await versionContract();
    expect(semanticRewrite.base).toBe('c08c48a');
    expect(semanticRewrite.skills).toHaveLength(42);
    expect(new Set(semanticRewrite.skills.map(skill => skill.path)).size).toBe(42);
    expect(await olderVersionFailures(semanticRewrite.skills)).toEqual([]);
  });

  test('quality-corrected skills receive another patch bump', async () => {
    const { qualityCorrections } = await versionContract();
    expect(qualityCorrections.base).toBe('4ee7b1e');
    expect(qualityCorrections.skills).toHaveLength(3);
    expect(await olderVersionFailures(qualityCorrections.skills)).toEqual([]);
  });
});
