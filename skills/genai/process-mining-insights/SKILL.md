---
name: process-mining-insights
version: 1.0.1
description: Generate process mining insights to identify inefficiencies, bottlenecks, compliance deviations, and optimization opportunities from ServiceNow process data
author: Happy Technologies LLC
tags: [genai, process-mining, bottleneck, compliance, optimization, analytics, workflow, efficiency]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sn_process_mining_process
    - /api/now/table/sn_process_mining_variant
    - /api/now/table/sn_process_mining_activity
    - /api/now/table/sn_process_mining_case
    - /api/now/table/sn_process_mining_transition
    - /api/now/table/sn_process_mining_filter
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Process Mining Insights

## Overview

This skill generates actionable insights from ServiceNow Process Mining data by analyzing process variants, identifying bottlenecks, detecting compliance deviations, and recommending optimization opportunities. It transforms raw process data into decision-ready intelligence.

- Retrieve and analyze process definitions, variants, and activity data
- Identify bottleneck activities where cases spend disproportionate time
- Detect compliance deviations: skipped steps, out-of-order activities, unauthorized actors
- Compare variant performance to identify the most efficient process paths
- Calculate process KPIs: throughput time, rework rate, automation potential
- Generate optimization recommendations with estimated impact

**When to use:** When analyzing business process efficiency, investigating process compliance, preparing process improvement proposals, or building executive dashboards for process performance.

## Prerequisites

- **Roles:** `process_mining_admin`, `process_mining_analyst`, or `admin`
- **Plugins:** `com.snc.process_mining` (Process Mining)
- **Access:** Read on `sn_process_mining_process`, `sn_process_mining_variant`, `sn_process_mining_activity`, `sn_process_mining_case`
- **Knowledge:** Understanding of process mining concepts (variants, activities, transitions, conformance)
- **Data:** At least one process mining project with imported event data

## Procedure

### Step 1: Retrieve Process Definitions

List available process mining projects and their metadata.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_process_mining_process
  query: active=true
  fields: sys_id,name,description,source_table,total_cases,total_variants,total_activities,created_on,updated_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_process_mining_process?sysparm_query=active=true&sysparm_fields=sys_id,name,description,source_table,total_cases,total_variants,total_activities,created_on,updated_on&sysparm_limit=20
```

### Step 2: Analyze Process Variants

Retrieve variants sorted by frequency to understand the most common process paths.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_process_mining_variant
  query: process=[process_sys_id]^ORDERBYDESCcase_count
  fields: sys_id,name,process,case_count,avg_duration,median_duration,activity_sequence,conformance_status
  limit: 25
```

**Using REST API:**
```bash
GET /api/now/table/sn_process_mining_variant?sysparm_query=process=[process_sys_id]^ORDERBYDESCcase_count&sysparm_fields=sys_id,name,process,case_count,avg_duration,median_duration,activity_sequence,conformance_status&sysparm_limit=25
```

Key variant analysis:

| Variant | Cases | Avg Duration | Conformance | Notes |
|---------|-------|-------------|-------------|-------|
| Happy Path | 1,245 | 2.3 days | Compliant | Ideal process flow |
| With Rework | 389 | 6.1 days | Deviated | Loop between Review and Fix |
| Skipped Approval | 67 | 1.1 days | Non-compliant | Missing manager approval |
| Emergency Path | 42 | 0.4 days | Compliant | Expedited with justification |

### Step 3: Identify Bottleneck Activities

Query activity-level data to find where cases spend the most time.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_process_mining_activity
  query: process=[process_sys_id]^ORDERBYDESCavg_duration
  fields: sys_id,name,process,case_count,avg_duration,median_duration,min_duration,max_duration,avg_wait_time
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_process_mining_activity?sysparm_query=process=[process_sys_id]^ORDERBYDESCavg_duration&sysparm_fields=sys_id,name,process,case_count,avg_duration,median_duration,min_duration,max_duration,avg_wait_time&sysparm_limit=20
```

Bottleneck identification criteria:
- **Duration bottleneck**: Activity avg_duration > 2x the process average
- **Wait bottleneck**: Activity avg_wait_time > avg processing time (waiting, not working)
- **Volume bottleneck**: Activity case_count significantly higher than downstream (queue buildup)
- **Variance bottleneck**: max_duration / min_duration > 10x (inconsistent execution)

### Step 4: Analyze Transitions Between Activities

Examine how cases flow between activities to detect rework loops and unusual paths.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_process_mining_transition
  query: process=[process_sys_id]^ORDERBYDESCcase_count
  fields: sys_id,source_activity,target_activity,case_count,avg_duration,process
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sn_process_mining_transition?sysparm_query=process=[process_sys_id]^ORDERBYDESCcase_count&sysparm_fields=sys_id,source_activity,target_activity,case_count,avg_duration,process&sysparm_limit=50
```

Look for:
- **Rework loops**: Transitions where target_activity appears earlier in the expected sequence
- **Skip patterns**: Expected transitions with zero or very low case counts
- **Unusual paths**: Transitions not present in the reference model

### Step 5: Detect Compliance Deviations

Compare actual process execution against the reference (happy path) model.

**Deviation categories:**

| Type | Description | Risk Level |
|------|-------------|------------|
| Skipped activity | Required step was bypassed entirely | High |
| Out-of-order execution | Activities performed in wrong sequence | Medium |
| Unauthorized actor | Activity performed by someone without proper role | Critical |
| Excessive rework | Activity repeated more than threshold (e.g., 3 times) | Medium |
| SLA breach | Activity duration exceeded defined SLA | High |
| Missing documentation | Required notes or attachments not present | Low |

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_process_mining_variant
  query: process=[process_sys_id]^conformance_status=non_compliant
  fields: sys_id,name,case_count,activity_sequence,conformance_status,deviation_details
  limit: 20
```

### Step 6: Calculate Process KPIs

Derive key performance indicators from the process data:

```
=== PROCESS MINING KPI DASHBOARD ===
Process: Incident Management
Period: Last 90 days

Throughput Metrics:
  Total Cases:           1,743
  Avg Cycle Time:        3.2 days
  Median Cycle Time:     1.8 days
  90th Percentile:       8.4 days

Efficiency Metrics:
  Happy Path Rate:       71.4% (1,245/1,743)
  Rework Rate:           22.3% (389 cases with loops)
  First-Time-Right:      77.7%
  Automation Rate:       34.2% (activities performed by system)

Compliance Metrics:
  Conformance Rate:      96.2% (1,676/1,743 compliant)
  Skipped Steps:         67 cases (3.8%)
  SLA Compliance:        89.1%

Resource Metrics:
  Avg Handoffs:          3.1 per case
  Avg Wait vs Work:      62% wait / 38% work
  Busiest Activity:      "Approval" (avg 1.4 days wait)
```

### Step 7: Generate Optimization Recommendations

Based on the analysis, produce prioritized recommendations:

```
=== OPTIMIZATION RECOMMENDATIONS ===

1. [HIGH IMPACT] Reduce Approval Wait Time
   Finding: "Manager Approval" averages 1.4 days wait, 62% of total cycle time
   Root Cause: Approvals queue in manager inbox without SLA enforcement
   Recommendation: Implement auto-approval for low-risk items (<$500) and
   add escalation after 4 hours for standard items
   Estimated Impact: -0.8 days avg cycle time, 25% throughput improvement

2. [HIGH IMPACT] Eliminate Rework Loop: Review-Fix-Review
   Finding: 389 cases (22.3%) cycle between Review and Fix steps
   Root Cause: Incomplete initial submissions missing required fields
   Recommendation: Add mandatory field validation at submission and
   pre-review checklist
   Estimated Impact: -2.8 days for affected cases, 15% rework reduction

3. [MEDIUM IMPACT] Address Skipped Approval Deviation
   Finding: 67 cases bypassed mandatory approval step
   Root Cause: Users with admin role can override state transitions
   Recommendation: Add business rule to enforce approval regardless of role,
   with emergency override requiring documented justification
   Estimated Impact: 100% conformance on approval step

4. [MEDIUM IMPACT] Automate Assignment Activity
   Finding: "Assignment" activity is manual, avg 2.1 hours
   Root Cause: No auto-assignment rules configured for this category
   Recommendation: Implement predictive assignment (see itsm/predict-assignment)
   Estimated Impact: -2 hours per case, 95% auto-assignment rate
```

### Step 8: Export and Report Findings

Compile findings into a structured report for stakeholders:

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [process_sys_id]
  work_notes: |
    === PROCESS MINING ANALYSIS REPORT ===
    Process: [process_name]
    Analysis Date: [current_date]
    Period: [date_range]

    EXECUTIVE SUMMARY:
    [2-3 sentence summary of key findings]

    TOP BOTTLENECKS:
    [Ranked list with impact metrics]

    COMPLIANCE STATUS:
    [Conformance rate and critical deviations]

    RECOMMENDATIONS:
    [Prioritized list with estimated impact]

    NEXT STEPS:
    [Action items with owners and timelines]
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Query-Table` | Retrieve process, variant, activity, and transition data | Core analysis data gathering |
| `SN-Natural-Language-Search` | Find processes or cases by natural language | Ad-hoc investigation |
| `SN-Update-Record` | Update process records with analysis results | Persisting findings |
| `SN-Add-Work-Notes` | Document analysis and recommendations | Reports and audit trail |
| `SN-Get-Table-Schema` | Explore process mining table structures | Setup and field discovery |

## Best Practices

1. **Start with the happy path** -- understand the ideal process before analyzing deviations
2. **Focus on high-volume variants** -- optimize the paths that affect the most cases first
3. **Distinguish wait from work** -- most bottlenecks are wait time, not processing time
4. **Validate deviations contextually** -- some "deviations" are legitimate exceptions (emergencies)
5. **Quantify impact** -- always attach metrics (time saved, cost reduced) to recommendations
6. **Compare time periods** -- trend analysis reveals whether processes are improving or degrading
7. **Involve process owners** -- share findings with the people who can act on them
8. **Iterate regularly** -- run analysis monthly to track improvement and catch regressions
9. **Correlate with outcomes** -- link process variants to business outcomes (CSAT, resolution quality)
10. **Use conformance checking** -- compare against BPMN reference models when available

## Troubleshooting

### "No process mining data found"

**Cause:** Process mining project has not been configured or data has not been imported
**Solution:** Verify that `sn_process_mining_process` has active records. Check that event log data has been imported from the source table.

### "Variant count is extremely high"

**Cause:** Process is highly variable or event data includes noise (system events, duplicate timestamps)
**Solution:** Apply filters to exclude system-generated activities. Focus on the top 20 variants which typically cover 80%+ of cases (Pareto principle).

### "Activity durations seem incorrect"

**Cause:** Timestamps may reflect calendar time including weekends/holidays rather than business hours
**Solution:** Check if the process mining project uses business calendar settings. Adjust duration calculations to exclude non-business hours.

### "Conformance status is blank on variants"

**Cause:** No reference model has been defined for the process
**Solution:** Create a reference model (happy path) in the process mining project settings. Without it, conformance checking cannot be performed.

## Examples

### Example 1: Incident Management Process Analysis

**Process:** Incident Management (1,743 cases over 90 days)

**Key Findings:**
- Happy path (Create > Assign > Investigate > Resolve > Close) covers 71% of cases
- Bottleneck: Assignment step averages 2.1 hours due to manual routing
- Rework: 22% of cases loop between Investigation and Reassignment
- Compliance: 3.8% of cases skip the required approval for P1 incidents

**Top Recommendation:** Implement auto-assignment to eliminate the 2.1-hour routing delay.

### Example 2: Change Management Process Compliance

**Process:** Change Management (412 changes over 90 days)

**Key Findings:**
- 94% conformance rate overall
- 26 changes (6.3%) bypassed CAB review -- all were "Normal" changes incorrectly marked "Standard"
- Emergency changes (42 cases) had 98% post-implementation review completion
- Bottleneck: CAB scheduling averages 3.2 days wait time

**Top Recommendation:** Add validation to prevent Normal changes from using Standard change workflow.

### Example 3: Service Catalog Fulfillment Efficiency

**Process:** Service Catalog Fulfillment (2,891 requests over 90 days)

**Key Findings:**
- 5 distinct fulfillment paths identified
- Fastest variant (auto-provisioned software) averages 0.3 days
- Slowest variant (hardware with procurement) averages 14.2 days
- 78% of total cycle time is wait time (approvals + procurement)
- 12% of requests are cancelled after approval due to incorrect item selection

**Top Recommendation:** Add guided item selection wizard to reduce 12% cancellation rate.

## Related Skills

- `itsm/predict-assignment` - Implement auto-assignment recommended by process analysis
- `itsm/change-management` - Change management process understanding
- `reporting/trend-analysis` - Complementary trend analysis on process data
- `reporting/sla-analysis` - SLA compliance analysis
- `genai/flow-generation` - Automate process steps identified as optimization candidates
