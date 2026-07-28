---
name: cmdb-search-analysis
version: 1.0.0
description: Analyze CMDB search requests, interpret natural language CI queries, and provide structured search results with relationships and dependency context
author: Happy Technologies LLC
tags: [cmdb, search, analysis, ci, natural-language, query, relationships, discovery]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-List-CmdbCis
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Discover-Table-Schema
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/cmdb_ci_service
    - /api/now/cmdb/meta
    - /api/now/table/sys_db_object
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# CMDB Search and Analysis

## Overview

This skill enables intelligent searching and analysis of the Configuration Management Database (CMDB). It covers:

- Interpreting natural language queries into structured CMDB searches across `cmdb_ci` and its child tables
- Performing multi-criteria searches combining name, class, location, environment, and operational status
- Enriching search results with relationship data from `cmdb_rel_ci`
- Identifying related business services via `cmdb_ci_service` associations
- Aggregating search results into structured reports with dependency context
- Discovering CI classes and schema to target the most appropriate table for a query

**When to use:** When users ask questions like "find all production database servers in the US datacenter," "what CIs are related to the SAP application," or "show me all Linux servers with critical business classification."

**Value proposition:** Accurate CMDB searches reduce time spent manually navigating the CI hierarchy and ensure that analysts, change managers, and incident responders find the right configuration items quickly.

## Prerequisites

- **Roles:** `itil`, `cmdb_read`, or `asset` access
- **Access:** Read access to `cmdb_ci`, `cmdb_rel_ci`, `cmdb_ci_service`, and child CI tables
- **Knowledge:** Understanding of CMDB class hierarchy and relationship types
- **Related skills:** `cmdb/relationship-mapping` for creating relationships, `cmdb/ci-discovery` for CI creation

## Procedure

### Step 1: Identify the Target CI Class

Determine which CMDB table to query based on the user's request. The CMDB uses a class hierarchy rooted at `cmdb_ci`.

**Discover available CI classes:**

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Discover-Table-Schema
Parameters:
  table_name: cmdb_ci
```

**Using REST API:**
```bash
GET /api/now/cmdb/meta?sysparm_type=class_hierarchy&sysparm_ci_type=cmdb_ci
```

**Common class mapping for natural language queries:**

| User Says | Target Table | Notes |
|-----------|-------------|-------|
| "server" or "host" | `cmdb_ci_server` | Physical and virtual servers |
| "database" | `cmdb_ci_db_instance` | Database instances |
| "application" or "app" | `cmdb_ci_appl` | Application CIs |
| "network device" or "switch" | `cmdb_ci_netgear` | Network equipment |
| "load balancer" | `cmdb_ci_lb` | Load balancers |
| "storage" | `cmdb_ci_storage_device` | Storage arrays |
| "virtual machine" or "VM" | `cmdb_ci_vm_instance` | Virtual machine instances |
| "container" | `cmdb_ci_container` | Container instances |
| "service" | `cmdb_ci_service` | Business services |
| "cluster" | `cmdb_ci_cluster` | Server or application clusters |

### Step 2: Build the Search Query

Translate the natural language request into a ServiceNow encoded query string.

**Using natural language search:**
```
Tool: SN-Natural-Language-Search
Parameters:
  query: "production Linux servers in the New York datacenter with critical business classification"
  tables: cmdb_ci_server
  limit: 25
```

**Using structured query:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: operational_status=1^os_domainLIKELinux^location.nameLIKENew York^business_criticality=1
  fields: sys_id,name,sys_class_name,ip_address,os,operational_status,environment,business_criticality,location,support_group
  limit: 50
  order_by: name
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci_server?sysparm_query=operational_status=1^os_domainLIKELinux^location.nameLIKENew%20York^business_criticality=1&sysparm_fields=sys_id,name,sys_class_name,ip_address,os,operational_status,environment,business_criticality,location,support_group&sysparm_limit=50&sysparm_display_value=true
```

**Common query operators:**

| Operator | Meaning | Example |
|----------|---------|---------|
| `=` | Equals | `operational_status=1` |
| `LIKE` | Contains | `nameLIKEprod` |
| `STARTSWITH` | Starts with | `nameSTARTSWITHweb` |
| `IN` | In list | `sys_idINid1,id2,id3` |
| `!=` | Not equals | `environment!=development` |
| `ISNOTEMPTY` | Has value | `ip_addressISNOTEMPTY` |
| `^` | AND | `name=x^status=1` |
| `^OR` | OR | `name=x^ORname=y` |

### Step 3: Enrich Results with Relationships

For each CI found, retrieve its relationships to provide dependency context.

**Get relationships for a specific CI:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[ci_sys_id]^ORchild=[ci_sys_id]
  fields: parent,parent.name,parent.sys_class_name,child,child.name,child.sys_class_name,type.name,type.parent_descriptor,type.child_descriptor
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_rel_ci?sysparm_query=parent=[ci_sys_id]^ORchild=[ci_sys_id]&sysparm_fields=parent,parent.name,parent.sys_class_name,child,child.name,child.sys_class_name,type.name,type.parent_descriptor,type.child_descriptor&sysparm_limit=50&sysparm_display_value=true
```

**Batch relationship lookup for multiple CIs:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Get relationships for multiple CIs from search results
  script: |
    var ciIds = ['sys_id_1', 'sys_id_2', 'sys_id_3']; // Replace with actual IDs
    var results = [];

    ciIds.forEach(function(ciId) {
      var ci = new GlideRecord('cmdb_ci');
      if (!ci.get(ciId)) return;

      var entry = {
        sys_id: ciId,
        name: ci.name.toString(),
        class: ci.sys_class_name.toString(),
        upstream: [],
        downstream: []
      };

      var rel = new GlideRecord('cmdb_rel_ci');
      rel.addQuery('child', ciId);
      rel.setLimit(20);
      rel.query();
      while (rel.next()) {
        entry.upstream.push({
          name: rel.parent.name.toString(),
          class: rel.parent.sys_class_name.toString(),
          relationship: rel.type.parent_descriptor.toString()
        });
      }

      rel = new GlideRecord('cmdb_rel_ci');
      rel.addQuery('parent', ciId);
      rel.setLimit(20);
      rel.query();
      while (rel.next()) {
        entry.downstream.push({
          name: rel.child.name.toString(),
          class: rel.child.sys_class_name.toString(),
          relationship: rel.type.child_descriptor.toString()
        });
      }

      results.push(entry);
    });

    gs.info(JSON.stringify(results, null, 2));
```

### Step 4: Identify Associated Business Services

Map found CIs to the business services they support.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: service_ci_assoc
  query: ci_id=[ci_sys_id]
  fields: service_id,service_id.name,service_id.operational_status,service_id.business_criticality
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/service_ci_assoc?sysparm_query=ci_id=[ci_sys_id]&sysparm_fields=service_id,service_id.name,service_id.operational_status,service_id.business_criticality&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Generate Structured Search Report

Compile the search results, relationships, and service context into a comprehensive report.

**Using background script for full analysis:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate structured CMDB search report
  script: |
    var searchQuery = 'nameLIKEprod-web^operational_status=1';
    var targetTable = 'cmdb_ci_server';
    var report = { query: searchQuery, table: targetTable, timestamp: new GlideDateTime().getDisplayValue(), results: [] };

    var gr = new GlideRecord(targetTable);
    gr.addEncodedQuery(searchQuery);
    gr.setLimit(25);
    gr.query();

    while (gr.next()) {
      var ciData = {
        sys_id: gr.sys_id.toString(),
        name: gr.name.toString(),
        class: gr.sys_class_name.toString(),
        ip_address: gr.ip_address ? gr.ip_address.toString() : '',
        environment: gr.environment ? gr.environment.getDisplayValue() : '',
        criticality: gr.business_criticality ? gr.business_criticality.getDisplayValue() : '',
        status: gr.operational_status.getDisplayValue(),
        support_group: gr.support_group ? gr.support_group.getDisplayValue() : '',
        location: gr.location ? gr.location.getDisplayValue() : '',
        relationships: { upstream: 0, downstream: 0 },
        services: []
      };

      var upRel = new GlideAggregate('cmdb_rel_ci');
      upRel.addQuery('child', gr.sys_id);
      upRel.addAggregate('COUNT');
      upRel.query();
      if (upRel.next()) ciData.relationships.upstream = parseInt(upRel.getAggregate('COUNT'));

      var downRel = new GlideAggregate('cmdb_rel_ci');
      downRel.addQuery('parent', gr.sys_id);
      downRel.addAggregate('COUNT');
      downRel.query();
      if (downRel.next()) ciData.relationships.downstream = parseInt(downRel.getAggregate('COUNT'));

      var svcAssoc = new GlideRecord('service_ci_assoc');
      svcAssoc.addQuery('ci_id', gr.sys_id);
      svcAssoc.query();
      while (svcAssoc.next()) {
        ciData.services.push(svcAssoc.service_id.getDisplayValue());
      }

      report.results.push(ciData);
    }

    report.totalFound = report.results.length;
    gs.info(JSON.stringify(report, null, 2));
```

### Step 6: Cross-Class Search

When the user's query spans multiple CI classes, search across the base `cmdb_ci` table or multiple child tables.

**Broad search across all CI types:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: nameLIKEpayment^operational_status=1
  fields: sys_id,name,sys_class_name,operational_status,environment,business_criticality,support_group
  limit: 50
  order_by: sys_class_name,name
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci?sysparm_query=nameLIKEpayment^operational_status=1&sysparm_fields=sys_id,name,sys_class_name,operational_status,environment,business_criticality,support_group&sysparm_limit=50&sysparm_display_value=true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Translate natural language queries into CMDB searches |
| `SN-Query-Table` | Execute structured queries against CMDB tables |
| `SN-List-CmdbCis` | Convenience tool for common CI lookups by class |
| `SN-Get-Record` | Retrieve a single CI record by sys_id |
| `SN-Discover-Table-Schema` | Explore available fields and CI classes |
| `SN-Execute-Background-Script` | Complex multi-table queries with aggregation |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/cmdb_ci` | GET | Search across all CI types |
| `/api/now/table/cmdb_ci_*` | GET | Search specific CI class tables |
| `/api/now/table/cmdb_rel_ci` | GET | Query CI relationships |
| `/api/now/table/cmdb_ci_service` | GET | Query business services |
| `/api/now/cmdb/meta` | GET | Retrieve CMDB class hierarchy metadata |

## Best Practices

- **Start with the right class:** Querying `cmdb_ci_server` is faster and more precise than searching the base `cmdb_ci` table when you know the CI type
- **Use display values:** Add `sysparm_display_value=true` to REST calls to get human-readable labels instead of sys_ids
- **Limit result sets:** Always set a reasonable limit; CMDB tables can contain millions of records
- **Combine filters:** Use multiple criteria (name + environment + status) to narrow results and reduce false matches
- **Validate class hierarchy:** Use schema discovery to confirm which fields exist on which CI classes before querying
- **Cache frequent queries:** For repeated searches, note the encoded query string for reuse
- **Include relationship context:** Raw CI lists are less useful without dependency context; always enrich with relationships when practical
- **Respect operational status:** Filter by `operational_status=1` (Operational) to exclude retired or decommissioned CIs unless specifically searching for them

## Troubleshooting

### Search Returns No Results

**Symptom:** Query returns empty even though the CI is known to exist
**Cause:** Wrong table (CI is a different class), CI name is slightly different, or CI is not operational
**Solution:** Search the base `cmdb_ci` table with a broad `LIKE` filter, or remove the `operational_status` filter to include non-operational CIs

### Search Returns Too Many Results

**Symptom:** Thousands of results returned, difficult to identify the correct CI
**Cause:** Query is too broad (e.g., `nameLIKEweb` matches hundreds of CIs)
**Solution:** Add environment, location, support group, or class filters to narrow results. Use `STARTSWITH` instead of `LIKE` for name matching.

### Relationship Data Missing

**Symptom:** CI shows no relationships but is clearly part of an application stack
**Cause:** Relationships not populated in CMDB; discovery may not have run or manual entries are missing
**Solution:** Check if Service Mapping or Discovery has been configured for this CI. Use `cmdb/relationship-mapping` to create missing relationships.

### Class Not Found

**Symptom:** Error querying a specific CI class table
**Cause:** The table name is incorrect or the CI class plugin is not installed
**Solution:** Use `SN-Discover-Table-Schema` on `cmdb_ci` to list available child classes, or query `sys_db_object` for tables matching the expected name.

## Examples

### Example 1: Find All Production Web Servers

```
# 1. Search for production web servers
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: nameLIKEweb^environment=production^operational_status=1
  fields: sys_id,name,ip_address,os,environment,business_criticality,location,support_group
  limit: 50

# 2. Get relationships for top result
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=[first_result_sys_id]
  fields: parent.name,parent.sys_class_name,type.parent_descriptor

# 3. Find associated services
Tool: SN-Query-Table
Parameters:
  table_name: service_ci_assoc
  query: ci_id=[first_result_sys_id]
  fields: service_id.name,service_id.business_criticality
```

### Example 2: Natural Language CI Search

**User asks:** "What database servers support the payroll application?"

```
# 1. Find the payroll application CI
Tool: SN-Natural-Language-Search
Parameters:
  query: "payroll application"
  tables: cmdb_ci_appl
  limit: 5

# 2. Find downstream database dependencies
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[payroll_app_sys_id]^child.sys_class_nameLIKEdb
  fields: child.name,child.sys_class_name,child.ip_address,child.environment,type.child_descriptor

# Result: Lists all database CIs that the payroll application depends on
```

### Example 3: Environment Comparison

**User asks:** "Compare production and staging servers for the CRM system"

```
# 1. Find CRM-related servers in production
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: nameLIKEcrm^environment=production^operational_status=1
  fields: sys_id,name,ip_address,os,cpu_count,ram,disk_space

# 2. Find CRM-related servers in staging
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_server
  query: nameLIKEcrm^environment=staging^operational_status=1
  fields: sys_id,name,ip_address,os,cpu_count,ram,disk_space

# 3. Compare and report differences in specs, count, and configuration
```

## Related Skills

- `cmdb/relationship-mapping` - Creating and validating CI relationships
- `cmdb/ci-discovery` - CI creation and classification
- `cmdb/data-quality` - Ensuring CMDB data accuracy
- `cmdb/impact-analysis` - Analyzing change impact using search results
- `cmdb/service-graph-diagnosis` - Troubleshooting Service Graph Connector and discovery
- `admin/schema-discovery` - Exploring table schemas and field definitions
