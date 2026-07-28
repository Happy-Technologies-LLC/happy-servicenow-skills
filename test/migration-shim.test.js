import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const repositoryRoot = new URL('..', import.meta.url).pathname;
const shimRoot = new URL('../migration/happy-servicenow-skills', import.meta.url).pathname;
let consumerDir;
let shimPackResult;

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

beforeAll(async () => {
  consumerDir = await mkdtemp(join(tmpdir(), 'happy-servicenow-skills-shim-'));
  const packagePack = run('npm', ['pack', '--json', '--pack-destination', consumerDir], repositoryRoot);
  const shimPack = run('npm', ['pack', '--json', '--pack-destination', consumerDir], shimRoot);
  expect(packagePack.status).toBe(0);
  expect(shimPack.status).toBe(0);
  const packageTarball = JSON.parse(packagePack.stdout)[0].filename;
  shimPackResult = JSON.parse(shimPack.stdout)[0];
  const shimTarball = shimPackResult.filename;
  expect(run('npm', ['init', '--yes'], consumerDir).status).toBe(0);
  expect(run('npm', [
    'install', '--ignore-scripts', '--no-audit', '--no-fund',
    join(consumerDir, packageTarball), join(consumerDir, shimTarball)
  ], consumerDir).status).toBe(0);
}, 60_000);

afterAll(async () => {
  await rm(consumerDir, { recursive: true, force: true });
});

describe('happy-servicenow-skills migration shim', () => {
  test('packs and installs the deliverable 1.2.1 compatibility release', async () => {
    const installedPackageJson = JSON.parse(await readFile(
      new URL('node_modules/happy-servicenow-skills/package.json', `file://${consumerDir}/`),
      'utf8'
    ));

    expect(shimPackResult.version).toBe('1.2.1');
    expect(installedPackageJson.version).toBe('1.2.1');
    expect(shimPackResult.files.map(file => file.path)).toContain('loader.js');
  });

  test('re-exports the supported loader subpath through a local module', async () => {
    const packageJson = JSON.parse(
      await readFile(new URL('../migration/happy-servicenow-skills/package.json', import.meta.url), 'utf8')
    );
    const result = run(process.execPath, [
      '--input-type=module',
      '--eval',
      "import Loader, { SkillLoader } from 'happy-servicenow-skills/loader'; console.log(Loader === SkillLoader);"
    ], consumerDir);

    expect(packageJson.exports['./loader']).toBe('./loader.js');
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('true');
    expect(result.stderr).toBe('');
  });

  test('forwards the legacy CLI to the exported current CLI', () => {
    const result = run(process.execPath, [
      join(consumerDir, 'node_modules', 'happy-servicenow-skills', 'cli.js'),
      '--version'
    ], consumerDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('2.4.0');
    expect(result.stderr).toContain('[DEPRECATED]');
  });
});
