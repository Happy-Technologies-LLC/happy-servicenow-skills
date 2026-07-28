---
name: code-assist
version: 1.0.1
description: AI-assisted code generation for ServiceNow business rules, client scripts, script includes, and UI scripts with best practices
author: Happy Technologies LLC
tags: [development, code-generation, business-rules, client-scripts, script-includes, ui-scripts, sys-script, sys-script-include, sys-ui-script]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Get-Table-Schema
    - SN-Get-Record
  rest:
    - /api/now/table/sys_script
    - /api/now/table/sys_script_include
    - /api/now/table/sys_ui_script
    - /api/now/table/sys_script_client
  native:
    - Bash
complexity: intermediate
estimated_time: 15-45 minutes
---

# AI-Assisted ServiceNow Code Generation

## Overview

This skill covers AI-assisted code generation for the core ServiceNow server-side and client-side scripting artifacts:

- Business rules (sys_script): Server-side logic triggered by database operations
- Client scripts (sys_script_client): Browser-side logic for form interactions
- Script includes (sys_script_include): Reusable server-side JavaScript libraries
- UI scripts (sys_ui_script): Global client-side JavaScript libraries
- Applying ServiceNow scripting best practices and API conventions
- Generating code with proper GlideRecord, GlideSystem, and GlideAjax patterns

**When to use:** When creating new server or client scripts, refactoring existing code, implementing business logic, or generating boilerplate for common ServiceNow patterns.

## Prerequisites

- **Roles:** `admin` or `personalize_script` for business rules; `admin` for script includes
- **Access:** sys_script, sys_script_include, sys_ui_script, sys_script_client tables
- **Knowledge:** JavaScript, ServiceNow scripting APIs (GlideRecord, GlideSystem, GlideAjax)
- **Related Skills:** Complete `development/code-review` for validation after generation

## Procedure

### Step 1: Understand ServiceNow Script Types

| Script Type | Table | Runs On | Trigger |
|-------------|-------|---------|---------|
| Business Rule | sys_script | Server | DB operations (insert, update, delete, query) |
| Client Script | sys_script_client | Client (Browser) | Form events (onLoad, onChange, onSubmit) |
| Script Include | sys_script_include | Server | Called from other server scripts |
| UI Script | sys_ui_script | Client (Browser) | Loaded globally or on-demand |

**Key Tables:**
| Table | Purpose |
|-------|---------|
| sys_script | Business rule definitions with script body |
| sys_script_client | Client script definitions |
| sys_script_include | Reusable server-side script classes |
| sys_ui_script | Global client-side script libraries |

### Step 2: Generate a Business Rule

**MCP Approach - Create a before business rule:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Validate Priority on Critical Incidents"
    collection: incident
    when: before
    order: 100
    active: true
    filter_condition: priority=1
    action_insert: true
    action_update: true
    action_delete: false
    action_query: false
    script: |
      (function executeRule(current, previous) {
        // Ensure critical incidents have an assignment group
        if (!current.assignment_group) {
          current.assignment_group.setDisplayValue('Service Desk');
          gs.addInfoMessage('Assignment group set to Service Desk for critical incident');
        }

        // Set SLA tracking
        if (current.isNewRecord()) {
          current.sla_due = gs.daysAgoEnd(-1); // Due in 1 day
        }
      })(current, previous);
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_script" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST \
  -d '{
    "name": "Validate Priority on Critical Incidents",
    "collection": "incident",
    "when": "before",
    "order": 100,
    "active": true,
    "action_insert": true,
    "action_update": true,
    "script": "(function executeRule(current, previous) {\n  if (!current.assignment_group) {\n    current.assignment_group.setDisplayValue(\"Service Desk\");\n  }\n})(current, previous);"
  }'
```

### Step 3: Generate Business Rule Patterns

**After business rule - send notification:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Notify on High Priority Change"
    collection: change_request
    when: after
    order: 200
    active: true
    action_insert: true
    action_update: true
    script: |
      (function executeRule(current, previous) {
        // Only trigger when priority changes to high
        if (current.priority.changesTo(1) || current.priority.changesTo(2)) {
          var assignmentGroup = current.assignment_group.getDisplayValue();
          gs.eventQueue('change.high_priority', current, assignmentGroup, current.number);
        }
      })(current, previous);
```

**Async business rule - heavy processing:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Sync CMDB Relationships on Insert"
    collection: cmdb_ci_business_app
    when: async
    order: 100
    active: true
    action_insert: true
    script: |
      (function executeRule(current, previous) {
        // Async - runs in background, safe for heavy operations
        var relSync = new CMDBRelationshipSync();
        relSync.syncRelationships(current.sys_id);

        // Update related records
        var gr = new GlideRecord('cmdb_rel_ci');
        gr.addQuery('parent', current.sys_id);
        gr.query();
        while (gr.next()) {
          gr.setValue('validated', true);
          gr.update();
        }
      })(current, previous);
```

### Step 4: Generate a Client Script

**onChange client script:**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Set Impact from Category"
    table: incident
    type: onChange
    fieldname: category
    active: true
    ui_type: 0
    script: |
      function onChange(control, oldValue, newValue, isLoading) {
        if (isLoading || newValue === '') {
          return;
        }

        // Map category to impact
        var impactMap = {
          'network': '1',
          'hardware': '2',
          'software': '3',
          'inquiry': '3'
        };

        var impact = impactMap[newValue] || '3';
        g_form.setValue('impact', impact);

        if (newValue === 'network') {
          g_form.setMandatory('cmdb_ci', true);
          g_form.showFieldMsg('cmdb_ci', 'Configuration item is required for network issues', 'info');
        } else {
          g_form.setMandatory('cmdb_ci', false);
          g_form.hideFieldMsg('cmdb_ci');
        }
      }
```

**onLoad client script:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Initialize Form Defaults"
    table: incident
    type: onLoad
    active: true
    ui_type: 0
    script: |
      function onLoad() {
        // Only apply to new records
        if (!g_form.isNewRecord()) {
          return;
        }

        // Set default contact type
        g_form.setValue('contact_type', 'self-service');

        // Hide fields not needed for self-service
        g_form.setVisible('caller_id', false);

        // Make description mandatory
        g_form.setMandatory('description', true);

        // Add informational message
        g_form.addInfoMessage('Please provide detailed information to help us resolve your issue quickly.');
      }
```

**onSubmit client script:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Validate Before Submit"
    table: incident
    type: onSubmit
    active: true
    ui_type: 0
    script: |
      function onSubmit() {
        // Validate short description length
        var shortDesc = g_form.getValue('short_description');
        if (shortDesc.length < 10) {
          g_form.showFieldMsg('short_description', 'Please provide a more detailed summary (at least 10 characters)', 'error');
          return false;
        }

        // Confirm high priority submission
        var priority = g_form.getValue('priority');
        if (priority === '1') {
          return confirm('You are submitting a Critical priority incident. This will trigger immediate notifications. Continue?');
        }

        return true;
      }
```

### Step 5: Generate a Script Include

**Standard script include (class-based):**

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentUtils"
    api_name: "global.IncidentUtils"
    client_callable: false
    active: true
    access: package_private
    script: |
      var IncidentUtils = Class.create();
      IncidentUtils.prototype = {
        initialize: function() {
        },

        /**
         * Get the count of open incidents for a given CI
         * @param {string} ciSysId - The sys_id of the configuration item
         * @returns {number} Count of open incidents
         */
        getOpenIncidentCount: function(ciSysId) {
          var ga = new GlideAggregate('incident');
          ga.addQuery('cmdb_ci', ciSysId);
          ga.addQuery('state', 'IN', '1,2,3');
          ga.addAggregate('COUNT');
          ga.query();
          if (ga.next()) {
            return parseInt(ga.getAggregate('COUNT'), 10);
          }
          return 0;
        },

        /**
         * Auto-assign incident based on category and location
         * @param {GlideRecord} incident - The incident GlideRecord
         * @returns {string} sys_id of the assigned group
         */
        autoAssign: function(incident) {
          var gr = new GlideRecord('sys_user_group');
          gr.addQuery('type', incident.category);
          gr.addQuery('active', true);
          gr.setLimit(1);
          gr.query();
          if (gr.next()) {
            incident.assignment_group = gr.sys_id;
            return gr.sys_id.toString();
          }
          return null;
        },

        type: 'IncidentUtils'
      };
```

**GlideAjax-callable script include:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "IncidentAjax"
    api_name: "global.IncidentAjax"
    client_callable: true
    active: true
    script: |
      var IncidentAjax = Class.create();
      IncidentAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {

        /**
         * Get open incident count for a CI (callable from client)
         */
        getOpenCount: function() {
          var ciSysId = this.getParameter('sysparm_ci_sys_id');
          var utils = new IncidentUtils();
          var count = utils.getOpenIncidentCount(ciSysId);
          return count.toString();
        },

        /**
         * Validate if a user can be assigned to an incident
         */
        validateAssignee: function() {
          var userId = this.getParameter('sysparm_user_id');
          var gr = new GlideRecord('sys_user');
          if (gr.get(userId)) {
            var result = {};
            result.valid = gr.active.toString() === 'true';
            result.name = gr.getDisplayValue();
            result.hasRole = gr.hasRole('itil');
            return JSON.stringify(result);
          }
          return JSON.stringify({valid: false});
        },

        type: 'IncidentAjax'
      });
```

### Step 6: Generate a UI Script

**MCP Approach:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_ui_script
  data:
    name: "CustomFormHelpers"
    global: true
    active: true
    ui_type: 0
    script: |
      /**
       * Custom form helper utilities
       * Available globally on all forms
       */
      var CustomFormHelpers = {

        /**
         * Call a GlideAjax script include and handle response
         * @param {string} scriptInclude - Name of the script include
         * @param {string} method - Method name to call
         * @param {object} params - Key-value pairs of parameters
         * @param {function} callback - Callback function receiving the answer
         */
        ajaxCall: function(scriptInclude, method, params, callback) {
          var ga = new GlideAjax(scriptInclude);
          ga.addParam('sysparm_name', method);
          for (var key in params) {
            if (params.hasOwnProperty(key)) {
              ga.addParam(key, params[key]);
            }
          }
          ga.getXMLAnswer(function(answer) {
            if (callback && typeof callback === 'function') {
              callback(answer);
            }
          });
        },

        /**
         * Show a confirmation dialog with custom message
         * @param {string} message - Message to display
         * @param {function} onConfirm - Callback on confirm
         * @param {function} onCancel - Callback on cancel
         */
        confirmAction: function(message, onConfirm, onCancel) {
          var dialog = new GlideDialogWindow('glide_confirm_standard');
          dialog.setTitle('Confirm Action');
          dialog.setBody(message);
          dialog.setPreference('onPromptComplete', onConfirm);
          dialog.setPreference('onPromptCancel', onCancel || function() {});
          dialog.render();
        }
      };
```

### Step 7: Deploy and Validate

**Verify the created script:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=Validate Priority on Critical Incidents
  fields: sys_id,name,collection,when,active,script
  limit: 1
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_script?sysparm_query=name=Validate Priority on Critical Incidents&sysparm_fields=sys_id,name,collection,when,active" \
  -H "Accept: application/json"
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Create business rule | SN-Create-Record | POST /api/now/table/sys_script |
| Create client script | SN-Create-Record | POST /api/now/table/sys_script_client |
| Create script include | SN-Create-Record | POST /api/now/table/sys_script_include |
| Create UI script | SN-Create-Record | POST /api/now/table/sys_ui_script |
| Query existing scripts | SN-Query-Table | GET /api/now/table/{script_table} |
| Update script | SN-Update-Record | PATCH /api/now/table/{script_table}/{sys_id} |
| Get table schema | SN-Get-Table-Schema | GET /api/now/table/sys_dictionary |

## Best Practices

- **Use before rules for validation:** Validate and modify data before it reaches the database
- **Use after rules for side effects:** Notifications, event triggers, and updates to other records
- **Use async rules for heavy operations:** GlideRecord loops, external integrations, bulk updates
- **Avoid DOM manipulation in client scripts:** Use g_form API methods instead of direct DOM access
- **Minimize GlideRecord queries in client scripts:** Use GlideAjax to call server-side logic
- **Wrap business rule scripts in IIFE:** Use `(function executeRule(current, previous) { ... })(current, previous);`
- **Check isLoading in onChange:** Always return early if `isLoading` is true to avoid interference during form load
- **Use script includes for reusable logic:** Never duplicate code across business rules
- **Set appropriate order values:** Lower numbers execute first; use 100-increment spacing for future insertions
- **Scope scripts properly:** Use scoped application API (e.g., `x_myapp.MyScriptInclude`) for custom applications
- **Add JSDoc comments:** Document parameters, return types, and side effects

## Troubleshooting

### Business Rule Not Firing

**Symptom:** Business rule script does not execute
**Causes:**
1. Rule inactive
2. Wrong `when` setting (before/after/async)
3. Filter condition not matching
4. Action flags (insert/update/delete) not set
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: name=[rule_name]
  fields: sys_id,name,active,when,collection,action_insert,action_update,filter_condition
```

### Client Script Not Running

**Symptom:** Client script does not fire on form
**Causes:**
1. Script inactive
2. Wrong type (onLoad/onChange/onSubmit)
3. Missing fieldname for onChange scripts
4. UI type mismatch (desktop vs. mobile vs. both)
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: name=[script_name]
  fields: sys_id,name,active,type,table,fieldname,ui_type
```

### Script Include Not Found

**Symptom:** "Class not found" or "is not defined" errors
**Causes:**
1. Script include inactive
2. Name mismatch (case-sensitive)
3. Scope access restrictions
4. client_callable not set for GlideAjax calls
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: name=[include_name]
  fields: sys_id,name,active,client_callable,api_name,access
```

### GlideAjax Returns Empty

**Symptom:** GlideAjax callback receives empty or undefined answer
**Cause:** Script include method does not return a value, or client_callable is false
**Solution:** Verify the script include has `client_callable: true` and the method returns a string value.

## Examples

### Example: Complete Feature - Auto-Assignment with Client Feedback

```
# 1. Create server-side logic (Script Include)
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_include
  data:
    name: "AutoAssignmentEngine"
    client_callable: true
    active: true
    script: |
      var AutoAssignmentEngine = Class.create();
      AutoAssignmentEngine.prototype = Object.extendsObject(AbstractAjaxProcessor, {
        getSuggestedGroup: function() {
          var category = this.getParameter('sysparm_category');
          var location = this.getParameter('sysparm_location');
          var gr = new GlideRecord('sys_user_group');
          gr.addQuery('type', category);
          gr.addQuery('active', true);
          gr.setLimit(1);
          gr.query();
          if (gr.next()) {
            return JSON.stringify({sys_id: gr.sys_id.toString(), name: gr.getDisplayValue()});
          }
          return JSON.stringify({sys_id: '', name: ''});
        },
        type: 'AutoAssignmentEngine'
      });

# 2. Create client script to call it
Tool: SN-Create-Record
Parameters:
  table_name: sys_script_client
  data:
    name: "Auto-suggest Assignment Group"
    table: incident
    type: onChange
    fieldname: category
    active: true
    script: |
      function onChange(control, oldValue, newValue, isLoading) {
        if (isLoading || newValue === '') return;
        var ga = new GlideAjax('AutoAssignmentEngine');
        ga.addParam('sysparm_name', 'getSuggestedGroup');
        ga.addParam('sysparm_category', newValue);
        ga.addParam('sysparm_location', g_form.getValue('location'));
        ga.getXMLAnswer(function(answer) {
          var result = JSON.parse(answer);
          if (result.sys_id) {
            g_form.setValue('assignment_group', result.sys_id, result.name);
            g_form.addInfoMessage('Auto-assigned to: ' + result.name);
          }
        });
      }

# 3. Create business rule as fallback
Tool: SN-Create-Record
Parameters:
  table_name: sys_script
  data:
    name: "Ensure Assignment Group on Insert"
    collection: incident
    when: before
    action_insert: true
    active: true
    script: |
      (function executeRule(current, previous) {
        if (!current.assignment_group) {
          var engine = new AutoAssignmentEngine();
          var result = engine.autoAssign(current);
          if (!result) {
            current.assignment_group.setDisplayValue('Service Desk');
          }
        }
      })(current, previous);
```

## Related Skills

- `development/code-review` - Review generated code for quality and security
- `admin/workflow-creation` - Building workflows that complement scripts
- `catalog/variable-management` - Catalog scripts for service catalog items
- `security/acl-management` - Security rules that work alongside business rules
