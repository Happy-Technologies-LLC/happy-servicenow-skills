---
name: risk-identification
version: 1.0.0
description: Identify emerging risks, prioritize intake signals, and route candidates into formal GRC risk assessment workflows
author: Happy Technologies LLC
tags: [grc, risk, identification, intake, prioritization, governance, assessment]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Discover-Table-Schema
    - SN-Query-Table
    - SN-Read-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sn_risk_identification
    - /api/now/table/sn_grc_profile
    - /api/now/table/sn_grc_risk
    - /api/now/table/sn_grc_issue
    - /api/now/table/task
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Risk Identification

## Overview

This skill supports proactive risk identification in ServiceNow® before full assessment and treatment. It helps teams:

- Gather risk signals from business applications, issues, and operational events
- Classify and prioritize risk candidates
- Route high-priority candidates for formal assessment
- Maintain governance-ready evidence for risk intake decisions

Use this when risk managers need structured early detection, not only post-event summarization.

## Prerequisites

- **Roles:** `sn_grc.manager`, `sn_risk.manager`, or `admin`
- **Plugins:** GRC / Risk Management enabled
- **Access:** Read/write access to risk identification, profile, risk, and issue tables
- **Policy Inputs:** Risk taxonomy, scoring thresholds, and escalation criteria

## Procedure

### Step 1: Confirm Risk Identification Schema

Validate table and fields used in your instance for risk identification workflows.

**Using MCP:**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: sn_risk_identification
```

If your instance uses alternate table names, capture mappings before continuing.

### Step 2: Ingest Risk Candidate Signals

Pull new or updated risk candidates and supporting context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_risk_identification
  query: stateINnew,under_review^sys_updated_on>=javascript:gs.daysAgoStart(7)
  fields: number,short_description,state,category,profile,owner,likelihood,impact,sys_updated_on
  limit: 100
```

### Step 3: Enrich with Profile and Historical Context

Gather profile posture and related historical risk records.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_grc_risk
  query: profile=[profile_sys_id]^active=true
  fields: number,short_description,state,residual_risk,inherent_risk,risk_score
  limit: 50
```

### Step 4: Score and Prioritize Candidates

Apply an intake score based on impact, likelihood, velocity, and control coverage.

Suggested decision bands:
- **High:** escalate immediately to formal assessment
- **Medium:** assign analyst review with due date
- **Low:** monitor and capture rationale

### Step 5: Create Follow-Up Actions

Route high/medium items into accountable next steps.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task
  fields:
    short_description: "Risk identification follow-up"
    description: "Perform formal assessment for high-priority risk candidate."
    priority: 2
```

### Step 6: Record Governance Evidence

Write final intake rationale with scoring factors and escalation decision.

## Tool Usage

| Tool | Purpose |
|---|---|
| `SN-Discover-Table-Schema` | Validate table names and field availability |
| `SN-Query-Table` | Retrieve candidate, profile, and historical risk data |
| `SN-Read-Record` | Inspect individual candidate details |
| `SN-Create-Record` | Create follow-up tasks/issues for escalated candidates |
| `SN-Update-Record` | Update candidate state and priority |
| `SN-Add-Work-Notes` | Capture audit-ready intake rationale |

## Best Practices

- Separate risk identification from risk treatment decisions
- Keep scoring model transparent and versioned
- Use consistent category mapping to avoid duplicate risk records
- Time-box analyst review for medium-priority candidates
- Link every escalation to an owner and target completion date

## Troubleshooting

### Risk Identification Table Not Found

**Symptom:** Query fails for `sn_risk_identification`.  
**Cause:** Instance uses alternate table naming or scoped table variants.  
**Solution:** Use schema discovery and update table mappings for your environment.

### Too Many Low-Quality Candidates

**Symptom:** Intake queue grows without actionable prioritization.  
**Cause:** Risk signal sources are noisy or scoring thresholds are too permissive.  
**Solution:** Tighten intake criteria and require minimum evidence before escalation.

## Related Skills

- `grc/risk-assessment-summarization` - Summarize formal risk assessments
- `grc/risk-event-summarization` - Summarize materialized risk events
- `grc/issue-validator` - Validate quality of downstream GRC issues

## References

- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/governance-risk-compliance/grc-risk-management-workspace/workflow-risk-identification.md>
- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/governance-risk-compliance/grc-risk-management-workspace/risk-identification-overview-dashboard.md>
