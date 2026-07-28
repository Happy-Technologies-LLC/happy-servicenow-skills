import { afterEach, describe, expect, test } from '@jest/globals';
import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { SkillValidator } from '../src/validator.js';

const temporaryRoots = [];

function skill({
  name = 'sample-skill',
  version = '1.0.0',
  description = 'A valid sample skill.',
  tags = ['sample', 'validation'],
  platforms = ['any'],
  tools = { mcp: ['SN-Query-Table'] },
  sections = [
    '## Overview\n\nExplain the goal.',
    '## Prerequisites\n\n- Read access',
    '## Procedure\n\n1. Query the records and verify the result.',
    '## Best Practices\n\nKeep the operation scoped.'
  ],
  extraFrontmatter = ''
} = {}) {
  const serializedTools = Object.entries(tools)
    .map(([type, values]) => `  ${type}: ${JSON.stringify(values)}`)
    .join('\n');
  return `---
name: ${name}
version: ${version}
description: ${description}
author: Happy Technologies LLC
tags: ${JSON.stringify(tags)}
platforms: ${JSON.stringify(platforms)}
tools:
${serializedTools}
complexity: beginner
estimated_time: 1-5 minutes
${extraFrontmatter}---

# Sample Skill

${sections.join('\n\n')}
`;
}

async function temporarySkillsRoot() {
  const root = await mkdtemp(join(tmpdir(), 'skill-validator-'));
  temporaryRoots.push(root);
  return join(root, 'skills');
}

async function writeSkill(skillsRoot, skillPath, content) {
  const directory = join(skillsRoot, skillPath);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'SKILL.md'), content);
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map(root =>
    rm(root, { recursive: true, force: true })));
});

describe('canonical skill integrity contract', () => {
  test.each([
    '1.0',
    '1.0.0.1',
    '1.0.0beta',
    '1.0.0-alpha',
    '01.0.0',
    '1.01.0',
    '1.0.01'
  ])('rejects non-release semver %s as an error', version => {
    const result = new SkillValidator().validate(
      skill({ version }),
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:3:.*version.*semantic version/i);
  });

  test.each(['0.0.0', '1.2.3', '10.20.30'])('accepts exact release semver %s', version => {
    const result = new SkillValidator().validate(
      skill({ version }),
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.errors).toEqual([]);
  });

  test('requires the frontmatter name to match its skill directory slug', () => {
    const result = new SkillValidator().validate(
      skill({ name: 'different-name' }),
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.errors.join('\n')).toMatch(
      /skills\/demo\/sample-skill\/SKILL\.md:2:.*different-name.*sample-skill/
    );
  });

  test.each([
    ['empty', ''],
    ['non-string', '123'],
    ['200 characters', 'x'.repeat(200)]
  ])('rejects an invalid description: %s', (_label, description) => {
    const content = skill({ description });
    const result = new SkillValidator().validate(
      content,
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:4:.*description/i);
  });

  test.each([
    ['not an array', 'tags: sample'],
    ['empty array', 'tags: []'],
    ['uppercase entry', 'tags: [sample, RAG]'],
    ['space-containing entry', 'tags: [sample, two words]'],
    ['empty entry', 'tags: [sample, ""]']
  ])('rejects invalid tags: %s', (_label, tagsLine) => {
    const content = skill().replace('tags: ["sample","validation"]', tagsLine);
    const result = new SkillValidator().validate(
      content,
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:6:.*tags/i);
  });

  test.each([
    ['not an array', 'platforms: any'],
    ['empty array', 'platforms: []'],
    ['unknown platform', 'platforms: [unknown]'],
    ['non-string platform', 'platforms: [42]']
  ])('rejects invalid platforms: %s', (_label, platformsLine) => {
    const content = skill().replace('platforms: ["any"]', platformsLine);
    const result = new SkillValidator().validate(
      content,
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:7:.*platforms/i);
  });

  test.each([
    ['null tools', 'tools: null'],
    ['non-object tools', 'tools: []'],
    ['empty tools object', 'tools: {}'],
    ['unknown tool type', 'tools:\n  mystery: ["value"]'],
    ['non-array tool list', 'tools:\n  native: Bash'],
    ['empty tool list', 'tools:\n  native: []'],
    ['empty tool entry', 'tools:\n  native: [""]'],
    ['non-string tool entry', 'tools:\n  native: [42]']
  ])('rejects an invalid tools shape: %s', (_label, toolsBlock) => {
    const content = skill().replace(
      'tools:\n  mcp: ["SN-Query-Table"]',
      toolsBlock
    );
    const result = new SkillValidator().validate(
      content,
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:8:.*tools/i);
  });

  test.each(['Overview', 'Prerequisites', 'Procedure'])(
    'requires a nonempty ## %s section',
    sectionName => {
      const sections = [
        '## Overview\n\nExplain the goal.',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Query the records and verify the result.'
      ].filter(section => !section.startsWith(`## ${sectionName}`));
      const result = new SkillValidator().validate(
        skill({ sections }),
        'demo/sample-skill',
        { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
      );
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(new RegExp(`required section.*${sectionName}`, 'i'));
    }
  );

  test('reports a skill directory that is missing SKILL.md', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await mkdir(join(skillsRoot, 'demo', 'missing-skill'), { recursive: true });
    await writeSkill(skillsRoot, 'demo/sample-skill', skill());

    const results = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });

    expect(results.find(result => result.path === 'demo/missing-skill')).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining([
          expect.stringMatching(/missing-skill\/SKILL\.md:1:.*missing required skill file/i)
        ])
      })
    );
  });

  test('accepts existing local links and category, relative, and slug related-skill forms', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/target-skill', skill({ name: 'target-skill' }));
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nRead the [target skill](../target-skill/SKILL.md).',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Query the records and verify the result.',
        '## Related Skills\n\n- `target-skill`\n- `demo/target-skill`\n- [Target](../target-skill/SKILL.md)'
      ]
    }));

    const results = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });

    expect(results.flatMap(result => result.errors)).toEqual([]);
  });

  test('rejects broken local Markdown links and Related Skills targets with line diagnostics', async () => {
    const skillsRoot = await temporarySkillsRoot();
    const content = skill({
      sections: [
        '## Overview\n\nRead the [missing guide](references/missing.md).',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Query the records and verify the result.',
        '## Related Skills\n\n- `demo/missing-skill`'
      ]
    });
    await writeSkill(skillsRoot, 'demo/sample-skill', content);

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });

    const linkLine = content.slice(0, content.indexOf('[missing guide]')).split('\n').length;
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(
      new RegExp(`SKILL\\.md:${linkLine}:.*broken local Markdown link.*references/missing\\.md`, 'i')
    );
    expect(result.errors.join('\n')).toMatch(/SKILL\.md:\d+:.*unknown related skill.*demo\/missing-skill/i);
  });

  test('requires a Related Skills Markdown link to resolve to a catalog skill', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nExplain the goal.',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Query the records and verify the result.',
        '## Related Skills\n\n- [Existing non-skill note](notes.md)'
      ]
    }));
    await writeFile(join(skillsRoot, 'demo', 'sample-skill', 'notes.md'), '# Notes\n');

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(
      /SKILL\.md:\d+:.*Related Skills Markdown link does not resolve to a catalog skill.*notes\.md/i
    );
  });
});
