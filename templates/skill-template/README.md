# Skill Template

Use this template when contributing a new skill to Happy Platform Skills.

## Directory Structure

```
skills/
  <category>/
    my-skill/
      SKILL.md         # Your skill file (required)
```

Each skill is a directory with a `SKILL.md` file placed in the appropriate category directory.

## Quick Start

```bash
# 1. Copy the template into the right category
mkdir -p skills/<category>/my-skill
cp templates/skill-template/TEMPLATE.md skills/<category>/my-skill/SKILL.md

# 2. Edit the file — fill in frontmatter and all sections
# 3. Validate
npm run validate

# 4. Submit a PR (see CONTRIBUTING.md)
```

## Naming Rules

Skill directory names must follow these rules:

1. **Use lowercase kebab-case directories:** `incident-triage/`, `contract-analysis/`
2. **No vendor or trademarked names:** Do not include platform vendor names in directory names.
   - Good: `incident-triage/`
   - Bad: `servicenow-incident-triage/`
3. **Describe the action, not the platform:** Focus on what the skill does.
   - Good: `flow-generation/`, `ai-search-rag/`
   - Bad: `now-assist-setup/`
4. **Keep it concise:** 2-4 words, max 40 characters.

## Frontmatter Fields

| Field | Status | Description |
|-------|--------|-------------|
| `name` | Required | Globally unique leaf slug, or `<category>-<leaf-slug>` when needed |
| `version` | Required | Semantic version (e.g., `1.0.0`) |
| `description` | Required | One-line summary of the skill |
| `author` | Recommended | Your name or organization |
| `tags` | Recommended | Nonempty array of lowercase kebab-case tags |
| `platforms` | Recommended | Nonempty array of compatible AI platforms |
| `tools.mcp` | Optional | MCP tools used by this skill |
| `tools.rest` | Optional | REST API endpoints used |
| `tools.native` | Optional | Native AI agent tools used |
| `complexity` | Recommended | `beginner`, `intermediate`, `advanced`, or `expert` |
| `estimated_time` | Recommended | Expected time range (e.g., `5-15 minutes`) |

## Required Sections

Every skill must include all of the following sections:

1. **Overview** — What, who, and why
2. **Prerequisites** — Roles, permissions, dependencies
3. **Procedure** — Step-by-step with MCP and REST alternatives
4. **Tool Usage** — Tables listing tools and their purposes
5. **Best Practices** — Industry-aligned recommendations
6. **Troubleshooting** — Real-world issues and fixes

Optional but encouraged:
- **Examples** — Concrete input/output demonstrations
- **Related Skills** — Cross-references to related content
- **References** — Links to public documentation

## Trademark Compliance

- Never use trademarked vendor names in file or directory names
- Use ® on first mention of registered trademarks within document body
- Prefer generic terminology: "platform," "instance," "service management"
- All content must be original — no copied vendor docs or sample code

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for the full trademark guidelines.
