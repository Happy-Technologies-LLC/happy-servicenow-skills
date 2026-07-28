---
name: government-case-summarization
version: 1.0.1
description: Summarize government and public sector cases with regulatory compliance context, service eligibility tracking, inter-agency coordination, and audit trail documentation
author: Happy Technologies LLC
tags: [psds, government, case-summarization, public-sector, regulatory, compliance, citizen-services]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
  rest:
    - /api/now/table/sn_psds_case
    - /api/now/table/sn_psds_service
    - /api/now/table/interaction
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_psds_task
    - /api/now/table/sn_psds_eligibility
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# Government Case Summarization

## Overview

This skill generates comprehensive summaries of government and public sector cases in ServiceNow Public Sector Digital Services (PSDS). It addresses the unique requirements of government case management including regulatory compliance tracking, service eligibility determination, inter-agency coordination, privacy considerations, and audit trail documentation.

Key capabilities:
- Retrieve and consolidate case details with citizen/constituent context
- Track service eligibility determinations and benefit program status
- Summarize inter-agency coordination and referral chains
- Document regulatory compliance status and applicable mandates
- Build audit-ready case timelines with full provenance tracking
- Produce summaries that respect PII handling requirements and data classification

**When to use:** When a caseworker needs a quick overview of a citizen case for shift handover, when a supervisor reviews case backlogs, when preparing for audit or compliance review, or when coordinating case transfers between agencies or departments.

## Prerequisites

- **Roles:** `sn_psds_caseworker`, `sn_psds_supervisor`, `sn_psds_admin`, or equivalent public sector role
- **Access:** Read access to `sn_psds_case`, `sn_psds_service`, `interaction`, `sys_journal_field`, `sn_psds_task`, and `sn_psds_eligibility` tables
- **Plugins:** Public Sector Digital Services (com.snc.psds) must be active
- **Compliance:** Familiarity with applicable privacy regulations (FOIA, Privacy Act, state-specific requirements)

## Procedure

### Step 1: Retrieve Core Case Details

Fetch the primary case record with all citizen, service, and compliance fields.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_psds_case
  sys_id: [CASE_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,urgency,impact,category,subcategory,contact,account,opened_at,opened_by,assigned_to,assignment_group,resolved_at,closed_at,resolution_code,resolution_notes,service,program,eligibility_status,agency,department,case_type,due_date,sla_due,escalation,data_classification
```

If searching by case number:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_case
  query: number=PSDS0012345
  fields: sys_id,number,short_description,description,state,priority,category,subcategory,contact,account,opened_at,assigned_to,assignment_group,service,program,eligibility_status,agency,department,case_type,due_date,data_classification
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_case?sysparm_query=number=PSDS0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,category,subcategory,contact,account,opened_at,assigned_to,assignment_group,service,program,eligibility_status,agency,department,case_type,due_date,data_classification&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Citizen/Constituent Context

Get the citizen contact record with relevant demographic and service history context.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_contact
  query: sys_id=[CONTACT_SYS_ID]
  fields: sys_id,name,email,phone,title,account,city,state,zip,preferred_language,preferred_contact_method,accessibility_needs
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/customer_contact/{CONTACT_SYS_ID}?sysparm_fields=sys_id,name,email,phone,account,city,state,zip,preferred_language,preferred_contact_method,accessibility_needs&sysparm_display_value=true
```

### Step 3: Retrieve Service and Program Details

Get the government service and program information linked to the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_service
  query: sys_id=[SERVICE_SYS_ID]
  fields: sys_id,name,description,category,department,agency,eligibility_criteria,regulatory_authority,processing_sla,service_level,active
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_service/{SERVICE_SYS_ID}?sysparm_fields=sys_id,name,description,category,department,agency,eligibility_criteria,regulatory_authority,processing_sla,service_level&sysparm_display_value=true
```

### Step 4: Check Eligibility Determinations

Retrieve eligibility assessment records and determination history.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_eligibility
  query: case=[CASE_SYS_ID]^ORDERBYDESCsys_created_on
  fields: sys_id,case,service,determination,determination_date,criteria_met,criteria_not_met,reviewed_by,appeal_status,expiration_date,notes
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_eligibility?sysparm_query=case=[CASE_SYS_ID]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,service,determination,determination_date,criteria_met,criteria_not_met,reviewed_by,appeal_status,expiration_date,notes&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Retrieve Case Tasks and Actions

Pull all tasks and action items associated with the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_task
  query: parent=[CASE_SYS_ID]^ORDERBYDESCsys_created_on
  fields: sys_id,number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at,due_date,task_type,agency
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_task?sysparm_query=parent=[CASE_SYS_ID]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,number,short_description,state,assigned_to,assignment_group,priority,opened_at,closed_at,due_date,task_type,agency&sysparm_limit=20&sysparm_display_value=true
```

### Step 6: Gather Interaction History

Retrieve all citizen interactions linked to the case.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: parent=[CASE_SYS_ID]^ORDERBYDESCopened_at
  fields: sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction,duration
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=parent=[CASE_SYS_ID]^ORDERBYDESCopened_at&sysparm_fields=sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,direction,duration&sysparm_limit=30&sysparm_display_value=true
```

### Step 7: Retrieve Work Notes and Audit Trail

Pull journal entries for case activity and compliance documentation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[CASE_SYS_ID]^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[CASE_SYS_ID]^element=work_notes^ORelement=comments^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,element,value,sys_created_on,sys_created_by&sysparm_limit=50
```

### Step 8: Build the Case Summary

Assemble all data into a structured government case summary:

```
=== GOVERNMENT CASE SUMMARY ===
Case Number: [number]
Status: [state] | Priority: [priority] | Type: [case_type]
Opened: [opened_at] | Due Date: [due_date]
Data Classification: [classification_level]

CITIZEN/CONSTITUENT:
Name: [contact_name]
Location: [city], [state] [zip]
Preferred Language: [preferred_language]
Contact Method: [preferred_contact_method]
Accessibility: [accessibility_needs]

SERVICE & PROGRAM:
Service: [service_name]
Program: [program_name]
Agency: [agency] | Department: [department]
Regulatory Authority: [regulatory_authority]

ELIGIBILITY STATUS:
Determination: [Eligible/Ineligible/Pending/Under Review]
Date: [determination_date] | Reviewed By: [reviewer]
Criteria Met: [list]
Criteria Not Met: [list]
Appeal Status: [if applicable]
Expiration: [expiration_date]

CASE DESCRIPTION:
[short_description]
[description - summarized]

TASKS: [total] total ([open] open, [closed] closed)
| # | Task | Type | Agency | Status | Due |
|---|------|------|--------|--------|-----|
| 1 | [description] | [type] | [agency] | [state] | [due] |

INTERACTIONS: [count] total
| Date | Channel | Direction | Summary |
|------|---------|-----------|---------|
| [date] | [channel] | [dir] | [description] |

INTER-AGENCY COORDINATION:
- [agency/dept]: [status of coordination]
- [agency/dept]: [status of coordination]

TIMELINE: (most recent first)
- [date] [user]: [activity summary]
- [date] [user]: [activity summary]

COMPLIANCE & REGULATORY:
- Applicable Regulations: [list]
- FOIA Considerations: [status]
- Privacy Act: [compliance status]
- Reporting Obligations: [deadlines]

PENDING ACTIONS:
1. [action required] - Due: [date] - Owner: [assignee]
2. [action required] - Due: [date] - Owner: [assignee]

SLA STATUS:
Processing SLA: [on-track/at-risk/breached]
Response Time: [within/exceeded] target
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language case search (e.g., "find open benefits cases in Region 5") |
| `SN-Query-Table` | Structured queries for cases, services, eligibility, and interactions |
| `SN-Get-Record` | Retrieve a single case or service record by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_psds_case` | GET | Government case records |
| `/api/now/table/sn_psds_service` | GET | Government service catalog |
| `/api/now/table/sn_psds_eligibility` | GET | Eligibility determinations |
| `/api/now/table/sn_psds_task` | GET | Case tasks and actions |
| `/api/now/table/interaction` | GET | Citizen interactions |
| `/api/now/table/sys_journal_field` | GET | Work notes and audit trail |
| `/api/now/table/customer_contact` | GET | Citizen contact details |

## Best Practices

- **Protect PII:** Never include Social Security numbers, full dates of birth, or other sensitive PII in summaries unless the recipient is authorized
- **Note data classification:** Always include the data classification level in the summary header
- **Track regulatory deadlines:** Government cases often have statutory response deadlines; highlight any approaching or missed deadlines
- **Document inter-agency handoffs:** When cases involve multiple agencies, clearly document which agency owns each action item
- **Preserve audit trail:** Government cases require complete audit trails; never summarize away critical decision points or determination rationale
- **Respect language preferences:** Note the citizen's preferred language and any translation services used during interactions
- **Include accessibility context:** Document any accessibility accommodations needed or provided
- **Note appeal rights:** When eligibility determinations are included, always reference the citizen's appeal rights and deadlines

## Troubleshooting

### "PSDS case table not found"

**Cause:** The PSDS plugin may not be installed, or the table name may differ in your instance.
**Solution:** Check for `sn_psds_case` or similar tables. Some government instances use custom case tables extending `sn_customerservice_case` or `task`. Verify the PSDS plugin (com.snc.psds) is active.

### "Eligibility records not linked to case"

**Cause:** Eligibility determinations may use a different reference field or be stored in a separate system.
**Solution:** Try querying `sn_psds_eligibility` by contact or service instead of case. Check if eligibility is tracked in custom fields on the case record itself.

### "Service catalog returns no results"

**Cause:** Government services may be organized differently or use a custom service catalog.
**Solution:** Check `sn_psds_service`, `sc_cat_item`, or custom service tables. Some implementations use the standard service catalog with government-specific categories.

### "Inter-agency tasks not visible"

**Cause:** Tasks assigned to other agencies may be in restricted scopes or have ACL limitations.
**Solution:** Verify your role grants cross-agency visibility. Check if inter-agency tasks use a separate task table or have agency-specific ACLs.

## Examples

### Example 1: Benefits Application Case Summary

**Scenario:** Caseworker reviews a housing assistance application case before a scheduled follow-up call with the applicant.

**Step 1 - Get case:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_case
  query: number=PSDS0045678
  fields: sys_id,number,short_description,state,priority,contact,service,program,eligibility_status,agency,due_date,data_classification
  limit: 1
```

**Generated Summary:**
```
CASE PSDS0045678 - BENEFITS APPLICATION
Status: In Progress | Priority: P2 | Classification: PII-Sensitive
Service: Housing Assistance Program
Agency: Dept. of Housing & Urban Development
Opened: Feb 28, 2026 | Due: Mar 28, 2026

CITIZEN:
Maria Gonzalez | Austin, TX 78745
Preferred Language: Spanish
Contact: Phone (preferred) | Accessibility: None noted

ELIGIBILITY: UNDER REVIEW
- Income verification: Pending (documents received Mar 10)
- Residency: Confirmed
- Household size: Verified (4 members)
- Prior assistance: None in last 24 months
Outstanding: Income documents need supervisor review

TASKS (3):
1. Income verification review - Assigned: J. Patel - Due: Mar 22
2. Property inspection scheduling - Pending - Due: Mar 25
3. Final determination letter - Not started - Due: Mar 28

INTERACTIONS: 4 total
- Mar 15: Phone (inbound) - Applicant provided pay stubs
- Mar 10: Portal - Document upload (W-2, pay stubs)
- Mar 5: Phone (outbound) - Requested additional documentation
- Feb 28: Walk-in - Initial application submitted

PENDING: Income verification must complete before property
inspection can be scheduled. Statutory 30-day deadline applies.
```

### Example 2: Multi-Agency Case Coordination Summary

**Scenario:** Supervisor reviews a complex case involving coordination between three government agencies.

```
CASE PSDS0046001 - INTER-AGENCY COORDINATION
Disaster Relief Application - Hurricane Recovery
Status: In Progress | Priority: P1 | Classification: PII-Sensitive
Lead Agency: FEMA Region VI
Opened: Mar 1, 2026 | Statutory Deadline: Apr 30, 2026

CITIZEN: James & Patricia Williams | Beaumont, TX 77701

AGENCY COORDINATION:
| Agency | Task | Status | Due |
|--------|------|--------|-----|
| FEMA | Damage assessment | Complete | Mar 10 |
| SBA | Disaster loan application | In Review | Mar 25 |
| HUD | Temporary housing voucher | Approved | Mar 15 |
| State OEM | Debris removal request | Scheduled | Mar 22 |

ELIGIBILITY: APPROVED (FEMA Individual Assistance)
Approved Amount: [REDACTED - authorized viewer only]
SBA Loan: Pending determination

COMPLIANCE NOTES:
- Stafford Act 30-day housing mandate: ON TRACK
- FOIA-exempt disaster assistance records (5 U.S.C. 552)
- Duplication of Benefits check: COMPLETE (no conflict)

CRITICAL PATH: SBA determination needed before permanent
housing placement can proceed.
```

## Related Skills

- `psds/chat-summarization` - Summarize public sector chat interactions
- `csm/case-summarization` - General case summarization techniques
- `reporting/sla-analysis` - SLA tracking and compliance reporting
- `security/audit-compliance` - Audit and compliance documentation
