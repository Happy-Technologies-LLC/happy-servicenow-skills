---
name: catalog-item-generation
version: 1.0.0
description: Generate catalog items from natural language descriptions including variables, workflows, and approval rules
author: Happy Technologies LLC
tags: [catalog, item-generation, service-catalog, variables, workflows, approval, automation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Create-Record
    - SN-Update-Record
    - SN-Natural-Language-Search
    - SN-Discover-Table-Schema
    - SN-Execute-Background-Script
  rest:
    - /api/now/table/sc_cat_item
    - /api/now/table/sc_category
    - /api/now/table/sc_cat_item_category
    - /api/now/table/item_option_new
    - /api/now/table/sc_cat_item_option
    - /api/now/table/sysapproval_group
    - /api/sn_sc/servicecatalog/items
  native:
    - Bash
complexity: intermediate
estimated_time: 15-40 minutes
---

# Catalog Item Generation

## Overview

This skill enables the generation of complete service catalog items from natural language descriptions. It covers:

- Creating catalog items in `sc_cat_item` with all required fields from plain-text descriptions
- Generating catalog variables (questions/fields) in `item_option_new` based on item requirements
- Assigning items to categories via `sc_category` and `sc_cat_item_category`
- Configuring approval rules and workflows for the item
- Setting up variable sets, UI policies, and client scripts for dynamic form behavior
- Publishing items to specific catalogs and categories for end-user access

**When to use:** When service owners describe a new catalog offering in plain language and need it translated into a fully configured ServiceNow catalog item with variables, approvals, and fulfillment rules.

**Value proposition:** Reduces catalog item creation time from hours to minutes, ensures consistent variable naming and configuration, and applies organizational standards for approvals and fulfillment automatically.

## Prerequisites

- **Plugins:** `com.glideapp.servicecatalog` (Service Catalog)
- **Roles:** `catalog_admin`, `catalog_manager`, or `admin`
- **Access:** Read/write access to `sc_cat_item`, `sc_category`, `sc_cat_item_category`, `item_option_new`, and workflow tables
- **Knowledge:** Understanding of your organization's catalog structure, approval policies, and fulfillment groups

## Procedure

### Step 1: Analyze the Natural Language Description

Parse the user's description to identify the catalog item components:

| Component | What to Extract | Example |
|-----------|----------------|---------|
| Item name | Short, descriptive title | "New Laptop Request" |
| Description | Detailed explanation of the offering | "Request a new laptop with specifications" |
| Category | Where it belongs in the catalog | "Hardware Requests" |
| Variables | Questions/fields for the requester | Model, RAM, storage, business justification |
| Approvals | Who must approve | Manager, IT Director for >$2000 |
| Fulfillment | Who fulfills the request | "Hardware Team" assignment group |
| Pricing | Cost or pricing model | $1200 base, variable by model |

### Step 2: Find or Create the Target Category

Query existing categories to place the item correctly.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_category
  query: active=true^titleLIKEHardware
  fields: sys_id,title,description,parent,sc_catalog,active,icon
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sc_category?sysparm_query=active=true^titleLIKEHardware&sysparm_fields=sys_id,title,description,parent,sc_catalog,active,icon&sysparm_limit=10&sysparm_display_value=true
```

**Create a new category if needed:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_category
  fields:
    title: "Hardware Requests"
    description: "Request new hardware including laptops, monitors, peripherals, and accessories"
    sc_catalog: [catalog_sys_id]
    parent: [parent_category_sys_id]
    active: true
    icon: "hardware-laptop"
```

### Step 3: Create the Catalog Item

Generate the catalog item record with all core fields.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  fields:
    name: "New Laptop Request"
    short_description: "Request a new laptop with your preferred specifications"
    description: |
      Use this form to request a new laptop computer. Select your preferred model,
      specifications, and provide business justification. Requests over $2,000 require
      IT Director approval.

      **Included with all laptops:**
      - Standard software image
      - 3-year warranty
      - Docking station and power adapter

      **Expected delivery:** 5-10 business days after approval
    category: [category_sys_id]
    sc_catalogs: [catalog_sys_id]
    active: true
    availability: on_desktop
    type: item
    fulfillment_group: [hardware_team_sys_id]
    delivery_time: "2026-03-19 08:00:00"
    price: 1200
    recurring_price: 0
    order: 100
    icon: "hardware-laptop"
    mandatory_attachment: false
    request_method: order_guide
```

**Using REST API:**
```bash
POST /api/now/table/sc_cat_item
Content-Type: application/json

{
  "name": "New Laptop Request",
  "short_description": "Request a new laptop with your preferred specifications",
  "description": "Use this form to request a new laptop computer...",
  "category": "[category_sys_id]",
  "sc_catalogs": "[catalog_sys_id]",
  "active": "true",
  "type": "item",
  "fulfillment_group": "[hardware_team_sys_id]",
  "price": "1200",
  "order": "100"
}
```

### Step 4: Generate Catalog Variables

Create the form variables (questions) that requesters will fill out.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: item_option_new
  fields:
    cat_item: [cat_item_sys_id]
    name: "laptop_model"
    question_text: "Laptop Model"
    type: 3
    choice_table: ""
    default_value: "standard"
    mandatory: true
    order: 100
    tooltip: "Select the laptop model that best fits your work requirements"
```

**Variable types reference:**

| Type Code | Type Name | Use Case |
|-----------|-----------|----------|
| 1 | Yes/No | Boolean selections |
| 2 | Multi Line Text | Long descriptions, justifications |
| 3 | Multiple Choice | Dropdown selections |
| 5 | Select Box | Multi-select options |
| 6 | Single Line Text | Short text input |
| 7 | CheckBox | Toggle options |
| 8 | Reference | Link to another table record |
| 9 | Date | Date picker |
| 10 | Date/Time | Date and time picker |
| 14 | Macro | Display-only information |
| 21 | List Collector | Multi-reference selection |
| 24 | Masked | Sensitive input |

**Create multiple variables for a complete form:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Create catalog item variables for laptop request
  script: |
    var itemId = '[cat_item_sys_id]';
    var variables = [
      { name: 'laptop_model', question_text: 'Laptop Model', type: 3, mandatory: true, order: 100, tooltip: 'Select your preferred model' },
      { name: 'ram_size', question_text: 'RAM (Memory)', type: 3, mandatory: true, order: 200, default_value: '16gb' },
      { name: 'storage_size', question_text: 'Storage', type: 3, mandatory: true, order: 300, default_value: '512gb' },
      { name: 'additional_software', question_text: 'Additional Software Required', type: 2, mandatory: false, order: 400 },
      { name: 'business_justification', question_text: 'Business Justification', type: 2, mandatory: true, order: 500, tooltip: 'Explain why this laptop is needed' },
      { name: 'needed_by_date', question_text: 'Date Needed By', type: 9, mandatory: false, order: 600 },
      { name: 'replace_existing', question_text: 'Is this replacing an existing laptop?', type: 1, mandatory: true, order: 700, default_value: 'false' },
      { name: 'existing_asset_tag', question_text: 'Existing Asset Tag', type: 6, mandatory: false, order: 800, tooltip: 'Enter asset tag of laptop being replaced' }
    ];

    variables.forEach(function(v) {
      var gr = new GlideRecord('item_option_new');
      gr.initialize();
      gr.cat_item = itemId;
      gr.name = v.name;
      gr.question_text = v.question_text;
      gr.type = v.type;
      gr.mandatory = v.mandatory || false;
      gr.order = v.order;
      if (v.default_value) gr.default_value = v.default_value;
      if (v.tooltip) gr.tooltip = v.tooltip;
      gr.active = true;
      gr.insert();
    });

    gs.info('Created ' + variables.length + ' variables for catalog item');
```

**Add choices for Multiple Choice variables:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Create choices for laptop model variable
  script: |
    var choices = [
      { text: 'Standard (Dell Latitude 5540)', value: 'standard', price: 1200, order: 100 },
      { text: 'Performance (Dell Latitude 7640)', value: 'performance', price: 1800, order: 200 },
      { text: 'Developer (MacBook Pro 14")', value: 'developer', price: 2400, order: 300 },
      { text: 'Executive (MacBook Pro 16")', value: 'executive', price: 3200, order: 400 }
    ];

    choices.forEach(function(c) {
      var gr = new GlideRecord('question_choice');
      gr.initialize();
      gr.question = '[laptop_model_var_sys_id]';
      gr.text = c.text;
      gr.value = c.value;
      gr.price = c.price || 0;
      gr.order = c.order;
      gr.inactive = false;
      gr.insert();
    });

    gs.info('Created ' + choices.length + ' choices for laptop model');
```

### Step 5: Configure Approval Rules

Set up approval requirements based on item cost or other criteria.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sysapproval_group
  fields:
    document_id: [cat_item_sys_id]
    assignment_group: [manager_approval_group_sys_id]
    approval_column: approval
    condition: "price>0"
    order: 100
    approval: requested
```

**Using REST API:**
```bash
POST /api/now/table/sysapproval_group
Content-Type: application/json

{
  "document_id": "[cat_item_sys_id]",
  "assignment_group": "[manager_approval_group_sys_id]",
  "approval_column": "approval",
  "condition": "price>0",
  "order": "100"
}
```

### Step 6: Link Item to Category

Create the item-to-category association for catalog navigation.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item_category
  fields:
    sc_cat_item: [cat_item_sys_id]
    sc_category: [category_sys_id]
```

**Using REST API:**
```bash
POST /api/now/table/sc_cat_item_category
Content-Type: application/json

{
  "sc_cat_item": "[cat_item_sys_id]",
  "sc_category": "[category_sys_id]"
}
```

### Step 7: Validate and Activate

Verify the complete item configuration before publishing.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: item_option_new
  query: cat_item=[cat_item_sys_id]^active=true
  fields: name,question_text,type,mandatory,order,default_value
  limit: 30
  order_by: order
```

**Check the item in the catalog API:**
```bash
GET /api/sn_sc/servicecatalog/items/[cat_item_sys_id]?sysparm_display_value=true
```

**Activate the item:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sc_cat_item
  sys_id: [cat_item_sys_id]
  fields:
    active: true
    visible_standalone: true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query existing categories, items, variables, and approvals |
| `SN-Create-Record` | Create new items, variables, choices, categories, and approval rules |
| `SN-Update-Record` | Activate items, update configurations |
| `SN-Natural-Language-Search` | Find existing similar items or categories by description |
| `SN-Discover-Table-Schema` | Explore field definitions for catalog tables |
| `SN-Execute-Background-Script` | Batch-create variables, choices, and complex configurations |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sc_cat_item` | GET/POST/PATCH | Manage catalog items |
| `/api/now/table/sc_category` | GET/POST | Manage catalog categories |
| `/api/now/table/sc_cat_item_category` | POST | Link items to categories |
| `/api/now/table/item_option_new` | GET/POST | Create and query catalog variables |
| `/api/now/table/question_choice` | POST | Add choices to multiple-choice variables |
| `/api/sn_sc/servicecatalog/items` | GET | Validate items via the Service Catalog API |

## Best Practices

- **Consistent naming:** Use a naming convention for variable names (snake_case) and question text (Title Case) across all items
- **Mandatory justification:** Always include a business justification variable for items above a cost threshold
- **Limit variable count:** Keep forms under 12 variables; use variable sets to group related fields
- **Set default values:** Pre-populate common selections to reduce requester effort
- **Use reference variables:** Link to existing tables (e.g., `cmn_location` for office location) instead of free text
- **Test before publishing:** Validate the item in a non-production catalog or with `active=false` before making it visible
- **Document fulfillment:** Include clear fulfillment instructions in the item description for the assignment group
- **Version catalog items:** Use the item's `meta` field or work notes to track configuration changes over time

## Troubleshooting

### Variables Not Appearing on Item Form

**Cause:** Variable `cat_item` reference does not match the item sys_id, or the variable is inactive
**Solution:** Query `item_option_new` with `cat_item=[sys_id]` to verify the association. Check `active=true` on each variable.

### Item Not Visible in Catalog

**Cause:** Item is inactive, not linked to a catalog, or the user lacks the required role/group to see it
**Solution:** Verify `active=true`, `sc_catalogs` is set, and check `sc_cat_item_user_criteria` for access restrictions.

### Approval Not Triggering

**Cause:** Approval rule condition does not match, or no approval group is configured for the item
**Solution:** Review `sysapproval_group` records for the item. Verify the condition expression evaluates to true for the request.

### Choices Not Displaying for Dropdown

**Cause:** `question_choice` records are not linked to the correct variable sys_id
**Solution:** Query `question_choice` with `question=[variable_sys_id]` and verify `inactive=false`.

## Examples

### Example 1: Generate Item from Description

**Input:** "Create a catalog item for requesting a parking pass. Employees should select their office location, parking type (indoor/outdoor), vehicle license plate, and start date. Manager approval required."

**Generated Item:**
- Name: "Parking Pass Request"
- Category: "Facilities"
- Variables: Office Location (reference), Parking Type (dropdown), License Plate (text), Start Date (date)
- Approval: Manager approval

### Example 2: Software License Request

**Input:** "Need a form to request software licenses. Users pick the software from a list, enter number of licenses, provide justification. Over 10 licenses needs IT Director approval."

```
Tool: SN-Create-Record
Parameters:
  table_name: sc_cat_item
  fields:
    name: "Software License Request"
    short_description: "Request new or additional software licenses"
    category: [software_category_sys_id]
    sc_catalogs: [catalog_sys_id]
    active: true
    type: item
    fulfillment_group: [software_team_sys_id]
    order: 200
```

### Example 3: Bulk Item Generation

**Input:** "Create 3 items for the HR category: Badge Replacement ($25), Desk Relocation (free), and Ergonomic Assessment (free)"

Use the batch background script approach from Step 4, creating all three items and their variables in a single script execution.

## Related Skills

- `catalog/variable-management` - Advanced variable configuration and variable sets
- `catalog/ui-policies` - Dynamic form behavior based on variable values
- `catalog/approval-workflows` - Complex approval routing and escalation
- `catalog/item-creation` - Standard item creation procedures
- `catalog/request-fulfillment` - Fulfillment workflow configuration
- `catalog/multi-turn-ordering` - Conversational ordering via Virtual Agent
