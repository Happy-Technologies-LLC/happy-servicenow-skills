import { describe, expect, test } from '@jest/globals';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'fs/promises';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { SkillValidator } from '../src/validator.js';

const contractUrl = new URL('../contracts/happy-platform-mcp-5.1.0.json', import.meta.url);
const contract = JSON.parse(await readFile(contractUrl, 'utf8'));

function skill({ tools = ['SN-Query-Table'], body = 'Tool: SN-Query-Table' } = {}) {
  return `---
name: contract-fixture
version: 1.0.0
description: Contract fixture
tools:
  mcp: [${tools.join(', ')}]
---

## Procedure

${body}

This procedure contains enough detail to satisfy the fixture validator.
`;
}

describe('Happy Platform MCP v5.1.0 tool contract', () => {
  test('contains exactly 55 unique tools and source metadata', () => {
    expect(contract.schemaVersion).toBe(1);
    expect(contract.package).toBe('happy-platform-mcp');
    expect(contract.version).toBe('5.1.0');
    expect(contract.source).toEqual(expect.objectContaining({
      repository: 'Happy-Technologies-LLC/happy-platform-mcp',
      files: expect.arrayContaining([
        'src/mcp-server-consolidated.js',
        'src/docs/tool-definitions.js',
        'src/instance-tools.js'
      ])
    }));
    expect(contract.tools).toHaveLength(55);
    expect(new Set(contract.tools).size).toBe(55);
    expect(contract.tools).toContain('SN-Register-Instance');
    expect(contract.tools.filter(name => name.startsWith('SN-Docs-'))).toHaveLength(5);
  });

  test('rejects an unsupported frontmatter MCP tool with path and name', () => {
    const result = new SkillValidator().validate(
      skill({ tools: ['SN-Query-Table', 'SN-Imaginary-Tool'] }),
      'fixtures/unsupported-frontmatter'
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/fixtures\/unsupported-frontmatter.*SN-Imaginary-Tool/);
  });

  test.each([
    ['Tool declaration', 'Tool: SN-Imaginary-Tool'],
    ['exact invocation', 'SN-Imaginary-Tool({ table_name: "incident" })'],
    ['exact inline reference', 'Use `SN-Imaginary-Tool` for this operation.']
  ])('rejects unsupported body %s with path and name', (_label, body) => {
    const result = new SkillValidator().validate(skill({ body }), 'fixtures/unsupported-body');
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/fixtures\/unsupported-body.*SN-Imaginary-Tool/);
  });

  test('accepts supported frontmatter and operative body tools', () => {
    const result = new SkillValidator().validate(skill({
      tools: ['SN-Get-Record', 'SN-Natural-Language-Search', 'SN-Docs-Search'],
      body: [
        'Tool: SN-Get-Record',
        'SN-Natural-Language-Search({ table_name: "incident", query: "active incidents" })',
        'Tool: SN-Docs-Search'
      ].join('\n')
    }), 'fixtures/supported');
    expect(result.errors).toEqual([]);
  });

  test('the complete catalog, root skill, README, and authoring docs satisfy the contract', async () => {
    const results = await SkillValidator.validateAll({ includeContractDocuments: true });
    const validatedPaths = results.map(result => result.path);
    expect(validatedPaths).toEqual(expect.arrayContaining([
      'SKILL.md',
      'README.md',
      'docs/CREATING_SKILLS.md',
      'docs/RELEASING.md',
      'docs/SKILL_SPEC.md'
    ]));
    const contractErrors = results.flatMap(result => result.errors
      .filter(error => /Unsupported MCP tool/.test(error))
      .map(error => `${result.path}: ${error}`));
    expect(contractErrors).toEqual([]);
  });

  test('refresh script deterministically generates and checks a contract', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'mcp-contract-'));
    try {
      const sourceRoot = join(temporaryRoot, 'mcp');
      await mkdir(join(sourceRoot, 'src', 'docs'), { recursive: true });
      await writeFile(join(sourceRoot, 'package.json'), JSON.stringify({ version: '5.1.0' }));
      await writeFile(join(sourceRoot, 'src', 'mcp-server-consolidated.js'), "({ name: 'SN-Zeta' });\n({ name: 'SN-Alpha' });\n");
      await writeFile(join(sourceRoot, 'src', 'docs', 'tool-definitions.js'), "({ name: 'SN-Docs-One' });\n");
      await writeFile(join(sourceRoot, 'src', 'instance-tools.js'), "const TOOL_NAME = 'SN-Register-Instance';\n");
      const output = join(temporaryRoot, 'contract.json');
      const script = new URL('../scripts/refresh-mcp-tool-contract.mjs', import.meta.url);

      const refresh = spawnSync(process.execPath, [script.pathname, '--source', sourceRoot, '--output', output], { encoding: 'utf8' });
      expect(refresh.status).toBe(0);
      const generated = JSON.parse(await readFile(output, 'utf8'));
      expect(generated.tools).toEqual(['SN-Alpha', 'SN-Docs-One', 'SN-Register-Instance', 'SN-Zeta']);

      const check = spawnSync(process.execPath, [script.pathname, '--source', sourceRoot, '--output', output, '--check'], { encoding: 'utf8' });
      expect(check.status).toBe(0);
      await writeFile(output, '{}\n');
      const stale = spawnSync(process.execPath, [script.pathname, '--source', sourceRoot, '--output', output, '--check'], { encoding: 'utf8' });
      expect(stale.status).not.toBe(0);
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
