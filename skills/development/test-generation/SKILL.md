---
name: test-generation
version: 1.0.1
description: Generate ATF (Automated Test Framework) tests from requirements or existing functionality including test steps, assertions, and test data
author: Happy Technologies LLC
tags: [development, testing, atf, automated-testing, test-framework, test-generation, quality, assertions]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Discover-Table-Schema
  rest:
    - /api/now/table/sys_atf_test
    - /api/now/table/sys_atf_step
    - /api/now/table/sys_atf_test_suite_test
    - /api/now/table/sys_atf_test_result
    - /api/now/table/sys_atf_step_config
    - /api/now/table/sys_atf_test_suite
  native:
    - Bash
complexity: advanced
estimated_time: 20-45 minutes
---

# ATF Test Generation

## Overview

This skill enables the generation of Automated Test Framework (ATF) tests from requirements, user stories, or existing ServiceNow functionality. It covers:

- Creating test records in `sys_atf_test` with metadata, descriptions, and configuration
- Generating ordered test steps in `sys_atf_step` for record operations, form interactions, and server-side scripts
- Building assertions that validate expected behavior against actual results
- Creating test data setup and teardown steps for isolated, repeatable tests
- Organizing tests into suites via `sys_atf_test_suite_test`
- Analyzing test results from `sys_atf_test_result` for quality reporting

**When to use:** When developing new features that need automated regression coverage, when converting manual test plans to ATF tests, when building CI/CD pipeline test suites, or when validating business rules, client scripts, and workflows.

**Value proposition:** Automated test generation reduces the time to create ATF tests by 70-80%, ensures consistent test quality, and enables rapid expansion of regression test coverage for CI/CD pipelines.

## Prerequisites

- **Plugins:** `com.snc.automated_test_framework` (Automated Test Framework)
- **Roles:** `atf_test_admin`, `atf_test_designer`, or `admin`
- **Access:** Read/write access to `sys_atf_test`, `sys_atf_step`, `sys_atf_step_config`, and related ATF tables
- **Knowledge:** Understanding of the feature being tested, expected behavior, and ServiceNow ATF step types

## Procedure

### Step 1: Analyze the Requirement or Functionality

Identify what needs to be tested and break it into testable scenarios.

**Query existing business rules, client scripts, or workflows for the target table:**

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_script
  query: collection=[table_name]^active=true
  fields: sys_id,name,when,filter_condition,script,active,order
  limit: 20
```

**Query existing tests for the same area to avoid duplication:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test
  query: descriptionLIKE[feature_keyword]^ORnameLIKE[feature_keyword]
  fields: sys_id,name,description,status,sys_updated_on,test_suite
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_atf_test?sysparm_query=descriptionLIKE[feature_keyword]&sysparm_fields=sys_id,name,description,status,sys_updated_on&sysparm_limit=20&sysparm_display_value=true
```

**Identify available step configurations:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_config
  query: active=true
  fields: sys_id,name,category,description,batch_order_constraint
  limit: 50
  order_by: category,name
```

### Step 2: Create the Test Record

Generate the test with descriptive metadata.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test
  fields:
    name: "Validate Incident Priority Calculation Business Rule"
    description: |
      Tests the priority lookup business rule on the incident table.

      Scenarios covered:
      1. Impact=1 + Urgency=1 should set Priority=1 (Critical)
      2. Impact=2 + Urgency=2 should set Priority=3 (Moderate)
      3. Impact=3 + Urgency=3 should set Priority=4 (Low)
      4. Changing Impact should recalculate Priority
      5. Priority field should be read-only after calculation

      Related requirement: REQ-2026-0145
      Related story: STY0015678
    status: design
    active: true
    application: [app_scope_sys_id]
    category: functional
    priority: 2
```

**Using REST API:**
```bash
POST /api/now/table/sys_atf_test
Content-Type: application/json

{
  "name": "Validate Incident Priority Calculation Business Rule",
  "description": "Tests the priority lookup business rule on the incident table.",
  "status": "design",
  "active": "true",
  "category": "functional",
  "priority": "2"
}
```

### Step 3: Generate Test Data Setup Steps

Create steps that prepare the test environment with known data.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  fields:
    test: [test_sys_id]
    step_config: [create_record_step_config_sys_id]
    order: 100
    description: "Create test incident with Impact=1 and Urgency=1"
    active: true
    inputs: |
      {
        "table": "incident",
        "fields": {
          "short_description": "ATF Test - Priority Calculation P1",
          "caller_id": "javascript:gs.getUserID()",
          "impact": "1",
          "urgency": "1",
          "category": "software",
          "assignment_group": "javascript:new GlideRecord('sys_user_group').get('name', 'Service Desk') ? current.sys_id : ''"
        }
      }
    output_variable: test_incident_p1
```

**Using REST API:**
```bash
POST /api/now/table/sys_atf_step
Content-Type: application/json

{
  "test": "[test_sys_id]",
  "step_config": "[create_record_step_config_sys_id]",
  "order": "100",
  "description": "Create test incident with Impact=1 and Urgency=1",
  "active": "true"
}
```

### Step 4: Generate Assertion Steps

Create steps that validate expected outcomes.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  fields:
    test: [test_sys_id]
    step_config: [assert_record_values_step_config_sys_id]
    order: 200
    description: "Assert Priority is set to 1 (Critical) when Impact=1, Urgency=1"
    active: true
    inputs: |
      {
        "table": "incident",
        "sys_id": "{{test_incident_p1.sys_id}}",
        "assertions": [
          {
            "field": "priority",
            "operator": "=",
            "expected": "1"
          }
        ]
      }
```

**Create a server-side script step for complex assertions:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  fields:
    test: [test_sys_id]
    step_config: [run_server_side_script_step_config_sys_id]
    order: 300
    description: "Validate priority matrix lookup logic"
    active: true
    inputs: |
      {
        "script": "var gr = new GlideRecord('incident');\ngr.get('{{test_incident_p1.sys_id}}');\n\nvar expectedPriority = '1';\nvar actualPriority = gr.getValue('priority');\n\nstepResult.setOutputMessage('Expected: ' + expectedPriority + ', Actual: ' + actualPriority);\nstepResult.assertEqual({\n  name: 'Priority calculation for Impact=1, Urgency=1',\n  shouldbe: expectedPriority,\n  value: actualPriority\n});"
      }
```

### Step 5: Generate Multiple Test Scenarios

Create comprehensive test coverage using batch step generation.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate ATF test steps for all priority matrix combinations
  script: |
    var testId = '[test_sys_id]';
    var createStepConfig = '[create_record_step_config_sys_id]';
    var assertStepConfig = '[assert_record_values_step_config_sys_id]';
    var cleanupStepConfig = '[delete_record_step_config_sys_id]';

    // Priority matrix: Impact x Urgency = Priority
    var matrix = [
      { impact: 1, urgency: 1, expected_priority: 1, label: 'Critical' },
      { impact: 1, urgency: 2, expected_priority: 2, label: 'High' },
      { impact: 1, urgency: 3, expected_priority: 2, label: 'High' },
      { impact: 2, urgency: 1, expected_priority: 2, label: 'High' },
      { impact: 2, urgency: 2, expected_priority: 3, label: 'Moderate' },
      { impact: 2, urgency: 3, expected_priority: 3, label: 'Moderate' },
      { impact: 3, urgency: 1, expected_priority: 2, label: 'High' },
      { impact: 3, urgency: 2, expected_priority: 3, label: 'Moderate' },
      { impact: 3, urgency: 3, expected_priority: 4, label: 'Low' }
    ];

    var stepOrder = 100;
    var createdSteps = 0;

    matrix.forEach(function(combo) {
      var varName = 'incident_i' + combo.impact + '_u' + combo.urgency;

      // Create record step
      var create = new GlideRecord('sys_atf_step');
      create.initialize();
      create.test = testId;
      create.step_config = createStepConfig;
      create.order = stepOrder;
      create.description = 'Create incident: Impact=' + combo.impact + ', Urgency=' + combo.urgency;
      create.active = true;
      create.insert();
      stepOrder += 50;
      createdSteps++;

      // Assert step
      var assert = new GlideRecord('sys_atf_step');
      assert.initialize();
      assert.test = testId;
      assert.step_config = assertStepConfig;
      assert.order = stepOrder;
      assert.description = 'Assert Priority=' + combo.expected_priority + ' (' + combo.label + ') for Impact=' + combo.impact + ', Urgency=' + combo.urgency;
      assert.active = true;
      assert.insert();
      stepOrder += 50;
      createdSteps++;
    });

    gs.info('Created ' + createdSteps + ' ATF steps for ' + matrix.length + ' priority combinations');
```

### Step 6: Add Cleanup (Teardown) Steps

Ensure test data is cleaned up after execution.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_step
  fields:
    test: [test_sys_id]
    step_config: [delete_record_step_config_sys_id]
    order: 9000
    description: "Cleanup: Delete test incidents created during test"
    active: true
    inputs: |
      {
        "table": "incident",
        "query": "short_descriptionSTARTSWITHATF Test - Priority Calculation"
      }
```

### Step 7: Organize Into Test Suites

Add the test to an appropriate test suite for batch execution.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test_suite
  query: active=true^nameLIKEregression^ORnameLIKEincident
  fields: sys_id,name,description,active,scheduled,run_condition
  limit: 10
```

**Add test to suite:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test_suite_test
  fields:
    test_suite: [suite_sys_id]
    test: [test_sys_id]
    order: 500
    abort_on_failure: false
```

**Using REST API:**
```bash
POST /api/now/table/sys_atf_test_suite_test
Content-Type: application/json

{
  "test_suite": "[suite_sys_id]",
  "test": "[test_sys_id]",
  "order": "500",
  "abort_on_failure": "false"
}
```

### Step 8: Review Test Results

Analyze results after test execution.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_test_result
  query: test=[test_sys_id]^ORDERBYDESCstart_time
  fields: sys_id,test,status,start_time,end_time,duration,output,run_by,failure_reason
  limit: 10
```

**Get step-level results:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_atf_step_result
  query: test_result=[result_sys_id]
  fields: sys_id,step,step.description,status,output,start_time,end_time,failure_reason
  limit: 50
  order_by: step.order
```

**Using REST API:**
```bash
GET /api/now/table/sys_atf_test_result?sysparm_query=test=[test_sys_id]^ORDERBYDESCstart_time&sysparm_fields=sys_id,test,status,start_time,end_time,duration,output,failure_reason&sysparm_limit=10&sysparm_display_value=true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query existing tests, step configs, suites, and results |
| `SN-Create-Record` | Create tests, steps, suite associations |
| `SN-Update-Record` | Update test status, activate/deactivate steps |
| `SN-Natural-Language-Search` | Find tests or functionality by description |
| `SN-Execute-Background-Script` | Batch step generation, complex test data setup |
| `SN-Discover-Table-Schema` | Explore ATF table structures and step config options |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sys_atf_test` | GET/POST/PATCH | Manage test records |
| `/api/now/table/sys_atf_step` | GET/POST | Create and query test steps |
| `/api/now/table/sys_atf_step_config` | GET | Discover available step types |
| `/api/now/table/sys_atf_test_suite` | GET/POST | Manage test suites |
| `/api/now/table/sys_atf_test_suite_test` | POST | Add tests to suites |
| `/api/now/table/sys_atf_test_result` | GET | Query test execution results |

## Best Practices

- **One scenario per test:** Each test should validate a single scenario; use suites to group related scenarios
- **Descriptive step names:** Write step descriptions as assertions (e.g., "Verify priority is Critical when Impact=1, Urgency=1")
- **Always clean up:** Include teardown steps to delete test data; never leave test records in production tables
- **Use output variables:** Chain step outputs using output variables to pass sys_ids between create and assert steps
- **Parameterize test data:** Use variables for test data values so tests are easily maintainable when requirements change
- **Test negative cases:** Include tests for invalid inputs, permission denials, and error conditions
- **Run in sub-production first:** Execute new tests in a sub-production instance before adding to production CI/CD pipelines
- **Version control tests:** Associate tests with application scopes and update sets for proper lifecycle management

## Troubleshooting

### Test Step "Create Record" Fails

**Cause:** Mandatory fields missing, business rules blocking creation, or access control denying the test user
**Solution:** Check that all mandatory fields are provided in the step inputs. Run the test as an admin user to rule out ACL issues. Review business rule conditions that may prevent record creation.

### Assertion Fails with Unexpected Value

**Cause:** Business rule timing (before vs after), async processes, or display value vs internal value mismatch
**Solution:** Verify the step order ensures business rules have executed before assertion. Use `sys_id` references for lookups rather than display values. Add a "Wait" step if async operations are involved.

### Test Suite Execution Timeout

**Cause:** Too many steps, expensive queries in server-side scripts, or external integration timeouts
**Solution:** Limit each test to 20-30 steps maximum. Optimize GlideRecord queries in server-side steps. Set appropriate timeout values on the suite configuration.

### Test Data Persists After Failure

**Cause:** Cleanup steps are skipped when earlier steps fail (if `abort_on_failure=true`)
**Solution:** Set `abort_on_failure=false` on non-critical steps, or use the test's "Teardown" section which runs regardless of test outcome. Consider using the "Delete Records" step type with a query to catch orphaned test data.

## Examples

### Example 1: Business Rule Test from User Story

**Input Story:** "As a service desk agent, I want incident priority to auto-calculate based on impact and urgency so that I don't have to set it manually."

**Generated Test:** 9 create/assert step pairs covering all Impact x Urgency combinations, plus teardown.

### Example 2: Form Validation Test

**Input:** "Test that the 'Close Notes' field is mandatory when closing an incident"

```
Tool: SN-Create-Record
Parameters:
  table_name: sys_atf_test
  fields:
    name: "Validate Close Notes Mandatory on Incident Close"
    description: "Verifies that closing an incident without close_notes is blocked by UI policy or business rule."
    status: design
    active: true

# Steps:
# 1. Create test incident (open state)
# 2. Attempt to set state=Closed without close_notes
# 3. Assert record is NOT in Closed state (business rule should block)
# 4. Set close_notes and state=Closed
# 5. Assert record IS in Closed state
# 6. Cleanup: delete test incident
```

### Example 3: API Endpoint Test

**Input:** "Generate a test for the custom Scripted REST API endpoint that returns user details"

```
# Steps:
# 1. Server-side script: Call REST API endpoint with test user sys_id
# 2. Assert: Response status = 200
# 3. Assert: Response body contains expected user name
# 4. Assert: Response body does NOT contain sensitive fields (password, token)
# 5. Server-side script: Call with invalid sys_id
# 6. Assert: Response status = 404
```

## Related Skills

- `development/automated-testing` - General ATF usage and best practices
- `development/business-rules` - Understanding business rules to test
- `development/client-scripts` - Client-side functionality to validate
- `development/script-includes` - Server-side logic to test
- `admin/deployment-workflow` - CI/CD pipeline integration with ATF
- `spm/acceptance-criteria` - Generate test cases from acceptance criteria
