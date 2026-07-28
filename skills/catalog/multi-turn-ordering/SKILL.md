---
name: multi-turn-ordering
version: 1.0.1
description: Configure multi-turn catalog ordering for conversational item selection, variable collection, and order placement via Virtual Agent
author: Happy Technologies LLC
tags: [catalog, multi-turn, ordering, virtual-agent, conversational, chatbot, natural-language, service-catalog]
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
    - /api/now/table/sc_cat_item
    - /api/now/table/sc_category
    - /api/now/table/sc_cat_item_category
    - /api/now/table/item_option_new
    - /api/now/table/sys_cb_topic
    - /api/now/table/sys_cb_topic_detail
    - /api/sn_sc/servicecatalog/items
    - /api/sn_sc/servicecatalog/cart
  native:
    - Bash
complexity: advanced
estimated_time: 25-50 minutes
---

# Multi-Turn Catalog Ordering

## Overview

This skill configures conversational multi-turn ordering flows where users can browse, select, and order catalog items through a guided dialogue. It covers:

- Setting up Virtual Agent topics for catalog ordering conversations using `sys_cb_topic`
- Configuring conversational item discovery and selection from `sc_cat_item` and `sc_category`
- Designing multi-turn variable collection flows that gather `item_option_new` values step by step
- Implementing cart management and order placement via the Service Catalog API
- Handling disambiguation when multiple items match a user's request
- Managing conversation context across turns for complex ordering scenarios

**When to use:** When organizations want employees to order catalog items through a chat-based interface (Virtual Agent, Slack, Teams) rather than navigating the traditional catalog portal, or when items require guided, step-by-step variable collection.

**Value proposition:** Multi-turn ordering reduces catalog abandonment rates, improves requester experience by guiding users through complex forms, and enables ordering from messaging platforms without portal access.

## Prerequisites

- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.glideapp.servicecatalog` (Service Catalog)
- **Roles:** `admin`, `virtual_agent_admin`, or `catalog_admin`
- **Access:** Read/write access to `sc_cat_item`, `sc_category`, `item_option_new`, `sys_cb_topic`, and `sys_cb_topic_detail`
- **Knowledge:** Understanding of Virtual Agent topic design, NLU models, and Service Catalog API

## Procedure

### Step 1: Identify Catalog Items for Conversational Ordering

Determine which items are suitable for multi-turn ordering. Items with 3-8 variables and clear selection paths work best.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sc_cat_item
  query: active=true^type=item^sc_catalogs.titleLIKEService Catalog
  fields: sys_id,name,short_description,category,sc_catalogs,price,order,availability
  limit: 50
  order_by: category,name
```

**Using REST API:**
```bash
GET /api/now/table/sc_cat_item?sysparm_query=active=true^type=item&sysparm_fields=sys_id,name,short_description,category,sc_catalogs,price,order&sysparm_limit=50&sysparm_display_value=true
```

**Check variable count per item to assess complexity:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Count variables per catalog item for ordering suitability
  script: |
    var items = new GlideRecord('sc_cat_item');
    items.addQuery('active', true);
    items.addQuery('type', 'item');
    items.orderBy('category');
    items.query();

    var results = [];
    while (items.next()) {
      var vars = new GlideAggregate('item_option_new');
      vars.addQuery('cat_item', items.sys_id);
      vars.addQuery('active', true);
      vars.addAggregate('COUNT');
      vars.query();

      var varCount = 0;
      if (vars.next()) varCount = parseInt(vars.getAggregate('COUNT'));

      var mandatoryVars = new GlideAggregate('item_option_new');
      mandatoryVars.addQuery('cat_item', items.sys_id);
      mandatoryVars.addQuery('active', true);
      mandatoryVars.addQuery('mandatory', true);
      mandatoryVars.addAggregate('COUNT');
      mandatoryVars.query();

      var mandCount = 0;
      if (mandatoryVars.next()) mandCount = parseInt(mandatoryVars.getAggregate('COUNT'));

      if (varCount > 0) {
        results.push({
          name: items.name.toString(),
          category: items.category.getDisplayValue(),
          total_variables: varCount,
          mandatory_variables: mandCount,
          suitability: varCount <= 8 ? 'Good' : 'Complex'
        });
      }
    }

    gs.info(JSON.stringify(results, null, 2));
```

### Step 2: Design the Conversation Flow

Map the ordering process into conversation turns:

| Turn | Bot Action | User Response | Data Captured |
|------|-----------|---------------|---------------|
| 1 | "What would you like to order?" | "I need a new laptop" | Intent: catalog_order, keyword: laptop |
| 2 | "I found these options: [list]" | "The performance model" | Item selection |
| 3 | "What RAM size do you need?" | "16GB" | Variable: ram_size |
| 4 | "What storage capacity?" | "512GB SSD" | Variable: storage_size |
| 5 | "Business justification?" | "Current laptop failing" | Variable: justification |
| 6 | "Confirm order: [summary]" | "Yes, submit" | Cart submission |

### Step 3: Create the Virtual Agent Topic

Configure the Virtual Agent topic for catalog ordering.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_topic
  fields:
    name: "Order Catalog Item"
    description: "Conversational flow for browsing and ordering service catalog items with guided variable collection"
    category: service_catalog
    active: true
    enabled: true
    nlu_intent: catalog_order
    greeting_message: "I can help you order from the service catalog. What are you looking for?"
    fallback_message: "I couldn't find a matching item. Could you describe what you need differently?"
    end_message: "Your order has been submitted! You'll receive a confirmation email shortly."
    topic_type: standard
```

**Using REST API:**
```bash
POST /api/now/table/sys_cb_topic
Content-Type: application/json

{
  "name": "Order Catalog Item",
  "description": "Conversational flow for browsing and ordering service catalog items",
  "category": "service_catalog",
  "active": "true",
  "enabled": "true",
  "nlu_intent": "catalog_order",
  "greeting_message": "I can help you order from the service catalog. What are you looking for?",
  "topic_type": "standard"
}
```

### Step 4: Configure Topic Details for Item Discovery

Add topic detail nodes that handle item search and selection.

**Create search node:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_topic_detail
  fields:
    topic: [topic_sys_id]
    name: "Search Catalog Items"
    node_type: script
    order: 100
    script: |
      (function() {
        var keyword = vaSystem.getLastUserMessage();
        var items = [];

        var gr = new GlideRecord('sc_cat_item');
        gr.addQuery('active', true);
        gr.addQuery('type', 'item');
        gr.addQuery('nameLIKE' + keyword)
          .addOrCondition('short_descriptionLIKE' + keyword);
        gr.setLimit(5);
        gr.query();

        while (gr.next()) {
          items.push({
            sys_id: gr.sys_id.toString(),
            name: gr.name.toString(),
            description: gr.short_description.toString(),
            price: gr.price.toString()
          });
        }

        vaVars.items = JSON.stringify(items);
        return items.length > 0 ? 'found' : 'not_found';
      })();
```

**Create disambiguation node for multiple matches:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_topic_detail
  fields:
    topic: [topic_sys_id]
    name: "Disambiguate Items"
    node_type: user_input
    order: 200
    prompt_message: "I found multiple items matching your request. Which one did you mean?"
    input_type: picker
    picker_source_variable: items
```

### Step 5: Configure Variable Collection Nodes

Create conversational nodes that collect each required variable.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Create variable collection nodes for catalog item ordering
  script: |
    var topicId = '[topic_sys_id]';
    var itemId = '[cat_item_sys_id]';

    // Get mandatory variables for the item
    var vars = new GlideRecord('item_option_new');
    vars.addQuery('cat_item', itemId);
    vars.addQuery('active', true);
    vars.addQuery('mandatory', true);
    vars.orderBy('order');
    vars.query();

    var nodeOrder = 300;
    while (vars.next()) {
      var detail = new GlideRecord('sys_cb_topic_detail');
      detail.initialize();
      detail.topic = topicId;
      detail.name = 'Collect: ' + vars.question_text.toString();
      detail.node_type = 'user_input';
      detail.order = nodeOrder;
      detail.prompt_message = vars.question_text.toString();

      // Map variable type to input type
      var varType = parseInt(vars.type);
      if (varType === 3) {
        detail.input_type = 'picker';
      } else if (varType === 9) {
        detail.input_type = 'date';
      } else if (varType === 2) {
        detail.input_type = 'text_area';
      } else {
        detail.input_type = 'text';
      }

      detail.mapped_variable = vars.name.toString();
      detail.insert();
      nodeOrder += 100;
    }

    gs.info('Created ' + ((nodeOrder - 300) / 100) + ' variable collection nodes');
```

### Step 6: Add Order Confirmation and Submission

Create the confirmation and cart submission nodes.

**Create confirmation node:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_topic_detail
  fields:
    topic: [topic_sys_id]
    name: "Confirm Order"
    node_type: user_input
    order: 900
    prompt_message: "Here's your order summary:\n\nItem: {{selected_item_name}}\n{{variable_summary}}\n\nWould you like to submit this order?"
    input_type: yes_no
```

**Create submission node using the Service Catalog API:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sys_cb_topic_detail
  fields:
    topic: [topic_sys_id]
    name: "Submit Order"
    node_type: script
    order: 1000
    script: |
      (function() {
        var itemId = vaVars.selected_item_id;
        var variables = JSON.parse(vaVars.collected_variables || '{}');

        // Create cart item
        var cart = new sn_sc.CatalogOrderHelper();
        cart.setRequestedFor(vaSystem.getUserSysId());

        var cartItem = cart.addToCart(itemId);
        for (var key in variables) {
          cartItem.setVariable(key, variables[key]);
        }

        var request = cart.submitOrder();
        vaVars.request_number = request.number;

        return 'submitted';
      })();
```

### Step 7: Test and Publish the Conversation Flow

Validate the multi-turn flow end to end.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cb_topic_detail
  query: topic=[topic_sys_id]
  fields: sys_id,name,node_type,order,prompt_message,input_type,mapped_variable
  limit: 20
  order_by: order
```

**Using REST API:**
```bash
GET /api/now/table/sys_cb_topic_detail?sysparm_query=topic=[topic_sys_id]^ORDERBYorder&sysparm_fields=sys_id,name,node_type,order,prompt_message,input_type,mapped_variable&sysparm_limit=20&sysparm_display_value=true
```

**Activate the topic:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_cb_topic
  sys_id: [topic_sys_id]
  fields:
    active: true
    enabled: true
    published: true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query catalog items, variables, categories, topics |
| `SN-Create-Record` | Create topics, topic details, and catalog configurations |
| `SN-Update-Record` | Activate and publish topics, update item settings |
| `SN-Natural-Language-Search` | Find catalog items matching natural language queries |
| `SN-Execute-Background-Script` | Batch-create conversation nodes and test flows |
| `SN-Discover-Table-Schema` | Explore Virtual Agent and catalog table schemas |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sc_cat_item` | GET | Query catalog items for ordering |
| `/api/now/table/item_option_new` | GET | Retrieve item variables for collection |
| `/api/now/table/sc_category` | GET | Browse catalog categories |
| `/api/now/table/sys_cb_topic` | GET/POST/PATCH | Manage Virtual Agent topics |
| `/api/now/table/sys_cb_topic_detail` | GET/POST | Configure conversation flow nodes |
| `/api/sn_sc/servicecatalog/items` | GET | Service Catalog API for item details |
| `/api/sn_sc/servicecatalog/cart` | POST | Cart management and order submission |

## Best Practices

- **Keep conversations short:** Limit to 5-7 turns maximum; combine related variables into single prompts when possible
- **Offer quick picks:** Present the 3-5 most popular items first before searching the full catalog
- **Provide context at each turn:** Remind users what they are ordering and what information is still needed
- **Handle backtracking:** Allow users to say "go back" or "change my selection" to revise previous answers
- **Use rich messages:** Display item images, prices, and descriptions using card-style responses
- **Collect mandatory variables first:** Ask for required fields before optional ones to minimize abandonment
- **Confirm before submission:** Always show a complete order summary and ask for explicit confirmation
- **Graceful error handling:** When item search finds no matches, suggest browsing by category or rephrasing the query

## Troubleshooting

### Virtual Agent Not Recognizing Catalog Intent

**Cause:** NLU model is not trained with sufficient utterances for the catalog ordering intent
**Solution:** Add training utterances to the `catalog_order` intent such as "I need to order," "request a new," "can I get a," "I want to buy." Retrain the NLU model after adding utterances.

### Variables Not Being Saved Between Turns

**Cause:** Conversation variables (`vaVars`) are not correctly mapped to catalog variables
**Solution:** Verify `mapped_variable` on each topic detail node matches the `name` field in `item_option_new`. Check that the variable names in the submission script match exactly.

### Cart Submission Fails

**Cause:** Missing mandatory variables, invalid variable values, or user session issues
**Solution:** Validate all mandatory variables are collected before the submission node. Add a pre-submission script node that checks for missing values and loops back if needed. Verify `CatalogOrderHelper` is available in the instance.

### Item Search Returns Wrong Results

**Cause:** Search query too broad or catalog items lack descriptive names and keywords
**Solution:** Improve item `short_description` and `description` fields with searchable keywords. Consider adding a catalog keyword field or using NLU entity extraction to refine the search.

## Examples

### Example 1: Simple Hardware Order Conversation

```
Bot: "What would you like to order?"
User: "I need a new monitor"
Bot: "I found 2 monitors available:
      1. Standard Monitor (24" Dell) - $350
      2. Ultra-Wide Monitor (34" LG) - $750
      Which one would you like?"
User: "The ultra-wide"
Bot: "What is your desk location?"
User: "Building A, Floor 3, Desk 312"
Bot: "Do you need any mounting accessories? (desk mount, wall mount, or none)"
User: "Desk mount please"
Bot: "Order Summary:
      Ultra-Wide Monitor (34" LG) - $750
      Location: Building A, Floor 3, Desk 312
      Mounting: Desk mount
      Shall I submit this order?"
User: "Yes"
Bot: "Order submitted! Request REQ0045123 created. Expected delivery: 5-7 business days."
```

### Example 2: Software Request with Disambiguation

```
Bot: "What would you like to order?"
User: "I need Adobe"
Bot: "I found several Adobe products:
      1. Adobe Creative Cloud (Full Suite) - $55/mo
      2. Adobe Acrobat Pro - $15/mo
      3. Adobe Photoshop (Single App) - $22/mo
      Which one do you need?"
User: "Just Acrobat"
Bot: "How many licenses do you need?"
User: "3"
Bot: "Business justification for the licenses?"
User: "Legal team needs PDF editing for contract reviews"
Bot: "I'll submit this for approval since it's 3+ licenses. Confirm?
      Adobe Acrobat Pro x3 - $45/mo
      Justification: Legal team PDF editing for contract reviews"
User: "Confirm"
Bot: "Submitted! REQ0045124 is pending manager approval."
```

## Related Skills

- `catalog/catalog-item-generation` - Generate catalog items from descriptions
- `catalog/variable-management` - Advanced variable configuration
- `catalog/item-creation` - Standard catalog item setup
- `catalog/request-fulfillment` - Post-order fulfillment workflows
- `catalog/approval-workflows` - Approval routing for orders
- `genai/playbook-generation` - Generate Virtual Agent playbooks
