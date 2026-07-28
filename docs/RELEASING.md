# Releasing

Use this flow to publish `happy-platform-skills` from a clean release branch.
Never publish an artifact that is not represented by a reviewed commit.

## Versioning

- Patch: documentation-only changes and compatible fixes.
- Minor: new skills, changed discovery behavior, or new CLI behavior.
- Major: breaking package, CLI, or skill-layout changes.

Keep the version synchronized in `package.json`, `package-lock.json`, the root
`SKILL.md`, and `CHANGELOG.md`.

## 1. Prepare and verify the release tree

Start from the intended mainline commit with a clean worktree, then update the
version without creating a tag:

```bash
npm version <version> --no-git-tag-version
```

Run every release gate:

```bash
npm ci
npm test -- --runInBand
npm run validate
npm run contract:check
npm run contract:nl-check
npm audit --omit=dev
npm run verify:package
npm run publish:dry-run
npx skills add . --list --full-depth
```

Review the complete change set and package manifest. Stage all intended release
files, then inspect the staged tree before committing:

```bash
git diff --check
git status --short
git add --all
git diff --cached --stat
git diff --cached
git commit -m "Release v<version>"
```

Confirm the release commit is clean and contains the synchronized versions:

```bash
git status --short
git show --stat --oneline HEAD
node -p "require('./package.json').version"
npm run verify:package
```

## 2. Authenticate and publish the committed artifact

```bash
npm whoami
npm publish --access public
```

Confirm npm serves the expected version before creating the release tag:

```bash
npm view happy-platform-skills version
```

## 3. Tag and push the exact published commit

```bash
git tag -a v<version> -m "Release v<version>"
git push origin HEAD:main
git push origin v<version>
```

Do not move an existing release tag. If publishing fails, fix the issue in a
new reviewed commit and rerun the gates before retrying.
