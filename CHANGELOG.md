# Changelog

All notable changes to Happy Platform Skills are documented here.

## 2.4.0 - 2026-07-27

### Added

- Four skills for task summarization, document screening, risk identification,
  and supplier lifecycle operations, bringing the catalog to 184 skills across
  23 categories.
- A canonical packaged root `SKILL.md` for catalog discovery.
- CI and clean packed-consumer release gates.

### Changed

- Aligned catalog guidance with the versioned Happy Platform MCP v5.1 contract:
  exactly 55 live tools and six docs-only tools.
- Made registry refreshes concurrent-safe, retryable, and atomic.
- Made prompt rendering preserve the complete authored skill body.
- Updated package metadata, documentation, and migration compatibility for the
  2.4.0 release.
- Prepared `happy-servicenow-skills@1.2.1` as a separate final compatibility
  release for the repaired loader export and legacy CLI forwarding, with a
  `happy-platform-skills@^2.4.0` compatibility floor.

### Fixed

- Removed stale and phantom README catalog entries and counts.
- Repaired the deprecated `happy-servicenow-skills` loader and CLI forwarding.
- Strengthened package verification to compare exact source, tarball, and
  clean-consumer skill path sets.
