# happy-servicenow-skills (DEPRECATED)

> **This package has been renamed to [`happy-platform-skills`](https://www.npmjs.com/package/happy-platform-skills).**

Version 1.2.1 is the final compatibility repair. It restores the documented
loader entry point and forwards the legacy CLI through public exports from
`happy-platform-skills`. It must be published separately from the root package.

## Migration

```bash
npm uninstall happy-servicenow-skills
npm install happy-platform-skills
```

Then update your imports:

```diff
- import { SkillLoader } from 'happy-servicenow-skills';
+ import { SkillLoader } from 'happy-platform-skills';
```

And CLI usage:

```diff
- npx sn-skills list
+ npx hps list
```

The `sn-skills` CLI alias continues to work with the new package for backwards compatibility.

The compatibility package continues to re-export the package root and the
`happy-servicenow-skills/loader` entry point. Import raw skill assets from the
new package name because the old package's raw `skills/*` export was never a
valid Node.js package target.
