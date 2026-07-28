---
name: predict-assignment
version: 1.0.1
description: Predict assignment group and category for incoming incidents using historical patterns, keyword analysis, and resolution data to accelerate routing
author: Happy Technologies LLC
tags: [itsm, incident, assignment, prediction, routing, pattern-matching, zero-touch, automation]
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
    - /api/now/table/sys_user_group
    - /api/now/table/sys_choice
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Predict Assignment

## Overview

This skill predicts the most appropriate assignment group and category for incoming incidents by analyzing historical resolution patterns, keyword frequency, and group performance metrics. It enables zero-touch routing for the service desk.

- Analyze incoming incident short descriptions and descriptions for keyword signals
- Query historical incidents with similar text to determine which groups resolved them
- Rank candidate assignment groups by resolution success rate and average resolution time
- Predict incident category and subcategory based on content analysis
- Apply predicted assignment with confidence scoring and fallback routing
- Track prediction accuracy over time and refine routing rules

**When to use:** When new incidents arrive unassigned or miscategorized, and you want to reduce manual triage time by automatically predicting the correct assignment group and category.

## Prerequisites

- **Roles:** `itil`, `incident_manager`, or `assignment_rule_admin`
- **Plugins:** `com.snc.incident` (Incident Management)
- **Access:** Read/write on `incident`, read on `sys_user_group`, `sys_choice`, `sn_agent_workspace`, `sys_cs_channel`
- **Knowledge:** Familiarity with your organization's support group structure and category taxonomy
- **Data:** At least 3-6 months of resolved incident data for reliable predictions

## Procedure

### Step 1: Retrieve the Incoming Incident

Fetch the new or unassigned incident that needs routing.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Natural-Language-Search
Parameters:
  table: incident
  query: "active incidents in new state where assignment group is empty"
  fields: sys_id,number,short_description,description,category,subcategory,contact_type,caller_id,cmdb_ci,priority
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=true^state=1^assignment_groupISEMPTY&sysparm_fields=sys_id,number,short_description,description,category,subcategory,contact_type,caller_id,cmdb_ci,priority&sysparm_limit=25
```

### Step 2: Extract Keywords and Signals

Parse the incident short description and description to extract routing signals:

| Signal Type | Examples | Weight |
|------------|---------|--------|
| Technology keywords | VPN, SAP, Exchange, Oracle, AWS | 0.35 |
| Symptom keywords | crash, slow, error, timeout, outage | 0.20 |
| Infrastructure terms | server, database, network, firewall, load balancer | 0.25 |
| Business context | payroll, invoice, order, shipping, compliance | 0.20 |

Build a signal vector from the incident text for matching against historical data.

### Step 3: Query Historical Incidents for Pattern Matching

Find resolved incidents with similar descriptions to determine routing patterns.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: state=6^resolved_atONLast 180 days@javascript:gs.daysAgoStart(180)@javascript:gs.daysAgoEnd(0)^short_descriptionLIKE[primary_keyword]^assignment_groupISNOTEMPTY
  fields: sys_id,number,short_description,category,subcategory,assignment_group,resolved_by,resolve_time
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=state=6^resolved_atONLast 180 days@javascript:gs.daysAgoStart(180)@javascript:gs.daysAgoEnd(0)^short_descriptionLIKE[primary_keyword]^assignment_groupISNOTEMPTY&sysparm_fields=sys_id,number,short_description,category,subcategory,assignment_group,resolved_by,resolve_time&sysparm_limit=50
```

### Step 4: Rank Candidate Assignment Groups

Aggregate historical results to rank groups by suitability:

**Scoring formula:**
```
group_score = (frequency * 0.40) + (success_rate * 0.30) + (speed_score * 0.30)
```

Where:
- **frequency**: How often this group resolved similar incidents (normalized 0-1)
- **success_rate**: Percentage of incidents resolved without reassignment (0-1)
- **speed_score**: Inverse of average resolution time relative to SLA (0-1)

| Rank | Assignment Group | Frequency | Success Rate | Avg Resolve Time | Score |
|------|-----------------|-----------|-------------|-----------------|-------|
| 1 | Network Operations | 34/50 | 94% | 2.1 hours | 0.91 |
| 2 | Infrastructure Team | 10/50 | 88% | 3.4 hours | 0.72 |
| 3 | Service Desk L2 | 6/50 | 70% | 8.2 hours | 0.48 |

### Step 5: Predict Category and Subcategory

Query the valid category/subcategory combinations and match based on content:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_choice
  query: name=incident^element=category^inactive=false
  fields: sys_id,label,value
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_choice?sysparm_query=name=incident^element=category^inactive=false&sysparm_fields=sys_id,label,value&sysparm_limit=100
```

Cross-reference the extracted keywords with the category most frequently associated with similar historical incidents.

### Step 6: Validate Against Agent Workspace Context

Check if the incident originated from Agent Workspace or a conversational channel for additional context:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_channel
  query: source_record=[incident_sys_id]
  fields: sys_id,channel_type,conversation,state
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_channel?sysparm_query=source_record=[incident_sys_id]&sysparm_fields=sys_id,channel_type,conversation,state&sysparm_limit=5
```

### Step 7: Apply Predicted Assignment

Apply the top-ranked assignment group and predicted category to the incident:

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    assignment_group: [predicted_group_sys_id]
    category: network
    subcategory: vpn
    state: 2
```

**Using REST API:**
```bash
PATCH /api/now/table/incident/{sys_id}
Content-Type: application/json

{
  "assignment_group": "[predicted_group_sys_id]",
  "category": "network",
  "subcategory": "vpn",
  "state": "2"
}
```

### Step 8: Document Prediction Rationale

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === PREDICTIVE ASSIGNMENT ANALYSIS ===
    Model: Keyword-Historical Pattern v1.0

    Keywords Detected: "VPN", "disconnect", "remote"
    Signal Category: Network / VPN

    Assignment Group Predictions:
    1. Network Operations (score: 0.91, confidence: HIGH)
       - 34/50 similar incidents resolved by this group
       - 94% first-touch resolution rate
       - Avg resolution: 2.1 hours
    2. Infrastructure Team (score: 0.72, confidence: MEDIUM)
    3. Service Desk L2 (score: 0.48, confidence: LOW)

    Category Prediction: Network > VPN
    Based on: 68% of similar incidents categorized as Network/VPN

    Action Taken: Assigned to Network Operations (highest score)
    Fallback: Infrastructure Team if reassigned within 30 minutes
```

### Step 9: Track Prediction Accuracy

Monitor reassignment rates to measure prediction quality:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: work_notesLIKEPREDICTIVE ASSIGNMENT^sys_updated_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,assignment_group,reassignment_count,state
  limit: 200
```

Key metrics to track:
- **First-touch accuracy**: Percentage of predictions not reassigned
- **Category accuracy**: Percentage of predicted categories not changed
- **Routing time saved**: Time from creation to assignment vs. manual baseline
- **Reassignment rate**: How often predicted assignments are overridden

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Natural-Language-Search` | Find unassigned incidents in natural language | Initial candidate discovery |
| `SN-Query-Table` | Query historical data, categories, groups | Pattern analysis and validation |
| `SN-Update-Record` | Apply predicted assignment and category | Routing the incident |
| `SN-Add-Work-Notes` | Document prediction rationale | Audit trail and transparency |
| `SN-Get-Table-Schema` | Discover incident and group fields | Setup and configuration |

## Best Practices

1. **Require minimum data** -- do not predict if short_description is fewer than 3 words
2. **Set confidence thresholds** -- only auto-assign when score >= 0.75; otherwise flag for review
3. **Never override manual assignments** -- if a human already assigned the group, do not overwrite
4. **Respect priority escalation** -- P1 incidents should always involve human confirmation
5. **Retrain regularly** -- recalculate keyword-group associations monthly as teams change
6. **Handle new categories gracefully** -- default to Service Desk L2 when no historical match
7. **Consider CI relationships** -- if cmdb_ci is populated, use its support group as a strong signal
8. **Monitor drift** -- alert when prediction accuracy drops below 80%

## Troubleshooting

### "Prediction always routes to the same group"

**Cause:** One group historically resolves the majority of incidents, skewing frequency scores
**Solution:** Apply frequency dampening or normalize per-category instead of globally.

### "Category prediction does not match subcategory"

**Cause:** Category and subcategory have a parent-child relationship not enforced in prediction
**Solution:** Query `sys_choice` with dependent_value to ensure valid combinations.

### "Low confidence on most predictions"

**Cause:** Insufficient historical data or descriptions too vague
**Solution:** Increase the historical data window, or combine with CI-based routing for stronger signals.

### "Agent Workspace context not found"

**Cause:** Incident was not created via Agent Workspace or Virtual Agent
**Solution:** This is expected for portal or email-created incidents. Fall back to text-only analysis.

## Examples

### Example 1: VPN Connectivity Incident

**Input:** INC0078901 - "VPN keeps dropping when connected to corporate network"

**Analysis:**
- Keywords: "VPN", "dropping", "connected", "corporate network"
- Historical match: 42 similar incidents, 36 resolved by Network Operations
- Category prediction: Network > VPN (86% confidence)
- Top group: Network Operations (score: 0.93)

**Action:** Assign to Network Operations, category Network/VPN.

### Example 2: SAP Authorization Error

**Input:** INC0078902 - "SAP transaction SU01 returning authorization failure for user JSMITH"

**Analysis:**
- Keywords: "SAP", "transaction", "SU01", "authorization"
- Historical match: 28 similar incidents, 24 resolved by SAP Basis Team
- Category prediction: Software > ERP (91% confidence)
- Top group: SAP Basis Team (score: 0.95)

**Action:** Assign to SAP Basis Team, category Software/ERP.

### Example 3: Ambiguous Request

**Input:** INC0078903 - "Something is not working"

**Analysis:**
- Keywords: none specific detected
- Historical match: insufficient signal
- Confidence: 0.22 (below threshold)

**Action:** Flag for manual triage. Add work note: "Insufficient detail for predictive assignment. Recommend contacting caller for clarification."

## Related Skills

- `itsm/incident-triage` - Manual triage and prioritization
- `itsm/case-auto-resolve` - Auto-resolve after assignment
- `itsm/incident-lifecycle` - Full incident management workflow
- `itsm/suggested-steps` - Generate resolution steps for assigned incidents
- `itsm/incident-sentiment` - Analyze sentiment to prioritize routing
