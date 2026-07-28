import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

describe('MCP v5.1 natural-language documentation contract', () => {
  test('ships parser-verified atomic fixtures', async () => {
    const fixture = JSON.parse(await readFile(
      new URL('../contracts/happy-platform-mcp-5.1.0-natural-language.json', import.meta.url),
      'utf8'
    ));
    expect(fixture.version).toBe('5.1.0');
    expect(fixture.source).toBe('src/natural-language.js');
    expect(fixture.supported.length).toBeGreaterThanOrEqual(12);
    for (const entry of fixture.supported) {
      expect(entry).toEqual(expect.objectContaining({
        query: expect.any(String),
        table: expect.any(String),
        encodedQuery: expect.any(String)
      }));
      expect(entry.encodedQuery.length).toBeGreaterThan(0);
    }
  });

  test('skill only claims source-supported patterns and routes precision cases to encoded queries', async () => {
    const markdown = await readFile(
      new URL('../skills/itsm/natural-language-queries/SKILL.md', import.meta.url),
      'utf8'
    );
    for (const unsupportedClaim of [
      /priority is 1/i,
      /not equals/i,
      /STARTSWITH/i,
      /ENDSWITH/i,
      /NOTLIKE/i,
      /assigned to is empty/i,
      /sort by|order by/i
    ]) {
      expect(markdown).not.toMatch(unsupportedClaim);
    }
    expect(markdown).toMatch(/SN-Query-Table/);
    expect(markdown).toMatch(/encoded quer/i);
    expect(markdown).toMatch(/parser-verified/i);
  });
});
