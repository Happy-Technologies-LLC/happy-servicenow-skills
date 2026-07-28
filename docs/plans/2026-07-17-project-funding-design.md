# Project Funding Design

## Goal
Expose the verified Buy Me a Coffee support route consistently to GitHub visitors and npm users of Happy Platform Skills.

## Decision
Use GitHub's native funding configuration, npm package funding metadata, and one concise README Support section. The support copy states that contributions support Happy Technologies LLC.

## Scope
- Add `.github/FUNDING.yml` with `buy_me_a_coffee: nickzitzer`.
- Add `funding: "https://buymeacoffee.com/nickzitzer"` to `package.json`.
- Add a `Support` navigation link and a plain `## Support` section to `README.md`.

## Non-goals
- No badges, tracking, new dependencies, or Docker-specific funding claims.
- No GitHub Sponsors link: the organization sponsor URL is not active and redirects to the organization profile.

## Verification
Parse package metadata, assert the funding YAML and README link inputs, run the existing test suite, then merge only after GitHub Actions passes.
