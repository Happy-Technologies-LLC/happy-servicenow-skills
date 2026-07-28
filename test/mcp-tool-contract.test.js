import { describe, expect, test } from '@jest/globals';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'fs/promises';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { SkillValidator } from '../src/validator.js';

const contractUrl = new URL('../contracts/happy-platform-mcp-5.1.0.json', import.meta.url);
const contract = JSON.parse(await readFile(contractUrl, 'utf8'));

async function catalogMarkdown() {
  const skillsUrl = new URL('../skills/', import.meta.url);
  const paths = (await readdir(skillsUrl, { recursive: true }))
    .filter(path => path.endsWith('.md'));
  return Promise.all(paths.map(async path => ({
    path: `skills/${path}`,
    content: await readFile(new URL(path, skillsUrl), 'utf8')
  })));
}

function naturalLanguageSearchSchemaErrors(path, markdown) {
  const errors = [];
  for (const match of markdown.matchAll(/^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm)) {
    const lines = match[1].split('\n');
    const baseLine = markdown.slice(0, match.index).split('\n').length;
    let active = null;
    const flush = () => {
      if (!active || active.tool !== 'SN-Natural-Language-Search') return;
      const parameters = active.lines.join('\n');
      if (/^\s*(?:table_name|tables)\s*:/m.test(parameters)) errors.push(`${path}:${active.line}: obsolete table argument`);
      if (!/^\s*table\s*:/m.test(parameters)) errors.push(`${path}:${active.line}: missing table argument`);
    };
    lines.forEach((line, index) => {
      const toolMatch = line.match(/^\s*Tool:\s*(SN-[A-Za-z0-9-]+)\s*$/);
      if (toolMatch) {
        flush();
        active = { tool: toolMatch[1], line: baseLine + index + 1, lines: [] };
      } else if (active) {
        active.lines.push(line);
      }
    });
    flush();
  }

  for (const match of markdown.matchAll(/\bSN-Natural-Language-Search\s*\(([^)]*)\)/g)) {
    const args = match[1];
    const line = markdown.slice(0, match.index).split('\n').length;
    if (/\b(?:table_name|tables)\s*:/.test(args)) errors.push(`${path}:${line}: obsolete inline table argument`);
    if (!/\btable\s*:/.test(args)) errors.push(`${path}:${line}: missing inline table argument`);
  }
  return errors;
}

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
        'SN-Natural-Language-Search({ table: "incident", query: "active incidents" })',
        'Tool: SN-Docs-Search'
      ].join('\n')
    }), 'fixtures/supported');
    expect(result.errors).toEqual([]);
  });

  test('natural-language search examples use the v5.1 table argument', async () => {
    const errors = (await catalogMarkdown()).flatMap(({ path, content }) =>
      naturalLanguageSearchSchemaErrors(path, content));
    expect(errors).toEqual([]);
  });

  test.each([
    ['singular legacy key', '```text\nTool: SN-Natural-Language-Search\nParameters:\n  table_name: incident\n  query: active incidents\n```'],
    ['plural legacy key', '```text\nTool: SN-Natural-Language-Search\nParameters:\n  tables: cmdb_ci\n  query: production servers\n```'],
    ['missing non-incident target', '```text\nTool: SN-Natural-Language-Search\nParameters:\n  query: published knowledge articles\n```'],
    ['legacy inline key', '`SN-Natural-Language-Search({ table_name: "problem", query: "open problems" })`']
  ])('detects natural-language search schema drift: %s', (_label, markdown) => {
    expect(naturalLanguageSearchSchemaErrors('fixture.md', markdown)).not.toEqual([]);
  });

  test('accepts table for non-incident search without flagging an adjacent query-table block', () => {
    const markdown = `\`\`\`text
Tool: SN-Natural-Language-Search
Parameters:
  table: kb_knowledge
  query: published VPN articles

Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
\`\`\`

\`SN-Natural-Language-Search({ table: "problem", query: "open problems" })\``;
    expect(naturalLanguageSearchSchemaErrors('fixture.md', markdown)).toEqual([]);
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
