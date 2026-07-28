import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

async function skill(path) {
  return readFile(new URL(`../skills/${path}/SKILL.md`, import.meta.url), 'utf8');
}

describe('encoded query semantic corrections', () => {
  test('health and safety summary includes every recent incident type', async () => {
    const markdown = await skill('hrsd/health-safety-summarization');
    expect(markdown).toMatch(/query: sys_created_on>=javascript:gs\.daysAgoStart\(30\)\s*$/m);
    expect(markdown).not.toMatch(/query: .*incident_typeINnear_miss,first_aid/);
  });

  test('broader CSM similarity search retains resolved constraints and text similarity', async () => {
    const markdown = await skill('csm/chat-recommendation');
    expect(markdown).toMatch(
      /query: short_descriptionLIKE\[key_terms\]\^stateIN6,7\^resolution_codeISNOTEMPTY\^ORDERBYDESCclosed_at/
    );
  });

  test('incident sentiment uses a rolling 24-hour cutoff', async () => {
    const markdown = await skill('itsm/incident-sentiment');
    expect(markdown).toMatch(
      /query: active=true\^priorityIN1,2\^sys_updated_on>=javascript:gs\.hoursAgo\(24\)/
    );
    expect(markdown).not.toMatch(/sys_updated_onONLast 24 hours/);
  });
});
