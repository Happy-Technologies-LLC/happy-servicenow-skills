---
name: saas-user-resolution
version: 1.0.0
description: Resolve SaaS user discrepancies, identify unused licenses, detect duplicate accounts, and recommend license optimization strategies
author: Happy Technologies LLC
tags: [sam, saas, user-resolution, license-optimization, cost-savings, usage-analytics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
  rest:
    - /api/now/table/samp_sw_product
    - /api/now/table/samp_sw_install
    - /api/now/table/samp_license
    - /api/now/table/samp_compliance_result
    - /api/now/table/samp_saas_user
    - /api/now/table/samp_saas_subscription
    - /api/now/table/sys_user
  native:
    - Bash
complexity: advanced
estimated_time: 15-25 minutes
---

# SaaS User Resolution

## Overview

This skill provides a structured approach to resolving SaaS user discrepancies and optimizing SaaS license utilization within ServiceNow Software Asset Management. It helps SAM analysts identify waste, reconcile user accounts, and generate actionable optimization recommendations.

Key capabilities:
- Compare SaaS subscription user counts against actual active usage
- Identify inactive, dormant, or orphaned SaaS user accounts
- Detect duplicate user provisioning across SaaS applications
- Analyze usage patterns to recommend license tier right-sizing
- Calculate potential cost savings from license reclamation
- Generate user reconciliation reports for subscription owners

**When to use:** When SaaS subscription renewals are approaching, when monthly usage reports reveal discrepancies, when onboarding/offboarding processes need audit, or when leadership requests SaaS spend optimization analysis.

## Prerequisites

- **Roles:** `sam_admin`, `sam_user`, `license_admin`, or `itil`
- **Access:** Read access to `samp_saas_user`, `samp_saas_subscription`, `samp_sw_product`, `samp_license`, `samp_sw_install`, and `sys_user` tables
- **Plugins:** Software Asset Management (com.snc.samp) with SaaS License Management module active
- **Data:** SaaS integrations configured and user sync completed for target applications

## Procedure

### Step 1: Retrieve SaaS Subscription Details

Fetch the SaaS subscription records for the target application.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_subscription
  query: software_product.display_nameLIKESalesforce
  fields: sys_id,display_name,software_product,vendor,total_licenses,used_licenses,available_licenses,cost_per_license,total_cost,renewal_date,contract,state,license_metric
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_subscription?sysparm_query=software_product.display_nameLIKESalesforce&sysparm_fields=sys_id,display_name,software_product,vendor,total_licenses,used_licenses,available_licenses,cost_per_license,total_cost,renewal_date,contract,state,license_metric&sysparm_limit=10&sysparm_display_value=true
```

### Step 2: Retrieve SaaS User Accounts

Pull all user accounts associated with the subscription.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription=[SUBSCRIPTION_SYS_ID]^ORDERBYlast_login_date
  fields: sys_id,user,user.email,user.active,subscription,last_login_date,status,license_type,created_on,role
  limit: 500
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_user?sysparm_query=subscription=[SUBSCRIPTION_SYS_ID]^ORDERBYlast_login_date&sysparm_fields=sys_id,user,subscription,last_login_date,status,license_type,created_on,role&sysparm_limit=500&sysparm_display_value=true
```

### Step 3: Identify Inactive and Dormant Users

Find users who have not logged in within the defined inactivity threshold (typically 30, 60, or 90 days).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription=[SUBSCRIPTION_SYS_ID]^last_login_date<javascript:gs.daysAgoStart(90)^status=active
  fields: sys_id,user,user.email,user.department,last_login_date,license_type,created_on
  limit: 200
```

For users who have never logged in:
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription=[SUBSCRIPTION_SYS_ID]^last_login_dateISEMPTY^status=active
  fields: sys_id,user,user.email,user.department,license_type,created_on
  limit: 200
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_user?sysparm_query=subscription=[SUBSCRIPTION_SYS_ID]^last_login_date<javascript:gs.daysAgoStart(90)^status=active&sysparm_fields=sys_id,user,last_login_date,license_type,created_on&sysparm_limit=200&sysparm_display_value=true

GET /api/now/table/samp_saas_user?sysparm_query=subscription=[SUBSCRIPTION_SYS_ID]^last_login_dateISEMPTY^status=active&sysparm_fields=sys_id,user,license_type,created_on&sysparm_limit=200&sysparm_display_value=true
```

### Step 4: Detect Orphaned Users

Identify SaaS users whose corresponding ServiceNow user records are inactive (terminated employees).

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription=[SUBSCRIPTION_SYS_ID]^user.active=false^status=active
  fields: sys_id,user,user.email,user.active,last_login_date,license_type
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_user?sysparm_query=subscription=[SUBSCRIPTION_SYS_ID]^user.active=false^status=active&sysparm_fields=sys_id,user,last_login_date,license_type&sysparm_limit=100&sysparm_display_value=true
```

### Step 5: Analyze License Tier Usage

Compare user activity levels against their assigned license tiers to identify downgrade opportunities.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription=[SUBSCRIPTION_SYS_ID]^status=active^ORDERBYlicense_type
  fields: sys_id,user,license_type,last_login_date,role,status
  limit: 500
```

Cross-reference with subscription tier costs:
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_subscription
  query: software_product=[PRODUCT_SYS_ID]
  fields: sys_id,display_name,license_metric,cost_per_license,total_licenses,used_licenses
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_user?sysparm_query=subscription=[SUBSCRIPTION_SYS_ID]^status=active^ORDERBYlicense_type&sysparm_fields=sys_id,user,license_type,last_login_date,role&sysparm_limit=500&sysparm_display_value=true
```

### Step 6: Check for Duplicate Provisioning

Identify users provisioned with multiple subscriptions for the same product.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_user
  query: subscription.software_product=[PRODUCT_SYS_ID]^status=active^ORDERBYuser
  fields: sys_id,user,user.email,subscription,license_type,status
  limit: 500
```

**Using REST API:**
```bash
GET /api/now/table/samp_saas_user?sysparm_query=subscription.software_product=[PRODUCT_SYS_ID]^status=active^ORDERBYuser&sysparm_fields=sys_id,user,subscription,license_type,status&sysparm_limit=500&sysparm_display_value=true
```

### Step 7: Build the User Resolution Report

Assemble findings into a structured optimization report:

```
=== SAAS USER RESOLUTION REPORT ===
Application: [product_name]
Subscription: [subscription_name]
Vendor: [vendor] | Renewal: [renewal_date]
Report Date: [current_date]

SUBSCRIPTION OVERVIEW:
Total Licenses: [total_licenses]
Active Users: [used_licenses]
Available: [available_licenses]
Monthly Cost: $[total_cost] ($[cost_per_license]/user)

USER DISCREPANCY ANALYSIS:
| Category | Count | Monthly Cost Impact |
|----------|-------|-------------------|
| Active & In Use | [count] | - |
| Inactive (90+ days) | [count] | $[savings] |
| Never Logged In | [count] | $[savings] |
| Orphaned (termed employees) | [count] | $[savings] |
| Duplicate Provisioning | [count] | $[savings] |

TOTAL RECLAIMABLE: [total_count] licenses = $[total_savings]/month

TIER OPTIMIZATION:
| Current Tier | Users | Recommended Tier | Savings/User |
|-------------|-------|-----------------|-------------|
| Enterprise | [count] | Standard | $[amount] |
| Professional | [count] | Basic | $[amount] |

TOP RECOMMENDATIONS:
1. [action] - Impact: $[savings]/month - Priority: [High/Med/Low]
2. [action] - Impact: $[savings]/month - Priority: [High/Med/Low]
3. [action] - Impact: $[savings]/month - Priority: [High/Med/Low]

ORPHANED USER DETAILS:
| User | Email | Department | Last Login | License Tier |
|------|-------|-----------|------------|-------------|
| [name] | [email] | [dept] | [date] | [tier] |
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language queries (e.g., "find unused Salesforce licenses") |
| `SN-Query-Table` | Structured queries for subscription, user, and usage data |
| `SN-Get-Record` | Retrieve specific subscription or user records by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/samp_saas_subscription` | GET | SaaS subscription details |
| `/api/now/table/samp_saas_user` | GET | SaaS user accounts and activity |
| `/api/now/table/samp_sw_product` | GET | Software product catalog |
| `/api/now/table/samp_license` | GET | License entitlement records |
| `/api/now/table/samp_compliance_result` | GET | Compliance calculation results |
| `/api/now/table/sys_user` | GET | ServiceNow user records for cross-reference |

## Best Practices

- **Define inactivity thresholds clearly:** Agree with stakeholders on 30/60/90-day dormancy windows before reclaiming
- **Verify before deprovisioning:** Always confirm with department managers before removing user access
- **Account for seasonal usage:** Some users may have legitimate periodic access patterns (e.g., quarterly reporting tools)
- **Check shared accounts:** Service accounts and shared mailboxes should be excluded from dormancy analysis
- **Track reclamation results:** Document which licenses were reclaimed and monitor for re-provisioning requests
- **Consider compliance impact:** Removing licenses may push the product into non-compliance if new users are added later
- **Automate ongoing monitoring:** Set up scheduled reports to catch dormant accounts before renewal cycles
- **Coordinate with HR:** Integrate offboarding workflows to automatically flag SaaS accounts when employees leave

## Troubleshooting

### "SaaS user records not available"

**Cause:** SaaS integration has not been configured or the sync has not completed.
**Solution:** Check the SaaS integration settings in SAM Workspace. Verify the API connection to the SaaS provider is active. Run a manual sync if needed.

### "Last login dates are all empty"

**Cause:** The SaaS provider integration may not support login date synchronization.
**Solution:** Check if the SaaS connector supports usage data. Some connectors only sync provisioning data. Consider using the SaaS provider's native reporting API to supplement login data.

### "Duplicate users not detected"

**Cause:** Users may be provisioned with different email addresses or user identifiers across subscriptions.
**Solution:** Cross-reference using `sys_user.employee_number` or `sys_user.user_name` fields instead of email. Check for email alias variations.

### "Cost calculations are inaccurate"

**Cause:** The `cost_per_license` field may not reflect negotiated pricing or tiered volume discounts.
**Solution:** Verify cost data against the actual contract terms. Update subscription records with accurate per-unit costs from procurement.

## Examples

### Example 1: Salesforce License Optimization

**Scenario:** SAM analyst reviews Salesforce licenses before annual renewal.

**Step 1 - Get subscription:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_subscription
  query: display_nameLIKESalesforce
  fields: sys_id,display_name,total_licenses,used_licenses,cost_per_license,renewal_date
  limit: 5
```

**Output:**
```
SALESFORCE USER RESOLUTION REPORT
Subscription: Salesforce Enterprise | Renewal: Jun 30, 2026
Total: 800 licenses | Active: 734 | Cost: $150/user/mo

FINDINGS:
- 42 users inactive 90+ days ($6,300/mo reclaimable)
- 18 orphaned accounts (termed employees) ($2,700/mo)
- 6 never-logged-in accounts ($900/mo)
- 23 users eligible for downgrade to Platform license ($1,150/mo)

TOTAL SAVINGS OPPORTUNITY: $11,050/month ($132,600/year)

IMMEDIATE ACTIONS:
1. Deprovision 18 orphaned accounts - $2,700/mo - Priority: High
2. Review 42 inactive users with managers - $6,300/mo - Priority: High
3. Downgrade 23 low-usage users to Platform - $1,150/mo - Priority: Medium
```

### Example 2: Multi-Application SaaS Spend Review

**Scenario:** CIO requests a cross-application SaaS optimization report.

```
Tool: SN-Query-Table
Parameters:
  table_name: samp_saas_subscription
  query: state=active^ORDERBYDESCtotal_cost
  fields: display_name,software_product,total_licenses,used_licenses,available_licenses,cost_per_license,total_cost,renewal_date
  limit: 20
```

**Output:**
```
SAAS PORTFOLIO OPTIMIZATION SUMMARY
Total SaaS Spend: $485,000/month across 14 applications

TOP OPTIMIZATION OPPORTUNITIES:
| Application | Unused Licenses | Monthly Waste | Renewal |
|-------------|----------------|---------------|---------|
| Salesforce Enterprise | 66 | $9,900 | Jun 2026 |
| Adobe Creative Cloud | 45 | $2,475 | Sep 2026 |
| Slack Business+ | 112 | $1,456 | Apr 2026 |
| Zoom Enterprise | 89 | $1,691 | Jul 2026 |

TOTAL ADDRESSABLE WASTE: $15,522/month ($186,264/year)
QUICK WINS (next 30 days): $12,356/month from orphaned accounts
```

## Related Skills

- `sam/product-compliance` - Software product compliance analysis and remediation
- `procurement/invoice-management` - SaaS invoice and contract management
- `admin/user-provisioning` - User lifecycle and provisioning workflows
- `reporting/executive-dashboard` - Executive SaaS spend dashboards
