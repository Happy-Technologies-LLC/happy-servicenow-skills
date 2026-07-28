#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = [
  'src/mcp-server-consolidated.js',
  'src/docs/tool-definitions.js',
  'src/instance-tools.js'
];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

export async function buildContract(sourceRoot) {
  const packageJson = JSON.parse(await readFile(join(sourceRoot, 'package.json'), 'utf8'));
  const names = [];

  for (const relativePath of sourceFiles) {
    const source = await readFile(join(sourceRoot, relativePath), 'utf8');
    for (const match of source.matchAll(/\bname:\s*['"](SN-[A-Za-z0-9-]+)['"]/g)) names.push(match[1]);
    for (const match of source.matchAll(/\bTOOL_NAME\s*=\s*['"](SN-[A-Za-z0-9-]+)['"]/g)) names.push(match[1]);
  }

  const tools = [...new Set(names)].sort();
  if (tools.length !== names.length) throw new Error('MCP source contains duplicate tool names');

  return {
    schemaVersion: 1,
    package: 'happy-platform-mcp',
    version: packageJson.version,
    source: {
      repository: 'Happy-Technologies-LLC/happy-platform-mcp',
      files: sourceFiles
    },
    tools
  };
}

export function serializeContract(contract) {
  return `${JSON.stringify(contract, null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sourceRoot = resolve(option('--source', join(repositoryRoot, '..', 'happy-platform-mcp')));
  const outputPath = resolve(option('--output', join(repositoryRoot, 'contracts', 'happy-platform-mcp-5.1.0.json')));
  const expected = serializeContract(await buildContract(sourceRoot));

  if (process.argv.includes('--check')) {
    const current = await readFile(outputPath, 'utf8');
    if (current !== expected) {
      console.error(`MCP tool contract is stale: ${outputPath}`);
      process.exitCode = 1;
    } else {
      console.log(`MCP tool contract is current: ${outputPath}`);
    }
  } else {
    await writeFile(outputPath, expected);
    console.log(`Wrote ${JSON.parse(expected).tools.length} tools to ${outputPath}`);
  }
}
