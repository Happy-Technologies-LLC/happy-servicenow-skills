import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'child_process';
import { readFile } from 'fs/promises';
import matter from 'gray-matter';

const task4Base = 'b5462ef';
const semanticRewriteBase = 'c08c48a';

function compareSemver(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

describe('Task 4 skill version migration', () => {
  test('every changed skill is newer than its Task 4 base version', async () => {
    const paths = execFileSync('git', [
      'diff', '--name-only', task4Base, '--', 'skills/*/SKILL.md'
    ], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    expect(paths.length).toBeGreaterThan(100);

    const failures = [];
    for (const path of paths) {
      const base = matter(execFileSync('git', ['show', `${task4Base}:${path}`], { encoding: 'utf8' })).data.version;
      const current = matter(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).data.version;
      if (compareSemver(current, base) <= 0) failures.push(`${path}: ${base} -> ${current}`);
    }
    expect(failures).toEqual([]);
  });

  test('every semantic-rewrite skill receives another patch bump', async () => {
    const paths = execFileSync('git', [
      'diff', '--name-only', semanticRewriteBase, '--', 'skills/*/SKILL.md'
    ], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    expect(paths.length).toBeGreaterThan(30);
    const failures = [];
    for (const path of paths) {
      const base = matter(execFileSync('git', ['show', `${semanticRewriteBase}:${path}`], { encoding: 'utf8' })).data.version;
      const current = matter(await readFile(new URL(`../${path}`, import.meta.url), 'utf8')).data.version;
      if (compareSemver(current, base) <= 0) failures.push(`${path}: ${base} -> ${current}`);
    }
    expect(failures).toEqual([]);
  });
});
