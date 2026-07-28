---
name: document-screening
version: 1.0.0
description: Screen inbound documents for completeness, policy risk, and routing readiness before extraction or case workflows
author: Happy Technologies LLC
tags: [document, screening, intake, triage, compliance, routing, risk]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Create-Record
    - SN-Update-Record
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/sys_attachment
    - /api/now/table/sn_doc_template
    - /api/now/table/sn_doc_intelligence_extraction
    - /api/now/table/sn_doc_intelligence_extraction_result
    - /api/now/table/task
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# Document Screening

## Overview

This skill adds a document screening stage before extraction or fulfillment workflows in ServiceNow®. It helps teams:

- Validate document completeness and format readiness
- Identify policy-sensitive or high-risk submissions early
- Route documents to automated extraction or human review lanes
- Record auditable screening rationale in work notes

Use this when your intake process receives mixed document quality, high volume, or compliance-sensitive content.

## Prerequisites

- **Roles:** `admin`, `sn_doc_intelligence_admin`, or equivalent intake operations role
- **Plugins:** Document Intelligence app enabled where extraction is required
- **Access:** Read/write access to `sys_attachment`, `sn_doc_template`, `sn_doc_intelligence_extraction`, and `task`
- **Inputs:** Defined screening rules (required fields, prohibited content, confidence thresholds)

## Procedure

### Step 1: Build the Intake Queue

Collect newly submitted documents and classify by source, type, and priority.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_attachment
  query: sys_created_on>=javascript:gs.hoursAgoStart(24)^table_nameISNOTEMPTY
  fields: sys_id,file_name,content_type,size_bytes,table_name,table_sys_id,sys_created_on,sys_created_by
  limit: 100
  order_by: sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/sys_attachment?sysparm_query=sys_created_on>=javascript:gs.hoursAgoStart(24)^table_nameISNOTEMPTY&sysparm_fields=sys_id,file_name,content_type,size_bytes,table_name,table_sys_id,sys_created_on,sys_created_by&sysparm_limit=100
```

### Step 2: Match to Screening Template

Map each document to a known template and required evidence checklist.

Decision points:
- If template exists and is active -> continue to automated screening
- If template missing -> create review task for template owner
- If unsupported format -> route to manual conversion queue

### Step 3: Run Screening Checks

Evaluate required attributes and extraction confidence signals.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_doc_intelligence_extraction_result
  query: extraction=[extraction_sys_id]
  fields: field_name,extracted_value,confidence_score,validation_status
  limit: 200
```

Checks to apply:
- Required field presence
- Minimum confidence threshold (for example 0.85)
- Prohibited content indicators (policy-defined)
- Duplicate submission checks by hash or metadata fingerprint

### Step 4: Assign Screening Outcome

Set one of three outcomes:
- **Pass:** Continue to extraction-to-record workflow
- **Conditional Pass:** Continue with mandatory human verification
- **Fail:** Route for remediation and return requester guidance

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: task
  fields:
    short_description: "Document screening failed: missing required evidence"
    description: "File [file_name] failed screening checks. Review checklist and resubmit."
    priority: 3
    state: 1
```

### Step 5: Record Audit Notes and Next Action

Document the screening rationale and the exact routing decision.

## Tool Usage

| Tool | Purpose |
|---|---|
| `SN-Query-Table` | Retrieve attachments, templates, and extraction results |
| `SN-Get-Record` | Inspect source record context for submitted documents |
| `SN-Create-Record` | Create remediation tasks for failed screenings |
| `SN-Update-Record` | Update screening status and routing fields |
| `SN-Add-Work-Notes` | Persist decision rationale for auditability |

## Best Practices

- Keep screening criteria versioned and tied to document type
- Treat confidence thresholds as policy controls, not hardcoded assumptions
- Separate business validation failures from technical OCR/extraction failures
- Capture decision evidence to support audit and dispute handling
- Periodically review false positives and false negatives to refine rules

## Troubleshooting

### Screening Queue Is Empty

**Symptom:** No documents appear in intake query.  
**Cause:** Time-window filter or source table filter is too restrictive.  
**Solution:** Broaden query window and verify attachment source integration.

### High False Failure Rate

**Symptom:** Most documents route to fail or conditional pass.  
**Cause:** Confidence threshold or required field set is misaligned with real inputs.  
**Solution:** Tune thresholds by document type and add exception handling rules.

## Related Skills

- `document/document-extraction` - Extract structured data from documents
- `document/smart-documents` - Manage document templates and generation
- `procurement/invoice-management` - Apply screened invoice documents to AP workflows

## References

- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/government-industry/psds-ai-skill-doc-screening.md>
- <https://github.com/ServiceNow/ServiceNowDocs/blob/australia/markdown/intelligent-experiences/ai-products.md>
