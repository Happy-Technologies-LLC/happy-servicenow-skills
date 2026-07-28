import { describe, expect, test } from '@jest/globals';
import { spawnSync } from 'child_process';

describe('published package smoke test', () => {
  test('verifies the tarball manifest and a clean consumer install', () => {
    const result = spawnSync(process.execPath, ['scripts/verify-package.mjs'], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    });

    expect({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr
    }).toEqual(expect.objectContaining({
      status: 0,
      stderr: ''
    }));
    expect(result.stdout).toContain('Package verification passed');
  }, 60_000);
});
