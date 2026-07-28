---
name: task-summarization
version: 1.0.0
description: Generate concise task summaries with status, timeline, blockers, SLA risk, and recommended next actions
author: Happy Technologies LLC
tags: [admin, task, summarization, handover, approvals, sla, operations]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Read-Record
    - SN-Query-Table
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/task
    - /api/now/table/sys_journal_field
    - /api/now/table/task_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Task Summarization

## Overview

This skill produces consistent task summaries for handoff, approvals, and management reviews in ServiceNow®. Each summary includes:

- Current status and owner
- Timeline of key events
- Latest customer/agent activity
- SLA exposure and urgency
- Open blockers and next actions

Use this when teams need fast context transfer without reading full activity streams.

## Prerequisites

- **Roles:** `itil`, `task_admin`, or `admin`
- **Access:** Read access to `task`, `task_sla`, and `sys_journal_field`
- **Input:** Target task number or sys_id and intended audience (resolver, approver, manager)

## Procedure

### Step 1: Read Core Task Context

Retrieve the primary task fields required for summary framing.

**Using MCP:**
```
Tool: SN-Read-Record
Parameters:
  table_name: task
  sys_id: [task_sys_id]
  fields: number,short_description,state,priority,assignment_group,assigned_to,opened_at,due_date,sys_updated_on
```

### Step 2: Pull Recent Activity and Work Notes

Collect the latest journal updates to build an accurate timeline.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=task^element_id=[task_sys_id]^ORDERBYDESCsys_created_on
  fields: element,value,sys_created_on,sys_created_by
  limit: 30
```

### Step 3: Evaluate SLA Risk

Determine if the task is at risk of breach or already breached.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=[task_sys_id]^stage=in_progress
  fields: sla,planned_end_time,business_percentage,has_breached
  limit: 10
```

Decision points:
- If `has_breached=true` -> include breach reason and recovery action
- If `business_percentage>=80` -> mark as urgent follow-up
- Otherwise -> keep as standard monitoring

### Step 4: Generate Audience-Specific Summary

Tailor summary depth by audience:
- **Resolver:** technical updates, blockers, dependencies
- **Approver:** business impact, decision needed, risk if delayed
- **Manager:** status trend, SLA risk, ownership alignment

### Step 5: Save Summary to Work Notes

Store output where downstream stakeholders can reuse it.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: task
  sys_id: [task_sys_id]
  work_notes: |
    TASK SUMMARY
    - Status:
    - Latest update:
    - SLA risk:
    - Blockers:
    - Next action:
```

## Tool Usage

| Tool | Purpose |
|---|---|
| `SN-Read-Record` | Get canonical task context |
| `SN-Query-Table` | Retrieve journals and SLA details |
| `SN-Execute-Background-Script` | Build aggregated timelines for complex tasks |
| `SN-Add-Work-Notes` | Persist summary in task history |

## Best Practices

- Always include timestamp and summary author context
- Keep summaries factual; separate facts from recommendations
- Call out unresolved dependencies explicitly
- Use consistent summary sections for easier comparison across tasks
- Re-summarize after major state or owner transitions

## Troubleshooting

### Summary Misses Critical Context

**Symptom:** Key issue details are absent from the generated summary.  
**Cause:** Journal query window is too short or excludes relevant elements.  
**Solution:** Increase journal limit and include both comments and work notes.

### Conflicting Status Signals

**Symptom:** Task state and SLA risk appear contradictory.  
**Cause:** State updated without corresponding SLA recalculation yet.  
**Solution:** Re-query `task_sla` and compare with latest task update timestamp.

## Related Skills

- `admin/task-analysis` - Analyze task trends and bottlenecks
- `itsm/incident-activity-summarization` - Summarize incident-specific activity streams
- `catalog/approval-summarization` - Summaries tailored for approval workflows

## References

- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/it-service-management/now-assist-for-it-service-management-itsm/now-assist-itsm-skills.md>
- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/field-service-management/now-assist-for-field-service-management-fsm/cust-now-assist-fsm-wot-summarization-skill.md>
