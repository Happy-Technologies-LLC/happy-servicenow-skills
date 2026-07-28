---
name: service-graph-diagnosis
version: 1.0.0
description: Diagnose Service Graph Connector issues, validate discovery patterns, and troubleshoot service mapping data flow
author: Happy Technologies LLC
tags: [cmdb, service-graph, discovery, service-mapping, connector, integration, troubleshooting, data-flow]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/cmdb_ci
    - /api/now/table/cmdb_rel_ci
    - /api/now/table/cmdb_ci_service
    - /api/now/table/svc_graph_connector
    - /api/now/table/svc_ci_assoc
    - /api/now/table/discovery_status
    - /api/now/table/cmdb_inst_duplicate
    - /api/now/table/sys_import_set_run
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# Service Graph Diagnosis

## Overview

This skill provides a systematic approach to diagnosing and resolving Service Graph Connector issues in ServiceNow. It covers:

- Validating Service Graph Connector configurations and connection status
- Troubleshooting data flow from external data sources into the CMDB via `cmdb_ci` and `cmdb_rel_ci`
- Diagnosing discovery pattern failures and identification/reconciliation rule mismatches
- Analyzing import set run logs for ingestion errors
- Detecting duplicate CIs created by faulty reconciliation in `cmdb_inst_duplicate`
- Verifying service mapping data integrity in `cmdb_ci_service` and `svc_ci_assoc`
- Monitoring connector health, scheduling, and transformation map accuracy

**When to use:** When Service Graph Connectors fail to populate or update CIs, when discovery produces duplicates or missing relationships, when service maps show incomplete or stale data, or when connector integrations report errors.

**Value proposition:** Rapid diagnosis of service graph issues prevents CMDB data quality degradation, ensures accurate service maps for change and incident management, and reduces MTTR for integration failures.

## Prerequisites

- **Plugins:** `sn_cmdb_ws` (CMDB Workspace), `sn_itom_pattern` (Discovery Patterns), `com.snc.service-mapping` (Service Mapping)
- **Roles:** `cmdb_admin`, `itil_admin`, or `discovery_admin`
- **Access:** Read/write access to `cmdb_ci`, `cmdb_rel_ci`, `svc_graph_connector`, `discovery_status`, and import set tables
- **Knowledge:** Understanding of CMDB identification rules, reconciliation engine, and Service Graph Connector architecture

## Procedure

### Step 1: Check Connector Status and Configuration

Query the Service Graph Connector table to verify connector health.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: svc_graph_connector
  query: active=true
  fields: sys_id,name,connector_type,state,last_run,last_run_status,schedule,data_source,error_message,total_records_processed,total_errors
  limit: 25
  order_by: -last_run
```

**Using REST API:**
```bash
GET /api/now/table/svc_graph_connector?sysparm_query=active=true^ORDERBYDESClast_run&sysparm_fields=sys_id,name,connector_type,state,last_run,last_run_status,schedule,data_source,error_message,total_records_processed,total_errors&sysparm_limit=25&sysparm_display_value=true
```

**Identify failed connectors:**
```
Tool: SN-Query-Table
Parameters:
  table_name: svc_graph_connector
  query: active=true^last_run_status=error^ORlast_run_status=warning
  fields: sys_id,name,connector_type,last_run,last_run_status,error_message,total_errors
  limit: 10
```

### Step 2: Analyze Import Set Run Logs

When a connector runs, it creates import set records. Check these for ingestion errors.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_import_set_run
  query: set.nameLIKE[connector_name]^ORDERBYDESCsys_created_on
  fields: sys_id,number,set,state,rows_inserted,rows_updated,rows_ignored,rows_error,completion_code,error_message
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_import_set_run?sysparm_query=set.nameLIKE[connector_name]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,set,state,rows_inserted,rows_updated,rows_ignored,rows_error,completion_code,error_message&sysparm_limit=10&sysparm_display_value=true
```

**Drill into error rows:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_import_set_row
  query: sys_import_set=[import_set_sys_id]^sys_import_state=error
  fields: sys_id,sys_import_state,sys_import_state_comment,sys_target_sys_id,sys_row_error
  limit: 25
```

### Step 3: Validate Identification and Reconciliation Rules

Check that CI identification rules are correctly matching incoming data to existing CIs.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_identifier_entry
  query: active=true^applies_to=[ci_class_name]
  fields: sys_id,name,identifier,applies_to,criterion_attributes,search_on_insert,search_on_update,order
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_identifier_entry?sysparm_query=active=true^applies_to=[ci_class_name]&sysparm_fields=sys_id,name,identifier,applies_to,criterion_attributes,search_on_insert,search_on_update,order&sysparm_limit=20&sysparm_display_value=true
```

**Check for duplicate CIs generated by reconciliation failures:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_inst_duplicate
  query: sys_created_on>=javascript:gs.daysAgoStart(7)
  fields: sys_id,duplicate_of,duplicate_of.name,ci,ci.name,ci.sys_class_name,rule_used,confidence,sys_created_on
  limit: 50
  order_by: -sys_created_on
```

### Step 4: Diagnose Discovery Pattern Issues

Validate that discovery patterns are running and producing expected results.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: discovery_status
  query: sys_created_on>=javascript:gs.daysAgoStart(3)^state!=complete
  fields: sys_id,number,dname,state,phase,ip_address,cmdb_ci,error,sys_created_on,discover
  limit: 25
  order_by: -sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/discovery_status?sysparm_query=sys_created_on>=javascript:gs.daysAgoStart(3)^state!=complete&sysparm_fields=sys_id,number,dname,state,phase,ip_address,cmdb_ci,error,sys_created_on,discover&sysparm_limit=25&sysparm_display_value=true
```

**Check pattern execution logs:**
```
Tool: SN-Query-Table
Parameters:
  table_name: discovery_log
  query: status=[discovery_status_sys_id]^levelINerror,warning
  fields: sys_id,level,message,source,sys_created_on
  limit: 50
  order_by: -sys_created_on
```

### Step 5: Verify Service Mapping Integrity

Ensure that services are correctly mapped to their supporting CIs.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_service
  query: operational_status=1
  fields: sys_id,name,operational_status,business_criticality,owned_by,support_group,used_for,service_status
  limit: 25
  order_by: name
```

**Check service-to-CI associations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: service_id=[service_sys_id]
  fields: sys_id,service_id.name,ci_id,ci_id.name,ci_id.sys_class_name,ci_id.operational_status
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/svc_ci_assoc?sysparm_query=service_id=[service_sys_id]&sysparm_fields=sys_id,service_id.name,ci_id,ci_id.name,ci_id.sys_class_name,ci_id.operational_status&sysparm_limit=50&sysparm_display_value=true
```

### Step 6: Run Comprehensive Health Check

Execute a background script to generate a full diagnostic report.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Service Graph Connector health check
  script: |
    var report = {
      timestamp: new GlideDateTime().getDisplayValue(),
      connectors: [],
      duplicates_last_7d: 0,
      failed_discoveries_last_3d: 0,
      orphaned_cis: 0,
      services_missing_cis: []
    };

    // Check connector status
    var conn = new GlideRecord('svc_graph_connector');
    conn.addQuery('active', true);
    conn.query();
    while (conn.next()) {
      report.connectors.push({
        name: conn.name.toString(),
        status: conn.last_run_status.toString(),
        last_run: conn.last_run.getDisplayValue(),
        errors: parseInt(conn.total_errors) || 0
      });
    }

    // Count recent duplicates
    var dup = new GlideAggregate('cmdb_inst_duplicate');
    dup.addQuery('sys_created_on', '>=', gs.daysAgoStart(7));
    dup.addAggregate('COUNT');
    dup.query();
    if (dup.next()) report.duplicates_last_7d = parseInt(dup.getAggregate('COUNT'));

    // Count failed discoveries
    var disc = new GlideAggregate('discovery_status');
    disc.addQuery('sys_created_on', '>=', gs.daysAgoStart(3));
    disc.addQuery('state', 'error');
    disc.addAggregate('COUNT');
    disc.query();
    if (disc.next()) report.failed_discoveries_last_3d = parseInt(disc.getAggregate('COUNT'));

    // Find services with no CI associations
    var svc = new GlideRecord('cmdb_ci_service');
    svc.addQuery('operational_status', 1);
    svc.query();
    while (svc.next()) {
      var assoc = new GlideAggregate('svc_ci_assoc');
      assoc.addQuery('service_id', svc.sys_id);
      assoc.addAggregate('COUNT');
      assoc.query();
      if (assoc.next() && parseInt(assoc.getAggregate('COUNT')) === 0) {
        report.services_missing_cis.push(svc.name.toString());
      }
    }

    gs.info(JSON.stringify(report, null, 2));
```

### Step 7: Remediate Common Issues

Based on diagnosis, apply targeted fixes.

**Fix stale connector by resetting and re-running:**
```
Tool: SN-Update-Record
Parameters:
  table_name: svc_graph_connector
  sys_id: [connector_sys_id]
  fields:
    state: ready
    error_message: ""
```

**Merge duplicate CIs identified in Step 3:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Merge duplicate CI into canonical record
  script: |
    var canonical = new GlideRecord('cmdb_ci');
    canonical.get('[canonical_sys_id]');

    var duplicate = new GlideRecord('cmdb_ci');
    duplicate.get('[duplicate_sys_id]');

    // Re-point relationships from duplicate to canonical
    var rel = new GlideRecord('cmdb_rel_ci');
    rel.addQuery('parent', duplicate.sys_id);
    rel.query();
    while (rel.next()) {
      rel.parent = canonical.sys_id;
      rel.update();
    }

    rel = new GlideRecord('cmdb_rel_ci');
    rel.addQuery('child', duplicate.sys_id);
    rel.query();
    while (rel.next()) {
      rel.child = canonical.sys_id;
      rel.update();
    }

    duplicate.operational_status = 7; // Retired
    duplicate.update();

    gs.info('Merged ' + duplicate.name + ' into ' + canonical.name);
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query connectors, import sets, discovery status, duplicates, services |
| `SN-Get-Record` | Retrieve specific connector or CI details by sys_id |
| `SN-Natural-Language-Search` | Find connectors or CIs by natural language description |
| `SN-Execute-Background-Script` | Run health checks and batch remediation scripts |
| `SN-Discover-Table-Schema` | Explore connector and CMDB table schemas |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/svc_graph_connector` | GET/PATCH | Query and update connector configurations |
| `/api/now/table/cmdb_ci` | GET | Search for CIs affected by connector issues |
| `/api/now/table/cmdb_rel_ci` | GET | Validate relationship data from connectors |
| `/api/now/table/cmdb_ci_service` | GET | Verify service mapping integrity |
| `/api/now/table/discovery_status` | GET | Check discovery run status and errors |
| `/api/now/table/sys_import_set_run` | GET | Analyze import set processing results |
| `/api/now/table/cmdb_inst_duplicate` | GET | Find duplicate CIs from reconciliation |

## Best Practices

- **Monitor connector runs daily:** Set up scheduled jobs to check `last_run_status` and alert on failures before data becomes stale
- **Review identification rules before new connectors:** Ensure IRE rules match the data attributes provided by the connector's data source
- **Test with small data sets:** When configuring new connectors, limit initial runs to a small subset of records to validate transformation maps
- **Track duplicate trends:** A sudden increase in `cmdb_inst_duplicate` records indicates a broken identification rule or data quality issue in the source
- **Validate after upgrades:** ServiceNow upgrades can alter reconciliation behavior; run a health check after every instance upgrade
- **Document connector dependencies:** Maintain a mapping of which connectors feed which CI classes and services
- **Use staged rollouts:** Enable new connectors in a sub-production instance first and compare CMDB state before and after
- **Preserve audit trails:** Never delete duplicate records without first documenting the merge in work notes on the canonical CI

## Troubleshooting

### Connector Shows "Error" Status

**Symptom:** Connector `last_run_status` is "error" and no new CIs are being created
**Cause:** Authentication failure, network timeout, or data source API returning errors
**Solution:** Check `error_message` on the connector record. Verify credentials in the connection alias. Test the data source URL independently. Review `sys_import_set_run` for detailed error rows.

### Duplicate CIs Being Created

**Symptom:** Same physical asset appears multiple times in CMDB with different sys_ids
**Cause:** Identification rule criterion attributes do not match incoming data format (e.g., hostname case sensitivity, FQDN vs short name)
**Solution:** Query `cmdb_inst_duplicate` for recent entries. Review identification rules for the affected CI class. Normalize incoming data in the transformation map before IRE processing.

### Service Map Shows Missing Components

**Symptom:** Business service map is incomplete; known infrastructure CIs do not appear
**Cause:** Service mapping patterns have not discovered the CIs, or `svc_ci_assoc` records are missing
**Solution:** Verify discovery has run against the target IP ranges. Check `svc_ci_assoc` for the service. If associations exist but CIs show `operational_status != 1`, the CIs may be retired or non-operational.

### Import Set Rows Stuck in "Pending"

**Symptom:** Import set shows rows in pending state; CIs are not being created or updated
**Cause:** Transformation map errors, business rule conflicts, or IRE queue backlog
**Solution:** Check `sys_import_set_row` for error messages. Verify the transformation map field mappings. Check the IRE queue size via `cmdb_ire_output_queue`.

## Examples

### Example 1: Diagnose a Failed AWS Connector

```
# 1. Find the AWS connector
Tool: SN-Query-Table
Parameters:
  table_name: svc_graph_connector
  query: nameLIKEAWS
  fields: sys_id,name,state,last_run,last_run_status,error_message,total_errors

# 2. Check the last import set run
Tool: SN-Query-Table
Parameters:
  table_name: sys_import_set_run
  query: set.nameLIKEAWS^ORDERBYDESCsys_created_on
  fields: sys_id,number,state,rows_inserted,rows_updated,rows_error,error_message
  limit: 5

# 3. Look for duplicate EC2 instances
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_inst_duplicate
  query: ci.sys_class_name=cmdb_ci_vm_instance^sys_created_on>=javascript:gs.daysAgoStart(7)
  fields: ci.name,duplicate_of.name,rule_used,confidence,sys_created_on
  limit: 20
```

### Example 2: Validate Service Mapping After Discovery

```
# 1. Check discovery status for recent runs
Tool: SN-Query-Table
Parameters:
  table_name: discovery_status
  query: sys_created_on>=javascript:gs.daysAgoStart(1)^dnameLIKE[service_name]
  fields: number,dname,state,phase,cmdb_ci,error
  limit: 10

# 2. Verify service-CI associations
Tool: SN-Query-Table
Parameters:
  table_name: svc_ci_assoc
  query: service_id=[service_sys_id]
  fields: ci_id.name,ci_id.sys_class_name,ci_id.operational_status,ci_id.ip_address
  limit: 50

# 3. Check relationships for completeness
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[service_sys_id]
  fields: child.name,child.sys_class_name,type.name,type.child_descriptor
  limit: 50
```

### Example 3: Health Check Dashboard Data

```
# Run full health check script (see Step 6) and generate summary:
# - Active connectors: 12 (10 healthy, 2 with errors)
# - Duplicates (7 days): 23 records
# - Failed discoveries (3 days): 5
# - Services without CIs: 3 ("Email Service", "VPN Gateway", "Legacy CRM")
```

## Related Skills

- `cmdb/cmdb-search-analysis` - Search and analyze CMDB data
- `cmdb/relationship-mapping` - Create and validate CI relationships
- `cmdb/data-quality` - CMDB data accuracy and completeness
- `cmdb/ci-discovery` - CI creation and classification
- `cmdb/impact-analysis` - Assess impact using service graph data
- `itom/alert-analysis` - Correlate alerts with service graph topology
