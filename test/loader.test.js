import { describe, expect, test } from '@jest/globals';
import { SkillLoader } from '../src/loader.js';

describe('SkillLoader.load', () => {
  test('loads a normal category/name skill path', async () => {
    const skill = await SkillLoader.load('itsm/incident-triage');

    expect(skill.path).toBe('itsm/incident-triage');
    expect(skill.category).toBe('itsm');
    expect(skill.name).toBeTruthy();
  });
});
