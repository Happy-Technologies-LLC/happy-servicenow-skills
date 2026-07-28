import { describe, expect, test } from '@jest/globals';

describe('package skill path verification', () => {
  test('rejects equal-sized source and package sets with different paths', async () => {
    const verificationModule = import('../scripts/package-verification-lib.mjs');
    await expect(verificationModule).resolves.toEqual(expect.objectContaining({
      assertSameSkillPaths: expect.any(Function)
    }));

    const { assertSameSkillPaths } = await verificationModule;
    expect(() => assertSameSkillPaths(
      new Set(['itsm/incident-triage', 'admin/application-scope']),
      new Set(['itsm/incident-triage', 'admin/not-a-real-skill'])
    )).toThrow(/missing.*admin\/application-scope.*unexpected.*admin\/not-a-real-skill/is);
  });
});
