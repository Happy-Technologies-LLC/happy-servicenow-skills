---
name: analytics-generation
version: 1.0.1
description: Generate analytics dashboards and visualizations from natural language descriptions covering PA indicators, data collectors, and widgets
author: Happy Technologies LLC
tags: [reporting, analytics, dashboards, performance-analytics, pa-dashboards, pa-widgets, pa-indicators, pa-data-collectors, visualization]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Get-Record
  rest:
    - /api/now/table/pa_dashboards
    - /api/now/table/pa_widgets
    - /api/now/table/pa_indicators
    - /api/now/table/pa_data_collectors
    - /api/now/table/sys_report
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# Analytics Dashboard and Visualization Generation

## Overview

This skill covers generating analytics dashboards, Performance Analytics (PA) indicators, data collectors, widgets, and standard reports from natural language descriptions:

- Creating PA indicators to track key metrics over time
- Configuring data collectors to gather and store metric snapshots
- Building dashboard layouts with widgets and visualizations
- Generating standard reports with charts, lists, and pivot tables
- Mapping natural language metric descriptions to ServiceNow PA configuration
- Combining PA and reporting for comprehensive analytics solutions

**When to use:** When stakeholders request new dashboards, KPI tracking, trend analysis, or when translating business reporting requirements into ServiceNow analytics configuration.

## Prerequisites

- **Roles:** `pa_admin`, `report_admin`, or `admin`
- **Access:** pa_dashboards, pa_widgets, pa_indicators, pa_data_collectors, sys_report tables
- **Knowledge:** Performance Analytics concepts, ServiceNow reporting framework, data aggregation methods
- **Plugins:** Performance Analytics (com.snc.pa) must be activated for PA features
- **Related Skills:** Complete `reporting/query-generation` for advanced query construction

## Procedure

### Step 1: Understand the Analytics Data Model

```
pa_dashboards (Dashboard)
├── pa_tabs (Dashboard Tabs)
│   └── pa_widgets (Widget Instances)
│       └── pa_widget_indicators (Widget-Indicator Links)
├── pa_indicators (Indicators/KPIs)
│   ├── pa_indicator_source (Indicator Sources)
│   └── pa_data_collectors (Data Collectors)
│       └── pa_job_logs (Collection Logs)
└── sys_report (Standard Reports)
```

**Key Tables:**
| Table | Purpose |
|-------|---------|
| pa_dashboards | Dashboard container definitions |
| pa_widgets | Widget instances placed on dashboards |
| pa_indicators | KPI/metric definitions with formulas |
| pa_data_collectors | Scheduled jobs that collect indicator data |
| sys_report | Standard ServiceNow reports (charts, lists, pivot tables) |

### Step 2: Create a PA Indicator

Indicators define WHAT to measure.

**Create a count-based indicator:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_indicators
  data:
    name: "Open Critical Incidents"
    description: "Count of open incidents with priority 1 (Critical)"
    type: 1
    aggregate: "COUNT"
    table: "incident"
    conditions: "active=true^priority=1"
    frequency: "daily"
    direction: "minimize"
    unit: "incidents"
    precision: 0
    active: true
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/pa_indicators" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST \
  -d '{
    "name": "Open Critical Incidents",
    "description": "Count of open incidents with priority 1",
    "type": 1,
    "aggregate": "COUNT",
    "table": "incident",
    "conditions": "active=true^priority=1",
    "frequency": "daily",
    "active": true
  }'
```

**Create an average-based indicator:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_indicators
  data:
    name: "Average Incident Resolution Time"
    description: "Average time in hours from opening to resolution"
    type: 1
    aggregate: "AVG"
    table: "incident"
    field: "business_duration"
    conditions: "state=6^resolved_atISNOTEMPTY"
    frequency: "daily"
    direction: "minimize"
    unit: "hours"
    precision: 1
    active: true
```

**Create a percentage indicator:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_indicators
  data:
    name: "SLA Compliance Rate"
    description: "Percentage of incidents resolved within SLA"
    type: 2
    aggregate: "COUNT"
    table: "incident"
    conditions: "state=6"
    numerator_conditions: "state=6^made_sla=true"
    frequency: "daily"
    direction: "maximize"
    unit: "%"
    precision: 1
    active: true
```

### Step 3: Create Data Collectors

Data collectors define WHEN and HOW to gather indicator data.

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_data_collectors
  data:
    indicator: [indicator_sys_id]
    name: "Daily Open Critical Incidents Collector"
    active: true
    run_as: "system"
    collection_frequency: "daily"
    is_scheduled: true
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/pa_data_collectors" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "indicator": "[indicator_sys_id]",
    "name": "Daily Open Critical Incidents Collector",
    "active": true,
    "collection_frequency": "daily",
    "is_scheduled": true
  }'
```

### Step 4: Create a Dashboard

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_dashboards
  data:
    name: "IT Service Management Overview"
    description: "Executive dashboard for ITSM key performance indicators"
    active: true
    published: true
    owner: [user_sys_id]
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/pa_dashboards" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "name": "IT Service Management Overview",
    "description": "Executive dashboard for ITSM KPIs",
    "active": true,
    "published": true
  }'
```

### Step 5: Add Widgets to Dashboard

**PA Indicator Widget Types:**
| Type | Value | Use Case |
|------|-------|----------|
| Scorecard | scorecard | Single KPI with trend |
| Time Series | time_series | Metric over time (line chart) |
| Breakdown | breakdown | Metric split by dimension |
| Dial | dial | Gauge-style single metric |
| Single Score | single_score | Large number display |
| List | list | Tabular data |
| Pivot Table | pivot | Cross-tabulation |

**Create a scorecard widget:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_widgets
  data:
    dashboard: [dashboard_sys_id]
    indicator: [indicator_sys_id]
    visualization: "scorecard"
    name: "Critical Incidents Scorecard"
    row: 0
    column: 0
    width: 6
    height: 4
    active: true
```

**Create a time series widget:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_widgets
  data:
    dashboard: [dashboard_sys_id]
    indicator: [indicator_sys_id]
    visualization: "time_series"
    name: "Incident Volume Trend"
    row: 0
    column: 6
    width: 6
    height: 4
    active: true
    time_series_period: "last_12_months"
```

**Create a breakdown widget:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_widgets
  data:
    dashboard: [dashboard_sys_id]
    indicator: [indicator_sys_id]
    visualization: "breakdown"
    name: "Incidents by Priority"
    breakdown: [breakdown_sys_id]
    row: 4
    column: 0
    width: 6
    height: 4
    active: true
    chart_type: "bar"
```

### Step 6: Create Standard Reports

For simpler reporting needs without PA overhead, use sys_report.

**Create a bar chart report:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Incidents by Category"
    table: "incident"
    type: "bar"
    field: "category"
    filter: "active=true"
    aggregate: "COUNT"
    group: "category"
    is_published: true
    active: true
    chart_size: "large"
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_report" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "title": "Incidents by Category",
    "table": "incident",
    "type": "bar",
    "field": "category",
    "filter": "active=true",
    "aggregate": "COUNT",
    "is_published": true
  }'
```

**Create a trend report:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Weekly Incident Volume"
    table: "incident"
    type: "line"
    field: "sys_created_on"
    filter: "sys_created_on>=javascript:gs.daysAgo(90)"
    aggregate: "COUNT"
    trend_field: "sys_created_on"
    interval: "week"
    is_published: true
    active: true
```

**Create a pivot table report:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Incidents: Priority vs State"
    table: "incident"
    type: "pivot"
    field: "priority"
    stack: "state"
    filter: "sys_created_on>=javascript:gs.daysAgo(30)"
    aggregate: "COUNT"
    is_published: true
    active: true
```

### Step 7: Create PA Breakdowns

Breakdowns define dimensions for slicing indicator data.

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_breakdowns
  query: table=incident^active=true
  fields: sys_id,name,field,table
  limit: 50
```

If a needed breakdown does not exist:
```
Tool: SN-Create-Record
Parameters:
  table_name: pa_breakdowns
  data:
    name: "Incident Priority Breakdown"
    table: "incident"
    field: "priority"
    active: true
```

### Step 8: Validate and Test

**Verify indicator configuration:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_indicators
  query: sys_id=[indicator_sys_id]
  fields: sys_id,name,aggregate,table,conditions,frequency,active
```

**Verify dashboard widgets:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_widgets
  query: dashboard=[dashboard_sys_id]
  fields: sys_id,name,visualization,indicator,row,column,width,height,active
  limit: 50
```

**Check data collector status:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_data_collectors
  query: indicator=[indicator_sys_id]
  fields: sys_id,name,active,is_scheduled,last_collection_time
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Create indicator | SN-Create-Record | POST /api/now/table/pa_indicators |
| Create data collector | SN-Create-Record | POST /api/now/table/pa_data_collectors |
| Create dashboard | SN-Create-Record | POST /api/now/table/pa_dashboards |
| Add widget | SN-Create-Record | POST /api/now/table/pa_widgets |
| Create report | SN-Create-Record | POST /api/now/table/sys_report |
| Query indicators | SN-Query-Table | GET /api/now/table/pa_indicators |
| Query dashboards | SN-Query-Table | GET /api/now/table/pa_dashboards |
| Update widget | SN-Update-Record | PATCH /api/now/table/pa_widgets/{sys_id} |

## Best Practices

- **Start with indicators:** Define metrics before building dashboards; indicators are the foundation
- **Use daily frequency for most KPIs:** Daily collection balances granularity with performance
- **Set direction on indicators:** Specify "minimize" or "maximize" so trends show improvement correctly
- **Design for the audience:** Executive dashboards should have 4-6 widgets; operational dashboards can have more
- **Use breakdowns for drill-down:** Allow users to slice data by priority, category, group, or location
- **Combine PA and standard reports:** Use PA for trends and KPIs; use sys_report for ad-hoc lists and detail views
- **Test data collection:** Run a manual collection to verify indicator conditions return expected results
- **Set thresholds and targets:** Configure indicator thresholds to enable red/yellow/green visualization
- **Avoid over-aggregation:** Too many breakdowns on a single widget makes data hard to read
- **Document indicator formulas:** Use the description field to explain what each indicator measures and why

## Troubleshooting

### Indicator Shows No Data

**Symptom:** Indicator exists but displays zero or no data
**Causes:**
1. Data collector not active or not yet run
2. Conditions filter returns no records
3. Indicator frequency mismatch with collection schedule
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_data_collectors
  query: indicator=[indicator_sys_id]
  fields: sys_id,name,active,is_scheduled,last_collection_time
```
Then verify the condition query returns data:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1
  fields: sys_id
  limit: 1
```

### Dashboard Not Visible

**Symptom:** Dashboard created but not appearing in navigation
**Causes:**
1. Dashboard not published
2. User lacks pa_viewer or pa_admin role
3. Dashboard not active
**Solution:**
```
Tool: SN-Update-Record
Parameters:
  table_name: pa_dashboards
  sys_id: [dashboard_sys_id]
  data:
    published: true
    active: true
```

### Report Filter Not Working

**Symptom:** Report shows all records instead of filtered set
**Cause:** Filter encoded query syntax incorrect
**Solution:** Validate the encoded query:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: [your_filter_query]
  fields: sys_id
  limit: 5
```
If results are unexpected, adjust the query.

### Widget Overlapping on Dashboard

**Symptom:** Widgets overlap or display incorrectly
**Cause:** Row/column/width/height values conflict
**Solution:** Review all widget positions:
```
Tool: SN-Query-Table
Parameters:
  table_name: pa_widgets
  query: dashboard=[dashboard_sys_id]
  fields: name,row,column,width,height
  limit: 20
```

## Examples

### Example 1: ITSM Executive Dashboard

```
# 1. Create indicators
Tool: SN-Create-Record
Parameters:
  table_name: pa_indicators
  data:
    name: "Open Incidents"
    aggregate: "COUNT"
    table: "incident"
    conditions: "active=true"
    frequency: "daily"
    active: true
# Result: indicator1_sys_id

Tool: SN-Create-Record
Parameters:
  table_name: pa_indicators
  data:
    name: "MTTR (Hours)"
    aggregate: "AVG"
    table: "incident"
    field: "business_duration"
    conditions: "state=6^sys_created_on>=javascript:gs.daysAgo(30)"
    frequency: "daily"
    active: true
# Result: indicator2_sys_id

# 2. Create data collectors for each indicator
Tool: SN-Create-Record
Parameters:
  table_name: pa_data_collectors
  data:
    indicator: indicator1_sys_id
    name: "Open Incidents Daily"
    active: true
    is_scheduled: true

# 3. Create dashboard
Tool: SN-Create-Record
Parameters:
  table_name: pa_dashboards
  data:
    name: "ITSM Executive Dashboard"
    published: true
    active: true
# Result: dashboard_sys_id

# 4. Add widgets
Tool: SN-Create-Record
Parameters:
  table_name: pa_widgets
  data:
    dashboard: dashboard_sys_id
    indicator: indicator1_sys_id
    visualization: "single_score"
    name: "Open Incidents"
    row: 0
    column: 0
    width: 3
    height: 3

Tool: SN-Create-Record
Parameters:
  table_name: pa_widgets
  data:
    dashboard: dashboard_sys_id
    indicator: indicator2_sys_id
    visualization: "time_series"
    name: "MTTR Trend"
    row: 0
    column: 3
    width: 9
    height: 6
```

### Example 2: Quick Standard Report

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Top 10 Incident Categories This Month"
    table: "incident"
    type: "bar"
    field: "category"
    filter: "sys_created_on>=javascript:gs.beginningOfThisMonth()"
    aggregate: "COUNT"
    orderby: "COUNT"
    order_direction: "desc"
    row_count: 10
    is_published: true
```

## Related Skills

- `reporting/query-generation` - Generate complex queries for reports
- `itsm/incident-lifecycle` - Incident data model context
- `development/scheduled-jobs` - Configure scheduled data collection
- `ea/business-app-insights` - Application-level analytics
