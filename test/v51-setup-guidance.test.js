import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

const files = {
  installation: 'skills/development/mcp-server-installation/SKILL.md',
  instances: 'skills/admin/instance-management/SKILL.md',
  docsOnly: 'skills/development/servicenow-docs-mcp/SKILL.md',
  server: 'skills/development/mcp-server/SKILL.md',
  crud: 'skills/admin/generic-crud-operations/SKILL.md',
  authoring: 'docs/CREATING_SKILLS.md'
};

const contents = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([name, path]) => [
    name,
    await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  ])
));

describe('Happy Platform MCP v5.1 setup guidance', () => {
  test.each(Object.entries(contents))('%s contains no secret-bearing examples', (_name, markdown) => {
    const forbidden = [
      /Authorization\s*:/i,
      /curl[^\n]*(?:\s-u\s|--user\b)/i,
      /["'](?:password|clientSecret|client_secret|access_token|token)["']\s*:/i,
      /["'][^"'\n]*(?:PASSWORD|CLIENT_SECRET|ACCESS_TOKEN|API_TOKEN)[^"'\n]*["']\s*:/i,
      /^\s*(?:password|clientSecret|client_secret|access_token|token)\s*:/im,
      /\bexport\s+\w*(?:PASSWORD|SECRET|TOKEN)\w*=/i,
      /\b\w*(?:PASSWORD|CLIENT_SECRET|ACCESS_TOKEN|API_TOKEN)\w*\s*=/i,
      /client_secret\s*=/i
    ];

    for (const pattern of forbidden) {
      expect(markdown).not.toMatch(pattern);
    }
  });

  test('installation documents the supported local CLI and storage model', () => {
    expect(contents.installation).toMatch(/Node(?:\.js)?\s*(?:version\s*)?>=\s*20/i);
    for (const command of ['add', 'list', 'update', 'remove', 'test', 'migrate']) {
      expect(contents.installation).toContain(`happy-platform-mcp instance ${command}`);
    }
    expect(contents.installation).toContain('happy-platform-mcp instance credential set');
    expect(contents.installation).toContain('~/.config/happy-platform-mcp/instances.json');
    expect(contents.installation).toContain('HAPPY_CONFIG_PATH');
    expect(contents.installation).toMatch(/masked prompts?/i);
    expect(contents.installation).toMatch(/OS keychain/i);
    expect(contents.installation).toMatch(/remove[^\n]+re-add/i);
    expect(contents.installation).toMatch(/read-only legacy migration input/i);
    expect(contents.installation).toMatch(/leaves? the legacy source untouched/i);
  });

  test('installation covers the four v5.1 authentication choices', () => {
    for (const authMode of ['Basic', 'client_credentials', 'OAuth password', 'authorization_code']) {
      expect(contents.installation).toContain(authMode);
    }
    expect(contents.installation).toMatch(/authorization_code[^\n]+zero-static-secret/i);
  });

  test('docs-only and registration guidance reflects v5.1 behavior and caveats', () => {
    const guidance = `${contents.installation}\n${contents.docsOnly}`;
    expect(guidance).toContain('HAPPY_MCP_DOCS_ONLY=true');
    expect(guidance).not.toMatch(/recommend[^\n]*--docs-only/i);
    expect(guidance).toMatch(/automatic(?:ally)?[^\n]*docs-only/i);
    expect(guidance).toMatch(/metadata-only[^\n]*SN-Register-Instance|SN-Register-Instance[^\n]*metadata-only/i);
    expect(guidance).toMatch(/rejects? secret fields?/i);
    expect(guidance).toMatch(/live reload/i);
    expect(guidance).toMatch(/restart[^\n]*docs-only/i);
    expect(guidance).toMatch(/externally preprovisioned deterministic keychain refs?/i);
  });

  test('instance routing uses the live v5.1 tools and concurrency semantics', () => {
    expect(contents.instances).not.toContain('SN-List-Instances');
    expect(contents.instances).toContain('SN-Set-Instance');
    expect(contents.instances).toContain('SN-Get-Current-Instance');
    expect(contents.instances).toMatch(/parameterless[^\n]*SN-Set-Instance|SN-Set-Instance[^\n]*parameterless/i);
    expect(contents.instances).toMatch(/session(?:'s)?[^\n]*implicit target/i);
    expect(contents.instances).toMatch(/explicit[^\n]*instance[^\n]*(?:concurrent|critical)/i);
  });

  test('touched MCP tool names use the live v5.1 aliases', () => {
    const guidance = Object.values(contents).join('\n');
    expect(guidance).not.toMatch(/\bSN-Read-Record\b/);
    expect(guidance).not.toMatch(/\bSN-NL-Search\b/);
  });
});
