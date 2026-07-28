---
name: smart-documents
version: 1.0.1
description: Manage smart documents with version control, approval workflows, automated content generation, document templates, merge fields, and distribution
author: Happy Technologies LLC
tags: [document, smart-documents, templates, version-control, approval, merge-fields, distribution, generation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Create-Record
  rest:
    - /api/now/table/sn_doc_management
    - /api/now/table/sn_doc_template
    - /api/now/table/sys_attachment
    - /api/now/table/sn_doc_version
    - /api/now/table/sn_doc_approval
    - /api/now/table/sn_doc_distribution
    - /api/now/table/sn_doc_merge_field
    - /api/now/table/sysapproval_approver
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Smart Documents

## Overview

This skill provides a structured approach to managing smart documents in ServiceNow Document Intelligence. It helps you:

- Create and manage document records in `sn_doc_management` with full lifecycle tracking
- Configure document templates in `sn_doc_template` with reusable structures for common document types
- Implement version control using `sn_doc_version` to track document revisions and maintain audit history
- Set up approval workflows via `sn_doc_approval` and `sysapproval_approver` for document review and sign-off
- Define merge fields in `sn_doc_merge_field` for automated content generation from ServiceNow data
- Manage document distribution through `sn_doc_distribution` for controlled sharing and delivery

**When to use:** When creating standardized documents (policies, SOPs, contracts, compliance reports), when documents require version control and approval before publication, or when generating documents with dynamic data from ServiceNow records.

**Plugin required:** `com.sn_doc_intelligence`

## Prerequisites

- **Roles:** `sn_doc_management_admin`, `sn_doc_management_user`, `document_management`, or `admin`
- **Access:** Read/write access to `sn_doc_management`, `sn_doc_template`, `sn_doc_version`, `sn_doc_approval`, and `sys_attachment` tables
- **Knowledge:** Understanding of your organization's document governance policies, approval hierarchies, and distribution requirements
- **Plugin:** Document Intelligence (`com.sn_doc_intelligence`) must be activated

## Procedure

### Step 1: Create or Select a Document Template

Templates define the structure, merge fields, and default content for each document type.

**Query existing templates:**

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_template
  query: active=true^document_typeLIKEpolicy^ORdocument_typeLIKEcontract^ORdocument_typeLIKEreport
  fields: sys_id,name,description,document_type,category,version,state,merge_field_count,approval_required
  limit: 25
  order_by: name
```

**Using REST API:**
```bash
GET /api/now/table/sn_doc_template?sysparm_query=active=true^ORDERBYname&sysparm_fields=sys_id,name,description,document_type,category,version,state,merge_field_count,approval_required&sysparm_limit=25&sysparm_display_value=true
```

**Create a new template:**

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_template
  fields:
    name: "IT Security Policy Template"
    description: "Standard template for IT security policies with approval workflow. Includes merge fields for department, effective date, and policy owner."
    document_type: policy
    category: information_security
    approval_required: true
    approval_group: [security_governance_group_sys_id]
    version: "1.0"
    state: draft
    active: true
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_template
Content-Type: application/json

{
  "name": "IT Security Policy Template",
  "description": "Standard template for IT security policies with approval workflow",
  "document_type": "policy",
  "category": "information_security",
  "approval_required": "true",
  "approval_group": "[security_governance_group_sys_id]",
  "version": "1.0",
  "state": "draft",
  "active": "true"
}
```

### Step 2: Define Merge Fields

Configure merge fields that pull dynamic data from ServiceNow records into the document.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_merge_field
  fields:
    template: [template_sys_id]
    field_name: "department_name"
    display_label: "Department Name"
    source_table: cmn_department
    source_field: name
    placeholder: "{{department_name}}"
    field_type: reference
    required: true
    order: 100
```

Common merge fields by document type:

| Document Type | Merge Field | Source Table | Source Field | Placeholder |
|--------------|-------------|-------------|-------------|-------------|
| Policy | Department | `cmn_department` | `name` | `{{department_name}}` |
| Policy | Effective Date | (manual) | (date) | `{{effective_date}}` |
| Policy | Policy Owner | `sys_user` | `name` | `{{policy_owner}}` |
| Policy | Review Date | (calculated) | (date) | `{{next_review_date}}` |
| Contract | Vendor Name | `core_company` | `name` | `{{vendor_name}}` |
| Contract | Contract Value | `ast_contract` | `total_cost` | `{{contract_value}}` |
| Contract | Start Date | `ast_contract` | `starts` | `{{start_date}}` |
| Contract | End Date | `ast_contract` | `ends` | `{{end_date}}` |
| Report | Report Period | (manual) | (string) | `{{report_period}}` |
| Report | Author | `sys_user` | `name` | `{{author_name}}` |
| Report | Generated Date | (system) | (datetime) | `{{generated_date}}` |

**Using REST API:**
```bash
POST /api/now/table/sn_doc_merge_field
Content-Type: application/json

{
  "template": "[template_sys_id]",
  "field_name": "department_name",
  "display_label": "Department Name",
  "source_table": "cmn_department",
  "source_field": "name",
  "placeholder": "{{department_name}}",
  "field_type": "reference",
  "required": "true",
  "order": "100"
}
```

### Step 3: Create a Document from Template

Generate a new document instance from the template, populating merge fields with actual data.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_management
  fields:
    short_description: "IT Security Policy - Remote Access - Engineering Department"
    template: [template_sys_id]
    document_type: policy
    category: information_security
    department: [department_sys_id]
    owner: [policy_owner_sys_id]
    effective_date: "2026-04-01"
    review_date: "2027-04-01"
    state: draft
    version: "1.0"
    confidentiality: internal
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_management
Content-Type: application/json

{
  "short_description": "IT Security Policy - Remote Access - Engineering Department",
  "template": "[template_sys_id]",
  "document_type": "policy",
  "category": "information_security",
  "department": "[department_sys_id]",
  "owner": "[policy_owner_sys_id]",
  "effective_date": "2026-04-01",
  "review_date": "2027-04-01",
  "state": "draft",
  "version": "1.0",
  "confidentiality": "internal"
}
```

### Step 4: Manage Document Versions

Track revisions and maintain version history.

**Create a new version when editing:**

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_version
  fields:
    document: [document_sys_id]
    version_number: "1.1"
    change_description: "Updated remote access VPN requirements per security audit findings. Added MFA requirement for all remote connections."
    author: [editor_sys_id]
    state: draft
    previous_version: [previous_version_sys_id]
    attachment: [updated_attachment_sys_id]
```

**Query version history:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_version
  query: document=[document_sys_id]
  fields: sys_id,version_number,change_description,author,state,sys_created_on,attachment,previous_version
  limit: 20
  order_by: -sys_created_on
```

**Using REST API:**
```bash
# Create new version
POST /api/now/table/sn_doc_version
Content-Type: application/json

{
  "document": "[document_sys_id]",
  "version_number": "1.1",
  "change_description": "Updated remote access VPN requirements",
  "author": "[editor_sys_id]",
  "state": "draft",
  "previous_version": "[previous_version_sys_id]"
}

# Get version history
GET /api/now/table/sn_doc_version?sysparm_query=document=[document_sys_id]^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,version_number,change_description,author,state,sys_created_on&sysparm_limit=20&sysparm_display_value=true
```

### Step 5: Submit for Approval

Route the document through the configured approval workflow.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_approval
  fields:
    document: [document_sys_id]
    document_version: [version_sys_id]
    approval_type: sequential
    state: requested
    short_description: "Approval required: IT Security Policy v1.1 - Remote Access"
    comments: "Updated policy requires approval from Security Governance and CISO before publication."
```

Then create individual approver records:
```
Tool: SN-Create-Record
Parameters:
  table_name: sysapproval_approver
  fields:
    sysapproval: [approval_sys_id]
    approver: [approver_sys_id]
    state: requested
    order: 100
    comments: "Please review the updated remote access policy. Key changes: MFA requirement added for all VPN connections."
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_approval
Content-Type: application/json

{
  "document": "[document_sys_id]",
  "document_version": "[version_sys_id]",
  "approval_type": "sequential",
  "state": "requested",
  "short_description": "Approval required: IT Security Policy v1.1"
}
```

**Monitor approval status:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sysapproval_approver
  query: sysapproval=[approval_sys_id]
  fields: sys_id,approver,state,comments,sys_updated_on,order
  limit: 10
  order_by: order
```

### Step 6: Publish and Update Document State

After approval, publish the document and update its state.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_doc_management
  sys_id: [document_sys_id]
  data:
    state: published
    version: "1.1"
    published_date: "2026-03-19"
    work_notes: "Document approved by Security Governance (2026-03-17) and CISO (2026-03-19). Published as version 1.1."
```

Update the version record:
```
Tool: SN-Update-Record
Parameters:
  table_name: sn_doc_version
  sys_id: [version_sys_id]
  data:
    state: published
```

**Using REST API:**
```bash
PATCH /api/now/table/sn_doc_management/[document_sys_id]
Content-Type: application/json

{
  "state": "published",
  "version": "1.1",
  "published_date": "2026-03-19",
  "work_notes": "Approved and published as version 1.1."
}
```

### Step 7: Configure Document Distribution

Set up controlled distribution to ensure the right audiences receive the document.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_distribution
  fields:
    document: [document_sys_id]
    distribution_type: group
    recipient_group: [engineering_group_sys_id]
    delivery_method: email_notification
    notify_on_update: true
    acknowledgment_required: true
    acknowledgment_deadline: "2026-04-15"
    short_description: "Distribute IT Security Policy v1.1 to Engineering"
```

**Using REST API:**
```bash
POST /api/now/table/sn_doc_distribution
Content-Type: application/json

{
  "document": "[document_sys_id]",
  "distribution_type": "group",
  "recipient_group": "[engineering_group_sys_id]",
  "delivery_method": "email_notification",
  "notify_on_update": "true",
  "acknowledgment_required": "true",
  "acknowledgment_deadline": "2026-04-15"
}
```

**Track acknowledgments:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_distribution
  query: document=[document_sys_id]
  fields: sys_id,recipient_group,recipient_user,delivery_method,acknowledged,acknowledged_date,acknowledgment_deadline
  limit: 50
```

### Step 8: Monitor Document Lifecycle

Track documents approaching review dates or requiring updates.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_management
  query: state=published^review_date<=javascript:gs.daysAgoEnd(-30)^review_date>=javascript:gs.beginningOfToday()
  fields: sys_id,number,short_description,document_type,owner,review_date,version,department
  limit: 25
  order_by: review_date
```

**Using REST API:**
```bash
GET /api/now/table/sn_doc_management?sysparm_query=state=published^review_dateBETWEENjavascript:gs.beginningOfToday()@javascript:gs.daysAgoEnd(-30)^ORDERBYreview_date&sysparm_fields=sys_id,number,short_description,document_type,owner,review_date,version,department&sysparm_limit=25&sysparm_display_value=true
```

**Generate a lifecycle report:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: sn_doc_management
  sys_id: [document_sys_id]
  work_notes: |
    === DOCUMENT LIFECYCLE STATUS ===
    Document: [number] - [short_description]
    Current Version: [version]
    State: Published
    Owner: [owner]

    VERSION HISTORY:
    - v1.0 (2026-01-15) - Initial publication
    - v1.1 (2026-03-19) - Updated MFA requirements

    APPROVAL HISTORY:
    - v1.0: Approved by Security Governance (2026-01-12), CISO (2026-01-14)
    - v1.1: Approved by Security Governance (2026-03-17), CISO (2026-03-19)

    DISTRIBUTION:
    - Engineering: 45/50 acknowledged (90%)
    - IT Operations: 28/30 acknowledged (93%)
    - Outstanding: 7 users past deadline

    NEXT REVIEW: 2027-04-01 (378 days)
    ACTION: Schedule review kickoff for 2027-02-01
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Find documents by description or content keywords |
| `SN-Query-Table` | Query documents, templates, versions, approvals, distributions |
| `SN-Get-Record` | Retrieve a specific document or template record |
| `SN-Create-Record` | Create documents, versions, approvals, distributions, merge fields |
| `SN-Update-Record` | Update document state, publish, archive |
| `SN-Add-Work-Notes` | Document lifecycle events and review notes |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_doc_management` | GET/POST/PATCH | Manage document records |
| `/api/now/table/sn_doc_template` | GET/POST | Manage document templates |
| `/api/now/table/sn_doc_version` | GET/POST/PATCH | Track document versions |
| `/api/now/table/sn_doc_approval` | GET/POST | Manage document approvals |
| `/api/now/table/sn_doc_distribution` | GET/POST | Manage distribution lists |
| `/api/now/table/sn_doc_merge_field` | GET/POST | Configure merge fields |
| `/api/now/table/sysapproval_approver` | GET/POST | Manage individual approvers |
| `/api/now/table/sys_attachment` | GET | Access document file attachments |

## Best Practices

- **Template governance:** Maintain a central library of approved templates; restrict template creation to document management administrators
- **Version discipline:** Never overwrite a published version; always create a new version record to preserve audit trail
- **Meaningful change descriptions:** Every version must include a clear description of what changed and why, not just "updated document"
- **Approval before distribution:** Never distribute a document that has not completed its approval workflow
- **Acknowledgment tracking:** For compliance-critical documents (policies, procedures), require acknowledgment and track completion rates
- **Review cadence:** Set review dates based on document type: policies annually, procedures semi-annually, standards quarterly
- **Confidentiality classification:** Tag every document with a confidentiality level (public, internal, confidential, restricted) to control access
- **Merge field validation:** Test all merge fields with sample data before publishing a template to ensure proper rendering

## Troubleshooting

### "Template merge fields not populating"

**Cause:** Merge field placeholders in the document content do not match the configured `placeholder` values in `sn_doc_merge_field`
**Solution:** Verify that placeholders use exact matching syntax (e.g., `{{department_name}}`). Check for extra spaces or encoding issues. Query `sn_doc_merge_field` with `template=[template_sys_id]` to confirm field configurations.

### "Approval workflow not triggering"

**Cause:** The template's `approval_required` flag is not set, or no approval group is configured
**Solution:** Verify the template has `approval_required=true` and a valid `approval_group`. Check that the approval group has active members with the `approver_user` role.

### "Document version conflict"

**Cause:** Two users editing the same document simultaneously, or a version was created without locking the previous version
**Solution:** Query `sn_doc_version` for the document to identify competing drafts. Implement a checkout/lock mechanism using the document `state` field (set to `checked_out` when editing).

### "Distribution notification not sent"

**Cause:** Email notification configuration is missing or the recipient group has no email-enabled members
**Solution:** Verify the notification template exists in `sysevent_email_action` with event name matching the distribution trigger. Check that recipients have valid email addresses in their `sys_user` records.

### "Cannot find document attachments"

**Cause:** Attachments may be linked to the version record rather than the document record
**Solution:** Query `sys_attachment` with both `table_name=sn_doc_management^table_sys_id=[doc_sys_id]` and `table_name=sn_doc_version^table_sys_id=[version_sys_id]` to find all related files.

## Examples

### Example 1: Create and Publish a Security Policy

**Input:** "Create a new data classification policy for the Finance department"

**Process:**
1. Select template: "IT Security Policy Template"
2. Create document with merge fields: Department=Finance, Owner=CISO, Effective=2026-04-01
3. Upload draft content as attachment
4. Create version 1.0
5. Submit for approval: Security Governance then CISO
6. After approval, publish and distribute to Finance department
7. Require acknowledgment within 30 days

### Example 2: Update an Existing Procedure Document

**Input:** "Update the incident response procedure to include ransomware playbook"

**Process:**
```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_version
  fields:
    document: [ir_procedure_sys_id]
    version_number: "3.2"
    change_description: "Added ransomware response playbook (Section 7). Updated escalation matrix to include Cyber Insurance carrier notification. Revised recovery time objectives per 2026 BCP update."
    author: [security_analyst_sys_id]
    state: draft
    previous_version: [v31_sys_id]
```

### Example 3: Automated Contract Document Generation

**Input:** "Generate an NDA document from template for vendor onboarding"

**Process:**
1. Select template: "Mutual NDA Template"
2. Populate merge fields from `core_company` and `sys_user`:
   - `{{vendor_name}}`: "TechPartners Inc"
   - `{{vendor_address}}`: "123 Innovation Blvd, Austin, TX"
   - `{{effective_date}}`: "2026-03-19"
   - `{{term_length}}`: "2 years"
   - `{{company_signatory}}`: "Jane Smith, VP Legal"
3. Generate document, create version 1.0
4. Route for legal approval
5. After approval, distribute to vendor via secure link

```
Tool: SN-Create-Record
Parameters:
  table_name: sn_doc_management
  fields:
    short_description: "Mutual NDA - TechPartners Inc - Vendor Onboarding"
    template: [nda_template_sys_id]
    document_type: contract
    category: nda
    state: draft
    version: "1.0"
    confidentiality: confidential
    related_record_table: core_company
    related_record: [vendor_sys_id]
```

## Related Skills

- `document/document-extraction` - Extract structured data from uploaded documents
- `legal/contract-analysis` - Analyze generated contract documents for risk
- `legal/contract-obligation-extraction` - Extract obligations from contract documents
- `catalog/approval-workflows` - Configure approval workflows for document processes
- `admin/workflow-creation` - Build custom document lifecycle workflows
