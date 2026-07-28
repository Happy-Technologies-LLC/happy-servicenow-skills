---
name: query-generation
version: 1.0.1
description: Generate ServiceNow queries, GlideAggregate scripts, and reporting filters from natural language descriptions
author: Happy Technologies LLC
tags: [reporting, queries, glide-aggregate, filters, encoded-query, sys-report, natural-language, data-analysis]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Get-Table-Schema
    - SN-Create-Record
  rest:
    - /api/now/table/sys_report
    - /api/now/table/pa_indicators
    - /api/now/table/sys_dictionary
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# ServiceNow Query Generation from Natural Language

## Overview

This skill covers translating natural language descriptions into ServiceNow queries, scripts, and report configurations:

- Converting plain English requirements into encoded queries
- Building GlideRecord queries with proper filter operators
- Generating GlideAggregate scripts for data summarization
- Creating report filter conditions for dashboards
- Translating complex multi-condition queries with AND/OR logic
- Generating date-based, relative time, and dynamic queries

**When to use:** When users describe data needs in natural language, when building report filters, when creating script-based data retrieval, or when constructing complex encoded queries for lists and modules.

## Prerequisites

- **Roles:** `itil`, `report_user`, `admin`, or any role with read access to target tables
- **Access:** Target data tables, sys_dictionary for field validation, sys_report for report creation
- **Knowledge:** ServiceNow encoded query syntax, GlideRecord API, GlideAggregate API, data types
- **Related Skills:** Complete `reporting/analytics-generation` for dashboard creation

## Procedure

### Step 1: Understand Encoded Query Syntax

ServiceNow encoded queries use a specific syntax for filtering records:

**Operators Reference:**
| Operator | Syntax | Example |
|----------|--------|---------|
| Equals | = | `priority=1` |
| Not equals | != | `state!=6` |
| Contains | LIKE | `short_descriptionLIKEnetwork` |
| Does not contain | NOT LIKE | `short_descriptionNOT LIKEtest` |
| Starts with | STARTSWITH | `numberSTARTSWITHINC` |
| Ends with | ENDSWITH | `emailENDSWITH@company.com` |
| Is empty | ISEMPTY | `assignment_groupISEMPTY` |
| Is not empty | ISNOTEMPTY | `resolved_atISNOTEMPTY` |
| Greater than | > | `priority>2` |
| Less than | < | `priority<3` |
| Greater or equal | >= | `sys_created_on>=2025-01-01` |
| Less or equal | <= | `sys_created_on<=2025-12-31` |
| In list | IN | `state IN 1,2,3` |
| Not in list | NOT IN | `priority NOT IN 4,5` |
| Between | BETWEEN | `sys_created_onBETWEEN2025-01-01@2025-06-30` |
| Instance of | INSTANCEOF | `sys_class_nameINSTANCEOFtask` |
| AND | ^ | `active=true^priority=1` |
| OR | ^OR | `priority=1^ORpriority=2` |
| New query (OR group) | ^NQ | `priority=1^NQstate=6` |

**Date Operators:**
| Function | Syntax | Meaning |
|----------|--------|---------|
| Today | javascript:gs.daysAgo(0) | Current day |
| Last 7 days | javascript:gs.daysAgo(7) | Past week |
| Last 30 days | javascript:gs.daysAgo(30) | Past month |
| This month start | javascript:gs.beginningOfThisMonth() | First day of current month |
| This quarter start | javascript:gs.beginningOfThisQuarter() | First day of current quarter |
| This year start | javascript:gs.beginningOfThisYear() | First day of current year |
| Last month start | javascript:gs.beginningOfLastMonth() | First day of previous month |
| End of last month | javascript:gs.endOfLastMonth() | Last day of previous month |

### Step 2: Translate Natural Language to Encoded Queries

**Examples of natural language to query translation:**

| Natural Language | Encoded Query |
|-----------------|---------------|
| "All open critical incidents" | `active=true^priority=1` |
| "Incidents assigned to Service Desk opened this week" | `assignment_group.name=Service Desk^sys_created_on>=javascript:gs.daysAgo(7)` |
| "Unresolved P1 or P2 incidents" | `active=true^priority=1^ORpriority=2` |
| "Changes approved but not implemented" | `state=authorized^ORstate=scheduled` |
| "Users without a manager" | `managerISEMPTY^active=true` |
| "Incidents created in Q1 2025" | `sys_created_on>=2025-01-01^sys_created_on<2025-04-01` |
| "High priority incidents not updated in 3 days" | `priority IN 1,2^sys_updated_on<javascript:gs.daysAgo(3)^active=true` |

### Step 3: Validate Query Against Table Schema

Before using a query, verify the fields exist on the target table.

**MCP Approach:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: incident
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_dictionary?sysparm_query=name=incident^elementISNOTEMPTY^active=true&sysparm_fields=element,column_label,internal_type&sysparm_limit=200" \
  -H "Accept: application/json"
```

### Step 4: Test the Generated Query

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1^assignment_groupISEMPTY
  fields: sys_id,number,short_description,priority,state,sys_created_on
  limit: 10
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/incident?sysparm_query=active=true^priority=1^assignment_groupISEMPTY&sysparm_fields=sys_id,number,short_description,priority,state&sysparm_limit=10" \
  -H "Accept: application/json"
```

### Step 5: Generate GlideRecord Scripts

**Basic GlideRecord query:**
```javascript
// Natural Language: "Get all active incidents assigned to the Network team"
var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('assignment_group.name', 'Network');
gr.orderByDesc('sys_created_on');
gr.setLimit(100);
gr.query();

while (gr.next()) {
    gs.info('Incident: {0} - {1} (Priority: {2})',
        gr.getValue('number'),
        gr.getValue('short_description'),
        gr.getDisplayValue('priority'));
}
```

**GlideRecord with complex conditions:**
```javascript
// Natural Language: "Find incidents that are either P1 or P2,
// created in the last 7 days, and not yet assigned"
var gr = new GlideRecord('incident');
var qc = gr.addQuery('priority', '1');
qc.addOrCondition('priority', '2');
gr.addQuery('sys_created_on', '>=', gs.daysAgo(7));
gr.addQuery('assigned_to', '');
gr.addActiveQuery();
gr.query();

gs.info('Found {0} unassigned high-priority incidents', gr.getRowCount());
```

**GlideRecord with encoded query:**
```javascript
// Natural Language: "All resolved incidents from this month
// where the resolution was a workaround"
var gr = new GlideRecord('incident');
gr.addEncodedQuery('state=6^sys_resolved_on>=javascript:gs.beginningOfThisMonth()^close_notesLIKEworkaround');
gr.query();

while (gr.next()) {
    gs.info('{0}: {1}', gr.getValue('number'), gr.getValue('close_notes'));
}
```

### Step 6: Generate GlideAggregate Scripts

**Count with grouping:**
```javascript
// Natural Language: "How many incidents are open per priority?"
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.groupBy('priority');
ga.orderBy('priority');
ga.query();

while (ga.next()) {
    gs.info('Priority {0}: {1} incidents',
        ga.getDisplayValue('priority'),
        ga.getAggregate('COUNT'));
}
```

**Average calculation:**
```javascript
// Natural Language: "What is the average resolution time by category?"
var ga = new GlideAggregate('incident');
ga.addQuery('state', 6); // Resolved
ga.addQuery('sys_resolved_on', '>=', gs.daysAgo(90));
ga.addAggregate('AVG', 'business_duration');
ga.groupBy('category');
ga.query();

while (ga.next()) {
    var avgDuration = ga.getAggregate('AVG', 'business_duration');
    var hours = (parseInt(avgDuration, 10) / 3600).toFixed(1);
    gs.info('Category: {0} - Avg Resolution: {1} hours',
        ga.getDisplayValue('category'), hours);
}
```

**Sum with filtering:**
```javascript
// Natural Language: "Total cost of all hardware assets purchased this year"
var ga = new GlideAggregate('alm_hardware');
ga.addQuery('purchase_date', '>=', gs.beginningOfThisYear());
ga.addAggregate('SUM', 'cost');
ga.query();

if (ga.next()) {
    gs.info('Total hardware cost this year: ${0}',
        ga.getAggregate('SUM', 'cost'));
}
```

**Multiple aggregates:**
```javascript
// Natural Language: "For each assignment group, show count,
// average priority, and oldest open incident"
var ga = new GlideAggregate('incident');
ga.addQuery('active', true);
ga.addAggregate('COUNT');
ga.addAggregate('AVG', 'priority');
ga.addAggregate('MIN', 'sys_created_on');
ga.groupBy('assignment_group');
ga.orderByAggregate('COUNT');
ga.query();

while (ga.next()) {
    gs.info('Group: {0} | Count: {1} | Avg Priority: {2} | Oldest: {3}',
        ga.getDisplayValue('assignment_group'),
        ga.getAggregate('COUNT'),
        parseFloat(ga.getAggregate('AVG', 'priority')).toFixed(1),
        ga.getAggregate('MIN', 'sys_created_on'));
}
```

### Step 7: Generate Report Filters

**Create a report with the generated query:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Unassigned Critical Incidents"
    table: "incident"
    type: "list"
    filter: "active=true^priority=1^assigned_toISEMPTY"
    is_published: true
    active: true
```

**Create a chart report with query:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Monthly Incident Trend by Priority"
    table: "incident"
    type: "line"
    field: "priority"
    filter: "sys_created_on>=javascript:gs.monthsAgo(12)"
    aggregate: "COUNT"
    trend_field: "sys_created_on"
    interval: "month"
    is_published: true
    active: true
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_report" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "title": "Monthly Incident Trend by Priority",
    "table": "incident",
    "type": "line",
    "field": "priority",
    "filter": "sys_created_on>=javascript:gs.monthsAgo(12)",
    "aggregate": "COUNT",
    "trend_field": "sys_created_on",
    "interval": "month",
    "is_published": true
  }'
```

### Step 8: Advanced Query Patterns

**Dot-walking (related table fields):**
```
// Natural Language: "Incidents where the caller's department is IT"
query: caller_id.department.name=IT^active=true
```

**Dynamic reference qualifiers:**
```
// Natural Language: "Incidents assigned to the current user's group"
query: assignment_group=javascript:getMyGroups()^active=true
```

**Relative date queries:**
```
// Natural Language: "Changes scheduled for next week"
query: start_date>=javascript:gs.daysAgo(-1)^start_date<javascript:gs.daysAgo(-8)
```

**INSTANCEOF for hierarchy queries:**
```
// Natural Language: "All tasks including incidents, changes, and problems"
query: sys_class_nameINSTANCEOFtask^active=true
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Test query | SN-Query-Table | GET /api/now/table/{table}?sysparm_query={query} |
| Get table schema | SN-Get-Table-Schema | GET /api/now/table/sys_dictionary |
| Create report | SN-Create-Record | POST /api/now/table/sys_report |
| Create PA indicator | SN-Create-Record | POST /api/now/table/pa_indicators |
| Validate field | SN-Query-Table | GET /api/now/table/sys_dictionary |

## Best Practices

- **Validate fields first:** Always check sys_dictionary to confirm field names before building queries
- **Test incrementally:** Build complex queries one condition at a time, testing each addition
- **Use encoded queries for reports:** Encoded queries are more portable and URL-safe than scripted filters
- **Prefer GlideAggregate over GlideRecord for counts:** GlideAggregate is far more efficient for aggregations
- **Use setLimit for testing:** Always limit results during development to avoid performance issues
- **Leverage dot-walking judiciously:** Dot-walking across multiple references can impact performance
- **Use IN operator for multiple values:** `priority IN 1,2,3` is cleaner than chained OR conditions
- **Document complex queries:** Add comments explaining the business logic behind multi-condition queries
- **Use javascript: functions for dates:** Relative date functions ensure queries remain dynamic
- **Avoid eval() in dynamic queries:** Never construct queries from unvalidated user input
- **Index key filter fields:** Ensure commonly filtered fields have database indexes

## Troubleshooting

### Query Returns No Results

**Symptom:** Encoded query returns empty set when data should exist
**Causes:**
1. Field name misspelled or does not exist on table
2. Value does not match (case sensitivity, display vs. internal value)
3. ACL restrictions filtering results
**Solution:** Validate field names and values:
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: [target_table]
```
Then test a simplified version of the query:
```
Tool: SN-Query-Table
Parameters:
  table_name: [target_table]
  query: [single_condition_only]
  fields: sys_id
  limit: 1
```

### Query Returns Too Many Results

**Symptom:** Query is too broad, returning excessive records
**Causes:**
1. Missing filter conditions
2. OR conditions too broad
3. Missing active=true filter
**Solution:** Add constraints incrementally:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority=1^sys_created_on>=javascript:gs.daysAgo(30)
  fields: sys_id
  limit: 1
```

### Date Query Not Filtering Correctly

**Symptom:** Date-based filters include unexpected records
**Causes:**
1. Using date field with datetime comparison or vice versa
2. Timezone differences
3. Missing time component in comparison
**Solution:** Use ServiceNow date functions for reliability:
```
// Use gs.daysAgo() instead of hardcoded dates
query: sys_created_on>=javascript:gs.daysAgo(30)

// For specific date ranges, include full datetime
query: sys_created_on>=2025-01-01 00:00:00^sys_created_on<2025-02-01 00:00:00
```

### GlideAggregate Returns Unexpected Counts

**Symptom:** Aggregate counts do not match manual counts
**Causes:**
1. ACL restrictions filtering records from aggregate
2. Missing addQuery conditions
3. Grouping on wrong field
**Solution:** Compare with a simple count:
```javascript
// Verify with GlideRecord count
var gr = new GlideRecord('incident');
gr.addEncodedQuery('active=true^priority=1');
gr.query();
gs.info('GlideRecord count: ' + gr.getRowCount());
```

### Dot-Walk Query Performance

**Symptom:** Query with dot-walking is very slow
**Cause:** Multiple levels of dot-walking create expensive JOINs
**Solution:** Limit dot-walk depth and add indexed conditions first:
```
// BAD: Deep dot-walk as primary filter
query: caller_id.department.company.name=Acme

// GOOD: Add indexed conditions first, limit dot-walk depth
query: active=true^priority IN 1,2^caller_id.department.name=IT
```

## Examples

### Example 1: Build a Complex Incident Query

```
Natural Language: "Show me all P1 and P2 incidents from the last 30 days
that are still open, assigned to either the Network or Server team,
and have not been updated in the last 48 hours"

Encoded Query:
active=true^priority IN 1,2^sys_created_on>=javascript:gs.daysAgo(30)^assignment_group.nameLIKENetwork^ORassignment_group.nameLIKEServer^sys_updated_on<javascript:gs.daysAgo(2)

Test:
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^priority IN 1,2^sys_created_on>=javascript:gs.daysAgo(30)^sys_updated_on<javascript:gs.daysAgo(2)
  fields: sys_id,number,priority,assignment_group,sys_updated_on
  limit: 20
```

### Example 2: Generate an Aggregate Report Script

```
Natural Language: "Create a summary showing the number of incidents
created each month this year, broken down by category"

GlideAggregate Script:
var ga = new GlideAggregate('incident');
ga.addQuery('sys_created_on', '>=', gs.beginningOfThisYear());
ga.addAggregate('COUNT');
ga.groupBy('category');
ga.addTrend('sys_created_on', 'month');
ga.query();

while (ga.next()) {
    gs.info('Month: {0} | Category: {1} | Count: {2}',
        ga.getValue('timeref'),
        ga.getDisplayValue('category'),
        ga.getAggregate('COUNT'));
}
```

### Example 3: Create a Report from Natural Language

```
Natural Language: "I need a pie chart showing the distribution
of change requests by risk level for the current quarter"

Tool: SN-Create-Record
Parameters:
  table_name: sys_report
  data:
    title: "Change Requests by Risk Level (Current Quarter)"
    table: "change_request"
    type: "pie"
    field: "risk"
    filter: "sys_created_on>=javascript:gs.beginningOfThisQuarter()"
    aggregate: "COUNT"
    is_published: true
    active: true
```

## Related Skills

- `reporting/analytics-generation` - Build full dashboards with PA indicators
- `development/code-assist` - Generate complete scripts with query logic
- `itsm/incident-lifecycle` - Incident data model and field reference
- `admin/schema-discovery` - Apply queries to list views and filters
