---
name: business-app-insights
version: 1.0.1
description: Generate insights for business applications including health, dependencies, technology stack, and modernization recommendations
author: Happy Technologies LLC
tags: [enterprise-architecture, business-application, cmdb, dependencies, modernization, cmdb-ci-business-app, sn-ea-tech-standard]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Get-Table-Schema
    - SN-Create-Record
    - SN-Update-Record
  rest:
    - /api/now/table/cmdb_ci_business_app
    - /api/now/table/sn_ea_architecture_decision_record
    - /api/now/table/sn_ea_diagram
    - /api/now/table/sn_ea_tech_standard
    - /api/now/table/cmdb_rel_ci
  native:
    - Bash
complexity: advanced
estimated_time: 45-90 minutes
---

# Business Application Insights

## Overview

This skill covers generating comprehensive insights for business applications registered in ServiceNow's CMDB and Enterprise Architecture module:

- Assessing application health through incident, change, and outage data
- Mapping upstream and downstream dependencies via CMDB relationships
- Analyzing technology stack alignment with enterprise standards
- Identifying modernization candidates based on lifecycle stage, risk, and cost
- Generating application portfolio summaries for executive dashboards
- Correlating applications with architecture decision records

**When to use:** During application portfolio rationalization, technology refresh planning, M&A due diligence, risk assessments, or when architects need a holistic view of an application's standing.

## Prerequisites

- **Roles:** `ea_admin`, `ea_viewer`, `itil`, `cmdb_read`, or `admin`
- **Access:** cmdb_ci_business_app, cmdb_rel_ci, sn_ea_tech_standard, sn_ea_architecture_decision_record tables
- **Knowledge:** CMDB data model, application lifecycle management, enterprise architecture concepts
- **Plugins:** Enterprise Architecture (com.sn_ea), CMDB (com.snc.cmdb) must be activated
- **Related Skills:** Complete `ea/adr-summarization` for decision history context

## Procedure

### Step 1: Understand the Business Application Data Model

```
cmdb_ci_business_app (Business Application)
├── cmdb_rel_ci (Relationships) ── upstream/downstream CIs
├── sn_ea_tech_standard (Technology Standards)
├── sn_ea_architecture_decision_record (ADRs)
├── sn_ea_diagram (Architecture Diagrams)
├── incident (Related Incidents)
├── change_request (Related Changes)
└── sys_user / sys_user_group (Owners / Support Groups)
```

**Key Tables:**
| Table | Purpose |
|-------|---------|
| cmdb_ci_business_app | Business application records with lifecycle, criticality, ownership |
| cmdb_rel_ci | CI-to-CI relationships for dependency mapping |
| sn_ea_tech_standard | Technology standards and lifecycle status |
| sn_ea_diagram | Architecture diagrams linked to applications |
| sn_ea_architecture_decision_record | Architectural decisions affecting the application |

### Step 2: Retrieve Business Application Details

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: name=[app_name]
  fields: sys_id,name,short_description,owner,business_criticality,lifecycle_stage,operational_status,used_for,version,vendor,cost_center,support_group,managed_by
  limit: 10
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/cmdb_ci_business_app?sysparm_query=name=[app_name]&sysparm_fields=sys_id,name,short_description,owner,business_criticality,lifecycle_stage,operational_status,used_for,version,vendor&sysparm_limit=10" \
  -H "Accept: application/json"
```

### Step 3: Query Application Portfolio Overview

**Retrieve all business applications with key metrics:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: operational_status=1^ORoperational_status=2
  fields: sys_id,name,business_criticality,lifecycle_stage,operational_status,owner,vendor,used_for
  limit: 200
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/cmdb_ci_business_app?sysparm_query=operational_status=1^ORoperational_status=2&sysparm_fields=sys_id,name,business_criticality,lifecycle_stage,operational_status,owner,vendor&sysparm_limit=200" \
  -H "Accept: application/json"
```

### Step 4: Map Application Dependencies

**Query upstream dependencies (what this app depends on):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: child=[app_sys_id]
  fields: sys_id,parent,child,type,connection_strength
  limit: 100
```

**Query downstream dependencies (what depends on this app):**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[app_sys_id]
  fields: sys_id,parent,child,type,connection_strength
  limit: 100
```

**REST Alternative:**
```bash
# Upstream
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/cmdb_rel_ci?sysparm_query=child=[app_sys_id]&sysparm_fields=sys_id,parent,child,type&sysparm_limit=100" \
  -H "Accept: application/json"

# Downstream
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/cmdb_rel_ci?sysparm_query=parent=[app_sys_id]&sysparm_fields=sys_id,parent,child,type&sysparm_limit=100" \
  -H "Accept: application/json"
```

### Step 5: Analyze Technology Stack Alignment

**Retrieve technology standards:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_tech_standard
  query: active=true
  fields: sys_id,name,description,status,lifecycle_stage,standard_type,category
  limit: 200
```

**Check which standards the application aligns with:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_tech_standard
  query: related_business_appLIKE[app_sys_id]
  fields: sys_id,name,status,lifecycle_stage,standard_type
  limit: 50
```

### Step 6: Assess Application Health via Incidents

**Query recent incidents for the application:**

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=[app_sys_id]^sys_created_on>=javascript:gs.daysAgo(90)
  fields: sys_id,number,short_description,priority,state,resolved_at,sys_created_on
  limit: 100
```

**REST Alternative:**
```bash
curl -u "$SN_USER:$SN_PASS" \
  "$SN_INSTANCE/api/now/table/incident?sysparm_query=cmdb_ci=[app_sys_id]^sys_created_on>=javascript:gs.daysAgo(90)&sysparm_fields=sys_id,number,short_description,priority,state&sysparm_limit=100" \
  -H "Accept: application/json"
```

### Step 7: Assess Change Frequency

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: cmdb_ci=[app_sys_id]^sys_created_on>=javascript:gs.daysAgo(180)
  fields: sys_id,number,short_description,type,state,risk,sys_created_on
  limit: 100
```

### Step 8: Retrieve Related Architecture Decisions

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: business_application=[app_sys_id]
  fields: sys_id,number,title,state,decision,consequences,sys_created_on
  limit: 50
```

### Step 9: Retrieve Architecture Diagrams

**MCP Approach:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_diagram
  query: related_record=[app_sys_id]
  fields: sys_id,name,description,diagram_type,sys_updated_on
  limit: 20
```

### Step 10: Compile Application Insight Report

Generate a structured report using this template:

```
Application Insight Report: [App Name]
================================================
Business Criticality: [Level]
Lifecycle Stage: [Stage]
Operational Status: [Status]
Owner: [Owner Name]
Vendor: [Vendor]

HEALTH SUMMARY:
- Incidents (last 90 days): [Count] ([P1]: X, [P2]: Y, [P3]: Z)
- Changes (last 180 days): [Count]
- Availability: [Derived metric]

DEPENDENCY MAP:
Upstream (depends on):
  - [CI Name] (Type: [Rel Type])
Downstream (depended on by):
  - [CI Name] (Type: [Rel Type])

TECHNOLOGY STACK:
- [Standard Name] - Status: [Approved/Retiring/Prohibited]

ARCHITECTURE DECISIONS:
- [ADR Number]: [Title] - [State]

MODERNIZATION ASSESSMENT:
- Lifecycle Risk: [Low/Medium/High]
- Technical Debt Indicators: [List]
- Recommended Actions: [List]

DIAGRAMS:
- [Diagram Name] (Type: [Type])
```

## Tool Usage

| Action | MCP Tool | REST Endpoint |
|--------|----------|---------------|
| Get application details | SN-Get-Record | GET /api/now/table/cmdb_ci_business_app/{sys_id} |
| Query applications | SN-Query-Table | GET /api/now/table/cmdb_ci_business_app |
| Map dependencies | SN-Query-Table | GET /api/now/table/cmdb_rel_ci |
| Get tech standards | SN-Query-Table | GET /api/now/table/sn_ea_tech_standard |
| Get incidents | SN-Query-Table | GET /api/now/table/incident |
| Get changes | SN-Query-Table | GET /api/now/table/change_request |
| Get ADRs | SN-Query-Table | GET /api/now/table/sn_ea_architecture_decision_record |
| Get diagrams | SN-Query-Table | GET /api/now/table/sn_ea_diagram |

## Best Practices

- **Start with criticality:** Focus analysis on business-critical applications first (criticality 1 or 2)
- **Use lifecycle stages:** Leverage lifecycle_stage field to identify candidates for retirement or modernization
- **Cross-reference incidents with changes:** Correlate high incident counts with recent changes for root cause patterns
- **Map full dependency chains:** Walk the dependency graph 2-3 levels deep to understand blast radius
- **Include cost data:** Where available, incorporate cost_center and TCO data for financial insights
- **Compare against standards:** Flag applications using technologies in "Retiring" or "Prohibited" lifecycle stages
- **Time-box incident analysis:** Use 90-day windows for health metrics to capture current trends without noise
- **Aggregate for portfolio views:** Roll up individual application insights into domain or capability-level summaries
- **Validate with owners:** Always confirm automated insights with application owners before publishing

## Troubleshooting

### No Dependency Relationships Found

**Symptom:** cmdb_rel_ci returns no results for an application
**Causes:**
1. Relationships not populated in CMDB
2. Application registered as different CI class
3. Relationship direction reversed
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[app_sys_id]^ORchild=[app_sys_id]
  fields: sys_id,parent,child,type
  limit: 50
```

### Business Application Not Found

**Symptom:** Query returns no results for application name
**Cause:** Application may be registered under a different name or CI class
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: nameLIKE[partial_name]^ORshort_descriptionLIKE[partial_name]
  fields: sys_id,name,short_description,sys_class_name
  limit: 20
```

### Missing Technology Standard Links

**Symptom:** No technology standards linked to application
**Cause:** Standards may be linked via a different relationship or custom table
**Solution:** Check the data dictionary for relationship fields:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_dictionary
  query: name=sn_ea_tech_standard^elementLIKEapplication
  fields: element,column_label,internal_type
  limit: 20
```

### Incident Counts Seem Too High

**Symptom:** Hundreds of incidents returned for a single application
**Cause:** Parent CI may be catching child CI incidents via CMDB hierarchy
**Solution:** Filter to direct CI association only:
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=[app_sys_id]^cmdb_ci.sys_class_name=cmdb_ci_business_app
  fields: sys_id,number,priority
  limit: 200
```

## Examples

### Example 1: Full Application Health Assessment

```
# Step 1: Get application details
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: name=SAP ERP
  fields: sys_id,name,business_criticality,lifecycle_stage,operational_status,owner,vendor
  limit: 1
# Result: sys_id = "app123"

# Step 2: Get dependencies
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=app123^ORchild=app123
  fields: sys_id,parent,child,type
  limit: 100

# Step 3: Get recent incidents
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: cmdb_ci=app123^sys_created_on>=javascript:gs.daysAgo(90)
  fields: sys_id,number,priority,state
  limit: 200

# Step 4: Get architecture decisions
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: business_application=app123
  fields: sys_id,number,title,state,decision
  limit: 20
```

### Example 2: Portfolio Modernization Candidates

```
# Find applications in "End of Life" or "Retiring" lifecycle stages
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: lifecycle_stage=end_of_life^ORlifecycle_stage=retiring^operational_status=1
  fields: sys_id,name,business_criticality,lifecycle_stage,owner,vendor
  limit: 100
```

### Example 3: Critical Application Dependency Report

```
# Find all critical applications
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: business_criticality=1^operational_status=1
  fields: sys_id,name,owner,lifecycle_stage
  limit: 50

# For each, query dependency count
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_rel_ci
  query: parent=[each_app_sys_id]
  fields: sys_id,child
  limit: 500
```

## Related Skills

- `ea/adr-summarization` - Architecture Decision Record summarization
- `cmdb/ci-discovery` - CMDB configuration item management
- `cmdb/relationship-mapping` - Deep dependency analysis
- `reporting/analytics-generation` - Dashboard creation for portfolio views
- `spm/project-insights` - Project and portfolio management insights
