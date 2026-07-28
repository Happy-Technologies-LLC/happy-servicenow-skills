---
name: supplier-lifecycle-operations
version: 1.0.0
description: Manage supplier onboarding, qualification, performance monitoring, and offboarding with auditable lifecycle controls
author: Happy Technologies LLC
tags: [procurement, supplier, lifecycle, onboarding, qualification, performance, offboarding]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/core_company
    - /api/now/table/ast_contract
    - /api/now/table/proc_sourcing_event
    - /api/now/table/proc_po
    - /api/now/table/sn_proc_invoice
    - /api/now/table/task
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Supplier Lifecycle Operations

## Overview

This skill provides a repeatable supplier lifecycle workflow in ServiceNow® across four stages:

1. Onboarding
2. Qualification
3. Performance monitoring
4. Offboarding

Use this skill to reduce supplier risk, improve procurement consistency, and maintain clear audit evidence for supplier decisions.

## Prerequisites

- **Roles:** `sn_shop.procurement_administrator`, sourcing or vendor operations equivalent, or `admin`
- **Plugins:** Sourcing and Procurement Operations enabled
- **Access:** Read/write to `core_company`, `proc_sourcing_event`, `proc_po`, `sn_proc_invoice`, `ast_contract`, and `task`
- **Policy Inputs:** Qualification criteria, risk thresholds, and offboarding policy

## Procedure

### Step 1: Onboard Supplier Record

Create or validate the supplier master profile.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: core_company
  fields:
    name: "Example Supplier Pty Ltd"
    vendor: true
    vendor_type: "Strategic"
    country: "Australia"
    website: "https://example.com"
```

Decision points:
- If supplier already exists -> proceed to qualification
- If duplicate profile detected -> merge or retire duplicate before continuing

### Step 2: Execute Qualification Checks

Run baseline qualification checks (coverage, capability, policy alignment, commercial readiness).

Typical checks:
- Category fit and service capability
- Legal and contractual readiness
- Compliance documentation availability
- Financial and operational risk signals

### Step 3: Link to Sourcing and Contract Context

Associate supplier with sourcing events and contracts to establish operational readiness.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: ast_contract
  query: vendor=[supplier_sys_id]^state!=expired
  fields: sys_id,number,state,starts,ends,cost
  limit: 20
```

### Step 4: Monitor Ongoing Supplier Performance

Track delivery, invoice quality, and responsiveness using purchasing and AP activity.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: proc_po
  query: vendor=[supplier_sys_id]^ordered_date>=javascript:gs.beginningOfLast12Months()
  fields: number,state,ordered_date,expected_delivery,total_cost
  limit: 100
```

Performance dimensions:
- Delivery timeliness
- Quality / exception rate
- Invoice match success
- Contract compliance

### Step 5: Trigger Risk-Based Offboarding or Remediation

If supplier performance drops below policy thresholds, create a structured remediation or offboarding plan.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task
  fields:
    short_description: "Supplier lifecycle review required"
    description: "Supplier exceeded risk thresholds. Evaluate remediation vs offboarding."
    priority: 2
```

### Step 6: Document Lifecycle Decision

Capture decision evidence and next steps in work notes, including owners and due dates.

## Tool Usage

| Tool | Purpose |
|---|---|
| `SN-Query-Table` | Gather supplier, purchasing, and invoice history |
| `SN-Get-Record` | Retrieve full supplier and contract context |
| `SN-Create-Record` | Create lifecycle tasks and governance actions |
| `SN-Update-Record` | Update supplier status and lifecycle stage |
| `SN-Add-Work-Notes` | Record qualification and offboarding rationale |

## Best Practices

- Use consistent qualification criteria across all suppliers in the same category
- Separate corrective action plans from immediate offboarding decisions
- Review supplier lifecycle stage on a scheduled cadence (for example quarterly)
- Keep lifecycle evidence linked to supplier record for auditability
- Avoid single-owner decisioning for high-risk supplier outcomes

## Troubleshooting

### Supplier Appears in Multiple Profiles

**Symptom:** Duplicate supplier records with partial history.  
**Cause:** Onboarding happened through different channels without identity matching.  
**Solution:** Consolidate to one canonical supplier profile and re-link dependent records.

### Lifecycle Stage Not Updating

**Symptom:** Supplier remains in onboarding despite completed checks.  
**Cause:** Required qualification fields are missing or workflow conditions are unmet.  
**Solution:** Validate mandatory fields and rerun lifecycle transition conditions.

## Related Skills

- `procurement/supplier-recommendation` - Rank suppliers using scorecard criteria
- `procurement/sourcing-summarization` - Summarize sourcing events and outcomes
- `procurement/procurement-summarization` - Review procurement pipeline performance

## References

- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/source-to-pay-operations/sourcing-and-procurement-operations/create-supplier.md>
- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/source-to-pay-operations/sourcing-and-procurement-operations/supplier-qualification.md>
