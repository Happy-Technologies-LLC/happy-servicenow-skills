---
name: chat-summarization-va
version: 1.0.1
description: Summarize virtual agent chat sessions with topic classification, resolution status, handoff context, and actionable insights for agent productivity
author: Happy Technologies LLC
tags: [genai, virtual-agent, chat, summarization, topic-classification, handoff, conversation]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/sys_cs_topic
    - /api/now/table/sys_cs_conversation
    - /api/now/table/sys_cb_topic
    - /api/now/table/sys_cb_action
    - /api/now/table/sys_cs_message
    - /api/now/table/sys_cs_context_entry
    - /api/now/table/interaction
  native:
    - Bash
complexity: intermediate
estimated_time: 10-25 minutes
---

# Chat Summarization - Virtual Agent

## Overview

This skill generates concise, structured summaries of virtual agent chat sessions to improve agent handoff quality, enable trend analysis, and create audit trails. Each summary includes topic classification, resolution status, captured data, and handoff context.

- Extract key information from virtual agent conversation transcripts
- Classify conversations by topic, intent, and outcome
- Determine resolution status: self-served, escalated, abandoned, or unresolved
- Build handoff context packages for seamless live agent takeover
- Identify captured slots and missing information for follow-up
- Generate batch summaries for trend reporting and quality analysis

**When to use:** When live agents need quick context on escalated chats, when management needs conversation analytics, or when building audit trails for virtual agent interactions.

## Prerequisites

- **Roles:** `admin`, `va_admin`, `itil`, or `conversation_designer`
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.glide.interaction` (Agent Workspace)
- **Access:** Read on `sys_cs_conversation`, `sys_cs_message`, `sys_cs_topic`, `sys_cb_topic`, `sys_cb_action`, `sys_cs_context_entry`
- **Knowledge:** Familiarity with your Virtual Agent topic catalog and escalation paths
- **Data:** Active virtual agent deployment with conversation history

## Procedure

### Step 1: Select Conversations for Summarization

Query conversations by status, date range, or topic.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: sys_created_onONLast 24 hours@javascript:gs.daysAgoStart(1)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,topic,state,channel,opened_at,closed_at,close_reason,user,queue_time,handle_time,assigned_to
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_conversation?sysparm_query=sys_created_onONLast 24 hours@javascript:gs.daysAgoStart(1)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,topic,state,channel,opened_at,closed_at,close_reason,user,queue_time,handle_time,assigned_to&sysparm_limit=50
```

For escalated conversations specifically:
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: close_reason=escalated^sys_created_onONLast 24 hours@javascript:gs.daysAgoStart(1)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,topic,state,channel,opened_at,closed_at,close_reason,user
  limit: 50
```

### Step 2: Retrieve Full Message History

Get all messages for the conversation in chronological order.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_message
  query: conversation=[conversation_sys_id]^ORDERBYsys_created_on
  fields: sys_id,body,type,sender_type,sys_created_on,is_hidden,formatted_body
  limit: 200
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_message?sysparm_query=conversation=[conversation_sys_id]^ORDERBYsys_created_on&sysparm_fields=sys_id,body,type,sender_type,sys_created_on,is_hidden,formatted_body&sysparm_limit=200
```

### Step 3: Extract Context and Captured Data

Retrieve all context entries (slot values) captured during the conversation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_context_entry
  query: conversation=[conversation_sys_id]
  fields: sys_id,name,value,source
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_context_entry?sysparm_query=conversation=[conversation_sys_id]&sysparm_fields=sys_id,name,value,source&sysparm_limit=50
```

### Step 4: Identify Topic and Intent

Map the conversation to its designed topic and determine user intent.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cb_topic
  query: sys_id=[topic_sys_id]
  fields: sys_id,name,description,goal,category
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sys_cb_topic?sysparm_query=sys_id=[topic_sys_id]&sysparm_fields=sys_id,name,description,goal,category&sysparm_limit=1
```

Classify the conversation outcome:

| Outcome | Criteria | Code |
|---------|----------|------|
| Self-served | User issue resolved by bot without escalation | SS |
| Escalated - Requested | User explicitly asked for a live agent | ER |
| Escalated - Automated | Bot could not handle request, auto-escalated | EA |
| Abandoned | User left conversation before resolution | AB |
| Unresolved | Conversation closed without clear resolution | UR |

### Step 5: Generate the Summary

Build a structured summary with the following template:

```
=== CHAT SESSION SUMMARY ===
Conversation: [number]
Date: [opened_at] - [closed_at]
Duration: [handle_time]
Channel: [channel]
User: [user display_value]

TOPIC & INTENT:
  Topic: [topic name]
  Primary Intent: [extracted user intent]
  Secondary Intents: [any topic switches during conversation]

CONVERSATION FLOW:
  1. [User initiated with: brief description of first message]
  2. [Bot identified topic: topic name]
  3. [Data collection: list of slots captured]
  4. [Resolution attempt: what the bot tried]
  5. [Outcome: resolution or escalation point]

CAPTURED DATA:
  - [slot_name]: [value]
  - [slot_name]: [value]
  - [slot_name]: [value]

MISSING DATA:
  - [required slot not captured]

RESOLUTION STATUS: [Self-Served | Escalated | Abandoned | Unresolved]
RESOLUTION DETAIL: [Brief description of how it was resolved or why it was not]

HANDOFF CONTEXT (if escalated):
  Issue: [concise problem statement]
  What was tried: [bot actions taken]
  What is needed: [next steps for live agent]
  Sentiment: [user sentiment at handoff point]

KEY QUOTES:
  - User: "[most relevant user statement]"
  - User: "[any frustration or clarification]"
```

### Step 6: Check for Related Records

Identify any incidents, requests, or interactions created from this conversation.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: interaction
  query: conversation=[conversation_sys_id]
  fields: sys_id,number,type,state,assigned_to,opened_at
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/interaction?sysparm_query=conversation=[conversation_sys_id]&sysparm_fields=sys_id,number,type,state,assigned_to,opened_at&sysparm_limit=5
```

### Step 7: Store the Summary

Write the summary to the conversation record or a related work note.

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: sys_cs_conversation
  sys_id: [conversation_sys_id]
  data:
    work_notes: "[generated summary]"
```

**Using REST API:**
```bash
PATCH /api/now/table/sys_cs_conversation/{sys_id}
Content-Type: application/json

{
  "work_notes": "[generated summary]"
}
```

### Step 8: Generate Batch Analytics

Summarize patterns across multiple conversations for reporting:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,topic,close_reason,handle_time,queue_time
  limit: 500
```

Produce aggregate metrics:

| Metric | Value | Trend |
|--------|-------|-------|
| Total conversations | 487 | +12% WoW |
| Self-service rate | 62% | +3% WoW |
| Escalation rate | 24% | -2% WoW |
| Abandonment rate | 14% | -1% WoW |
| Avg handle time | 4.2 min | -0.3 min WoW |
| Top escalation topic | VPN Issues | 31 escalations |

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Query-Table` | Retrieve conversations, messages, context, topics | Core data gathering |
| `SN-Natural-Language-Search` | Find conversations by natural language criteria | Ad-hoc investigation |
| `SN-Update-Record` | Store summaries on conversation records | Persisting results |
| `SN-Add-Work-Notes` | Document summaries as work notes | Audit trail |
| `SN-Get-Table-Schema` | Discover conversation table structures | Setup and exploration |

## Best Practices

1. **Summarize at escalation** -- generate summaries immediately when a conversation is escalated for fastest agent handoff
2. **Keep summaries concise** -- aim for 10-15 lines maximum; agents need quick context, not transcripts
3. **Highlight missing data** -- explicitly call out required slots not captured so the agent knows what to ask
4. **Include user sentiment** -- note frustration, urgency, or confusion to help agents calibrate their approach
5. **Exclude hidden messages** -- filter out `is_hidden=true` messages as they contain system-internal data
6. **Batch summarize daily** -- run aggregate summaries for trend reporting and topic optimization
7. **Preserve original transcripts** -- summaries complement but never replace the full message history
8. **Tag summaries consistently** -- use standard outcome codes (SS, ER, EA, AB, UR) for reliable analytics

## Troubleshooting

### "Conversation has no messages"

**Cause:** User connected but never sent a message, or messages are in a linked table
**Solution:** Check `sys_cs_message` with the conversation sys_id. If empty, classify as abandoned and note "No user messages recorded."

### "Topic field is empty on conversation"

**Cause:** User disconnected before intent was matched, or the conversation used a fallback flow
**Solution:** Attempt to infer topic from the first few user messages. Classify as "Unmatched Intent" if no topic is identifiable.

### "Context entries do not match expected slots"

**Cause:** Topic design was updated after the conversation occurred, or slots were captured under different names
**Solution:** Cross-reference with the topic version active at conversation time. Use `sys_cs_context_entry.source` to trace slot origin.

### "Summary is too long for work_notes field"

**Cause:** Conversation had many turns and the summary exceeds field limits
**Solution:** Truncate to key sections: Topic, Resolution Status, Handoff Context. Store the full summary as an attachment if needed.

## Examples

### Example 1: Self-Served Password Reset

**Conversation:** CS0089001 - 6 turns, 2.1 minutes

**Summary:**
```
Topic: Password Reset | Status: SELF-SERVED
User requested password reset for corporate account. Bot verified identity
via security questions (3/3 correct), sent reset link to registered email.
User confirmed receipt and successful reset.
Captured: username=jsmith, email=jsmith@company.com, verification=passed
No missing data. No escalation needed.
```

### Example 2: Escalated Software Installation

**Conversation:** CS0089002 - 14 turns, 8.3 minutes

**Summary:**
```
Topic: Software Request | Status: ESCALATED (User Requested)
User requested installation of Adobe Creative Suite. Bot collected
justification and manager approval details but user asked for live agent
after bot could not confirm license availability.
Captured: software=Adobe Creative Suite, justification=marketing deliverables,
manager=Jane Doe
Missing: cost_center, license_type
Handoff Context: User needs license availability check. Sentiment: mildly frustrated.
```

### Example 3: Abandoned HR Inquiry

**Conversation:** CS0089003 - 3 turns, 0.8 minutes

**Summary:**
```
Topic: PTO Balance | Status: ABANDONED
User asked about remaining PTO balance. Bot requested employee ID for
lookup. User did not respond after 5 minutes. Session timed out.
Captured: none
Missing: employee_id
No handoff context. Recommend: add PTO lookup via SSO identity.
```

## Related Skills

- `genai/conversation-evaluator` - Evaluate conversation quality before summarizing
- `csm/chat-recommendation` - Recommend responses during live chat
- `itsm/incident-triage` - Triage incidents created from escalated conversations
- `genai/now-assist-qa` - Quality assurance for AI-assisted conversations
- `knowledge/content-recommendation` - Find KB articles referenced in conversations
