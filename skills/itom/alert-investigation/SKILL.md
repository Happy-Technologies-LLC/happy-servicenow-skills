---
name: alert-investigation
version: 1.0.3
description: Deep investigation of operational alerts including CI tracing, recent change correlation, related alert analysis, knowledge base review, and remediation suggestions using LEAP methodology
author: Happy Technologies LLC
tags: [itom, alerts, investigation, root-cause, correlation, remediation, leap, event-management, change-correlation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/em_alert
    - /api/now/table/em_event
    - /api/now/table/em_alert_metric_correlation
    - /api/now/table/em_impact
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_ci_service
    - /api/now/table/change_request
    - /api/now/table/kb_knowledge
    - /api/now/table/task_ci
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# Alert Investigation

## Overview

This skill provides a structured, deep-dive investigation methodology for ServiceNow ITOM alerts using the **LEAP** framework:

- **Locate** -- Identify the alert, its source, and the affected CI
- **Examine** -- Trace CI relationships, check recent changes, review historical patterns
- **Analyze** -- Correlate with related alerts, metric data, and business impact
- **Propose** -- Suggest remediation actions based on knowledge base articles and past resolutions

Use this skill when a single alert or cluster of alerts requires root cause investigation beyond basic triage. It goes deeper than alert-analysis by focusing on individual alert forensics.

**When to use:** An operations engineer receives a Critical or Major alert and needs to understand the full blast radius, whether a recent change caused it, and what remediation steps to take.

**Plugin required:** `com.snc.event_management`

## Prerequisites

- **Roles:** `evt_mgmt_admin`, `evt_mgmt_user`, or `itil`
- **Access:** Read access to `em_alert`, `em_event`, `em_impact`, `cmdb_ci`, `cmdb_ci_service`, `change_request`, `kb_knowledge`
- **Knowledge:** Understanding of ITOM Event Management alert lifecycle, CMDB CI classes, and change management processes
- **Plugins:** `com.snc.event_management`, `com.snc.cmdb` must be activated

## Procedure

### Step 1: Locate the Alert and Gather Initial Context (LEAP - Locate)

Retrieve the full alert record including all relevant fields.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: em_alert
  sys_id: [alert_sys_id]
```

If you only have the alert number:
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: number=[alert_number]
  fields: sys_id,number,description,severity,state,source,node,ci,group_source,acknowledged,additional_info,metric_name,sys_created_on,sys_updated_on
```

**Using REST API:**
```bash
GET /api/now/table/em_alert?sysparm_query=number=[alert_number]&sysparm_fields=sys_id,number,description,severity,state,source,node,ci,group_source,acknowledged,additional_info,metric_name,sys_created_on,sys_updated_on
```

### Step 2: Trace the Affected CI and Its Relationships (LEAP - Examine)

Retrieve CI details and upstream/downstream dependencies.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: cmdb_ci
  sys_id: [ci_sys_id_from_alert]
```

Then find services this CI supports:
```
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: ci_id=[ci_sys_id]
  fields: sys_id,ci_id,service_id,type
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci/[ci_sys_id]?sysparm_fields=sys_id,name,sys_class_name,business_criticality,support_group,operational_status,environment,location
GET /api/now/table/svc_ci_assoc?sysparm_query=ci_id=[ci_sys_id]&sysparm_fields=sys_id,ci_id,service_id,type
```

### Step 3: Check Recent Changes on the Affected CI

Identify whether a recent change request could have caused the alert.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Find recent changes associated with the alerting CI
  script: |
    var ciSysId = '[ci_sys_id]';
    var gr = new GlideRecord('task_ci');
    gr.addQuery('ci_item', ciSysId);
    gr.addQuery('task.sys_class_name', 'change_request');
    gr.addQuery('task.sys_created_on', '>=', gs.daysAgo(7));
    gr.orderByDesc('task.sys_created_on');
    gr.setLimit(10);
    gr.query();

    gs.info('=== RECENT CHANGES ON CI (Last 7 Days) ===');
    while (gr.next()) {
      var chg = new GlideRecord('change_request');
      if (chg.get(gr.task)) {
        gs.info('Change: ' + chg.number +
          ' | Type: ' + chg.type.getDisplayValue() +
          ' | State: ' + chg.state.getDisplayValue() +
          ' | Short Desc: ' + chg.short_description +
          ' | Planned End: ' + chg.end_date);
      }
    }
```

**Using REST API:**
```bash
GET /api/now/table/task_ci?sysparm_query=ci_item=[ci_sys_id]^task.sys_class_name=change_request^task.sys_created_on>=javascript:gs.daysAgo(7)&sysparm_fields=task,ci_item&sysparm_limit=10
```

### Step 4: Correlate with Related Alerts (LEAP - Analyze)

Find other alerts on the same CI, same node, or same time window.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: ci=[ci_sys_id]^state!=Closed^sys_idNOT IN[current_alert_sys_id]^ORDERBYDESCsys_created_on
  fields: sys_id,number,description,severity,source,state,sys_created_on
  limit: 20
```

Check alert metric correlations:
```
Tool: SN-Query-Table
Parameters:
  table_name: em_alert_metric_correlation
  query: alert=[alert_sys_id]
  fields: sys_id,alert,metric_name,ci,correlation_strength,sys_created_on
```

Check business impact:
```
Tool: SN-Query-Table
Parameters:
  table_name: em_impact
  query: alert=[alert_sys_id]
  fields: sys_id,alert,business_service,impact_level,ci
```

**Using REST API:**
```bash
GET /api/now/table/em_alert?sysparm_query=ci=[ci_sys_id]^state!=Closed^sys_idNOT IN[current_alert_sys_id]^ORDERBYDESCsys_created_on&sysparm_limit=20
GET /api/now/table/em_alert_metric_correlation?sysparm_query=alert=[alert_sys_id]
GET /api/now/table/em_impact?sysparm_query=alert=[alert_sys_id]
```

### Step 5: Search Knowledge Base for Remediation (LEAP - Propose)

Look for existing KB articles that match the alert description or CI class.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^123TEXTQUERY321=[alert_description] remediation [ci_class_name]
```

Or query KB directly:
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: textLIKE[key_alert_terms]^workflow_state=published
  fields: sys_id,number,short_description,text,kb_knowledge_base,sys_updated_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/kb_knowledge?sysparm_query=textLIKE[key_alert_terms]^workflow_state=published&sysparm_fields=sys_id,number,short_description,text&sysparm_limit=10
```

### Step 6: Document Findings and Suggest Remediation

Update the alert with investigation notes and recommended actions.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: em_alert
  sys_id: [alert_sys_id]
  data:
    work_notes: |
      LEAP Investigation Summary:
      - LOCATE: Alert [number] from [source] on node [node], CI [ci_name]
      - EXAMINE: CI criticality [criticality], [N] related changes found, closest change [CHG_number]
      - ANALYZE: [N] correlated alerts found, impact on [N] business services
      - PROPOSE: KB article [KB_number] provides remediation steps. Recommended action: [action]
    acknowledged: true
```

**Using REST API:**
```bash
PATCH /api/now/table/em_alert/[alert_sys_id]
Content-Type: application/json

{
  "work_notes": "LEAP Investigation completed. See work notes for full analysis.",
  "acknowledged": "true"
}
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Get-Record` | Retrieve full alert or CI record by sys_id |
| `SN-Query-Table` | Search alerts, changes, KB articles, CI associations |
| `SN-Update-Record` | Document investigation findings on the alert |
| `SN-Natural-Language-Search` | Natural language search for KB remediation articles |
| `SN-Execute-Background-Script` | Complex cross-table joins and change lookups |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/em_alert` | GET/PATCH | Query and update alerts |
| `/api/now/table/em_event` | GET | Trace original raw events |
| `/api/now/table/em_alert_metric_correlation` | GET | Check metric correlations |
| `/api/now/table/em_impact` | GET | Assess business service impact |
| `/api/now/table/cmdb_ci` | GET | Retrieve CI details and criticality |
| `/api/now/table/change_request` | GET | Check recent changes |
| `/api/now/table/kb_knowledge` | GET | Search knowledge base for remediation |
| `/api/now/table/task_ci` | GET | Find changes linked to a CI |

## Best Practices

- **Follow LEAP Sequentially:** Resist jumping to remediation before completing the Locate and Examine phases -- incomplete context leads to incorrect fixes
- **Check Changes First:** In production environments, 60-80% of incidents are caused by recent changes -- always check the change history before exploring other causes
- **Correlate Before Isolating:** A single alert on a CI may be a symptom of an upstream failure; always check related alerts on parent services and infrastructure CIs
- **Use Time Windows:** When correlating, use tight time windows (1-2 hours before the alert) to avoid false correlations
- **Document Everything:** Update work_notes at each LEAP phase so other engineers can pick up the investigation
- **Preserve Alert State:** Do not close an alert until the root cause is confirmed and remediation is verified

## Troubleshooting

### Alert Has No CI Mapped

**Cause:** The event source did not include CI identification fields, or CI lookup rules failed to match.
**Solution:** Check the raw event in `em_event` table for the `ci_identifier` field. Review Event Management CI lookup rules. Manually associate the CI if identifiable from the node/source.

### No Recent Changes Found but Alert Persists

**Cause:** The issue may be environmental (capacity, network, external dependency) rather than change-related.
**Solution:** Expand the investigation to check metric correlations (`em_alert_metric_correlation`), review infrastructure CI health (CPU, memory, disk metrics), and check upstream service dependencies.

### KB Search Returns No Relevant Articles

**Cause:** The knowledge base may not have articles for this alert type.
**Solution:** After resolution, create a KB article documenting the root cause and remediation steps. Link it to the CI class and alert source for future reference.

### Correlated Alerts Belong to Different Root Causes

**Cause:** Time-based correlation can produce false positives when multiple unrelated issues occur simultaneously.
**Solution:** Validate correlations by checking whether correlated alerts share CI relationships (same service map) rather than just temporal proximity.

## Examples

### Example 1: Investigate a Critical Database Alert

```
# LEAP Step 1 - LOCATE: Retrieve the alert
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: number=AL0045123
  fields: sys_id,number,description,severity,source,node,ci,state,additional_info,sys_created_on

# LEAP Step 2 - EXAMINE: Get CI details
Tool: SN-Get-Record
Parameters:
  table_name: cmdb_ci
  sys_id: [ci_sys_id_from_alert]

# LEAP Step 2 - EXAMINE: Find recent changes
Tool: SN-Query-Table
Parameters:
  table_name: task_ci
  query: ci_item=[ci_sys_id]^task.sys_class_name=change_request^task.sys_created_on>=javascript:gs.daysAgo(3)
  fields: task,ci_item

# LEAP Step 3 - ANALYZE: Find related alerts
Tool: SN-Query-Table
Parameters:
  table_name: em_alert
  query: ci=[ci_sys_id]^state!=Closed^ORDERBYDESCsys_created_on
  fields: sys_id,number,description,severity,source
  limit: 15

# LEAP Step 4 - PROPOSE: Search KB
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: workflow_state=published^123TEXTQUERY321=database connection pool exhausted remediation Oracle
```

### Example 2: Change-Induced Alert Investigation

```
# 1. Get the alert details
Tool: SN-Get-Record
Parameters:
  table_name: em_alert
  sys_id: [alert_sys_id]

# 2. Find changes that completed within 2 hours before the alert
Tool: SN-Execute-Background-Script
Parameters:
  description: Find changes completed shortly before alert firing
  script: |
    var alert = new GlideRecord('em_alert');
    alert.get('[alert_sys_id]');
    var alertTime = alert.sys_created_on.toString();
    var ciId = alert.ci.toString();

    var twoHoursBefore = new GlideDateTime(alertTime);
    twoHoursBefore.addSeconds(-7200);

    var taskCi = new GlideRecord('task_ci');
    taskCi.addQuery('ci_item', ciId);
    taskCi.query();

    gs.info('=== CHANGES NEAR ALERT TIME ===');
    while (taskCi.next()) {
      var chg = new GlideRecord('change_request');
      if (chg.get(taskCi.task)) {
        var closeTime = chg.closed_at.toString();
        if (closeTime >= twoHoursBefore.toString() && closeTime <= alertTime) {
          gs.info('SUSPECT CHANGE: ' + chg.number +
            ' | Closed: ' + closeTime +
            ' | Type: ' + chg.type.getDisplayValue() +
            ' | Desc: ' + chg.short_description);
        }
      }
    }
```

### Example 3: Multi-Service Impact Assessment

```
# 1. Check business impact records
Tool: SN-Query-Table
Parameters:
  table_name: em_impact
  query: alert=[alert_sys_id]
  fields: sys_id,business_service,impact_level,ci

# 2. For each impacted service, check service criticality
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_service
  query: sys_idIN[service_sys_ids_from_impact]
  fields: sys_id,name,business_criticality,owned_by,operational_status
```

## Related Skills

- `itom/alert-analysis` -- Bulk alert triage, noise reduction, and suppression rules
- `itom/service-mapping` -- Understand service dependencies behind alerting CIs
- `itom/health-log-analytics` -- Anomaly detection and log-based root cause analysis
- `itom/observability-integration` -- Ingest and normalize alerts from external monitoring tools
- `cmdb/impact-analysis` -- Broader CI impact and dependency analysis
- `itsm/change-management` -- Change request lifecycle and risk assessment
