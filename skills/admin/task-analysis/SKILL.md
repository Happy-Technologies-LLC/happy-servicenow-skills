---
name: task-analysis
version: 1.0.0
description: Analyze task trends, identify bottlenecks, predict SLA breaches, and recommend workload redistribution
author: Happy Technologies LLC
tags: [admin, task, analysis, bottleneck, sla, workload, trends, capacity, planning]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/task
    - /api/now/table/sc_task
    - /api/now/table/planned_task
    - /api/now/table/task_sla
    - /api/now/table/sys_user_group
    - /api/now/table/cmn_schedule
  native:
    - Bash
complexity: intermediate
estimated_time: 15-35 minutes
---

# Task Analysis

## Overview

This skill provides comprehensive analysis of task data across ServiceNow to identify operational patterns and optimize work distribution. It covers:

- Analyzing task volume trends across `task`, `sc_task`, and `planned_task` tables
- Identifying bottleneck assignment groups and individuals with excessive workloads
- Predicting SLA breaches by analyzing `task_sla` records and current task aging
- Recommending workload redistribution based on capacity and skill alignment
- Generating task health dashboards with key performance indicators
- Detecting patterns in task reassignment, escalation, and resolution times

**When to use:** When managers need visibility into team workload distribution, when SLA compliance is trending downward, when planning capacity for upcoming projects, or when identifying systemic bottlenecks in task fulfillment.

**Value proposition:** Proactive task analysis prevents SLA breaches, balances workload across teams, and provides data-driven input for staffing and process improvement decisions.

## Prerequisites

- **Roles:** `itil`, `task_admin`, `assignment_group_manager`, or `admin`
- **Access:** Read access to `task`, `sc_task`, `planned_task`, `task_sla`, `sys_user_group`, and `sys_user` tables
- **Knowledge:** Understanding of task lifecycle states, SLA definitions, and organizational assignment group structure

## Procedure

### Step 1: Assess Current Task Volume and State Distribution

Get a snapshot of active tasks across all task types.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Task volume snapshot by type and state
  script: |
    var snapshot = { timestamp: new GlideDateTime().getDisplayValue(), task_types: [] };
    var tables = ['incident', 'sc_task', 'change_request', 'problem', 'sc_req_item'];

    tables.forEach(function(tableName) {
      var typeData = { table: tableName, states: {} };
      var ga = new GlideAggregate(tableName);
      ga.addQuery('active', true);
      ga.addAggregate('COUNT');
      ga.groupBy('state');
      ga.query();

      var total = 0;
      while (ga.next()) {
        var state = ga.state.getDisplayValue();
        var count = parseInt(ga.getAggregate('COUNT'));
        typeData.states[state] = count;
        total += count;
      }
      typeData.total_active = total;
      snapshot.task_types.push(typeData);
    });

    gs.info(JSON.stringify(snapshot, null, 2));
```

**Using REST API (for a specific task type):**
```bash
GET /api/now/table/sc_task?sysparm_query=active=true&sysparm_fields=sys_id,number,state,assignment_group,assigned_to,priority,opened_at,sla_due&sysparm_limit=100&sysparm_display_value=true
```

### Step 2: Identify Assignment Group Bottlenecks

Find groups with disproportionately high task volumes or aging tasks.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Identify bottleneck assignment groups
  script: |
    var bottlenecks = [];

    var ga = new GlideAggregate('task');
    ga.addQuery('active', true);
    ga.addQuery('assignment_group', 'ISNOTEMPTY', '');
    ga.addAggregate('COUNT');
    ga.addAggregate('AVG', 'reassignment_count');
    ga.groupBy('assignment_group');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.query();

    while (ga.next()) {
      var groupId = ga.assignment_group.toString();
      var count = parseInt(ga.getAggregate('COUNT'));

      // Get average age of active tasks
      var ageGa = new GlideAggregate('task');
      ageGa.addQuery('active', true);
      ageGa.addQuery('assignment_group', groupId);
      ageGa.addAggregate('AVG', 'sys_mod_count');
      ageGa.query();

      var avgAge = 0;
      if (ageGa.next()) {
        avgAge = parseInt(ageGa.getAggregate('AVG', 'sys_mod_count'));
      }

      // Get group member count
      var members = new GlideAggregate('sys_user_grmember');
      members.addQuery('group', groupId);
      members.addQuery('user.active', true);
      members.addAggregate('COUNT');
      members.query();
      var memberCount = 0;
      if (members.next()) memberCount = parseInt(members.getAggregate('COUNT'));

      bottlenecks.push({
        group: ga.assignment_group.getDisplayValue(),
        active_tasks: count,
        active_members: memberCount,
        tasks_per_person: memberCount > 0 ? (count / memberCount).toFixed(1) : 'N/A',
        avg_reassignments: parseFloat(ga.getAggregate('AVG', 'reassignment_count')).toFixed(1)
      });
    }

    // Sort by tasks per person descending
    bottlenecks.sort(function(a, b) {
      return parseFloat(b.tasks_per_person) - parseFloat(a.tasks_per_person);
    });

    gs.info(JSON.stringify(bottlenecks.slice(0, 20), null, 2));
```

### Step 3: Predict SLA Breaches

Analyze task SLA records to identify tasks at risk of breaching.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: stage=in_progress^has_breached=false^planned_end_time<=javascript:gs.hoursAgoEnd(-24)
  fields: sys_id,task,task.number,task.short_description,task.assignment_group,task.assigned_to,task.priority,sla,planned_end_time,percentage,business_percentage,stage
  limit: 50
  order_by: planned_end_time
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=stage=in_progress^has_breached=false^planned_end_time<=javascript:gs.hoursAgoEnd(-24)&sysparm_fields=sys_id,task,task.number,task.short_description,task.assignment_group,task.assigned_to,task.priority,sla,planned_end_time,percentage,business_percentage&sysparm_limit=50&sysparm_display_value=true
```

**Analyze breach risk by group:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: SLA breach risk analysis by assignment group
  script: |
    var riskAnalysis = [];

    var ga = new GlideAggregate('task_sla');
    ga.addQuery('stage', 'in_progress');
    ga.addQuery('has_breached', false);
    ga.addQuery('business_percentage', '>=', 75);
    ga.addAggregate('COUNT');
    ga.groupBy('task.assignment_group');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.query();

    while (ga.next()) {
      var group = ga.getValue('task.assignment_group');
      var atRisk = parseInt(ga.getAggregate('COUNT'));

      // Count already breached
      var breached = new GlideAggregate('task_sla');
      breached.addQuery('stage', 'in_progress');
      breached.addQuery('has_breached', true);
      breached.addQuery('task.assignment_group', group);
      breached.addAggregate('COUNT');
      breached.query();
      var breachedCount = 0;
      if (breached.next()) breachedCount = parseInt(breached.getAggregate('COUNT'));

      riskAnalysis.push({
        group: ga.getDisplayValue('task.assignment_group'),
        at_risk_75_plus: atRisk,
        already_breached: breachedCount,
        total_exposure: atRisk + breachedCount
      });
    }

    gs.info(JSON.stringify(riskAnalysis, null, 2));
```

### Step 4: Analyze Individual Workload Distribution

Examine workload per team member within an assignment group.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Individual workload analysis for assignment group
  script: |
    var groupId = '[group_sys_id]';
    var workload = [];

    var ga = new GlideAggregate('task');
    ga.addQuery('active', true);
    ga.addQuery('assignment_group', groupId);
    ga.addQuery('assigned_to', 'ISNOTEMPTY', '');
    ga.addAggregate('COUNT');
    ga.groupBy('assigned_to');
    ga.orderByAggregate('COUNT', 'DESC');
    ga.query();

    while (ga.next()) {
      var userId = ga.assigned_to.toString();

      // Get priority breakdown
      var priorities = {};
      var pa = new GlideAggregate('task');
      pa.addQuery('active', true);
      pa.addQuery('assigned_to', userId);
      pa.addAggregate('COUNT');
      pa.groupBy('priority');
      pa.query();
      while (pa.next()) {
        priorities['P' + pa.priority.toString()] = parseInt(pa.getAggregate('COUNT'));
      }

      // Count tasks with SLA at risk
      var slaRisk = new GlideAggregate('task_sla');
      slaRisk.addQuery('task.assigned_to', userId);
      slaRisk.addQuery('stage', 'in_progress');
      slaRisk.addQuery('business_percentage', '>=', 75);
      slaRisk.addAggregate('COUNT');
      slaRisk.query();
      var riskCount = 0;
      if (slaRisk.next()) riskCount = parseInt(slaRisk.getAggregate('COUNT'));

      workload.push({
        user: ga.assigned_to.getDisplayValue(),
        active_tasks: parseInt(ga.getAggregate('COUNT')),
        priorities: priorities,
        sla_at_risk: riskCount
      });
    }

    // Unassigned tasks
    var unassigned = new GlideAggregate('task');
    unassigned.addQuery('active', true);
    unassigned.addQuery('assignment_group', groupId);
    unassigned.addQuery('assigned_to', 'ISEMPTY', '');
    unassigned.addAggregate('COUNT');
    unassigned.query();
    var unassignedCount = 0;
    if (unassigned.next()) unassignedCount = parseInt(unassigned.getAggregate('COUNT'));

    var result = {
      group: '[group_name]',
      members: workload,
      unassigned_tasks: unassignedCount
    };

    gs.info(JSON.stringify(result, null, 2));
```

### Step 5: Analyze Task Trends Over Time

Track task creation, completion, and backlog growth trends.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Weekly task trend analysis
  script: |
    var trends = [];

    for (var i = 7; i >= 0; i--) {
      var weekStart = gs.daysAgoStart(i * 7);
      var weekEnd = gs.daysAgoEnd((i - 1) * 7);

      var week = { period: 'Week -' + i, created: 0, closed: 0, backlog: 0 };

      // Created
      var created = new GlideAggregate('task');
      created.addQuery('opened_at', '>=', weekStart);
      created.addQuery('opened_at', '<=', weekEnd);
      created.addAggregate('COUNT');
      created.query();
      if (created.next()) week.created = parseInt(created.getAggregate('COUNT'));

      // Closed
      var closed = new GlideAggregate('task');
      closed.addQuery('closed_at', '>=', weekStart);
      closed.addQuery('closed_at', '<=', weekEnd);
      closed.addAggregate('COUNT');
      closed.query();
      if (closed.next()) week.closed = parseInt(closed.getAggregate('COUNT'));

      week.net_change = week.created - week.closed;
      trends.push(week);
    }

    // Current backlog
    var backlog = new GlideAggregate('task');
    backlog.addQuery('active', true);
    backlog.addAggregate('COUNT');
    backlog.query();
    var currentBacklog = 0;
    if (backlog.next()) currentBacklog = parseInt(backlog.getAggregate('COUNT'));

    var result = {
      current_backlog: currentBacklog,
      weekly_trends: trends
    };

    gs.info(JSON.stringify(result, null, 2));
```

### Step 6: Generate Workload Redistribution Recommendations

Based on the analysis, produce actionable recommendations.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sys_user_group
  sys_id: [group_sys_id]
  work_notes: |
    === TASK ANALYSIS & WORKLOAD REPORT ===
    Group: Service Desk Team A
    Date: 2026-03-19

    CURRENT STATE:
    - Active tasks: 87
    - Unassigned: 12
    - Members: 8 active
    - Average per person: 10.9 tasks

    WORKLOAD DISTRIBUTION:
    - Alice Johnson: 18 tasks (5 P1/P2) - OVERLOADED
    - Bob Smith: 15 tasks (3 P1/P2)
    - Carol Davis: 12 tasks (2 P1/P2)
    - Dan Wilson: 11 tasks (1 P1/P2)
    - Eve Martinez: 10 tasks (2 P1/P2)
    - Frank Lee: 8 tasks (0 P1/P2)
    - Grace Chen: 7 tasks (1 P1/P2)
    - Henry Patel: 6 tasks (0 P1/P2) - CAPACITY AVAILABLE

    SLA RISK:
    - 14 tasks at 75%+ SLA consumption (breach within 24 hours)
    - 3 tasks already breached
    - Highest risk: Alice Johnson (5 tasks at risk)

    TRENDS (8 weeks):
    - Creation rate: 45/week average (trending up +8%)
    - Closure rate: 41/week average (stable)
    - Backlog growing at ~4 tasks/week

    RECOMMENDATIONS:
    1. IMMEDIATE: Redistribute 5 tasks from Alice to Henry/Grace (capacity available)
    2. IMMEDIATE: Assign 12 unassigned tasks prioritizing SLA-at-risk items
    3. SHORT-TERM: Backlog growing - request 1 additional team member or cross-train
    4. PROCESS: Investigate high reassignment rate (avg 2.3 per task) - routing rules may need tuning
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query tasks, SLAs, groups, and assignments |
| `SN-Get-Record` | Retrieve individual task or group details |
| `SN-Natural-Language-Search` | Find tasks matching natural language descriptions |
| `SN-Execute-Background-Script` | Complex aggregations, trend analysis, workload calculations |
| `SN-Add-Work-Notes` | Post analysis reports and recommendations |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/task` | GET | Query tasks across all types |
| `/api/now/table/sc_task` | GET | Query catalog tasks specifically |
| `/api/now/table/planned_task` | GET | Query planned/project tasks |
| `/api/now/table/task_sla` | GET | Analyze SLA status and breach risk |
| `/api/now/table/sys_user_group` | GET | Get assignment group details |
| `/api/now/stats/task` | GET | Use Stats API for server-side aggregation |

## Best Practices

- **Analyze at the right level:** Use specific task tables (`incident`, `sc_task`) for type-specific analysis; use `task` for cross-type views
- **Normalize by team size:** Always show tasks-per-person alongside total counts to identify true bottlenecks
- **Consider business hours:** Use `business_percentage` from `task_sla` rather than calendar elapsed time for SLA analysis
- **Look at reassignment patterns:** High reassignment counts indicate routing or skills mismatch issues
- **Track unassigned tasks separately:** Unassigned tasks are invisible bottlenecks; always surface them
- **Set threshold alerts:** Define clear thresholds (e.g., >15 tasks/person, >80% SLA consumption) for automated alerting
- **Include capacity context:** Factor in PTO, training days, and part-time schedules when analyzing workload
- **Pair with action:** Every analysis should produce at least one specific, implementable recommendation

## Troubleshooting

### Task Counts Do Not Match Dashboard

**Cause:** Dashboard may use different filters (e.g., excluding certain states or task types)
**Solution:** Compare the exact query used in the dashboard widget with your analysis query. Check for access controls that may filter results differently per user.

### SLA Data Shows Unexpected Values

**Cause:** SLA definitions may have changed, or retroactive SLA attachments are affecting calculations
**Solution:** Check `task_sla.sla` reference to verify the correct SLA definition is attached. Review `has_breached` vs `stage` for accurate status.

### Assignment Group Member Count Incorrect

**Cause:** Inactive users may still be group members, or users may have multiple group memberships
**Solution:** Filter `sys_user_grmember` with `user.active=true` and check for duplicate memberships.

### Trend Data Shows Gaps

**Cause:** No tasks were created or closed during certain periods, or data archiving removed historical records
**Solution:** Include zero-count periods in trend output. Check if table rotation or archiving is configured for task tables.

## Examples

### Example 1: Weekly Operations Review Data

**Input:** "Prepare task analysis data for the weekly ops review meeting"

**Process:** Run Steps 1, 2, 5, and 6 to generate a comprehensive snapshot with volume, bottlenecks, trends, and recommendations.

### Example 2: SLA Breach Prevention

**Input:** "Which tasks are about to breach SLA in the next 24 hours?"

```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: stage=in_progress^has_breached=false^planned_end_time<=javascript:gs.hoursAgoEnd(-24)^planned_end_time>=javascript:gs.beginningOfToday()
  fields: task.number,task.short_description,task.assigned_to,task.assignment_group,planned_end_time,business_percentage
  limit: 30
  order_by: planned_end_time
```

### Example 3: New Manager Onboarding

**Input:** "I just took over Team B. Show me the current state of the team's work."

**Process:** Run Steps 2, 4, and 5 filtered to the specific group, generating a complete workload profile with per-person breakdown, SLA risks, and 8-week trends.

## Related Skills

- `reporting/sla-analysis` - Detailed SLA performance analysis
- `reporting/trend-analysis` - General trend analysis capabilities
- `reporting/executive-dashboard` - Executive-level reporting
- `itsm/incident-lifecycle` - Incident-specific task management
- `catalog/request-fulfillment` - Catalog task fulfillment workflows
- `admin/workflow-creation` - Automate task routing and escalation
