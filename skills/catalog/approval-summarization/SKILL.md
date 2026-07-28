---
name: approval-summarization
version: 1.0.0
description: Summarize approval requests with context including what is being requested, who is requesting, business justification, and similar past approvals
author: Happy Technologies LLC
tags: [catalog, approval, summarization, employee-experience, approver, request, context, decision-support]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sc_request
    - /api/now/table/sc_req_item
    - /api/now/table/sysapproval_approver
    - /api/now/table/sc_cat_item
    - /api/now/table/item_option_new
    - /api/now/table/sc_item_option_mtom
    - /api/now/table/sys_user
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Approval Summarization

## Overview

This skill generates comprehensive approval summaries that give approvers the context they need to make informed decisions. It covers:

- Retrieving approval requests from `sysapproval_approver` with full request and item context
- Enriching approvals with requester profile data from `sys_user` including role, department, and manager
- Extracting variable values (form responses) from `sc_req_item` to show exactly what was requested
- Analyzing historical approval patterns from `sc_request` for similar requests
- Generating structured approval summaries with recommendation signals
- Identifying cost, risk, and compliance considerations for each approval

**When to use:** When approvers need a quick, comprehensive summary of pending approvals, when building approval digest notifications, or when creating approval dashboards with contextual data.

**Value proposition:** Reduces approval decision time by presenting all relevant context in a single view, decreases approval bottlenecks, and improves decision quality by surfacing historical precedent and risk factors.

## Prerequisites

- **Roles:** `approver_user`, `itil`, or `admin`
- **Access:** Read access to `sysapproval_approver`, `sc_request`, `sc_req_item`, `sc_cat_item`, `item_option_new`, and `sys_user`
- **Knowledge:** Understanding of organizational approval policies and delegation rules

## Procedure

### Step 1: Retrieve Pending Approvals

Query for all approvals awaiting action by a specific approver or group.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: approver=[approver_sys_id]^state=requested
  fields: sys_id,sysapproval,sysapproval.number,sysapproval.short_description,sysapproval.sys_class_name,state,approver,group,sys_created_on,due_date,expected_start,comments
  limit: 25
  order_by: sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sysapproval_approver?sysparm_query=approver=[approver_sys_id]^state=requested&sysparm_fields=sys_id,sysapproval,sysapproval.number,sysapproval.short_description,sysapproval.sys_class_name,state,approver,group,sys_created_on,due_date,comments&sysparm_limit=25&sysparm_display_value=true
```

**Get group approvals:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: group=[group_sys_id]^state=requested
  fields: sys_id,sysapproval.number,sysapproval.short_description,state,group,sys_created_on,due_date
  limit: 25
```

### Step 2: Retrieve Request and Requested Item Details

For each approval, pull the full request and item context.

**Get the requested item details:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_req_item
  query: request=[request_sys_id]
  fields: sys_id,number,cat_item,cat_item.name,cat_item.short_description,cat_item.price,quantity,requested_for,requested_for.name,requested_for.department,requested_for.manager,opened_by,opened_by.name,stage,state,price,description
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sc_req_item?sysparm_query=request=[request_sys_id]&sysparm_fields=sys_id,number,cat_item,cat_item.name,cat_item.short_description,cat_item.price,quantity,requested_for,requested_for.name,requested_for.department,requested_for.manager,opened_by,opened_by.name,stage,state,price,description&sysparm_limit=10&sysparm_display_value=true
```

### Step 3: Extract Variable Values (Form Responses)

Retrieve the specific answers the requester provided on the catalog item form.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_item_option_mtom
  query: request_item=[ritm_sys_id]
  fields: sc_item_option.item_option_new.question_text,sc_item_option.value,sc_item_option.item_option_new.name,sc_item_option.item_option_new.type
  limit: 30
```

**Using background script for clean variable extraction:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Extract catalog variable values for RITM
  script: |
    var ritmId = '[ritm_sys_id]';
    var ritm = new GlideRecord('sc_req_item');
    ritm.get(ritmId);

    var variables = [];
    var opts = new GlideRecord('sc_item_option_mtom');
    opts.addQuery('request_item', ritmId);
    opts.query();

    while (opts.next()) {
      var option = opts.sc_item_option;
      var varDef = option.item_option_new;
      if (varDef) {
        variables.push({
          question: varDef.question_text.toString(),
          answer: option.value.getDisplayValue(),
          variable_name: varDef.name.toString(),
          mandatory: varDef.mandatory.toString() === 'true'
        });
      }
    }

    var result = {
      ritm_number: ritm.number.toString(),
      item_name: ritm.cat_item.getDisplayValue(),
      requested_for: ritm.requested_for.getDisplayValue(),
      department: ritm.requested_for.department.getDisplayValue(),
      variables: variables
    };

    gs.info(JSON.stringify(result, null, 2));
```

### Step 4: Retrieve Requester Context

Gather relevant information about the person making the request.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_user
  query: sys_id=[requested_for_sys_id]
  fields: sys_id,name,user_name,email,title,department,manager,location,cost_center,company,vip,active
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sys_user/[requested_for_sys_id]?sysparm_fields=sys_id,name,user_name,email,title,department,manager,location,cost_center,company,vip,active&sysparm_display_value=true
```

### Step 5: Analyze Historical Approval Patterns

Find similar past approvals to provide precedent for the approver's decision.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze historical approval patterns for similar requests
  script: |
    var catItemId = '[cat_item_sys_id]';
    var departmentId = '[department_sys_id]';

    var history = {
      same_item_total: 0,
      same_item_approved: 0,
      same_item_rejected: 0,
      same_dept_total: 0,
      avg_approval_time_hours: 0,
      recent_approvals: []
    };

    // Same item across all departments (last 6 months)
    var ga = new GlideAggregate('sysapproval_approver');
    ga.addQuery('sysapproval.sys_class_name', 'sc_req_item');
    ga.addQuery('sys_created_on', '>=', gs.monthsAgoStart(6));
    ga.addJoinQuery('sc_req_item', 'sysapproval', 'sys_id')
      .addCondition('cat_item', catItemId);
    ga.addAggregate('COUNT');
    ga.addAggregate('COUNT', 'state');
    ga.groupBy('state');
    ga.query();

    while (ga.next()) {
      var state = ga.state.toString();
      var count = parseInt(ga.getAggregate('COUNT'));
      history.same_item_total += count;
      if (state === 'approved') history.same_item_approved = count;
      if (state === 'rejected') history.same_item_rejected = count;
    }

    // Recent approvals for same item
    var recent = new GlideRecord('sysapproval_approver');
    recent.addQuery('sysapproval.sys_class_name', 'sc_req_item');
    recent.addQuery('state', 'approved');
    recent.addQuery('sys_created_on', '>=', gs.monthsAgoStart(3));
    recent.addJoinQuery('sc_req_item', 'sysapproval', 'sys_id')
      .addCondition('cat_item', catItemId);
    recent.orderByDesc('sys_updated_on');
    recent.setLimit(5);
    recent.query();

    while (recent.next()) {
      history.recent_approvals.push({
        approved_by: recent.approver.getDisplayValue(),
        date: recent.sys_updated_on.getDisplayValue(),
        request: recent.sysapproval.getDisplayValue()
      });
    }

    history.approval_rate = history.same_item_total > 0
      ? Math.round((history.same_item_approved / history.same_item_total) * 100) + '%'
      : 'N/A';

    gs.info(JSON.stringify(history, null, 2));
```

### Step 6: Generate the Approval Summary

Compile all gathered context into a structured summary.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]
  work_notes: |
    === APPROVAL SUMMARY ===

    REQUEST: REQ0045123 / RITM0067890
    ITEM: New Laptop Request - Performance Model (Dell Latitude 7640)
    PRICE: $1,800.00

    REQUESTER:
    - Name: John Smith (john.smith@company.com)
    - Title: Senior Software Engineer
    - Department: Engineering
    - Manager: Jane Doe
    - Location: Building A, Floor 3
    - VIP: No

    WHAT'S BEING REQUESTED:
    - Laptop Model: Performance (Dell Latitude 7640)
    - RAM: 32GB
    - Storage: 1TB SSD
    - Additional Software: Docker Desktop, IntelliJ IDEA
    - Business Justification: "Current laptop is 4 years old and unable to run containerized development environments. Build times exceed 30 minutes affecting productivity."
    - Replacing Existing: Yes (Asset Tag: LAP-2022-0456)

    HISTORICAL CONTEXT:
    - Same item ordered 47 times in last 6 months
    - Approval rate: 94% (44 approved, 3 rejected)
    - Engineering department: 18 orders (all approved)
    - Recent approvals: 3 in last 30 days by IT Director

    RISK ASSESSMENT:
    - Cost: Within standard budget threshold ($2,500)
    - Justification: Strong (productivity impact documented)
    - Precedent: Consistent with approval history
    - Compliance: Asset replacement documented

    RECOMMENDATION SIGNAL: Approve
```

### Step 7: Batch Summarize Multiple Approvals

Generate digest summaries for approvers with multiple pending items.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Generate approval digest for approver
  script: |
    var approverId = '[approver_sys_id]';
    var digest = { approver: '', pending_count: 0, total_value: 0, approvals: [] };

    var approver = new GlideRecord('sys_user');
    approver.get(approverId);
    digest.approver = approver.name.toString();

    var ga = new GlideRecord('sysapproval_approver');
    ga.addQuery('approver', approverId);
    ga.addQuery('state', 'requested');
    ga.orderBy('sys_created_on');
    ga.query();

    while (ga.next()) {
      digest.pending_count++;

      var ritm = new GlideRecord('sc_req_item');
      if (ritm.get(ga.sysapproval.toString())) {
        var price = parseFloat(ritm.price) || 0;
        digest.total_value += price;

        digest.approvals.push({
          approval_id: ga.sys_id.toString(),
          request_number: ritm.request.getDisplayValue(),
          ritm_number: ritm.number.toString(),
          item: ritm.cat_item.getDisplayValue(),
          requested_for: ritm.requested_for.getDisplayValue(),
          department: ritm.requested_for.department.getDisplayValue(),
          price: price,
          waiting_since: ga.sys_created_on.getDisplayValue()
        });
      }
    }

    digest.total_value = '$' + digest.total_value.toFixed(2);
    gs.info(JSON.stringify(digest, null, 2));
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query approvals, requests, items, variables, and user profiles |
| `SN-Get-Record` | Retrieve individual approval or request records |
| `SN-Natural-Language-Search` | Find requests or items by description keywords |
| `SN-Execute-Background-Script` | Batch analysis, historical patterns, digest generation |
| `SN-Add-Work-Notes` | Post approval summaries to approval or request records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sysapproval_approver` | GET | Query pending approvals |
| `/api/now/table/sc_request` | GET | Retrieve parent request details |
| `/api/now/table/sc_req_item` | GET | Get requested item details and variables |
| `/api/now/table/sc_cat_item` | GET | Look up catalog item definitions |
| `/api/now/table/sc_item_option_mtom` | GET | Extract variable values from requests |
| `/api/now/table/sys_user` | GET | Get requester profile information |

## Best Practices

- **Include business justification prominently:** The justification variable is the most important field for approvers; always surface it first
- **Show total cost clearly:** Include item price, quantity, recurring costs, and any variable-based pricing
- **Provide historical context:** Approval rate and precedent data significantly reduce decision uncertainty
- **Flag anomalies:** Highlight when a request is unusual (first-time item, exceeds typical cost, VIP requester)
- **Calculate wait time:** Show how long the approval has been pending to create urgency awareness
- **Group by priority:** Sort digest approvals by age, cost, or business criticality rather than creation date
- **Respect data access:** Only include information the approver has permission to view
- **Automate digests:** Schedule daily or twice-daily approval digest generation for managers with high approval volumes

## Troubleshooting

### Variable Values Not Found

**Cause:** The `sc_item_option_mtom` join is not returning expected variable values
**Solution:** Some items use `sc_item_option` directly. Try querying `sc_item_option` with `request_item=[ritm_sys_id]` instead. For older requests, variables may be stored differently.

### Approval Record Shows Wrong Request

**Cause:** The `sysapproval` field on the approval record may reference a request (REQ) rather than a requested item (RITM)
**Solution:** Check `sysapproval.sys_class_name` to determine whether the approval is linked to `sc_request` or `sc_req_item`, and adjust your joins accordingly.

### Historical Data Incomplete

**Cause:** Old approval records may have been archived or purged
**Solution:** Adjust the date range in historical queries. Check if the instance uses table rotation or archiving on `sysapproval_approver`.

### Requester Department Not Populating

**Cause:** The `department` field on the user record is empty
**Solution:** Fall back to `company` or `cost_center` for organizational context. Check if the user's manager chain can provide department information.

## Examples

### Example 1: Single Approval Summary

**Input:** "Summarize approval SYSAPPR0012345"

**Output:** A structured summary including request details, requester profile, variable values, historical approval rate for the same item, and a recommendation signal based on precedent and policy compliance.

### Example 2: Daily Approval Digest

**Input:** "Generate an approval digest for manager Jane Doe"

**Output:**
```
APPROVAL DIGEST - Jane Doe
Date: 2026-03-19
Pending Approvals: 4
Total Value: $7,450.00

1. REQ0045123 / RITM0067890 - New Laptop ($1,800) - John Smith, Engineering - 2 days pending
2. REQ0045130 / RITM0067897 - Software License x5 ($2,500) - Lisa Park, Marketing - 1 day pending
3. REQ0045135 / RITM0067902 - Conference Travel ($2,400) - Mike Johnson, Sales - 4 hours pending
4. REQ0045138 / RITM0067905 - Desk Phone ($750) - Sarah Kim, HR - 1 hour pending
```

### Example 3: High-Value Approval with Risk Flags

```
Tool: SN-Get-Record
Parameters:
  table_name: sysapproval_approver
  sys_id: [approval_sys_id]

# Result analysis flags:
# - Cost exceeds $5,000 threshold (requires VP approval)
# - First time this item has been ordered by this department
# - Requester is a contractor (non-FTE)
# - No business justification provided (mandatory field bypass)
```

## Related Skills

- `catalog/approval-workflows` - Configure approval routing rules
- `catalog/request-fulfillment` - Post-approval fulfillment processing
- `catalog/item-creation` - Catalog item setup and configuration
- `catalog/catalog-item-generation` - Generate items from descriptions
- `admin/workflow-creation` - Build approval workflow logic
