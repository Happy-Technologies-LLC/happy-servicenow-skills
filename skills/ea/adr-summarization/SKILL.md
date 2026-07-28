---
name: adr-summarization
version: 1.0.1
description: Summarize Architecture Decision Records with context, rationale, trade-offs, and impact analysis for enterprise architecture governance
author: Happy Technologies LLC
tags: [enterprise-architecture, adr, architecture-decisions, governance, sn-ea-architecture-decision-record, cmdb]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Get-Table-Schema
    - SN-Update-Record
    - SN-Create-Record
  rest:
    - /api/now/table/sn_ea_architecture_decision_record
    - /api/now/table/cmdb_ci_business_app
    - /api/now/table/sn_ea_tech_standard
    - /api/now/table/sn_ea_diagram
  native:
    - Bash
complexity: advanced
estimated_time: 30-60 minutes
---

# Architecture Decision Record Summarization

## Overview

This skill covers summarizing Architecture Decision Records (ADRs) in ServiceNow Enterprise Architecture:

- Retrieving and parsing ADR content including context, decision, rationale, and consequences
- Correlating ADRs with related business applications and technology standards
- Analyzing trade-offs documented across multiple ADRs
- Generating executive-level summaries with impact assessments
- Identifying decision patterns and potential conflicts between ADRs
- Linking ADRs to enterprise architecture diagrams and roadmaps

**When to use:** When stakeholders need consolidated views of architecture decisions, during architecture reviews, compliance audits, or when evaluating the impact of proposed changes on existing decisions.

## Prerequisites

- **Roles:** `ea_admin`, `ea_viewer`, or `admin`
- **Access:** sn_ea_architecture_decision_record, cmdb_ci_business_app, sn_ea_tech_standard, sn_ea_diagram tables
- **Plugins:** Enterprise Architecture (com.snc.enterprise_architecture) must be activated
- **Knowledge:** ADR format (context, decision, status, consequences), enterprise architecture concepts
- **Related Skills:** Complete `ea/business-app-insights` for application-level context

## Procedure

### Step 1: Discover the ADR Table Schema

Before querying, understand the table structure.

**Using MCP:**
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: sn_ea_architecture_decision_record
```

**Using REST:**
```
GET /api/now/table/sn_ea_architecture_decision_record?sysparm_limit=1
Accept: application/json
```

**Key Fields:**
| Field | Description |
|-------|-------------|
| number | ADR number identifier |
| title | Decision title |
| status | Current status (proposed, accepted, deprecated, superseded) |
| context | Business or technical context driving the decision |
| decision | The architecture decision made |
| rationale | Reasoning behind the decision |
| consequences | Expected outcomes and trade-offs |
| business_application | Related business application reference |
| technology_standard | Associated technology standard |
| created_by | Decision author |
| sys_created_on | Creation date |
| sys_updated_on | Last modification date |

### Step 2: Query Architecture Decision Records

**Retrieve all active ADRs:**

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: status=accepted^ORstatus=proposed
  fields: sys_id,number,title,status,context,decision,rationale,consequences,business_application,technology_standard,sys_created_on,sys_updated_on
  limit: 100
```

**Using REST:**
```
GET /api/now/table/sn_ea_architecture_decision_record?sysparm_query=status=accepted^ORstatus=proposed&sysparm_fields=sys_id,number,title,status,context,decision,rationale,consequences,business_application,technology_standard,sys_created_on,sys_updated_on&sysparm_limit=100
Accept: application/json
```

**Filter ADRs by business application:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: business_application=[app_sys_id]
  fields: sys_id,number,title,status,decision,rationale,consequences
  limit: 50
```

**Filter ADRs by date range:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: sys_created_on>=javascript:gs.dateGenerate('2025-01-01','00:00:00')^status=accepted
  fields: sys_id,number,title,status,decision,consequences
  limit: 100
```

### Step 3: Retrieve Related Context

**Get associated business application details:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: sys_id=[business_application_sys_id]
  fields: sys_id,name,short_description,business_criticality,lifecycle_stage,owned_by,managed_by
```

**Get related technology standards:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_tech_standard
  query: sys_id=[tech_standard_sys_id]
  fields: sys_id,name,status,description,category,lifecycle_stage
```

**Get associated architecture diagrams:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_diagram
  query: business_application=[app_sys_id]
  fields: sys_id,name,description,diagram_type,sys_updated_on
  limit: 20
```

### Step 4: Analyze Trade-offs and Conflicts

For each ADR, extract and categorize:

1. **Positive consequences** - Benefits and advantages stated in the consequences field
2. **Negative consequences** - Risks, limitations, and costs acknowledged
3. **Dependencies** - Other systems or decisions referenced
4. **Constraints** - Technical or business constraints mentioned in the context

**Identify potentially conflicting decisions:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: status=accepted^technology_standard=[same_standard_sys_id]
  fields: sys_id,number,title,decision,consequences
  limit: 50
```

### Step 5: Generate the Summary

Structure the ADR summary with these sections:

1. **Decision Overview** - Title, status, date, author
2. **Context Summary** - Condensed version of the business/technical context
3. **Decision Statement** - The core decision in one to two sentences
4. **Rationale Highlights** - Key reasons supporting the decision
5. **Trade-off Analysis** - Pros vs. cons matrix
6. **Impact Assessment** - Affected applications, standards, and teams
7. **Related Decisions** - Links to related or superseded ADRs
8. **Recommendations** - Suggested follow-up actions or reviews

### Step 6: Store the Summary (Optional)

**Update ADR with generated summary:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_ea_architecture_decision_record
  sys_id: [adr_sys_id]
  data:
    work_notes: |
      AI-Generated Summary (as of YYYY-MM-DD):

      Decision: [condensed decision statement]

      Key Trade-offs:
      + [positive consequence 1]
      + [positive consequence 2]
      - [negative consequence 1]
      - [negative consequence 2]

      Impact: Affects [N] business applications
      Related Standards: [standard names]

      Recommendation: [follow-up action]
```

**Using REST:**
```
PATCH /api/now/table/sn_ea_architecture_decision_record/[adr_sys_id]
Content-Type: application/json
{
  "work_notes": "AI-Generated Summary: ..."
}
```

## Tool Usage

| Tool | Purpose |
|------|---------|
| SN-Get-Table-Schema | Discover ADR table fields and relationships |
| SN-Query-Table | Retrieve ADRs, applications, standards, and diagrams |
| SN-Get-Record | Get detailed single ADR with all fields |
| SN-Update-Record | Store generated summaries back to ADR records |
| SN-Create-Record | Create new summary records or tasks |

## Best Practices

- **Batch by domain:** Summarize ADRs grouped by business domain or application for coherent narratives
- **Preserve original language:** When quoting rationale, keep the original phrasing to avoid misrepresentation
- **Flag stale decisions:** Highlight ADRs not reviewed in over 12 months for potential re-evaluation
- **Cross-reference standards:** Always check whether referenced technology standards are still active
- **Version tracking:** Note the sys_updated_on date to indicate summary freshness
- **Stakeholder context:** Tailor summary depth based on audience (executive vs. technical)
- **Conflict detection:** When summarizing multiple ADRs, actively look for contradictory decisions
- **Include superseded history:** When an ADR supersedes another, include the chain of decisions

## Troubleshooting

### No ADRs Returned from Query

**Symptom:** Query returns empty result set
**Causes:**
1. Enterprise Architecture plugin not activated
2. No ADRs created in the instance
3. Insufficient permissions
**Solution:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: ORDERBYDESCsys_created_on
  fields: sys_id,number,title,status
  limit: 5
```

### Missing Business Application References

**Symptom:** business_application field is empty on ADRs
**Cause:** ADRs created without linking to business applications
**Solution:** Query cmdb_ci_business_app separately and correlate by name or description keywords

### ADR Content Fields Are Empty

**Symptom:** context, decision, or rationale fields return blank
**Cause:** ADRs may use custom fields or journal fields
**Solution:** Check table schema for custom columns or use work_notes/comments fields
```
Tool: SN-Get-Table-Schema
Parameters:
  table_name: sn_ea_architecture_decision_record
```

### Permission Denied Errors

**Symptom:** 403 or insufficient privileges error
**Cause:** User lacks ea_viewer or ea_admin role
**Solution:** Verify role assignment or request elevated access

## Examples

### Example 1: Summarize a Single ADR

```
# Step 1: Get the ADR
Tool: SN-Get-Record
Parameters:
  table_name: sn_ea_architecture_decision_record
  sys_id: abc123def456

# Result contains:
#   title: "Adopt Kubernetes for Container Orchestration"
#   status: "accepted"
#   context: "Our microservices deployment requires automated scaling..."
#   decision: "Adopt Kubernetes as the standard container orchestration platform..."
#   rationale: "Kubernetes provides auto-scaling, self-healing, and wide ecosystem..."
#   consequences: "Requires team training, increases infrastructure complexity..."

# Step 2: Get related application
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_business_app
  query: sys_id=[business_application_value]
  fields: name,business_criticality,lifecycle_stage

# Step 3: Generate summary output:
# ADR-0042: Adopt Kubernetes for Container Orchestration
# Status: Accepted | Created: 2025-06-15
# Application: Cloud Platform Services (Business Critical)
#
# Context: Microservices architecture requires automated container management
# Decision: Standardize on Kubernetes for all container orchestration
#
# Trade-offs:
# + Auto-scaling and self-healing capabilities
# + Large ecosystem and community support
# - Requires significant team training investment
# - Increases infrastructure complexity
#
# Impact: Affects 12 microservices across 3 business applications
```

### Example 2: Batch Summarize ADRs by Domain

```
# Step 1: Get all ADRs for a specific business domain
Tool: SN-Query-Table
Parameters:
  table_name: sn_ea_architecture_decision_record
  query: status=accepted^contextLIKEcloud^ORtitleLIKEcloud
  fields: sys_id,number,title,status,decision,consequences,sys_created_on
  limit: 50

# Step 2: For each ADR, fetch related records and build consolidated summary
# Step 3: Output a domain-level summary with decision timeline and dependency map
```

## Related Skills

- `ea/business-app-insights` - Application health and dependency analysis
- `genai/app-summary` - Scoped application analysis
- `security/audit-compliance` - Compliance implications of architecture decisions
- `cmdb/relationship-mapping` - Understanding CI dependencies affected by ADRs
