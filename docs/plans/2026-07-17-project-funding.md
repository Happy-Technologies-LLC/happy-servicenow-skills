# Project Funding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the verified Buy Me a Coffee support route discoverable from the Happy Platform Skills GitHub repository and npm package.

**Architecture:** GitHub reads `.github/FUNDING.yml` to render its native Sponsor control. npm reads `package.json` funding metadata. The README exposes one support anchor and one concise support section that identifies Happy Technologies LLC as the recipient.

**Tech Stack:** GitHub repository metadata, npm package metadata, Markdown.

---

### Task 1: Add verified funding metadata

**Files:**
- Create: `.github/FUNDING.yml`
- Modify: `package.json:43-48`

**Step 1: Create GitHub funding configuration**

Create `.github/FUNDING.yml`:

```yaml
buy_me_a_coffee: nickzitzer
```

**Step 2: Add npm funding metadata**

Insert after `homepage` in `package.json`:

```json
"funding": "https://buymeacoffee.com/nickzitzer",
```

**Step 3: Validate the metadata**

Run:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); if(p.funding !== 'https://buymeacoffee.com/nickzitzer') process.exit(1); if(fs.readFileSync('.github/FUNDING.yml','utf8') !== 'buy_me_a_coffee: nickzitzer\\n') process.exit(1)"
```

Expected: exit `0`.

**Step 4: Commit**

```bash
git add .github/FUNDING.yml package.json
git commit -m "feat: add project funding link"
```

### Task 2: Add README support path

**Files:**
- Modify: `README.md:20-45`

**Step 1: Add navigation anchor**

Add `<a href="#support">Support</a>` after the existing `Contributing` link in the centered navigation.

**Step 2: Add concise support section**

Insert after the migration separator and before `## What Are Platform Skills?`:

```markdown
## Support

If you find this project useful, consider supporting its development. Contributions support Happy Technologies LLC.

[Buy Me a Coffee](https://buymeacoffee.com/nickzitzer)
```

**Step 3: Validate rendered-link inputs**

Run:

```bash
node -e "const r=require('fs').readFileSync('README.md','utf8'); for(const s of ['href=\\\"#support\\\"','https://buymeacoffee.com/nickzitzer','Contributions support Happy Technologies LLC.']) if(!r.includes(s)) process.exit(1)"
```

Expected: exit `0`.

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add support path"
```

### Task 3: Verify and publish

**Files:**
- Verify: `.github/FUNDING.yml`, `package.json`, `README.md`

**Step 1: Install the locked dependency graph**

Run:

```bash
npm ci
```

Expected: dependencies install without modifying `package-lock.json`.

**Step 2: Run the existing test suite**

Run:

```bash
npm test
```

Expected: all existing tests pass.

**Step 3: Review the release-facing diff**

Run:

```bash
git diff origin/main...HEAD -- .github/FUNDING.yml package.json README.md
git diff --exit-code -- package-lock.json
```

Expected: only verified funding metadata and the concise README path change; package lock unchanged.

**Step 4: Publish and merge**

Push `feat/project-funding`, create the pull request, wait for required GitHub Actions checks, then merge through the repository policy.
