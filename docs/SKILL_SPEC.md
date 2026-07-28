# Happy ServiceNow Skills Specification

Version: 1.3.2

This document defines the specification for creating skills in the Happy ServiceNow AI Skills library.

## File Format

Skills are written as Markdown files with YAML frontmatter.

```markdown
---
# YAML Frontmatter (Required)
name: skill-name
version: 1.0.0
description: Brief description
...
---

# Markdown Body
Content here...
```

## Frontmatter Specification

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Globally unique identifier derived from its catalog path |
| `version` | string | Exact release semantic version (`major.minor.patch`) |
| `description` | string | Nonempty one-line description under 200 characters |

### Recommended Fields

| Field | Type | Description |
|-------|------|-------------|
| `author` | string | Author or organization name |
| `tags` | array | Searchable tags for discovery |
| `platforms` | array | Supported AI platforms |
| `tools` | object | Tools used by this skill |
| `complexity` | string | Skill complexity level |
| `estimated_time` | string | Typical completion time |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `prerequisites` | array | Required skills or knowledge |
| `related_skills` | array | Related skill paths |
| `servicenow_version` | string | Minimum ServiceNow version |
| `plugins` | array | Required ServiceNow plugins |

## Field Details

### name

- Must be either the leaf directory slug or `<category>-<leaf-directory-slug>`
- Must be globally unique across the catalog; use the category-prefixed form
  when the leaf slug would collide
- Use lowercase kebab-case (letters, digits, and single hyphens)
- Should be descriptive but concise

```yaml
name: incident-triage        # Good
name: Incident Triage        # Bad (spaces, capitals)
name: triage                 # Bad (not descriptive enough)
```

### version

- Use an exact `major.minor.patch` release version
- Do not use leading zeroes, prerelease suffixes, build suffixes, or trailing text

```yaml
version: 1.0.0   # Valid initial release
version: 1.1.0   # Valid feature release
version: 1.1.1   # Valid patch
version: 01.0.0  # Invalid leading zero
version: 1.0.0-rc.1  # Invalid: catalog versions are release-only
```

### tags

- Supply a nonempty array
- Use lowercase kebab-case strings; underscores, spaces, and uppercase letters are invalid
- Include relevant categories
- Max 10 tags recommended

```yaml
tags:
  - itsm
  - incident
  - triage
  - assignment
  - itil
```

### platforms

Supply a nonempty array of strings. Valid values:
- `claude-code` - Claude Code CLI
- `claude-desktop` - Claude Desktop App
- `chatgpt` - OpenAI ChatGPT
- `cursor` - Cursor IDE
- `any` - Platform agnostic

```yaml
platforms:
  - claude-code
  - claude-desktop
  - chatgpt
  - any
```

### tools

When present, `tools` must be a nonempty object. Its only valid keys are `mcp`,
`rest`, `native`, and `cli`. Each value must be a nonempty array of nonempty strings.
Every `tools.mcp` entry and operative `SN-*` reference in the body must exist in
the versioned MCP contract under `contracts/`.

Organize tools by type:

```yaml
tools:
  mcp:                    # MCP tools (ServiceNow MCP Server)
    - SN-Query-Table
    - SN-Create-Record
  rest:                   # REST API endpoints
    - /api/now/table/incident
    - /api/now/table/sys_user
  native:                 # Native agent tools
    - Bash
    - Read
    - Write
  cli:                    # Command-line tools
    - curl
    - jq
```

### complexity

When present, `complexity` must be one of the following nonempty string values:

Valid values:
- `beginner` - Simple, single-step procedures
- `intermediate` - Multi-step with some decisions
- `advanced` - Complex workflows, multiple systems
- `expert` - Requires deep expertise, edge cases

## Body Specification

### Required Sections

Required section names are matched case-insensitively. Use the title-case forms
below as the canonical spelling for readability and consistency.

```markdown
## Overview
What this skill does and when to use it.

## Prerequisites
What's needed before using this skill.

## Procedure
Step-by-step instructions with numbered steps.
```

### Recommended Sections

```markdown
## Best Practices
Guidelines and recommendations.
```

### Optional Sections

```markdown
## Tool Usage
Reference for tools mentioned in procedure.

## Troubleshooting
Common issues and solutions.

## Examples
Concrete usage examples.

## Related Skills
Links to related skills.

## References
External documentation links.
```

## Section Guidelines

### Procedure Section

- Use numbered steps for sequential actions
- Include tool usage blocks with parameters
- Provide both MCP and REST alternatives when possible
- Include decision points for branching logic

**Tool Usage Block Format:**

```markdown
**Using MCP:**
\`\`\`
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true
  fields: number,short_description
  limit: 10
\`\`\`

**Using REST API:**
\`\`\`bash
GET /api/now/table/incident?sysparm_query=active=true&sysparm_fields=number,short_description&sysparm_limit=10
\`\`\`
```

### Troubleshooting Section

Use consistent format:

```markdown
### Issue Title

**Symptom:** What the user observes
**Cause:** Why it happens
**Solution:** How to fix it
```

## File Organization

```
skills/
├── itsm/
│   ├── incident-triage/
│   │   └── SKILL.md
│   └── incident-lifecycle/
│       └── SKILL.md
├── cmdb/
│   └── ci-discovery/
│       └── SKILL.md
├── admin/
│   └── update-set-management/
│       └── SKILL.md
├── catalog/
│   └── request-fulfillment/
│       └── SKILL.md
├── security/
│   └── incident-response/
│       └── SKILL.md
└── reporting/
    └── sla-analysis/
        └── SKILL.md
```

Every immediate skill directory must contain `SKILL.md`; an empty or partially
created directory is a validation error.

## Links and Related Skills

- Local Markdown links are resolved relative to the containing `SKILL.md` and
  must point to an existing file or directory.
- Local links must remain inside the packaged repository root after both lexical
  and real-path resolution. Absolute filesystem paths, symlink escapes,
  malformed percent encoding, and `javascript:`, `data:`, or `file:` links are errors.
- Local targets must be included by the npm package manifest; a repository file
  that is excluded from the tarball is not a valid link target.
- Entries under `## Related Skills` may use a full `category/skill` path, a
  same-category `skill` slug, or a relative Markdown link to another skill.
- Every Related Skills target must resolve to a different skill in the catalog;
  anchors, external URLs, self-references, and duplicate targets are invalid.
- A catalog target is resolvable only when its `SKILL.md` is readable and its
  frontmatter is parseable.
- Only `http:` and `https:` external Markdown links are allowed. Other URI
  schemes are rejected after percent decoding; network availability is not checked.
- Link validation covers inline links and images, full/collapsed/shortcut
  reference links, reference images, and URI autolinks. Ordinary HTML tags are
  not interpreted as links. Reference destinations may appear on the following
  indented line as permitted by CommonMark.

### Category Guidelines

| Category | Content |
|----------|---------|
| `itsm` | Incident, Problem, Change, Request |
| `cmdb` | Configuration Management |
| `admin` | System Administration |
| `catalog` | Service Catalog |
| `security` | Security Operations |
| `reporting` | Reports, Dashboards, Analytics |

## Validation

Run validation before submitting:

```bash
npm run validate
```

Validation checks:
- Required frontmatter fields, types, lengths, and exact release versions
- Name-to-directory identity, tag/platform shape, and MCP tool contracts
- Required nonempty sections
- Presence of `SKILL.md` in every skill directory
- Local Markdown links and Related Skills targets
- Source path and line diagnostics when the source location can be determined

## Examples

### Minimal Valid Skill

```markdown
---
name: simple-query
version: 1.0.0
description: Query ServiceNow records
---

## Overview
Query records from any ServiceNow table.

## Prerequisites
- Read access to target table

## Procedure

1. Identify the table name
2. Build your query
3. Execute the query
```

### Complete Skill

See `templates/skill-template/TEMPLATE.md` for a full example.

## Changelog

### 1.0.0 (2026-02-06)
- Initial specification release

### 1.1.0 (2026-07-27)
- Aligned metadata, section, directory, link, and Related Skills requirements
  with automated validation.

### 1.2.0 (2026-07-27)
- Added globally unique path-derived names, safe local-link containment, strict
  Related Skills integrity, and present-value complexity validation.

### 1.3.0 (2026-07-27)
- Added external URI allowlisting, packed-target membership, and readable,
  parseable catalog-target requirements.

### 1.3.1 (2026-07-27)
- Extended link integrity checks to reference-style Markdown and URI autolinks.

### 1.3.2 (2026-07-27)
- Added multiline reference destinations and empty-text reference forms.
