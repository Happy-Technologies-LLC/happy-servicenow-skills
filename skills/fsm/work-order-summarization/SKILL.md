---
name: work-order-summarization
version: 1.0.0
description: Summarize field service work orders with tasks, SLAs, asset information, travel logistics, and parts requirements for dispatch coordinators and field technicians
author: Happy Technologies LLC
tags: [fsm, work-order, summarization, field-service, sla, assets, travel, parts]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
  rest:
    - /api/now/table/wm_order
    - /api/now/table/wm_task
    - /api/now/table/alm_asset
    - /api/now/table/cmdb_ci
    - /api/now/table/sla_condition_check
    - /api/now/table/sys_journal_field
    - /api/now/table/wm_parts_request
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Work Order Summarization

## Overview

This skill provides a structured approach to generating comprehensive summaries of Field Service Management (FSM) work orders in ServiceNow. It consolidates all relevant work order data into a concise briefing suitable for dispatch coordinators, field technicians, and service managers.

Key capabilities:
- Retrieve and consolidate core work order details including customer, location, and scheduling
- Summarize all associated work order tasks with status, assignment, and sequencing
- Assess SLA compliance status and identify at-risk timelines
- Compile asset and configuration item details for the service location
- Summarize travel logistics including estimated travel time and route considerations
- Inventory parts requirements, availability, and procurement status

**When to use:** When a dispatch coordinator needs to brief a field technician, when a service manager reviews work order backlogs, or when preparing shift handover documentation for field operations.

## Prerequisites

- **Roles:** `wm_initiator`, `wm_dispatcher`, `wm_agent`, or `wm_admin`
- **Access:** Read access to `wm_order`, `wm_task`, `alm_asset`, `cmdb_ci`, `sla_condition_check`, `sys_journal_field`, and `wm_parts_request` tables
- **Plugins:** Field Service Management (com.snc.work_management) must be active
- **Data:** An existing work order with populated tasks and asset references

## Procedure

### Step 1: Retrieve Core Work Order Details

Fetch the primary work order record with all scheduling, location, and classification fields.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: wm_order
  sys_id: [WORK_ORDER_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,caller_id,company,location,assigned_to,assignment_group,opened_at,scheduled_start,scheduled_end,actual_start,actual_end,follow_up,sla_due,cmdb_ci,asset,contact_type,work_notes_list
```

If you only have the work order number, search first:
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: number=WO0012345
  fields: sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,caller_id,company,location,assigned_to,assignment_group,opened_at,scheduled_start,scheduled_end,actual_start,actual_end,sla_due,cmdb_ci,asset
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/wm_order?sysparm_query=number=WO0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,caller_id,company,location,assigned_to,assignment_group,opened_at,scheduled_start,scheduled_end,actual_start,actual_end,sla_due,cmdb_ci,asset&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Associated Work Order Tasks

Pull all tasks linked to the work order to understand the scope of work.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_task
  query: work_order=[WORK_ORDER_SYS_ID]^ORDERBYorder
  fields: sys_id,number,short_description,state,priority,assigned_to,assignment_group,scheduled_start,scheduled_end,actual_start,actual_end,estimated_travel_duration,actual_travel_duration,estimated_work_duration,actual_work_duration,location,cmdb_ci,asset,sequence
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/wm_task?sysparm_query=work_order=[WORK_ORDER_SYS_ID]^ORDERBYorder&sysparm_fields=sys_id,number,short_description,state,priority,assigned_to,assignment_group,scheduled_start,scheduled_end,actual_start,actual_end,estimated_travel_duration,actual_travel_duration,estimated_work_duration,actual_work_duration,location,cmdb_ci,asset,sequence&sysparm_limit=50&sysparm_display_value=true
```

### Step 3: Check SLA Compliance Status

Assess SLA conditions attached to the work order and identify any at-risk or breached SLAs.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=[WORK_ORDER_SYS_ID]
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,pause_duration,pause_time
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=task=[WORK_ORDER_SYS_ID]&sysparm_fields=sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage,pause_duration&sysparm_limit=10&sysparm_display_value=true
```

### Step 4: Retrieve Asset and Configuration Item Details

Get details about the asset being serviced and its configuration item record.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: alm_asset
  query: sys_id=[ASSET_SYS_ID]
  fields: sys_id,display_name,asset_tag,serial_number,model,model_category,install_status,location,assigned_to,warranty_expiration,purchase_date,cost,vendor,ci
  limit: 1
```

```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci
  query: sys_id=[CMDB_CI_SYS_ID]
  fields: sys_id,name,sys_class_name,location,install_status,operational_status,manufacturer,model_id,serial_number,asset_tag,support_group,maintenance_schedule
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/alm_asset/{ASSET_SYS_ID}?sysparm_fields=sys_id,display_name,asset_tag,serial_number,model,model_category,install_status,location,warranty_expiration,purchase_date,vendor,ci&sysparm_display_value=true

GET /api/now/table/cmdb_ci/{CMDB_CI_SYS_ID}?sysparm_fields=sys_id,name,sys_class_name,location,install_status,operational_status,manufacturer,model_id,serial_number,support_group,maintenance_schedule&sysparm_display_value=true
```

### Step 5: Retrieve Travel and Logistics Information

Gather travel estimates and actual travel data from work order tasks.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_task
  query: work_order=[WORK_ORDER_SYS_ID]^estimated_travel_duration>0
  fields: sys_id,number,assigned_to,location,estimated_travel_duration,actual_travel_duration,estimated_work_duration,dispatch_group
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/wm_task?sysparm_query=work_order=[WORK_ORDER_SYS_ID]^estimated_travel_duration>0&sysparm_fields=sys_id,number,assigned_to,location,estimated_travel_duration,actual_travel_duration,estimated_work_duration,dispatch_group&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Check Parts Requirements and Availability

Retrieve parts requests and their fulfillment status.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_parts_request
  query: work_order_task.work_order=[WORK_ORDER_SYS_ID]^ORDERBYsys_created_on
  fields: sys_id,part,quantity_requested,quantity_received,state,work_order_task,stockroom,expected_delivery
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/wm_parts_request?sysparm_query=work_order_task.work_order=[WORK_ORDER_SYS_ID]^ORDERBYsys_created_on&sysparm_fields=sys_id,part,quantity_requested,quantity_received,state,work_order_task,stockroom,expected_delivery&sysparm_limit=30&sysparm_display_value=true
```

### Step 7: Retrieve Work Notes and Activity History

Pull journal entries to capture recent activity and technician notes.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[WORK_ORDER_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on
  fields: sys_id,value,sys_created_on,sys_created_by
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[WORK_ORDER_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,value,sys_created_on,sys_created_by&sysparm_limit=20
```

### Step 8: Build the Work Order Summary

Assemble all collected data into a structured summary:

```
=== WORK ORDER SUMMARY ===
Work Order: WO0012345
Status: [state] | Priority: [priority] | Category: [category]
Opened: [opened_at] | Scheduled: [scheduled_start] - [scheduled_end]
SLA Due: [sla_due] | SLA Status: [on-track/at-risk/breached]

CUSTOMER & LOCATION:
Company: [company] | Caller: [caller_id]
Location: [location_full_address]
Contact Method: [contact_type]

ASSET DETAILS:
Asset: [display_name] | Tag: [asset_tag] | Serial: [serial_number]
Model: [model] | Manufacturer: [manufacturer]
Warranty: [warranty_expiration] | Status: [install_status]
CI: [ci_name] ([sys_class_name])

TASKS: [total_count] total ([open_count] open, [closed_count] closed)
| # | Task | Status | Assigned To | Est. Duration |
|---|------|--------|-------------|---------------|
| 1 | [short_description] | [state] | [assigned_to] | [est_work_duration] |
| 2 | [short_description] | [state] | [assigned_to] | [est_work_duration] |

TRAVEL LOGISTICS:
Total Estimated Travel: [sum_est_travel] | Actual: [sum_actual_travel]
Technician: [assigned_to] | Dispatch Group: [dispatch_group]

PARTS REQUIREMENTS: [total_parts] items
| Part | Qty Requested | Qty Received | Status | ETA |
|------|--------------|--------------|--------|-----|
| [part_name] | [qty_req] | [qty_recv] | [state] | [expected_delivery] |

RECENT ACTIVITY:
- [date] [user]: [summary_of_note]
- [date] [user]: [summary_of_note]

KEY OBSERVATIONS:
- [SLA risk assessment]
- [Parts availability concerns]
- [Scheduling conflicts or dependencies]
- [Asset warranty status]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language work order lookup (e.g., "find open work orders for Building A") |
| `SN-Query-Table` | Structured queries across work order, task, asset, and parts tables |
| `SN-Get-Record` | Retrieve a single work order or asset record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/wm_order` | GET | Query work order records |
| `/api/now/table/wm_task` | GET | Retrieve work order tasks |
| `/api/now/table/alm_asset` | GET | Get asset details |
| `/api/now/table/cmdb_ci` | GET | Configuration item information |
| `/api/now/table/task_sla` | GET | SLA compliance status |
| `/api/now/table/wm_parts_request` | GET | Parts requirements and availability |
| `/api/now/table/sys_journal_field` | GET | Work notes and activity history |

## Best Practices

- **Use display values:** Always pass `sysparm_display_value=true` in REST calls to get readable names instead of sys_ids
- **Check warranty status:** Always flag assets with expired or near-expiring warranties as this affects service entitlement
- **Verify parts availability:** Highlight any parts that are backordered or have extended delivery timelines
- **Note SLA proximity:** Clearly indicate when SLA breach is imminent (within 2 hours or 80% elapsed)
- **Include travel estimates:** Field technicians need travel context to plan their day effectively
- **Sequence tasks correctly:** Present tasks in the order they should be executed, respecting dependencies
- **Flag safety considerations:** If the work order involves hazardous equipment, highlight any safety requirements
- **Summarize concisely:** Field technicians access summaries on mobile devices so keep formatting clean and scannable

## Troubleshooting

### "Work order not found"

**Cause:** Work order number format incorrect or work order is in a different scope.
**Solution:** Verify the prefix (WO vs WM vs other custom prefixes). Try searching with `numberLIKEWO001234`. Check if the work order was created in a scoped application.

### "No tasks associated with work order"

**Cause:** Tasks may not have been generated yet, or they use a different parent reference.
**Solution:** Check if the work order requires manual task creation. Query `wm_task` using `parent=[WORK_ORDER_SYS_ID]` as an alternative relationship field.

### "Asset details missing"

**Cause:** The asset field on the work order may not be populated, or the asset record has been retired.
**Solution:** Try looking up the asset via the `cmdb_ci` field instead. Check `alm_asset` with `ci=[CMDB_CI_SYS_ID]` to find the linked asset record.

### "Parts requests not returning results"

**Cause:** Parts may be tracked through a different table or a custom parts management process.
**Solution:** Check `wm_parts_request_line` for line-item details. Some organizations use `alm_consumable` or custom tables for parts tracking.

### "SLA information unavailable"

**Cause:** SLA definitions may not be configured for the work order type.
**Solution:** Verify SLA definitions exist in `sla_condition_check` for the `wm_order` table. Check with your FSM administrator if SLAs are tracked externally.

## Examples

### Example 1: Routine Maintenance Work Order Summary

**Scenario:** Dispatch coordinator needs to brief a technician on a scheduled HVAC maintenance visit.

**Step 1 - Get work order:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: number=WO0056789
  fields: sys_id,number,short_description,state,priority,category,location,company,caller_id,assigned_to,scheduled_start,scheduled_end,asset,cmdb_ci,sla_due
  limit: 1
```

**Step 2 - Get tasks:**
```
Tool: SN-Query-Table
Parameters:
  table_name: wm_task
  query: work_order=<sys_id>^ORDERBYorder
  fields: number,short_description,state,assigned_to,estimated_work_duration,estimated_travel_duration
  limit: 10
```

**Output Summary:**
```
WORK ORDER WO0056789 - TECHNICIAN BRIEFING
Status: Assigned | Priority: P3 | Category: Preventive Maintenance
Customer: Acme Corp - Building A, 3rd Floor
Scheduled: Mar 20 08:00 - Mar 20 12:00

ASSET: HVAC Unit AC-301 | Serial: HV2024-0045
Model: Carrier 50XC | Warranty: Valid until Dec 2027

TASKS (3):
1. Filter replacement - Pending | Est: 30 min
2. Refrigerant level check - Pending | Est: 45 min
3. Thermostat calibration - Pending | Est: 20 min

TRAVEL: Est. 35 min from warehouse
PARTS: 2x MERV-13 filters (in stock), 1x R-410A canister (in stock)

NOTE: Building access requires badge - contact front desk on arrival
```

### Example 2: Emergency Repair with SLA at Risk

**Scenario:** Service manager reviewing an urgent work order approaching SLA breach.

```
Tool: SN-Query-Table
Parameters:
  table_name: wm_order
  query: number=WO0057001
  fields: sys_id,number,short_description,state,priority,sla_due,assigned_to,location
  limit: 1
```

**Output:**
```
WORK ORDER WO0057001 - URGENT: SLA AT RISK
Status: Work In Progress | Priority: P1
Issue: Production line conveyor belt motor failure
Location: Globex Manufacturing - Plant 2, Line 4
SLA Due: Mar 19 16:00 (2.5 hours remaining)

TASKS (2 of 3 complete):
1. Diagnose motor failure - COMPLETE (45 min)
2. Replace motor assembly - IN PROGRESS (est. 2 hrs)
3. Functional testing - PENDING (est. 30 min)

PARTS: 1x 15HP motor assembly - EN ROUTE (ETA: 1 hour)
RISK: SLA breach likely if parts delivery delayed.

ACTION REQUIRED: Confirm parts ETA with logistics team.
```

## Related Skills

- `fsm/sidebar-summarization` - Generate sidebar context summaries for field technicians
- `itsm/incident-lifecycle` - Related incident management for break-fix scenarios
- `reporting/sla-analysis` - SLA tracking and compliance reporting
- `cmdb/impact-analysis` - Assess downstream impact of CI maintenance
