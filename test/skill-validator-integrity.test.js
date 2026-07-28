import { afterEach, describe, expect, test } from '@jest/globals';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import matter from 'gray-matter';
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
      /skills\/demo\/sample-skill\/SKILL\.md:2:.*different-name.*sample-skill.*demo-sample-skill/
    );
  });

  test('accepts a category-prefixed name derived from the skill path', () => {
    const result = new SkillValidator().validate(
      skill({ name: 'demo-sample-skill' }),
      'demo/sample-skill',
      { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
    );
    expect(result.errors).toEqual([]);
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

  test.each(['complexity:', 'complexity: null', 'complexity: ""'])(
    'rejects an invalid present complexity value: %s',
    complexityLine => {
      const content = skill().replace('complexity: beginner', complexityLine);
      const result = new SkillValidator().validate(
        content,
        'demo/sample-skill',
        { sourcePath: 'skills/demo/sample-skill/SKILL.md' }
      );
      expect(result.errors.join('\n')).toMatch(/SKILL\.md:\d+:.*invalid complexity/i);
    }
  );

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
    await writeSkill(skillsRoot, 'demo/relative-target', skill({ name: 'relative-target' }));
    await writeSkill(skillsRoot, 'demo/category-target', skill({ name: 'category-target' }));
    await writeSkill(skillsRoot, 'demo/slug-target', skill({ name: 'slug-target' }));
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nRead the [target skill](../relative-target/SKILL.md).',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Query the records and verify the result.',
        '## Related Skills\n\n- `slug-target` -- Same-category target\n- `demo/category-target` - Full-path target\n- [Target](../relative-target/SKILL.md)'
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

  test('rejects duplicate frontmatter names across the catalog', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/shared-name', skill({ name: 'shared-name' }));
    await writeSkill(skillsRoot, 'other/shared-name', skill({ name: 'shared-name' }));

    const results = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });

    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.errors.join('\n')).toMatch(/frontmatter name.*shared-name.*globally unique/i);
    }
  });

  test('rejects unsafe, malformed, absolute, escaping, and symlinked local links', async () => {
    const skillsRoot = await temporarySkillsRoot();
    const outsideRoot = await mkdtemp(join(tmpdir(), 'skill-validator-outside-'));
    temporaryRoots.push(outsideRoot);
    const outsideFile = join(outsideRoot, 'outside.md');
    await mkdir(join(skillsRoot, 'demo', 'sample-skill'), { recursive: true });
    await writeFile(outsideFile, '# Outside\n');
    await symlink(outsideFile, join(skillsRoot, 'demo', 'sample-skill', 'linked-outside.md'));
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        [
          '## Overview',
          '',
          '[Absolute](/etc/passwd)',
          '[Escape](../../../../outside.md)',
          '[Symlink](linked-outside.md)',
          '[JavaScript](javascript:alert(1))',
          '[Data](data:text/plain,unsafe)',
          '[File](file:///etc/passwd)',
          '[Encoded](java%73cript:alert(1))',
          '[VBScript](vbscript:msgbox(1))',
          '[Encoded VBScript](vb%73cript:msgbox(1))',
          '[Unknown](custom:resource)',
          '[Encoded unknown](cust%6fm:resource)',
          '[Malformed](bad%E0%A4%A.md)'
        ].join('\n'),
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate every local reference.'
      ]
    }));

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });
    const errors = result.errors.join('\n');
    expect(errors).toMatch(/absolute local Markdown link.*\/etc\/passwd/i);
    expect(errors).toMatch(/local Markdown link escapes.*\.\.\/\.\.\/\.\.\/\.\.\/outside\.md/i);
    expect(errors).toMatch(/local Markdown link resolves outside.*linked-outside\.md/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*javascript:/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*data:/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*file:/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*java%73cript:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*vbscript:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*vb%73cript:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*custom:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*cust%6fm:/i);
    expect(errors).toMatch(/malformed percent-encoding.*bad%E0%A4%A\.md/i);
  });

  test('allows only HTTP and HTTPS external Markdown links', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nRead [HTTP](http://example.com) and [HTTPS](https://example.com).',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Follow the external references safely.'
      ]
    }));

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });
    expect(result.errors).toEqual([]);
  });

  test('validates reference-style links, images, and URI autolinks', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeFile(join(skillsRoot, '..', 'package-lock.json'), '{}\n');
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        [
          '## Overview',
          '',
          '[Full reference][unsafe]',
          '[collapsed][]',
          '[shortcut]',
          '![Image reference][image-unsafe]',
          '[Encoded reference][encoded-unsafe]',
          '[Missing local][missing-local]',
          '[Nonpacked local][nonpacked-local]',
          '<vbscript:autolink-only>',
          '<custom:autolink-only>',
          '<section>Ordinary HTML is not a link.</section>',
          '',
          '[unsafe]: vbscript:msgbox(1)',
          '[collapsed]: custom:resource',
          '[shortcut]: javascript:alert(1)',
          '[image-unsafe]: data:text/plain,unsafe',
          '[encoded-unsafe]: vb%73cript:msgbox(1)',
          '[missing-local]: references/missing.md',
          '[nonpacked-local]: ../../../package-lock.json'
        ].join('\n'),
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate every Markdown link form.'
      ]
    }));

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });
    const errors = result.errors.join('\n');
    expect(errors).toMatch(/unsupported Markdown URI scheme.*vbscript:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*custom:/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*javascript:/i);
    expect(errors).toMatch(/unsafe Markdown link scheme.*data:/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*vb%73cript:/i);
    expect(errors).toMatch(/broken local Markdown link.*references\/missing\.md/i);
    expect(errors).toMatch(/not included in the package.*package-lock\.json/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*vbscript:autolink-only/i);
    expect(errors).toMatch(/unsupported Markdown URI scheme.*custom:autolink-only/i);
    expect(errors).not.toMatch(/section>Ordinary HTML/i);
  });

  test('accepts HTTP, HTTPS, and packaged local reference links and autolinks', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        [
          '## Overview',
          '',
          '[Full reference][web]',
          '[collapsed][]',
          '[shortcut]',
          '![Local image][local-guide]',
          '<https://example.com/reference>',
          '<http://example.com/reference>',
          '<section>Ordinary HTML remains ignored.</section>',
          '',
          '[web]: https://example.com/full',
          '[collapsed]: http://example.com/collapsed',
          '[shortcut]: https://example.com/shortcut',
          '[local-guide]: guide.md'
        ].join('\n'),
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Follow each valid reference.'
      ]
    }));
    await writeFile(join(skillsRoot, 'demo', 'sample-skill', 'guide.md'), '# Guide\n');

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });
    expect(result.errors).toEqual([]);
  });

  test('rejects an existing local link target excluded from the npm package', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeFile(join(skillsRoot, '..', 'package-lock.json'), '{}\n');
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nDo not link the [lockfile](../../../package-lock.json).',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate package membership.'
      ]
    }));

    const [result] = await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    });
    expect(result.errors.join('\n')).toMatch(
      /SKILL\.md:\d+:.*local Markdown link target is not included in the package.*package-lock\.json/i
    );
  });

  test('validateOne rejects Related targets whose SKILL.md is missing or malformed', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await mkdir(join(skillsRoot, 'demo', 'missing-target'), { recursive: true });
    await writeSkill(skillsRoot, 'demo/malformed-target', '---\nname: [malformed\n---\n');
    await writeSkill(skillsRoot, 'demo/source-skill', skill({
      name: 'source-skill',
      sections: [
        '## Overview\n\nExplain the goal.',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate each target.',
        '## Related Skills\n\n- `demo/missing-target`\n- `demo/malformed-target`'
      ]
    }));

    const result = await SkillValidator.validateOne('demo/source-skill', { skillsDir: skillsRoot });
    const errors = result.errors.join('\n');
    expect(errors).toMatch(/unknown related skill target.*demo\/missing-target/i);
    expect(errors).toMatch(/unknown related skill target.*demo\/malformed-target/i);
  });

  test('extracts the complete missing plain Related target before an em dash', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/source-skill', skill({
      name: 'source-skill',
      sections: [
        '## Overview\n\nExplain the goal.',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate the target.',
        '## Related Skills\n\n- missing/missing-skill — Target is intentionally absent'
      ]
    }));

    const result = await SkillValidator.validateOne('demo/source-skill', { skillsDir: skillsRoot });
    expect(result.errors.join('\n')).toMatch(
      /unknown related skill target: missing\/missing-skill/i
    );
  });

  test('requires Related Skills to be unique catalog targets other than the current skill', async () => {
    const skillsRoot = await temporarySkillsRoot();
    await writeSkill(skillsRoot, 'demo/target-skill', skill({ name: 'target-skill' }));
    await writeSkill(skillsRoot, 'demo/sample-skill', skill({
      sections: [
        '## Overview\n\nExplain the goal.',
        '## Prerequisites\n\n- Read access',
        '## Procedure\n\n1. Validate every related skill.',
        [
          '## Related Skills',
          '',
          '- `demo/sample-skill`',
          '- `target-skill`',
          '- `demo/target-skill`',
          '- [External](https://example.com/skill)',
          '- [Anchor](#overview)',
          '- https://example.com/plain-skill',
          '- #plain-anchor'
        ].join('\n')
      ]
    }));

    const result = (await SkillValidator.validateAll({
      skillsDir: skillsRoot,
      includeContractDocuments: false
    })).find(candidate => candidate.path === 'demo/sample-skill');
    const errors = result.errors.join('\n');
    expect(errors).toMatch(/Related Skills target must not reference itself.*demo\/sample-skill/i);
    expect(errors).toMatch(/Duplicate Related Skills target.*demo\/target-skill/i);
    expect(errors).toMatch(/Related Skills.*catalog skill.*https:\/\/example\.com\/skill/i);
    expect(errors).toMatch(/Related Skills.*catalog skill.*#overview/i);
    expect(errors).toMatch(/Related Skills.*catalog skill.*https:\/\/example\.com\/plain-skill/i);
    expect(errors).toMatch(/Related Skills.*catalog skill.*#plain-anchor/i);
  });

  test('the published catalog has 184 globally unique path-derived names', async () => {
    const skillsRoot = join(process.cwd(), 'skills');
    const entries = await readdir(skillsRoot, { recursive: true });
    const skillFiles = entries.filter(entry => entry.endsWith('/SKILL.md'));
    const rows = await Promise.all(skillFiles.map(async entry => {
      const skillPath = entry.replace(/\/SKILL\.md$/, '');
      const [category, leaf] = skillPath.split('/');
      const name = matter(await readFile(join(skillsRoot, entry), 'utf8')).data.name;
      return { name, allowed: [leaf, `${category}-${leaf}`] };
    }));

    expect(rows).toHaveLength(184);
    expect(new Set(rows.map(row => row.name)).size).toBe(184);
    for (const row of rows) expect(row.allowed).toContain(row.name);
  });
});
