---
name: product-compliance
version: 1.0.1
description: Summarize software product compliance status including license counts, entitlement gaps, compliance violations, and recommended remediation actions
author: Happy Technologies LLC
tags: [sam, software-asset, compliance, licensing, entitlement, remediation, audit]
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
    - /api/now/table/samp_entitlement_result
    - /api/now/table/cmdb_sam_sw_discovery_model
    - /api/now/table/sys_audit
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Product Compliance

## Overview

This skill provides a structured approach to summarizing software product compliance within ServiceNow Software Asset Management (SAM). It helps SAM analysts and license managers assess the compliance posture of software products across the enterprise.

Key capabilities:
- Retrieve software product details and associated discovery models
- Summarize license entitlements versus actual installations (rights vs. usage)
- Identify compliance gaps where installations exceed entitlements
- Highlight over-licensed products where entitlements exceed usage
- Analyze compliance results and reconciliation status
- Generate remediation action plans for compliance violations
- Produce audit-ready compliance reports

**When to use:** When a SAM analyst needs to review compliance for a specific software product or publisher, when preparing for a vendor audit, when identifying cost optimization opportunities, or when generating periodic compliance reports.

## Prerequisites

- **Roles:** `sam_admin`, `sam_user`, `license_admin`, or `asset_manager`
- **Access:** Read access to `samp_sw_product`, `samp_sw_install`, `samp_license`, `samp_compliance_result`, `samp_entitlement_result`, and `cmdb_sam_sw_discovery_model` tables
- **Plugins:** Software Asset Management (com.snc.samp) must be active with SAM Professional or Enterprise
- **Data:** Completed software discovery and normalization with up-to-date license records

## Procedure

### Step 1: Retrieve Software Product Details

Fetch the software product record and its classification.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_sw_product
  query: display_name=Microsoft Office 365
  fields: sys_id,display_name,manufacturer,version,is_licensable,product_classification,lifecycle_stage,lifecycle_end_date,platform,category
  limit: 5
```

For broader searches by publisher:
```
Tool: SN-Natural-Language-Search
Parameters:
  table: samp_sw_product
  query: "Find all licensable software products from Microsoft"
```

**Using REST API:**
```bash
GET /api/now/table/samp_sw_product?sysparm_query=display_nameLIKEMicrosoft Office^is_licensable=true&sysparm_fields=sys_id,display_name,manufacturer,version,is_licensable,product_classification,lifecycle_stage,lifecycle_end_date,platform,category&sysparm_limit=10&sysparm_display_value=true
```

### Step 2: Retrieve Compliance Results

Get the latest compliance calculation results for the product.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_compliance_result
  query: software_product=[PRODUCT_SYS_ID]^ORDERBYDESCsys_updated_on
  fields: sys_id,software_product,compliance_status,rights_count,install_count,usage_count,compliance_gap,last_compliance_run,license_metric,publisher
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/samp_compliance_result?sysparm_query=software_product=[PRODUCT_SYS_ID]^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,software_product,compliance_status,rights_count,install_count,usage_count,compliance_gap,last_compliance_run,license_metric,publisher&sysparm_limit=1&sysparm_display_value=true
```

### Step 3: Retrieve License Entitlements

Pull all license records associated with the product.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_license
  query: software_product=[PRODUCT_SYS_ID]^ORDERBYDESCstart_date
  fields: sys_id,display_name,license_metric,rights,used_rights,available_rights,start_date,end_date,contract,vendor,cost,state,license_type,compliance_status
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/samp_license?sysparm_query=software_product=[PRODUCT_SYS_ID]^ORDERBYDESCstart_date&sysparm_fields=sys_id,display_name,license_metric,rights,used_rights,available_rights,start_date,end_date,contract,vendor,cost,state,license_type,compliance_status&sysparm_limit=20&sysparm_display_value=true
```

### Step 4: Retrieve Installation Data

Get current installations to understand actual deployment.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_sw_install
  query: norm_product=[PRODUCT_SYS_ID]^is_reconciled=true
  fields: sys_id,display_name,installed_on,installed_on.location,installed_on.assigned_to,install_date,discovery_source,is_reconciled,last_scanned
  limit: 100
```

For installation count by location:
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_sw_install
  query: norm_product=[PRODUCT_SYS_ID]^is_reconciled=true^GROUPBYinstalled_on.location
  fields: installed_on.location
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/samp_sw_install?sysparm_query=norm_product=[PRODUCT_SYS_ID]^is_reconciled=true&sysparm_fields=sys_id,display_name,installed_on,install_date,discovery_source,is_reconciled,last_scanned&sysparm_limit=100&sysparm_display_value=true
```

### Step 5: Retrieve Entitlement Allocations

Check how license entitlements are allocated.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_entitlement_result
  query: software_product=[PRODUCT_SYS_ID]^ORDERBYDESCsys_updated_on
  fields: sys_id,software_product,license,allocated_rights,consumed_rights,remaining_rights,metric_group,allocation_type
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/samp_entitlement_result?sysparm_query=software_product=[PRODUCT_SYS_ID]^ORDERBYDESCsys_updated_on&sysparm_fields=sys_id,software_product,license,allocated_rights,consumed_rights,remaining_rights,metric_group,allocation_type&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Identify Compliance Gaps and Risks

Analyze the compliance gap and determine remediation needs.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_compliance_result
  query: compliance_status=non_compliant^ORDERBYcompliance_gap
  fields: sys_id,software_product,publisher,compliance_status,rights_count,install_count,compliance_gap,license_metric,last_compliance_run
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/samp_compliance_result?sysparm_query=compliance_status=non_compliant^ORDERBYcompliance_gap&sysparm_fields=sys_id,software_product,publisher,compliance_status,rights_count,install_count,compliance_gap,license_metric&sysparm_limit=20&sysparm_display_value=true
```

### Step 7: Build the Compliance Summary

Assemble collected data into a structured compliance report:

```
=== SOFTWARE COMPLIANCE SUMMARY ===
Product: [product_name]
Publisher: [manufacturer] | Version: [version]
Lifecycle: [lifecycle_stage] | EOL: [lifecycle_end_date]
Last Compliance Run: [last_compliance_run]

COMPLIANCE STATUS: [COMPLIANT / NON-COMPLIANT / OVER-LICENSED]

LICENSE POSITION:
Total Entitlements (Rights): [rights_count]
Total Installations: [install_count]
Actual Usage: [usage_count]
Compliance Gap: [compliance_gap] ([positive = over-licensed, negative = under-licensed])

LICENSE INVENTORY:
| License | Type | Metric | Rights | Used | Available | Expiry |
|---------|------|--------|--------|------|-----------|--------|
| [name]  | [type] | [metric] | [rights] | [used] | [avail] | [end_date] |

INSTALLATION DISTRIBUTION:
| Location | Install Count | % of Total |
|----------|--------------|------------|
| [location] | [count] | [pct]% |

RISK ASSESSMENT:
- Compliance Gap: [gap_description]
- Expiring Licenses: [count] licenses expiring within 90 days
- Unreconciled Installs: [count] installations not matched to entitlements
- Lifecycle Risk: [EOL/EOS warnings]

REMEDIATION ACTIONS:
1. [action_description] - Priority: [High/Medium/Low]
2. [action_description] - Priority: [High/Medium/Low]

COST OPTIMIZATION:
- Over-licensed savings potential: $[amount]
- License consolidation opportunities: [description]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language product search (e.g., "find non-compliant Adobe products") |
| `SN-Query-Table` | Structured queries for compliance, license, and installation data |
| `SN-Get-Record` | Retrieve a specific product, license, or compliance record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/samp_sw_product` | GET | Software product catalog lookup |
| `/api/now/table/samp_compliance_result` | GET | Compliance calculation results |
| `/api/now/table/samp_license` | GET | License entitlement records |
| `/api/now/table/samp_sw_install` | GET | Software installation records |
| `/api/now/table/samp_entitlement_result` | GET | Entitlement allocation details |
| `/api/now/table/cmdb_sam_sw_discovery_model` | GET | Discovery model mappings |

## Best Practices

- **Run compliance calculations first:** Ensure the most recent compliance job has completed before generating reports
- **Use normalized products:** Always reference `samp_sw_product` (normalized) rather than raw discovery records
- **Check license expiration:** Flag licenses expiring within 90 days as they affect future compliance
- **Distinguish usage from installation:** Installation count and actual usage count can differ significantly for products with usage metering
- **Consider license metrics:** Different metrics (per device, per user, per core) require different comparison approaches
- **Validate discovery data:** Stale discovery records inflate installation counts; check `last_scanned` dates
- **Document remediation:** Always pair compliance gaps with specific, actionable remediation steps
- **Account for license mobility:** Some licenses allow reassignment; factor in mobility rules when assessing compliance

## Troubleshooting

### "Compliance result shows zero rights and zero installs"

**Cause:** The compliance calculation has not been run, or the product is not mapped to any discovery models.
**Solution:** Verify that the product has associated discovery models in `cmdb_sam_sw_discovery_model`. Trigger a compliance calculation from the SAM Workspace.

### "Installation count is unexpectedly high"

**Cause:** Multiple discovery sources may be reporting duplicate installations, or normalization rules are too broad.
**Solution:** Check for duplicate `samp_sw_install` records. Review the normalization rules mapping discovery models to the product. Filter by `is_reconciled=true`.

### "License records not linked to product"

**Cause:** License records may reference a different product version or use a different product reference field.
**Solution:** Check the `software_product` and `software_model` fields on the license. Verify product normalization includes all relevant versions.

### "Compliance status shows compliant but gap is negative"

**Cause:** The compliance calculation may use a different metric than expected, or sub-capacity rules apply.
**Solution:** Review the `license_metric` field on the compliance result. Check if the product uses processor value unit (PVU) or other sub-capacity metrics.

## Examples

### Example 1: Microsoft Office 365 Compliance Review

**Scenario:** SAM analyst prepares a compliance summary for an upcoming Microsoft audit.

**Step 1 - Find product:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_sw_product
  query: display_nameLIKEOffice 365^manufacturer.nameLIKEMicrosoft
  fields: sys_id,display_name,manufacturer,version,is_licensable
  limit: 5
```

**Step 2 - Get compliance:**
```
Tool: SN-Query-Table
Parameters:
  table_name: samp_compliance_result
  query: software_product=<sys_id>
  fields: compliance_status,rights_count,install_count,usage_count,compliance_gap,last_compliance_run
  limit: 1
```

**Output Summary:**
```
COMPLIANCE SUMMARY - Microsoft Office 365 E3
Publisher: Microsoft | Metric: Per User
Last Run: Mar 18, 2026

STATUS: NON-COMPLIANT

Rights: 2,500 licenses | Installs: 2,847 | Active Users: 2,712
Gap: -212 licenses (under-licensed)

LICENSES:
- EA Agreement EA-2024-001: 2,000 rights (exp Dec 2026)
- CSP Monthly: 500 rights (active, monthly)

REMEDIATION:
1. Purchase 212 additional E3 licenses - Priority: High
2. Review 135 installed but inactive users for removal - Priority: Medium
3. Evaluate E3 to E1 downgrade for 340 light users - Priority: Medium

ESTIMATED COST: $212 x $23/user/mo = $4,876/mo additional
SAVINGS OPPORTUNITY: Downgrade 340 users = $5,440/mo savings
```

### Example 2: Publisher-Wide Compliance Dashboard

**Scenario:** SAM manager needs an overview of all Adobe product compliance.

```
Tool: SN-Query-Table
Parameters:
  table_name: samp_compliance_result
  query: publisher.nameLIKEAdobe^ORDERBYcompliance_status
  fields: software_product,compliance_status,rights_count,install_count,compliance_gap,license_metric
  limit: 20
```

**Output:**
```
ADOBE COMPLIANCE OVERVIEW
Total Products: 8 | Compliant: 5 | Non-Compliant: 2 | Over-Licensed: 1

NON-COMPLIANT:
1. Adobe Acrobat Pro DC
   Rights: 450 | Installs: 623 | Gap: -173
   Action: Harvest unused installs, purchase delta

2. Adobe Illustrator CC
   Rights: 50 | Installs: 78 | Gap: -28
   Action: Verify business need for 28 excess installs

OVER-LICENSED:
1. Adobe Photoshop CC
   Rights: 200 | Installs: 89 | Gap: +111
   Action: Reduce licenses at next renewal (-$6,660/yr)

TOTAL RISK EXPOSURE: ~$48,000 (est. true-up cost)
SAVINGS OPPORTUNITY: ~$6,660/yr (Photoshop right-sizing)
```

## Related Skills

- `sam/saas-user-resolution` - Resolve SaaS user discrepancies and optimize licenses
- `procurement/invoice-management` - Track license procurement and invoicing
- `admin/configuration-validation` - Validate SAM plugin configuration
- `reporting/executive-dashboard` - Generate executive compliance dashboards
