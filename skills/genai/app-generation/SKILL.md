---
name: app-generation
version: 1.0.1
description: Generate ServiceNow scoped applications from requirements including tables, forms, ACLs, and business logic
author: Happy Technologies LLC
tags: [genai, app-generation, scoped-app, sys-scope, sys-app, sys-metadata, tables, acl, business-logic]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Get-Record
  rest:
    - /api/now/table/sys_scope
    - /api/now/table/sys_app
    - /api/now/table/sys_metadata
    - /api/now/table/sys_db_object
    - /api/now/table/sys_dictionary
    - /api/now/table/sys_security_acl
    - /api/now/table/sys_script
  native:
    - Bash
complexity: expert
estimated_time: 60-120 minutes
---

# ServiceNow Scoped Application Generation

## Overview

This skill covers generating complete ServiceNow scoped applications from requirements, including:

- Creating application scope and metadata
- Defining custom tables with fields, indexes, and relationships
- Generating forms, lists, and UI configurations
- Creating ACL rules for role-based access control
- Building business rules, client scripts, and script includes
- Setting up application navigation and modules
- Configuring application properties and system settings

**When to use:** When building a new custom application from scratch, prototyping a solution from business requirements, or automating the creation of standardized application templates.

## Prerequisites

- **Roles:** `admin`, `maint` (for table creation), or `application_creator`
- **Access:** sys_scope, sys_app, sys_db_object, sys_dictionary, sys_security_acl, sys_script tables
- **Knowledge:** ServiceNow application model, scoped applications, data modeling, ACL architecture
- **Plugins:** No additional plugins required; Studio (com.glide.studio) recommended
- **Related Skills:** Complete `development/code-assist` for script generation patterns

## Procedure

### Step 1: Understand the Application Architecture

```
sys_scope (Application Scope)
├── sys_app (Application Record)
├── sys_db_object (Tables)
│   └── sys_dictionary (Fields/Columns)
├── sys_ui_form (Forms)
│   └── sys_ui_form_section (Form Sections)
├── sys_ui_list (List Views)
├── sys_security_acl (ACL Rules)
├── sys_script (Business Rules)
├── sys_script_client (Client Scripts)
├── sys_script_include (Script Includes)
├── sys_app_module (Navigation Modules)
└── sys_properties (Application Properties)
```

**Key Tables:**
| Table | Purpose |
|-------|---------|
| sys_scope | Application scope definition and namespace |
| sys_app | Application metadata and version info |
| sys_metadata | Base record for all application artifacts |
| sys_db_object | Table definitions |
| sys_dictionary | Field/column definitions for tables |
| sys_security_acl | Access control rules |

### Step 2: Create the Application Scope

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_scope
  data:
    name: "Asset Tracking Pro"
    scope: "x_happy_asset_trk"
    short_description: "Custom asset tracking and lifecycle management application"
    version: "1.0.0"
    vendor: "Happy Technologies LLC"
    vendor_prefix: "x_happy"
    active: true
    licensable: false
    js_level: "helsinki_es6"
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_scope" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST \
  -d '{
    "name": "Asset Tracking Pro",
    "scope": "x_happy_asset_trk",
    "short_description": "Custom asset tracking and lifecycle management application",
    "version": "1.0.0",
    "vendor": "Happy Technologies LLC",
    "active": true
  }'
```

### Step 3: Create Application Tables

**Create the primary table:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_db_object
  data:
    name: "x_happy_asset_trk_asset"
    label: "Tracked Asset"
    super_class: task
    is_extendable: true
    create_access: true
    read_access: true
    update_access: true
    delete_access: true
    sys_scope: [scope_sys_id]
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_db_object" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "name": "x_happy_asset_trk_asset",
    "label": "Tracked Asset",
    "super_class": "task",
    "is_extendable": true,
    "sys_scope": "[scope_sys_id]"
  }'
```

**Create a supporting table:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_db_object
  data:
    name: "x_happy_asset_trk_asset_history"
    label: "Asset History"
    is_extendable: false
    sys_scope: [scope_sys_id]
```

### Step 4: Add Fields to Tables

**Add string field:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_dictionary
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_tag"
    column_label: "Asset Tag"
    internal_type: "string"
    max_length: 40
    mandatory: true
    unique: true
    active: true
    read_only: false
    sys_scope: [scope_sys_id]
```

**Add reference field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_dictionary
  data:
    name: "x_happy_asset_trk_asset"
    element: "assigned_user"
    column_label: "Assigned User"
    internal_type: "reference"
    reference: "sys_user"
    max_length: 32
    mandatory: false
    active: true
    sys_scope: [scope_sys_id]
```

**Add choice field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_dictionary
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_status"
    column_label: "Asset Status"
    internal_type: "string"
    max_length: 40
    choice: 1
    mandatory: true
    default_value: "available"
    active: true
    sys_scope: [scope_sys_id]
```

**Add choices for the choice field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_choice
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_status"
    label: "Available"
    value: "available"
    sequence: 100
    inactive: false

Tool: SN-Create-Record
Parameters:
  table_name: sys_choice
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_status"
    label: "In Use"
    value: "in_use"
    sequence: 200
    inactive: false

Tool: SN-Create-Record
Parameters:
  table_name: sys_choice
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_status"
    label: "In Maintenance"
    value: "in_maintenance"
    sequence: 300
    inactive: false

Tool: SN-Create-Record
Parameters:
  table_name: sys_choice
  data:
    name: "x_happy_asset_trk_asset"
    element: "asset_status"
    label: "Retired"
    value: "retired"
    sequence: 400
    inactive: false
```

**Add date field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_dictionary
  data:
    name: "x_happy_asset_trk_asset"
    element: "purchase_date"
    column_label: "Purchase Date"
    internal_type: "glide_date"
    mandatory: false
    active: true
    sys_scope: [scope_sys_id]
```

**Add currency field:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_dictionary
  data:
    name: "x_happy_asset_trk_asset"
    element: "purchase_cost"
    column_label: "Purchase Cost"
    internal_type: "currency"
    mandatory: false
    active: true
    sys_scope: [scope_sys_id]
```

### Step 5: Create ACL Rules

**Create table-level read ACL:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "x_happy_asset_trk_asset"
    operation: "read"
    type: "record"
    active: true
    admin_overrides: true
    advanced: false
    condition: ""
    sys_scope: [scope_sys_id]
```

**Create role-based ACL:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl
  data:
    name: "x_happy_asset_trk_asset"
    operation: "write"
    type: "record"
    active: true
    admin_overrides: true
    sys_scope: [scope_sys_id]
```

**Associate role with ACL:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_security_acl_role
  data:
    sys_security_acl: [acl_sys_id]
    sys_user_role: [role_sys_id]
```

**Create custom application role:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_user_role
  data:
    name: "x_happy_asset_trk.manager"
    description: "Asset Tracking Manager - full CRUD access"
    assignable_by: [admin_role_sys_id]
    sys_scope: [scope_sys_id]

Tool: SN-Create-Record
Parameters:
  table_name: sys_user_role
  data:
    name: "x_happy_asset_trk.user"
    description: "Asset Tracking User - read and create access"
    assignable_by: [admin_role_sys_id]
    sys_scope: [scope_sys_id]
```

### Step 6: Create Business Logic

**Before insert business rule - auto-generate asset tag:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Generate Asset Tag"
    collection: "x_happy_asset_trk_asset"
    when: "before"
    order: 100
    active: true
    action_insert: true
    sys_scope: [scope_sys_id]
    script: |
      (function executeRule(current, previous) {
        if (!current.asset_tag) {
          var prefix = 'AST';
          var ga = new GlideAggregate('x_happy_asset_trk_asset');
          ga.addAggregate('COUNT');
          ga.query();
          var count = 0;
          if (ga.next()) {
            count = parseInt(ga.getAggregate('COUNT'), 10);
          }
          current.asset_tag = prefix + '-' + gs.nowNoTZ().substring(0, 4) + '-' + String(count + 1).padStart(5, '0');
        }
      })(current, previous);
```

**After update business rule - track status changes:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Track Asset Status Change"
    collection: "x_happy_asset_trk_asset"
    when: "after"
    order: 200
    active: true
    action_update: true
    sys_scope: [scope_sys_id]
    script: |
      (function executeRule(current, previous) {
        if (current.asset_status.changes()) {
          var history = new GlideRecord('x_happy_asset_trk_asset_history');
          history.initialize();
          history.asset = current.sys_id;
          history.previous_status = previous.asset_status;
          history.new_status = current.asset_status;
          history.changed_by = gs.getUserID();
          history.changed_on = new GlideDateTime();
          history.insert();
        }
      })(current, previous);
```

### Step 7: Create Application Navigation

**Create application menu:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_app_application
  data:
    title: "Asset Tracking"
    hint: "Asset Tracking Pro application"
    device_type: "browser"
    category: "custom"
    active: true
    sys_scope: [scope_sys_id]
```

**Create navigation modules:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_app_module
  data:
    title: "All Assets"
    application: [app_menu_sys_id]
    hint: "View all tracked assets"
    link_type: "LIST"
    name: "x_happy_asset_trk_asset"
    query: ""
    order: 100
    active: true
    sys_scope: [scope_sys_id]

Tool: SN-Create-Record
Parameters:
  table_name: sys_app_module
  data:
    title: "Create New Asset"
    application: [app_menu_sys_id]
    hint: "Create a new tracked asset"
    link_type: "NEW"
    name: "x_happy_asset_trk_asset"
    order: 200
    active: true
    sys_scope: [scope_sys_id]

Tool: SN-Create-Record
Parameters:
  table_name: sys_app_module
  data:
    title: "My Assigned Assets"
    application: [app_menu_sys_id]
    hint: "Assets assigned to me"
    link_type: "LIST"
    name: "x_happy_asset_trk_asset"
    query: "assigned_user=javascript:gs.getUserID()"
    order: 300
    active: true
    sys_scope: [scope_sys_id]
```

### Step 8: Validate Application

**Check all application artifacts:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_metadata
  query: sys_scope=[scope_sys_id]
  fields: sys_id,sys_class_name,sys_name
  limit: 200
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_metadata?sysparm_query=sys_scope=[scope_sys_id]&sysparm_fields=sys_id,sys_class_name,sys_name&sysparm_limit=200" \
  -H "Accept: application/json"
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Create app scope | SN-Create-Record | POST /api/now/table/sys_scope |
| Create table | SN-Create-Record | POST /api/now/table/sys_db_object |
| Add fields | SN-Create-Record | POST /api/now/table/sys_dictionary |
| Create ACLs | SN-Create-Record | POST /api/now/table/sys_security_acl |
| Create business rules | SN-Create-Record | POST /api/now/table/sys_script |
| Create navigation | SN-Create-Record | POST /api/now/table/sys_app_module |
| Query metadata | SN-Query-Table | GET /api/now/table/sys_metadata |
| Validate app | SN-Query-Table | GET /api/now/table/sys_scope |

## Best Practices

- **Use scoped applications:** Always create applications within a scope for portability and isolation
- **Follow naming conventions:** Prefix all artifacts with the scope namespace (e.g., `x_vendor_app`)
- **Design tables around task:** Extend the `task` table for workflow-enabled entities
- **Create roles early:** Define application roles before creating ACLs to ensure consistent access control
- **Use application properties:** Store configurable values in `sys_properties` rather than hard-coding
- **Build incrementally:** Create tables and fields first, then ACLs, then business logic, then UI
- **Document as you build:** Add descriptions to every table, field, ACL, and script
- **Test in developer instance:** Always prototype in a personal developer instance before production
- **Plan for upgrades:** Avoid modifying baseline tables; extend or create custom tables instead
- **Include data cleanup scripts:** Plan for application removal with cleanup procedures

## Troubleshooting

### Table Creation Fails

**Symptom:** Error creating sys_db_object record
**Causes:**
1. Missing `maint` role
2. Table name does not match scope prefix
3. Table name already exists
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_db_object
  query: name=x_happy_asset_trk_asset
  fields: sys_id,name,label,sys_scope
```

### ACLs Not Enforcing

**Symptom:** Users can access records despite ACL rules
**Causes:**
1. ACL not active
2. Higher-priority ACL granting access
3. User has admin role (admin_overrides = true)
**Solution:** Check ACL evaluation order:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_security_acl
  query: name=x_happy_asset_trk_asset^active=true
  fields: sys_id,name,operation,type,admin_overrides,condition
  limit: 20
```

### Scope Access Errors

**Symptom:** "Scope access denied" when running scripts
**Cause:** Cross-scope access not configured
**Solution:** Check scope access settings:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_scope_privilege
  query: source_scope=[scope_sys_id]
  fields: sys_id,source_scope,target_scope,type,operation,status
  limit: 20
```

### Fields Not Appearing on Form

**Symptom:** Created fields not visible on the form
**Cause:** Fields exist in dictionary but not added to form layout
**Solution:** Create form section entries or use the form designer. Verify field existence:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=x_happy_asset_trk_asset^active=true
  fields: element,column_label,internal_type,mandatory
  limit: 50
```

## Examples

### Example: Complete Visitor Management Application

```
# 1. Create scope
Tool: SN-Create-Record
Parameters:
  table_name: sys_scope
  data:
    name: "Visitor Management"
    scope: "x_happy_visitor"
    version: "1.0.0"
    vendor: "Happy Technologies LLC"

# 2. Create visitor table extending task
Tool: SN-Create-Record
Parameters:
  table_name: sys_db_object
  data:
    name: "x_happy_visitor_visit"
    label: "Visitor Request"
    super_class: task

# 3. Add fields: visitor_name, company, host, visit_date, badge_number
# 4. Create ACLs for receptionist and host roles
# 5. Create business rule to auto-assign badge numbers
# 6. Create client script for date validation
# 7. Create navigation modules
# 8. Validate all artifacts via sys_metadata
```

## Related Skills

- `genai/app-summary` - Analyze and summarize existing applications
- `development/code-assist` - AI-assisted code generation for scripts
- `development/code-review` - Review generated code for quality
- `security/acl-management` - Detailed ACL configuration
- `admin/update-set-management` - Package application for deployment
