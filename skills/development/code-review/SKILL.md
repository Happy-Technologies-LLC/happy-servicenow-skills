---
name: code-review
version: 1.0.1
description: Review ServiceNow code for security vulnerabilities, performance issues, and platform best practices
author: Happy Technologies LLC
tags: [development, code-review, security, performance, best-practices, sys-script, sys-script-include, sys-ui-script]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Get-Table-Schema
    - SN-Update-Record
  rest:
    - /api/now/table/sys_script
    - /api/now/table/sys_script_include
    - /api/now/table/sys_ui_script
    - /api/now/table/sys_script_client
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# ServiceNow Code Review

## Overview

This skill covers systematic code review for ServiceNow scripts to identify and remediate:

- Security vulnerabilities (injection, XSS, privilege escalation, data exposure)
- Performance anti-patterns (unnecessary queries, N+1 problems, missing query limits)
- Platform best practice violations (API misuse, scope issues, deprecated methods)
- Maintainability concerns (naming, documentation, complexity, dead code)
- Concurrency and transaction safety issues
- Client-side performance and UX problems

**When to use:** Before deploying new scripts to production, during code review processes, when troubleshooting performance issues, or when auditing existing scripts for security compliance.

## Prerequisites

- **Roles:** `admin`, `security_admin`, or developer with read access to script tables
- **Access:** sys_script, sys_script_include, sys_ui_script, sys_script_client tables
- **Knowledge:** ServiceNow scripting APIs, OWASP security principles, JavaScript best practices
- **Related Skills:** Complete `development/code-assist` for code generation context

## Procedure

### Step 1: Retrieve Scripts for Review

**Query business rules for a specific table:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true
  fields: sys_id,name,collection,when,script,filter_condition,order
  limit: 50
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_script?sysparm_query=collection=incident^active=true&sysparm_fields=sys_id,name,collection,when,script,filter_condition,order&sysparm_limit=50" \
  -H "Accept: application/json"
```

**Query script includes:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: active=true^sys_updated_on>=javascript:gs.daysAgo(30)
  fields: sys_id,name,script,client_callable,access,api_name
  limit: 50
```

**Query client scripts:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^active=true
  fields: sys_id,name,table,type,fieldname,script,ui_type
  limit: 50
```

### Step 2: Security Review Checklist

Review each script against these critical security patterns:

**2a. SQL/GlideRecord Injection:**
```
VULNERABILITY: Unsanitized user input in queries
BAD:
  gr.addEncodedQuery(current.variables.user_input);
  gr.addQuery('name', request.getParameter('name'));

GOOD:
  // Validate and sanitize input
  var sanitized = GlideStringUtil.escapeHTML(input);
  // Use parameterized queries
  gr.addQuery('name', sanitizedName);
  // Validate against allowlist
  var validFields = ['name', 'number', 'state'];
  if (validFields.indexOf(fieldName) === -1) return;
```

**2b. Cross-Site Scripting (XSS):**
```
VULNERABILITY: Unescaped output in UI scripts or HTML fields
BAD:
  element.innerHTML = current.short_description;
  gs.getMessage(userInput);

GOOD:
  element.textContent = current.short_description;
  var escaped = GlideStringUtil.escapeHTML(current.short_description);
```

**2c. Privilege Escalation:**
```
VULNERABILITY: Missing role checks or using setWorkflow(false) inappropriately
BAD:
  current.setWorkflow(false); // Bypasses business rules and ACLs
  current.autoSysFields(false); // Hides audit trail

GOOD:
  // Only bypass when absolutely necessary and documented
  if (gs.hasRole('admin')) {
    current.setWorkflow(false); // REASON: Bulk import requires bypass
  }
```

**2d. Sensitive Data Exposure:**
```
VULNERABILITY: Logging or returning sensitive data
BAD:
  gs.log('User password: ' + password);
  gs.log('SSN: ' + current.social_security_number);

GOOD:
  gs.log('Authentication attempted for user: ' + username);
  // Never log PII, credentials, or tokens
```

### Step 3: Performance Review Checklist

**3a. Unbounded GlideRecord Queries:**
```
ANTI-PATTERN: Query without limit
BAD:
  var gr = new GlideRecord('incident');
  gr.addQuery('active', true);
  gr.query(); // Could return millions of records

GOOD:
  var gr = new GlideRecord('incident');
  gr.addQuery('active', true);
  gr.setLimit(1000); // Always set a reasonable limit
  gr.query();
```

**3b. N+1 Query Pattern:**
```
ANTI-PATTERN: Query inside a loop
BAD:
  var incidents = new GlideRecord('incident');
  incidents.query();
  while (incidents.next()) {
    var user = new GlideRecord('sys_user');
    user.get(incidents.caller_id); // Query per iteration!
    // process...
  }

GOOD:
  // Use dot-walking or join queries
  var incidents = new GlideRecord('incident');
  incidents.addQuery('active', true);
  incidents.query();
  while (incidents.next()) {
    var callerName = incidents.caller_id.getDisplayValue(); // Dot-walk
    // process...
  }

  // Or use GlideAggregate for counts
  var ga = new GlideAggregate('incident');
  ga.addQuery('active', true);
  ga.groupBy('assignment_group');
  ga.addAggregate('COUNT');
  ga.query();
```

**3c. Synchronous GlideRecord in Client Scripts:**
```
ANTI-PATTERN: Synchronous server calls from client
BAD:
  var gr = new GlideRecord('sys_user');
  gr.addQuery('sys_id', userId);
  gr.query(); // Synchronous - blocks browser!
  if (gr.next()) { ... }

GOOD:
  // Use GlideAjax for async server calls
  var ga = new GlideAjax('MyScriptInclude');
  ga.addParam('sysparm_name', 'getUserInfo');
  ga.addParam('sysparm_user_id', userId);
  ga.getXMLAnswer(function(answer) {
    // Process response asynchronously
  });
```

**3d. Unnecessary Field Retrieval:**
```
ANTI-PATTERN: Selecting all fields when only a few are needed
BAD:
  var gr = new GlideRecord('incident');
  gr.query(); // Returns ALL fields

GOOD:
  var gr = new GlideRecord('incident');
  gr.addQuery('active', true);
  gr.chooseWindow(0, 100);
  gr.setFields('sys_id,number,short_description,state');
  gr.query();
```

### Step 4: Platform Best Practices Review

**4a. Deprecated API Usage:**
```
DEPRECATED: Avoid these methods
BAD:
  current.getDisplayValue(); // Without field name - ambiguous
  gs.log(); // Use gs.info/warn/error instead
  Packages.java.lang.*; // Direct Java calls - unsupported

GOOD:
  current.getDisplayValue('short_description');
  gs.info('Message: {0}', current.number);
```

**4b. Scope Violations:**
```
ANTI-PATTERN: Accessing global scope from scoped app
BAD:
  // In scoped app, directly calling global
  var result = new IncidentUtils(); // Global script include

GOOD:
  // Use scoped API or cross-scope access
  var si = new global.IncidentUtils(); // Explicit scope prefix
  // Or use sn_ws for REST-based cross-scope communication
```

**4c. Business Rule Ordering:**
```
BEST PRACTICE: Proper ordering
- 100: Data defaults and initialization
- 200: Validation rules
- 300: Data transformation
- 400: Cross-table updates (after rules)
- 500+: Notifications and integrations (after rules)
```

**4d. GlideRecord getValue vs Direct Access:**
```
ANTI-PATTERN: Direct field access for comparisons
BAD:
  if (current.state == 6) { ... } // Returns GlideElement, not value

GOOD:
  if (current.getValue('state') == '6') { ... }
  // Or use typed comparison
  if (current.state.changesTo(6)) { ... }
```

### Step 5: Client Script Review

**5a. DOM Manipulation:**
```
ANTI-PATTERN: Direct DOM manipulation
BAD:
  document.getElementById('incident.short_description').style.color = 'red';
  $('incident.state').value = '6';

GOOD:
  g_form.setMandatory('short_description', true);
  g_form.addDecoration('short_description', 'color_red');
  g_form.setValue('state', '6');
```

**5b. Missing isLoading Check:**
```
ANTI-PATTERN: onChange without isLoading guard
BAD:
  function onChange(control, oldValue, newValue, isLoading) {
    // Fires on every form load, causing unnecessary processing
    callServer(newValue);
  }

GOOD:
  function onChange(control, oldValue, newValue, isLoading) {
    if (isLoading || newValue === '') {
      return;
    }
    callServer(newValue);
  }
```

### Step 6: Generate Review Report

Compile findings into a structured review report:

```
Code Review Report
================================================
Script: [Script Name]
Table: [Table Name]
Type: [Business Rule / Client Script / Script Include]
Reviewer: [AI-Assisted Review]
Date: [Current Date]

CRITICAL ISSUES:
  [C1] Security - SQL Injection in line X
  [C2] Security - XSS vulnerability in line Y

HIGH ISSUES:
  [H1] Performance - N+1 query pattern in line Z
  [H2] Performance - Unbounded GlideRecord query

MEDIUM ISSUES:
  [M1] Best Practice - Deprecated API usage
  [M2] Best Practice - Missing error handling

LOW ISSUES:
  [L1] Maintainability - Missing JSDoc comments
  [L2] Maintainability - Variable naming inconsistency

RECOMMENDATIONS:
  1. [Specific fix for C1]
  2. [Specific fix for C2]
  3. [Specific fix for H1]
```

### Step 7: Apply Fixes

**Update script with fixes:**

**MCP Approach:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_script
  sys_id: [script_sys_id]
  data:
    script: |
      // [Updated script with fixes applied]
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/sys_script/[script_sys_id]" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"script": "// Updated script content"}'
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Query business rules | SN-Query-Table | GET /api/now/table/sys_script |
| Query client scripts | SN-Query-Table | GET /api/now/table/sys_script_client |
| Query script includes | SN-Query-Table | GET /api/now/table/sys_script_include |
| Query UI scripts | SN-Query-Table | GET /api/now/table/sys_ui_script |
| Get single script | SN-Get-Record | GET /api/now/table/{table}/{sys_id} |
| Update fixed script | SN-Update-Record | PATCH /api/now/table/{table}/{sys_id} |

## Best Practices

- **Review in layers:** Security first, then performance, then best practices, then maintainability
- **Automate recurring checks:** Build scanning scripts for common anti-patterns
- **Check all script types together:** Business rules, client scripts, and script includes often interact
- **Test fixes in sub-production:** Never apply code fixes directly to production
- **Document exceptions:** If a known anti-pattern is intentional, add a comment explaining why
- **Review ACLs alongside scripts:** Ensure ACLs complement business rule security checks
- **Check for dead code:** Inactive scripts still count against instance performance during upgrades
- **Validate error handling:** Every GlideRecord.get() should check for null results
- **Review update sets:** Check that scripts are captured in proper update sets before promoting

## Troubleshooting

### Cannot Access Script Tables

**Symptom:** Permission denied when querying sys_script
**Cause:** Missing admin or script-related roles
**Solution:** Verify role assignment:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user_has_role
  query: user=[user_sys_id]^role.name=admin
  fields: sys_id,role,user
```

### Script Too Large to Retrieve

**Symptom:** Script field truncated in API response
**Cause:** API field size limits
**Solution:** Get the specific record directly:
```
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: [script_sys_id]
  fields: script
```

### Finding All Scripts Modified Recently

**Symptom:** Need to review all recent changes
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: sys_updated_on>=javascript:gs.daysAgo(7)^active=true
  fields: sys_id,name,collection,when,sys_updated_by,sys_updated_on
  limit: 100
```

### Identifying Duplicate or Conflicting Rules

**Symptom:** Unexpected behavior from multiple rules on same table
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true^when=before
  fields: sys_id,name,order,filter_condition,action_insert,action_update
  limit: 100
```

## Examples

### Example 1: Full Security Audit of Incident Business Rules

```
# Step 1: Get all active business rules for incident table
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=incident^active=true
  fields: sys_id,name,when,script,order
  limit: 100

# Step 2: For each script, check for security patterns
# Look for: addEncodedQuery with user input, setWorkflow(false),
# gs.log with sensitive data, eval() usage, Packages.* calls

# Step 3: Get client scripts for incident
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_client
  query: table=incident^active=true
  fields: sys_id,name,type,script
  limit: 50

# Step 4: Check for synchronous GlideRecord in client scripts
# Look for: GlideRecord().query() without callback, direct DOM access
```

### Example 2: Performance Review of Script Includes

```
# Get all active script includes with recent updates
Tool: SN-Query-Table
Parameters:
  table_name: sys_script_include
  query: active=true^sys_updated_on>=javascript:gs.daysAgo(90)
  fields: sys_id,name,script,api_name
  limit: 100

# For each script include, check for:
# - GlideRecord queries without setLimit()
# - Nested loops with queries (N+1)
# - Missing null checks after .get()
# - Large string concatenation in loops
```

### Example 3: Review Recently Deployed Code

```
# Get scripts from the latest update set
Tool: SN-Query-Table
Parameters:
  table_name: sys_update_xml
  query: update_set=[update_set_sys_id]^nameLIKEsys_script
  fields: sys_id,name,action,target_name
  limit: 50

# Then retrieve each script for review
Tool: SN-Get-Record
Parameters:
  table_name: sys_script
  sys_id: [script_sys_id]
  fields: name,script,collection,when
```

## Related Skills

- `development/code-assist` - AI-assisted code generation
- `security/acl-management` - Access control list management
- `admin/update-set-management` - Update set handling for deployments
- `security/audit-compliance` - Security hardening guidelines
