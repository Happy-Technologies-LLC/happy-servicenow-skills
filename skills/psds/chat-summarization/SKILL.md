---
name: chat-summarization
version: 1.0.0
description: Summarize public sector chat interactions with citizen context, service delivery tracking, regulatory compliance notes, and structured handoff documentation
author: Happy Technologies LLC
tags: [psds, chat, summarization, public-sector, citizen, interaction, service-delivery]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
  rest:
    - /api/now/table/interaction
    - /api/now/table/sn_psds_case
    - /api/now/table/sn_psds_service
    - /api/now/table/sys_journal_field
    - /api/now/table/sys_email
    - /api/now/table/chat_queue_entry
  native:
    - Bash
complexity: intermediate
estimated_time: 5-15 minutes
---

# Chat Summarization

## Overview

This skill generates structured summaries of public sector chat interactions in ServiceNow. Government chat interactions require special handling for compliance documentation, citizen service tracking, language accessibility, and audit trail requirements that differ from standard commercial customer service.

Key capabilities:
- Summarize citizen chat conversations with key topics and outcomes documented
- Track service requests and referrals initiated during chat sessions
- Capture citizen sentiment and satisfaction indicators
- Document language and accessibility accommodations provided
- Generate handoff-ready summaries for case escalation or agency transfer
- Produce audit-compliant interaction records with timestamps and agent actions

**When to use:** When a government agent needs to summarize a completed chat session for case documentation, when transferring a citizen to another agent or agency, when supervisors review chat quality and compliance, or when generating interaction analytics for service improvement.

## Prerequisites

- **Roles:** `sn_psds_caseworker`, `sn_psds_supervisor`, `sn_psds_admin`, or `chat_agent`
- **Access:** Read access to `interaction`, `sn_psds_case`, `sn_psds_service`, `sys_journal_field`, and `chat_queue_entry` tables
- **Plugins:** Public Sector Digital Services (com.snc.psds) and Advanced Work Assignment or Agent Chat must be active
- **Context:** A valid interaction sys_id or case reference for the chat session

## Procedure

### Step 1: Retrieve Chat Interaction Record

Fetch the primary interaction record for the chat session.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: interaction
  sys_id: [INTERACTION_SYS_ID]
  fields: sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,assignment_group,parent,contact,contact_type,direction,duration,queue,transfer_count,abandon,wrap_up_code,disposition,close_notes
```

If searching for recent chats by agent:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: channel=chat^assigned_to=[AGENT_SYS_ID]^ORDERBYDESCopened_at
  fields: sys_id,number,channel,state,opened_at,closed_at,short_description,contact,parent,duration,transfer_count,disposition
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/interaction/{INTERACTION_SYS_ID}?sysparm_fields=sys_id,number,type,channel,state,opened_at,closed_at,short_description,assigned_to,assignment_group,parent,contact,contact_type,direction,duration,queue,transfer_count,disposition,close_notes&sysparm_display_value=true
```

### Step 2: Retrieve Chat Transcript and Messages

Pull the chat message history for the interaction.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[INTERACTION_SYS_ID]^element=comments^ORelement=work_notes^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_on,sys_created_by
  limit: 200
```

For live chat message entries:
```
Tool: SN-Query-Table
Parameters:
  table_name: chat_queue_entry
  query: interaction=[INTERACTION_SYS_ID]^ORDERBYsys_created_on
  fields: sys_id,message,sender,sys_created_on,type
  limit: 200
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[INTERACTION_SYS_ID]^element=comments^ORelement=work_notes^ORDERBYsys_created_on&sysparm_fields=element,value,sys_created_on,sys_created_by&sysparm_limit=200

GET /api/now/table/chat_queue_entry?sysparm_query=interaction=[INTERACTION_SYS_ID]^ORDERBYsys_created_on&sysparm_fields=message,sender,sys_created_on,type&sysparm_limit=200&sysparm_display_value=true
```

### Step 3: Retrieve Associated Case

Get the parent case that the chat interaction is linked to.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_psds_case
  sys_id: [PARENT_CASE_SYS_ID]
  fields: sys_id,number,short_description,state,priority,category,subcategory,contact,service,program,eligibility_status,agency,department,case_type,data_classification
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_case/{PARENT_CASE_SYS_ID}?sysparm_fields=sys_id,number,short_description,state,priority,category,service,program,eligibility_status,agency,department,case_type,data_classification&sysparm_display_value=true
```

### Step 4: Retrieve Citizen Context

Get the citizen's contact information and interaction history.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: customer_contact
  query: sys_id=[CONTACT_SYS_ID]
  fields: sys_id,name,email,phone,preferred_language,preferred_contact_method,accessibility_needs,city,state
  limit: 1
```

Get prior interaction count for context:
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: contact=[CONTACT_SYS_ID]^channel=chat^state=closed_complete^ORDERBYDESCclosed_at
  fields: number,short_description,opened_at,closed_at,disposition
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/customer_contact/{CONTACT_SYS_ID}?sysparm_fields=sys_id,name,email,phone,preferred_language,preferred_contact_method,accessibility_needs&sysparm_display_value=true

GET /api/now/table/interaction?sysparm_query=contact=[CONTACT_SYS_ID]^channel=chat^state=closed_complete^ORDERBYDESCclosed_at&sysparm_fields=number,short_description,opened_at,closed_at,disposition&sysparm_limit=5&sysparm_display_value=true
```

### Step 5: Retrieve Service Information

Get details about the government service discussed during the chat.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_psds_service
  query: sys_id=[SERVICE_SYS_ID]
  fields: sys_id,name,description,category,department,agency,eligibility_criteria,service_level
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_psds_service/{SERVICE_SYS_ID}?sysparm_fields=sys_id,name,description,category,department,agency,eligibility_criteria,service_level&sysparm_display_value=true
```

### Step 6: Check for Follow-up Actions

Identify any tasks, emails, or follow-up interactions created during the chat.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=[INTERACTION_SYS_ID]^ORinstanceLIKE[CASE_NUMBER]^ORDERBYDESCsys_created_on
  fields: sys_id,subject,type,recipients,sys_created_on
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=[INTERACTION_SYS_ID]^ORDERBYDESCsys_created_on&sysparm_fields=subject,type,recipients,sys_created_on&sysparm_limit=10&sysparm_display_value=true
```

### Step 7: Build the Chat Summary

Assemble the chat summary with public sector compliance context:

```
=== CHAT INTERACTION SUMMARY ===
Interaction: [number]
Channel: Chat | Status: [state]
Started: [opened_at] | Ended: [closed_at] | Duration: [duration]
Agent: [assigned_to] | Queue: [queue]
Transfers: [transfer_count] | Disposition: [disposition]

CITIZEN CONTEXT:
Name: [contact_name]
Location: [city], [state]
Language: [preferred_language]
Accessibility: [accessibility_needs]
Prior Chats: [count] (last: [date])

ASSOCIATED CASE:
Case: [case_number] - [short_description]
Status: [state] | Service: [service_name]
Agency: [agency] | Program: [program]

CONVERSATION SUMMARY:
Topic: [primary topic discussed]
Citizen Inquiry: [what the citizen asked about]
Information Provided: [key information shared with citizen]
Actions Taken: [actions performed during chat]
Outcome: [resolution or next steps agreed upon]

KEY TOPICS DISCUSSED:
1. [topic] - [outcome]
2. [topic] - [outcome]
3. [topic] - [outcome]

SERVICE DELIVERY:
- Service Requested: [service name]
- Eligibility Discussed: [yes/no - details]
- Referrals Made: [agency/department referrals]
- Documents Requested: [documentation needs]
- Follow-up Scheduled: [date/time if applicable]

CITIZEN SENTIMENT:
Initial Tone: [positive/neutral/frustrated]
Resolution Satisfaction: [satisfied/partially satisfied/unsatisfied]
Escalation Required: [yes/no]

COMPLIANCE NOTES:
- PII Exchanged: [yes/no - type]
- Identity Verified: [method used]
- Data Classification: [level]
- Disclosure Restrictions: [if any]

FOLLOW-UP ACTIONS:
1. [action] - Owner: [assignee] - Due: [date]
2. [action] - Owner: [assignee] - Due: [date]

AGENT WRAP-UP:
Wrap-up Code: [code]
Close Notes: [agent's closing remarks]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language search (e.g., "find today's chat interactions for benefits inquiries") |
| `SN-Query-Table` | Structured queries for interactions, cases, messages, and services |
| `SN-Get-Record` | Retrieve specific interaction or case records by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/interaction` | GET | Chat interaction records |
| `/api/now/table/sn_psds_case` | GET | Associated case details |
| `/api/now/table/sn_psds_service` | GET | Government service info |
| `/api/now/table/sys_journal_field` | GET | Chat messages and notes |
| `/api/now/table/chat_queue_entry` | GET | Live chat message log |
| `/api/now/table/sys_email` | GET | Follow-up emails sent |
| `/api/now/table/customer_contact` | GET | Citizen contact details |

## Best Practices

- **Redact PII in summaries:** Remove or mask sensitive personal information (SSN, full DOB, financial details) from chat summaries unless the recipient is authorized
- **Preserve exact timestamps:** Government audit requirements demand precise timestamps for all interactions and agent actions
- **Document language accommodations:** Note when translation services, bilingual agents, or simplified language was used
- **Track identity verification:** Record the method used to verify citizen identity during the chat
- **Note accessibility measures:** Document any accommodations provided (screen reader compatibility, large text, etc.)
- **Include referral details:** When citizens are referred to other agencies, document the referral with contact information and reference numbers
- **Capture citizen sentiment:** Note the citizen's emotional state and satisfaction level for quality assurance
- **Summarize, don't transcribe:** Produce concise summaries of chat content rather than full transcripts for operational use

## Troubleshooting

### "Chat messages not found in journal entries"

**Cause:** Chat messages may be stored in a dedicated chat table rather than sys_journal_field.
**Solution:** Check `chat_queue_entry`, `live_message`, or `sys_cs_message` tables. The storage location depends on the chat platform configuration (Agent Chat, Virtual Agent, or Connect Chat).

### "Interaction not linked to a case"

**Cause:** The chat may have been a general inquiry that did not result in case creation.
**Solution:** Check if the interaction has a `parent` field populated. If not, the chat was standalone. Generate the summary from the interaction record alone.

### "Contact record shows limited information"

**Cause:** The citizen may be an anonymous or unauthenticated user.
**Solution:** Check if the chat was initiated from a public-facing portal without authentication. Summarize with available information and note that identity was not verified.

### "Duration shows as zero"

**Cause:** The duration field may not auto-calculate, or the interaction was not properly closed.
**Solution:** Calculate duration from `opened_at` and `closed_at` timestamps. If `closed_at` is empty, the interaction may still be open or was abandoned.

## Examples

### Example 1: Benefits Inquiry Chat Summary

**Scenario:** Agent summarizes a completed chat about unemployment benefits eligibility.

**Step 1 - Get interaction:**
```
Tool: SN-Get-Record
Parameters:
  table_name: interaction
  sys_id: abc123def789
  fields: sys_id,number,channel,state,opened_at,closed_at,contact,parent,assigned_to,duration,disposition,transfer_count
```

**Generated Summary:**
```
CHAT SUMMARY - INT0078901
Channel: Chat | Duration: 18 minutes
Agent: Sarah Martinez | Transfers: 0
Date: Mar 19, 2026 10:15 - 10:33

CITIZEN: David Park | Sacramento, CA
Language: English | Prior Chats: 2

CASE: PSDS0051234 - Unemployment Benefits Application
Service: Employment Security - UI Benefits
Agency: Employment Development Department

CONVERSATION SUMMARY:
Topic: Unemployment insurance eligibility and application status
Citizen Inquiry: Asked about status of UI claim filed Feb 15
  and why payments have not been received.
Information Provided:
- Claim is in adjudication due to employer wage dispute
- Estimated timeline: 2-3 weeks for adjudication
- Citizen can continue to certify weekly while pending
Actions Taken:
- Verified identity via case number and DOB
- Escalated wage dispute documentation to adjudication unit
- Sent confirmation email with reference number

SERVICE DELIVERY:
- Referral: Adjudication Unit (internal escalation)
- Documents Requested: Final pay stub, termination letter
- Follow-up: Automated status update in 7 business days

CITIZEN SENTIMENT:
Initial: Frustrated (no payments for 4 weeks)
Resolution: Partially satisfied (timeline provided, escalated)

FOLLOW-UP ACTIONS:
1. Adjudication unit review - Due: Apr 2, 2026
2. Automated status notification - Scheduled: Mar 26, 2026
```

### Example 2: Multi-Topic Service Inquiry Chat

**Scenario:** Citizen contacts government portal about multiple services in a single chat session.

```
CHAT SUMMARY - INT0079015
Channel: Chat | Duration: 32 minutes
Agent: James Chen | Transfers: 1 (to Housing Dept)
Date: Mar 19, 2026 14:05 - 14:37

CITIZEN: Rosa Martinez | Houston, TX
Language: Spanish (bilingual agent used)
Accessibility: None noted | Prior Chats: 0 (first contact)

CONVERSATION SUMMARY:
Topic 1: Property tax exemption inquiry
- Explained homestead exemption eligibility criteria
- Directed to county tax assessor portal for application
- Provided deadline: April 30, 2026

Topic 2: Emergency housing assistance
- Transferred to Housing Department specialist (14:22)
- Citizen qualified for preliminary screening
- New case created: PSDS0051301

Topic 3: SNAP benefits renewal
- Confirmed renewal deadline: April 15, 2026
- Explained online renewal process via state portal
- Emailed renewal checklist to citizen

SERVICE DELIVERY:
- 3 services discussed across 2 departments
- 1 case created (housing assistance)
- 1 transfer (Housing Department)
- 2 referrals (tax assessor, SNAP portal)

COMPLIANCE:
- Identity verified via case lookup
- PII exchanged: Address, household size
- Spanish language accommodation provided
- All referral links sent via secure chat

FOLLOW-UP:
1. Housing case PSDS0051301 - screening appointment TBD
2. SNAP renewal reminder - automated Mar 31
```

## Related Skills

- `psds/government-case-summarization` - Full government case summaries
- `csm/chat-recommendation` - Chat response recommendations
- `csm/case-summarization` - General case summarization
- `csm/sentiment-analysis` - Customer sentiment analysis
