---
name: app-summary
version: 1.0.1
description: Summarize existing ServiceNow applications with scope analysis, table structure, script inventory, and dependency mapping
author: Happy Technologies LLC
tags: [genai, app-summary, scoped-app, sys-scope, sys-app, sys-metadata, analysis, documentation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_scope
    - /api/now/table/sys_app
    - /api/now/table/sys_metadata
    - /api/now/table/sys_db_object
    - /api/now/table/sys_dictionary
    - /api/now/table/sys_script
    - /api/now/table/sys_script_include
    - /api/now/table/sys_script_client
  native:
    - Bash
complexity: intermediate
estimated_time: 30-60 minutes
---

# ServiceNow Application Summary

## Overview

This skill covers generating comprehensive summaries of existing ServiceNow applications, including:

- Application scope and metadata analysis
- Table structure and data model documentation
- Script inventory (business rules, client scripts, script includes, UI actions)
- ACL and role analysis
- Dependency and integration mapping
- Configuration artifact inventory
- Application health and complexity assessment

**When to use:** During application portfolio reviews, before upgrades or migrations, for developer onboarding, documentation generation, technical debt assessment, or when evaluating applications for consolidation.

## Prerequisites

- **Roles:** `admin`, `application_developer`, or read access to sys_scope and sys_metadata
- **Access:** sys_scope, sys_app, sys_metadata, sys_db_object, sys_dictionary, sys_script tables
- **Knowledge:** ServiceNow application model, scoped application structure
- **Related Skills:** Complete `genai/app-generation` for context on application structure

## Procedure

### Step 1: Identify the Application

**Find application by name:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope
  query: nameLIKE[app_name]^active=true
  fields: sys_id,name,scope,short_description,version,vendor,vendor_prefix,sys_created_on,sys_updated_on
  limit: 10
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_scope?sysparm_query=nameLIKE[app_name]^active=true&sysparm_fields=sys_id,name,scope,short_description,version,vendor&sysparm_limit=10" \
  -H "Accept: application/json"
```

**List all custom scoped applications:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope
  query: scopeSTARTSWITHx_^active=true
  fields: sys_id,name,scope,version,vendor,sys_created_on
  limit: 100
```

### Step 2: Get Application Metadata

**Retrieve full application details:**

**MCP Approach:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_scope
  sys_id: [scope_sys_id]
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_scope/[scope_sys_id]" \
  -H "Accept: application/json"
```

**Check sys_app for additional metadata:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_app
  query: scope=[scope_name]
  fields: sys_id,name,version,short_description,template,active
  limit: 1
```

### Step 3: Inventory All Application Artifacts

**Get a count of all artifacts by type:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=[scope_sys_id]
  fields: sys_id,sys_class_name,sys_name,sys_created_on
  limit: 500
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_metadata?sysparm_query=sys_scope=[scope_sys_id]&sysparm_fields=sys_id,sys_class_name,sys_name&sysparm_limit=500" \
  -H "Accept: application/json"
```

Group the results by `sys_class_name` to produce an artifact summary:

```
Artifact Inventory:
  sys_db_object (Tables): X
  sys_dictionary (Fields): X
  sys_script (Business Rules): X
  sys_script_client (Client Scripts): X
  sys_script_include (Script Includes): X
  sys_ui_action (UI Actions): X
  sys_ui_page (UI Pages): X
  sys_security_acl (ACLs): X
  sys_properties (Properties): X
  sys_ui_form_section (Form Sections): X
  ...
```

### Step 4: Analyze Table Structure

**Get all tables in the application:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_object
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,label,super_class,is_extendable,number_ref,sys_created_on
  limit: 50
```

**For each table, get field definitions:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=[table_name]^sys_scope=[scope_sys_id]^elementISNOTEMPTY
  fields: element,column_label,internal_type,max_length,mandatory,reference,unique,active
  limit: 100
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_dictionary?sysparm_query=name=[table_name]^sys_scope=[scope_sys_id]^elementISNOTEMPTY&sysparm_fields=element,column_label,internal_type,max_length,mandatory,reference&sysparm_limit=100" \
  -H "Accept: application/json"
```

**Get table record counts (assess data volume):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_table_rotation
  query: name=[table_name]
  fields: name,max_size,size
  limit: 1
```

### Step 5: Inventory Scripts

**Get business rules:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,collection,when,order,active,action_insert,action_update,action_delete
  limit: 100
```

**Get client scripts:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,table,type,fieldname,active,ui_type
  limit: 100
```

**Get script includes:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,api_name,client_callable,active,access
  limit: 100
```

**Get UI scripts:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_script
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,global,active,ui_type
  limit: 50
```

### Step 6: Analyze ACLs and Roles

**Get application roles:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_role
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,description,assignable_by
  limit: 50
```

**Get ACL rules:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: sys_scope=[scope_sys_id]^active=true
  fields: sys_id,name,operation,type,admin_overrides,condition,advanced
  limit: 100
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_security_acl?sysparm_query=sys_scope=[scope_sys_id]^active=true&sysparm_fields=sys_id,name,operation,type,admin_overrides&sysparm_limit=100" \
  -H "Accept: application/json"
```

### Step 7: Map Dependencies

**Check for cross-scope references in scripts:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope_privilege
  query: source_scope=[scope_sys_id]^ORtarget_scope=[scope_sys_id]
  fields: sys_id,source_scope,target_scope,type,operation,status
  limit: 50
```

**Check for integrations (REST messages, SOAP, etc.):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_rest_message
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,rest_endpoint,authentication_type
  limit: 20
```

**Check for scheduled jobs:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysauto_script
  query: sys_scope=[scope_sys_id]
  fields: sys_id,name,active,run_type,run_period
  limit: 20
```

### Step 8: Analyze UI Configuration

**Get UI actions:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_ui_action
  query: sys_scope=[scope_sys_id]^active=true
  fields: sys_id,name,table,action_name,client,form_button,list_button
  limit: 50
```

**Get navigation modules:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_app_module
  query: sys_scope=[scope_sys_id]
  fields: sys_id,title,link_type,name,query,order
  limit: 30
```

### Step 9: Compile the Application Summary

Generate a structured summary report:

```
Application Summary: [App Name]
================================================
Scope: [scope_name]
Version: [version]
Vendor: [vendor]
Created: [date] | Last Updated: [date]
Description: [short_description]

ARTIFACT INVENTORY:
  Tables: [count]
  Fields: [count]
  Business Rules: [count] (active: X, inactive: Y)
  Client Scripts: [count]
  Script Includes: [count]
  UI Actions: [count]
  ACL Rules: [count]
  Roles: [count]
  Properties: [count]
  Scheduled Jobs: [count]
  REST Messages: [count]
  Total Artifacts: [count]

TABLE STRUCTURE:
  [Table 1 Name] ([Label])
    - Extends: [parent table]
    - Fields: [count]
    - Key Fields: [list of mandatory/unique fields]
  [Table 2 Name] ([Label])
    ...

SCRIPT INVENTORY:
  Business Rules:
    - [Rule Name] on [Table] ([when], order [N]) - [Active/Inactive]
  Client Scripts:
    - [Script Name] on [Table] ([type]) - [Active/Inactive]
  Script Includes:
    - [Include Name] (client_callable: [yes/no]) - [Active/Inactive]

SECURITY MODEL:
  Roles:
    - [Role Name]: [Description]
  ACLs:
    - [Table].[Operation]: [Conditions/Roles]

DEPENDENCIES:
  Cross-scope references: [list]
  Integrations: [list]
  Scheduled Jobs: [list]

COMPLEXITY ASSESSMENT:
  - Table Count: [Low/Medium/High]
  - Script Density: [Low/Medium/High]
  - Integration Points: [count]
  - Overall Complexity: [Low/Medium/High]
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Find application | SN-Query-Table | GET /api/now/table/sys_scope |
| Get app metadata | SN-Get-Record | GET /api/now/table/sys_scope/{sys_id} |
| List all artifacts | SN-Query-Table | GET /api/now/table/sys_metadata |
| Get tables | SN-Query-Table | GET /api/now/table/sys_db_object |
| Get fields | SN-Query-Table | GET /api/now/table/sys_dictionary |
| Get business rules | SN-Query-Table | GET /api/now/table/sys_script |
| Get client scripts | SN-Query-Table | GET /api/now/table/sys_script_client |
| Get script includes | SN-Query-Table | GET /api/now/table/sys_script_include |
| Get ACLs | SN-Query-Table | GET /api/now/table/sys_security_acl |
| Get roles | SN-Query-Table | GET /api/now/table/sys_user_role |

## Best Practices

- **Start with sys_metadata:** This gives the fastest overview of all artifacts in a scope
- **Group artifacts by type:** Use sys_class_name to categorize and count artifacts efficiently
- **Check active vs. inactive:** Inactive artifacts may indicate technical debt or abandoned features
- **Examine script complexity:** Long scripts or high script counts suggest areas needing refactoring
- **Map all integrations:** Cross-scope and external integrations are critical for upgrade impact assessment
- **Document undocumented apps:** Many custom apps lack documentation; summaries fill this gap
- **Compare versions:** If multiple versions exist, compare artifact counts across versions
- **Identify orphaned artifacts:** Look for scripts referencing tables or fields that no longer exist
- **Assess test coverage:** Check for ATF (Automated Test Framework) tests within the scope
- **Review update sets:** Check sys_update_set for deployment history

## Troubleshooting

### Application Not Found

**Symptom:** No results when querying sys_scope
**Causes:**
1. Application is a global scope plugin, not a scoped app
2. Application name differs from scope name
3. Application is inactive
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope
  query: nameLIKE[partial_name]^ORscopeLIKE[partial_name]
  fields: sys_id,name,scope,active
  limit: 20
```

### Incomplete Metadata Count

**Symptom:** sys_metadata returns fewer artifacts than expected
**Cause:** Some artifacts may not extend sys_metadata, or query limit is too low
**Solution:** Increase limit and check for artifacts outside the scope:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=[scope_sys_id]
  fields: sys_id,sys_class_name
  limit: 1000
```

### Cannot Determine Table Relationships

**Symptom:** Reference fields exist but relationships are unclear
**Solution:** Query sys_dictionary for reference fields specifically:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=[table_name]^internal_type=reference
  fields: element,column_label,reference
  limit: 50
```

### Scope Privilege Errors

**Symptom:** Cannot access artifacts in a different scope
**Cause:** Cross-scope access not granted
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope_privilege
  query: target_scope=[scope_sys_id]^status=allowed
  fields: source_scope,target_scope,type,operation
  limit: 20
```

## Examples

### Example 1: Summarize a Custom HR Application

```
# Step 1: Find the application
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope
  query: nameLIKEHR Onboarding
  fields: sys_id,name,scope,version,vendor
  limit: 5
# Result: sys_id = "scope123", scope = "x_acme_hr_onboard"

# Step 2: Get all artifacts
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=scope123
  fields: sys_id,sys_class_name,sys_name
  limit: 500

# Step 3: Get tables
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_object
  query: sys_scope=scope123
  fields: sys_id,name,label,super_class
  limit: 20

# Step 4: Get scripts
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: sys_scope=scope123
  fields: sys_id,name,collection,when,active
  limit: 100
```

### Example 2: Compare Two Application Versions

```
# Get artifacts for version 1.0
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=[scope_v1_sys_id]
  fields: sys_id,sys_class_name
  limit: 500

# Get artifacts for version 2.0
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=[scope_v2_sys_id]
  fields: sys_id,sys_class_name
  limit: 500

# Compare artifact counts by type between versions
```

### Example 3: Identify All Applications by a Specific Vendor

```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope
  query: vendor=Happy Technologies LLC^active=true
  fields: sys_id,name,scope,version,sys_created_on
  limit: 50
```

## Related Skills

- `genai/app-generation` - Generate new applications from requirements
- `development/code-review` - Review application scripts for quality
- `development/code-assist` - Generate new scripts for existing applications
- `admin/update-set-management` - Package and deploy applications
- `security/acl-management` - Detailed ACL analysis
