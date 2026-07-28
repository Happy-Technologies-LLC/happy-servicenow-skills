---
name: case-auto-resolve
version: 1.0.0
description: Auto-resolve common cases and incidents using pattern matching, knowledge base lookups, and historical resolution data to enable zero-touch service desk operations
author: Happy Technologies LLC
tags: [itsm, incident, case, auto-resolve, zero-touch, automation, pattern-matching, knowledge-base]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/incident
    - /api/now/table/sn_agent_workspace
    - /api/now/table/sys_cs_channel
    - /api/now/table/kb_knowledge
    - /api/now/table/incident_task
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# Case Auto-Resolve

## Overview

This skill automates the resolution of common, repetitive incidents and cases by leveraging pattern matching against known issues, knowledge base article lookups, and historical resolution data. It enables a zero-touch service desk workflow where routine tickets are resolved without human intervention.

- Identify incidents matching known resolution patterns (password resets, access requests, common errors)
- Match incoming tickets against knowledge base articles with high-confidence solutions
- Analyze historical resolution data for similar past incidents to derive automated fixes
- Apply resolution templates with appropriate work notes and customer communications
- Track auto-resolution success rates and escalate when confidence is low

**When to use:** When you want to reduce manual ticket handling for repetitive, well-understood issues that have documented solutions or consistent historical resolutions.

## Prerequisites

- **Roles:** `itil`, `knowledge_manager`, or `incident_manager`
- **Plugins:** `com.snc.incident` (Incident Management), `com.glide.knowledge` (Knowledge Management)
- **Access:** Read/write on `incident`, read on `kb_knowledge`, `sn_agent_workspace`, `sys_cs_channel`
- **Knowledge:** Understanding of your organization's common incident categories and resolution patterns
- **Data:** Sufficient historical incident data (recommended: 6+ months) for pattern matching

## Procedure

### Step 1: Identify Candidates for Auto-Resolution

Query for new or open incidents that match auto-resolvable categories.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Natural-Language-Search
Parameters:
  table: incident
  query: "active incidents in new state with category software or hardware or network where short description contains password reset or access request or VPN or printer"
  fields: sys_id,number,short_description,description,category,subcategory,priority,state,contact_type
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=true^state=1^categoryINsoftware,hardware,network^short_descriptionLIKEpassword reset^ORshort_descriptionLIKEaccess request^ORshort_descriptionLIKEVPN^ORshort_descriptionLIKEprinter&sysparm_fields=sys_id,number,short_description,description,category,subcategory,priority,state,contact_type&sysparm_limit=50
```

### Step 2: Build Pattern Matching Rules

Define resolution patterns for common incident types:

| Pattern ID | Category | Keywords | Resolution Template | Confidence Threshold |
|-----------|----------|----------|---------------------|---------------------|
| PWD-001 | Software | password, reset, locked, expired | Password Reset Procedure | 0.90 |
| ACC-001 | Software | access, permission, role, group | Access Request Fulfillment | 0.85 |
| VPN-001 | Network | VPN, connect, tunnel, remote | VPN Troubleshooting Steps | 0.85 |
| PRN-001 | Hardware | printer, print, queue, jam | Printer Reset Guide | 0.80 |
| EML-001 | Software | email, outlook, calendar, mailbox | Email Configuration Fix | 0.85 |
| DRV-001 | Hardware | disk, storage, space, full | Disk Cleanup Procedure | 0.80 |

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^resolved_atONLast 90 days@javascript:gs.daysAgoStart(90)@javascript:gs.daysAgoEnd(0)^short_descriptionLIKEpassword reset
  fields: sys_id,number,short_description,close_code,close_notes,resolution_code
  limit: 20
```

### Step 3: Search Knowledge Base for Matching Articles

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^active=true^short_descriptionLIKEpassword reset
  fields: sys_id,number,short_description,text,kb_category,rating,sys_view_count
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=workflow_state=published^active=true^short_descriptionLIKEpassword reset&sysparm_fields=sys_id,number,short_description,text,kb_category,rating,sys_view_count&sysparm_limit=5
```

### Step 4: Calculate Resolution Confidence Score

For each candidate incident, compute a confidence score based on:

1. **Keyword match strength** (0.0-0.4): How many pattern keywords appear in the short description and description
2. **KB article relevance** (0.0-0.3): Whether a published KB article directly addresses the issue
3. **Historical success rate** (0.0-0.3): Percentage of similar past incidents successfully auto-resolved

```
confidence = (keyword_score * 0.4) + (kb_relevance * 0.3) + (historical_rate * 0.3)
```

Only auto-resolve when confidence >= threshold defined in the pattern rule.

### Step 5: Apply Auto-Resolution

For incidents meeting the confidence threshold, apply the resolution:

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    state: 6
    close_code: Solved (Permanently)
    close_notes: "Auto-resolved: Password reset completed via self-service portal. KB article KB0012345 applied. Confidence score: 0.93."
    resolved_by: [auto_resolve_user_sys_id]
    resolution_code: Solved Remotely
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "state": "6",
  "close_code": "Solved (Permanently)",
  "close_notes": "Auto-resolved: Password reset completed via self-service portal. KB article KB0012345 applied. Confidence score: 0.93.",
  "resolved_by": "[auto_resolve_user_sys_id]",
  "resolution_code": "Solved Remotely"
}
```

### Step 6: Add Detailed Work Notes

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === AUTO-RESOLUTION ANALYSIS ===
    Pattern: PWD-001 (Password Reset)
    Confidence Score: 0.93 / 1.00

    Matching Factors:
    - Keywords matched: "password", "reset", "locked" (score: 0.38/0.40)
    - KB article: KB0012345 - Password Reset Procedure (score: 0.28/0.30)
    - Historical success: 94% of 127 similar incidents resolved successfully (score: 0.27/0.30)

    Resolution Applied:
    - Self-service password reset link sent to user email
    - KB article KB0012345 attached to incident
    - User notified via email with resolution steps

    Escalation: Not required (confidence above threshold 0.90)
```

### Step 7: Handle Low-Confidence Cases

When confidence falls below the threshold, route to a human agent with context:

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    assignment_group: [service_desk_l2_sys_id]
    work_notes: "Auto-resolve attempted but confidence too low (0.62). Partial pattern match on VPN-001. Requires human review. KB articles KB0034567, KB0034568 may be relevant."
```

### Step 8: Monitor Auto-Resolution Metrics

Query resolved incidents to track success rates:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: close_notesLIKEAuto-resolved^resolved_atONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,category,close_code,state,reopened
  limit: 200
```

Track these KPIs:
- **Auto-resolution rate**: Percentage of total incidents auto-resolved
- **Reopen rate**: Percentage of auto-resolved incidents reopened by users
- **Average confidence score**: Mean confidence at time of resolution
- **Time savings**: Average MTTR reduction vs. manual resolution

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Natural-Language-Search` | Find candidate incidents using natural language | Initial ticket discovery |
| `SN-Query-Table` | Structured queries for KB articles and history | Pattern matching and validation |
| `SN-Update-Record` | Apply resolution to incidents | Auto-resolve or escalate |
| `SN-Add-Work-Notes` | Document auto-resolution reasoning | Audit trail and transparency |
| `SN-Get-Table-Schema` | Discover available fields on tables | Setup and configuration |

## Best Practices

1. **Start conservative** -- set high confidence thresholds (0.90+) initially and lower as you validate
2. **Never auto-resolve P1/P2** -- high-priority incidents always require human review
3. **Track reopen rates** -- if reopens exceed 5%, tighten pattern rules or raise thresholds
4. **Keep KB articles current** -- stale articles lead to incorrect auto-resolutions
5. **Include opt-out** -- allow users to flag auto-resolutions as unhelpful
6. **Log everything** -- detailed work notes enable pattern refinement and auditing
7. **Run in shadow mode first** -- recommend resolutions without applying them for 2-4 weeks
8. **Respect channel context** -- check `sys_cs_channel` for conversation history before resolving

## Troubleshooting

### "Auto-resolved incident was reopened"

**Cause:** Resolution did not address the actual issue; pattern match was a false positive
**Solution:** Review the incident description for nuances missed by keyword matching. Refine pattern rules and consider adding negative keywords (e.g., "not" + keyword).

### "No KB articles found for pattern"

**Cause:** Knowledge base lacks coverage for this incident type
**Solution:** Create a new KB article from the historical resolution data. Use `knowledge/article-generation` skill.

### "Confidence score always below threshold"

**Cause:** Insufficient historical data or patterns too broad
**Solution:** Narrow pattern keywords, increase historical data window, or lower threshold temporarily while monitoring quality.

### "Agent workspace not reflecting auto-resolution"

**Cause:** `sn_agent_workspace` views may cache stale data
**Solution:** Verify the incident state change propagated. Check business rules on the incident table that may block state transitions.

## Examples

### Example 1: Password Reset Auto-Resolution

**Input:** INC0045678 - "My password is expired and I cannot log in to my workstation"

**Analysis:**
- Keywords: "password", "expired", "log in" -- matches PWD-001
- KB match: KB0012345 (Password Reset Self-Service) -- 95% relevance
- History: 142 similar incidents, 96% resolved with same KB article
- Confidence: 0.95

**Action:** Auto-resolve with password reset link and KB article reference.

### Example 2: VPN Issue with Low Confidence

**Input:** INC0045679 - "VPN keeps disconnecting after 10 minutes when using video calls"

**Analysis:**
- Keywords: "VPN", "disconnecting" -- partial match on VPN-001
- KB match: KB0034567 (VPN Troubleshooting) -- 60% relevance (does not cover video-specific issue)
- History: Only 12 similar incidents, 50% resolved with standard steps
- Confidence: 0.58

**Action:** Escalate to Network Operations with context notes and relevant KB articles.

### Example 3: Printer Issue Auto-Resolution

**Input:** INC0045680 - "Cannot print to the 3rd floor printer, jobs stuck in queue"

**Analysis:**
- Keywords: "print", "printer", "queue", "stuck" -- matches PRN-001
- KB match: KB0056789 (Printer Queue Reset) -- 88% relevance
- History: 89 similar incidents, 91% resolved with queue clear procedure
- Confidence: 0.87

**Action:** Auto-resolve with printer queue clear instructions and restart steps.

## Related Skills

- `itsm/incident-triage` - Manual incident triage for complex cases
- `itsm/suggested-steps` - Generate resolution steps for non-auto-resolvable incidents
- `itsm/predict-assignment` - Predict assignment group for escalated tickets
- `knowledge/content-recommendation` - Find relevant KB articles
- `knowledge/article-generation` - Create new KB articles from resolution data
