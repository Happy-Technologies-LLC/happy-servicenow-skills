#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, cwd = repositoryRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error([
      `Command failed (${result.status}): ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }

  return result.stdout.trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'happy-platform-skills-package-'));

try {
  const packOutput = run('npm', ['pack', '--json', '--pack-destination', temporaryRoot]);
  const [packResult] = JSON.parse(packOutput);
  const packagedPaths = new Set(packResult.files.map(file => file.path));
  const tarballPath = join(temporaryRoot, packResult.filename);

  const requiredPaths = [
    'package.json',
    'README.md',
    'LICENSE',
    'NOTICE',
    'src/index.js',
    'src/loader.js',
    'src/registry.js',
    'src/validator.js',
    'src/cli.js',
    'scripts/verify-package.mjs',
    'skills/itsm/incident-triage/SKILL.md',
    'skills/development/fluent-sdk/vendor/now-sdk-explain.md'
  ];

  for (const requiredPath of requiredPaths) {
    assert(packagedPaths.has(requiredPath), `Package is missing required path: ${requiredPath}`);
  }
  assert(!packagedPaths.has('SKILL.md'), 'Root SKILL.md must remain excluded until its package policy is decided');

  const packagedSkillCount = [...packagedPaths]
    .filter(path => /^skills\/[^/]+\/[^/]+\/SKILL\.md$/.test(path))
    .length;
  assert(packagedSkillCount > 0, 'Package contains no discoverable skills');

  const consumerDir = join(temporaryRoot, 'consumer');
  await mkdir(consumerDir);
  run('npm', ['init', '--yes'], consumerDir);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarballPath], consumerDir);

  const installedPackageJson = JSON.parse(
    await readFile(join(consumerDir, 'node_modules', 'happy-platform-skills', 'package.json'), 'utf8')
  );
  assert(installedPackageJson.dependencies['js-yaml'] === '3.15.0', 'Published package must pin js-yaml 3.15.0');

  const dependencyTree = JSON.parse(run('npm', ['ls', 'js-yaml', '--all', '--json'], consumerDir));
  const installedJsYaml = dependencyTree.dependencies?.['happy-platform-skills']?.dependencies?.['js-yaml'];
  assert(installedJsYaml?.version === '3.15.0', 'Clean consumer did not resolve js-yaml 3.15.0');

  run(process.execPath, [
    '--input-type=module',
    '--eval',
    "const pkg = await import('happy-platform-skills'); if (!pkg.SkillLoader || !pkg.SkillRegistry || !pkg.SkillValidator) process.exit(1);"
  ], consumerDir);

  const binDir = join(consumerDir, 'node_modules', '.bin');
  const hpsBin = join(binDir, 'hps');
  const legacyBin = join(binDir, 'sn-skills');
  await access(hpsBin);
  await access(legacyBin);
  assert(run(hpsBin, ['--version'], consumerDir) === installedPackageJson.version, 'hps version output is incorrect');
  assert(run(legacyBin, ['--version'], consumerDir) === installedPackageJson.version, 'sn-skills version output is incorrect');

  const listedSkills = JSON.parse(run(hpsBin, ['list', '--json'], consumerDir));
  assert(listedSkills.length === packagedSkillCount,
    `CLI discovered ${listedSkills.length} skills; package contains ${packagedSkillCount}`);

  console.log(`Package verification passed: ${packResult.entryCount} files, ${packagedSkillCount} skills`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
