---
name: release-notes-generation
version: 1.0.0
description: Generate release notes from change requests, stories, and defects for a given release window with categorization, impact summaries, and stakeholder-ready formatting
author: Happy Technologies LLC
tags: [itsm, release-notes, change-request, release-management, documentation, stories, defects]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
    - SN-Create-Record
  rest:
    - /api/now/table/change_request
    - /api/now/table/rm_story
    - /api/now/table/rm_defect
    - /api/now/table/rm_release
    - /api/now/table/kb_knowledge
    - /api/now/table/incident
  native:
    - Bash
complexity: intermediate
estimated_time: 20-40 minutes
---

# Release Notes Generation

## Overview

This skill generates comprehensive release notes by aggregating data from change requests, user stories, and defect fixes associated with a given release window. It produces stakeholder-ready documentation with categorized changes, impact summaries, and known issues.

- Query change requests within a release window and categorize by type
- Aggregate user stories and their acceptance criteria for feature documentation
- Collect defect fixes with root cause and impact descriptions
- Identify known issues and workarounds carried into the release
- Generate formatted release notes suitable for technical and non-technical audiences
- Optionally publish release notes as a knowledge base article

**When to use:** When preparing for a software release, sprint delivery, or maintenance window and stakeholders need documentation of what changed, what was fixed, and what to watch for.

## Prerequisites

- **Roles:** `itil`, `change_manager`, `release_manager`, or `scrum_master`
- **Plugins:** `com.snc.change_management` (Change Management), `com.snc.sdlc.agile.2.0` (Agile Development 2.0, optional), `com.glide.knowledge` (Knowledge Management, optional)
- **Access:** Read on `change_request`, `rm_story`, `rm_defect`, `rm_release`, `kb_knowledge`, `incident`
- **Knowledge:** Understanding of your release cycle, change categories, and stakeholder audiences
- **Data:** Change requests and/or stories/defects linked to the target release

## Procedure

### Step 1: Identify the Release Window

Determine the release scope by querying the release record or defining a date range.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_release
  query: number=[release_number]
  fields: sys_id,number,short_description,start_date,end_date,state,release_type,release_phase
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/rm_release?sysparm_query=number=[release_number]&sysparm_fields=sys_id,number,short_description,start_date,end_date,state,release_type,release_phase&sysparm_limit=1
```

If no formal release record exists, define the window by date range:
- **Start date:** Beginning of the sprint/release period
- **End date:** Release deployment date

### Step 2: Gather Change Requests

Query all change requests implemented within the release window.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: stateINclosed,implemented,review^end_dateBETWEEN[start_date]@[end_date]
  fields: sys_id,number,short_description,description,type,category,risk,impact,cmdb_ci,assignment_group,close_notes,state
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/change_request?sysparm_query=stateINclosed,implemented,review^end_dateBETWEEN[start_date]@[end_date]&sysparm_fields=sys_id,number,short_description,description,type,category,risk,impact,cmdb_ci,assignment_group,close_notes,state&sysparm_limit=100
```

Categorize changes:

| Category | Count | Description |
|----------|-------|-------------|
| New Feature | 5 | New capabilities added |
| Enhancement | 12 | Improvements to existing features |
| Bug Fix | 8 | Defect corrections |
| Infrastructure | 4 | Platform, server, or network changes |
| Security Patch | 3 | Security vulnerability remediation |
| Configuration | 6 | Settings or parameter changes |

### Step 3: Gather User Stories

If using Agile Development, retrieve completed stories for the release.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: release=[release_sys_id]^state=closed_complete
  fields: sys_id,number,short_description,description,acceptance_criteria,story_points,sprint,product,epic
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=release=[release_sys_id]^state=closed_complete&sysparm_fields=sys_id,number,short_description,description,acceptance_criteria,story_points,sprint,product,epic&sysparm_limit=50
```

### Step 4: Gather Defect Fixes

Retrieve defects fixed in this release.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_defect
  query: release=[release_sys_id]^state=closed_complete
  fields: sys_id,number,short_description,description,severity,found_in,fixed_in,root_cause,affected_users
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/rm_defect?sysparm_query=release=[release_sys_id]^state=closed_complete&sysparm_fields=sys_id,number,short_description,description,severity,found_in,fixed_in,root_cause,affected_users&sysparm_limit=50
```

### Step 5: Identify Known Issues

Check for open defects or problems that persist into the release.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_defect
  query: release=[release_sys_id]^stateNOT INclosed_complete,closed_skipped
  fields: sys_id,number,short_description,severity,workaround
  limit: 20
```

Also check for related incidents reported after similar past releases:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^short_descriptionLIKE[release_or_product_keyword]^sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,short_description,priority,state
  limit: 10
```

### Step 6: Generate the Release Notes Document

Compile all gathered data into a formatted release notes document:

```
================================================================
RELEASE NOTES
================================================================
Release: [release_number] - [release_short_description]
Date: [end_date]
Version: [version_number]
Environment: [Production / Staging / UAT]

================================================================
SUMMARY
================================================================
This release includes [X] new features, [Y] enhancements,
[Z] bug fixes, and [W] infrastructure changes.

Total Changes: [total]
Total Story Points Delivered: [points]
Risk Profile: [X] High, [Y] Moderate, [Z] Low risk changes

================================================================
NEW FEATURES
================================================================

[NFT-001] [CHG/STY number] - [Short Description]
  Description: [User-friendly description of the feature]
  Impact: [Who benefits and how]
  Configuration: [Any setup required by users/admins]
  Related KB: [KB article number if applicable]

[NFT-002] ...

================================================================
ENHANCEMENTS
================================================================

[ENH-001] [CHG/STY number] - [Short Description]
  Description: [What was improved and why]
  Before: [Previous behavior]
  After: [New behavior]

[ENH-002] ...

================================================================
BUG FIXES
================================================================

[BUG-001] [DEF number] - [Short Description]
  Severity: [Critical / High / Medium / Low]
  Symptom: [What users experienced]
  Root Cause: [What caused the defect]
  Fix: [What was changed to fix it]
  Affected Users: [Scope of impact]

[BUG-002] ...

================================================================
INFRASTRUCTURE CHANGES
================================================================

[INF-001] [CHG number] - [Short Description]
  Change Type: [Standard / Normal / Emergency]
  Impact: [Expected user impact during/after change]
  Downtime: [Any planned downtime window]

================================================================
SECURITY UPDATES
================================================================

[SEC-001] [CHG number] - [Short Description]
  Severity: [Critical / High / Medium / Low]
  CVE: [CVE number if applicable]
  Impact: [What was vulnerable and what was fixed]

================================================================
KNOWN ISSUES
================================================================

[KI-001] [DEF number] - [Short Description]
  Severity: [severity]
  Workaround: [Temporary workaround if available]
  Expected Fix: [Target release for fix]

================================================================
UPGRADE NOTES
================================================================
- [Any manual steps required after deployment]
- [Configuration changes needed]
- [Cache clears, restarts, or reindexing required]
- [Backward compatibility notes]

================================================================
ROLLBACK PLAN
================================================================
In case of critical issues:
- [Rollback procedure summary]
- Contact: [Release manager contact]
- Decision deadline: [Time by which rollback decision must be made]
```

### Step 7: Publish Release Notes

Optionally publish the release notes as a knowledge base article.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: kb_knowledge
  data:
    short_description: "Release Notes - [release_number] - [date]"
    text: "[generated release notes]"
    kb_knowledge_base: [knowledge_base_sys_id]
    kb_category: Release Notes
    workflow_state: draft
    valid_to: ""
```

**Using REST API:**
```bash
POST /api/now/table/kb_knowledge
Content-Type: application/json

{
  "short_description": "Release Notes - [release_number] - [date]",
  "text": "[generated release notes]",
  "kb_knowledge_base": "[knowledge_base_sys_id]",
  "kb_category": "Release Notes",
  "workflow_state": "draft"
}
```

### Step 8: Notify Stakeholders

Document the release notes distribution in the release record.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: rm_release
  sys_id: [release_sys_id]
  data:
    work_notes: "Release notes generated and published as KB article [KB_number]. Distribution: Technical teams, Change Advisory Board, Service Desk, End-user communications."
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Query-Table` | Retrieve changes, stories, defects, release data | Core data gathering |
| `SN-Natural-Language-Search` | Find related items using natural language | Supplementary discovery |
| `SN-Create-Record` | Publish release notes as KB article | Documentation |
| `SN-Update-Record` | Update release record with notes status | Tracking and audit |
| `SN-Add-Work-Notes` | Document generation process | Audit trail |
| `SN-Get-Table-Schema` | Explore table structures | Setup and field discovery |

## Best Practices

1. **Generate early, iterate often** -- draft release notes as changes are implemented, not at the last minute
2. **Write for your audience** -- technical details for engineering, business impact for stakeholders
3. **Group logically** -- categorize by type (feature, fix, infrastructure) not by team or ticket number
4. **Always include known issues** -- stakeholders trust transparency; hiding known issues erodes confidence
5. **Link to KB articles** -- reference detailed documentation for features that need setup or training
6. **Version the notes** -- if the release changes after notes are drafted, update and version them
7. **Include rollback information** -- every release should have a documented rollback plan
8. **Automate the data gathering** -- manual collection of change details is error-prone and time-consuming
9. **Validate with change owners** -- have each change owner review their section for accuracy
10. **Archive consistently** -- store release notes in a standard location (KB, release record) for historical reference

## Troubleshooting

### "No change requests found for the release window"

**Cause:** Changes may not have end_date populated, or they use a different date field
**Solution:** Try querying by `close_date` or `work_end` instead. Also check if changes are linked to the release record via `release` field rather than date range.

### "Stories have no release field populated"

**Cause:** Agile Development integration may not be configured to link stories to releases
**Solution:** Query stories by sprint dates instead: `sprint.end_date BETWEEN [start] AND [end]`. Or query by product and state.

### "Too many changes to include in release notes"

**Cause:** Large release window or very active environment
**Solution:** Filter by risk level (exclude low-risk standard changes) or by application scope. Focus on customer-facing changes and summarize internal/infrastructure changes.

### "Defect root_cause field is empty"

**Cause:** Developers did not populate root cause analysis during defect resolution
**Solution:** Fall back to the defect description and close_notes for context. Flag empty root_cause as a process improvement item.

## Examples

### Example 1: Sprint Release Notes

**Release:** REL0023456 - Sprint 42 Delivery (2026-03-15 to 2026-03-29)

**Generated Notes:**
- 3 New Features: Self-service portal redesign, Mobile app push notifications, SSO for vendor portal
- 5 Enhancements: Improved search performance, Updated approval email templates, Dashboard load time optimization, Bulk import CSV validation, Report export to PDF
- 4 Bug Fixes: Login timeout issue (Critical), Calendar date picker off-by-one (Medium), Report pagination error (Medium), Notification duplicate suppression (Low)
- 1 Known Issue: PDF export occasionally truncates tables with >50 rows (workaround: export to CSV)

### Example 2: Emergency Patch Release Notes

**Release:** REL0023457 - Emergency Security Patch (2026-03-18)

**Generated Notes:**
- 1 Security Update: CVE-2026-1234 - Cross-site scripting vulnerability in form submission handler (Critical)
- 0 New Features
- 1 Infrastructure Change: WAF rule update to block exploit pattern pending patch deployment
- Rollback Plan: Revert WAF rules and apply previous application version within 2-hour window

### Example 3: Major Platform Upgrade Release Notes

**Release:** REL0023458 - Platform Upgrade v3.0 (2026-03-22)

**Generated Notes:**
- 8 New Features spanning 3 modules
- 15 Enhancements including performance and UX improvements
- 12 Bug Fixes including 2 Critical severity
- 3 Infrastructure Changes including database migration and cache architecture update
- 5 Known Issues with documented workarounds
- Upgrade Notes: 4-hour maintenance window, database backup required, cache clear after deployment, all users must re-authenticate

## Related Skills

- `itsm/change-management` - Change request lifecycle management
- `spm/agile-story-generation` - Generate stories for next sprint
- `knowledge/article-generation` - Create KB articles from release content
- `spm/acceptance-criteria` - Define acceptance criteria for stories
- `itsm/suggested-steps` - Resolution steps for incidents caused by releases
- `spm/planning-summarization` - Sprint and release planning summaries
