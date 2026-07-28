---
name: conversation-evaluator
version: 1.0.1
description: Evaluate virtual agent conversations for quality including coherence, accuracy, slot filling, intent matching, and hallucination detection
author: Happy Technologies LLC
tags: [genai, virtual-agent, conversation, evaluation, quality, coherence, hallucination, intent-matching]
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
  native:
    - Bash
complexity: advanced
estimated_time: 20-40 minutes
---

# Conversation Evaluator

## Overview

This skill evaluates virtual agent conversations across multiple quality dimensions to ensure accurate, coherent, and helpful interactions. It identifies issues with conversational AI performance and provides actionable improvement recommendations.

- Assess conversation coherence: logical flow, context retention, and topic continuity
- Validate accuracy: are responses factually correct and aligned with knowledge base content
- Evaluate slot filling: completeness and correctness of captured user inputs
- Score intent matching: did the virtual agent select the correct topic and actions
- Detect hallucination: identify fabricated information not grounded in ServiceNow data
- Generate quality scorecards with per-dimension ratings and aggregate scores

**When to use:** When auditing virtual agent performance, investigating user complaints about bot interactions, or running periodic quality assessments on conversational AI deployments.

## Prerequisites

- **Roles:** `admin`, `va_admin`, or `conversation_designer`
- **Plugins:** `com.glide.cs.chatbot` (Virtual Agent), `com.glide.cs.designer` (Conversation Designer)
- **Access:** Read on `sys_cs_topic`, `sys_cs_conversation`, `sys_cb_topic`, `sys_cb_action`, `sys_cs_message`
- **Knowledge:** Understanding of your Virtual Agent topic designs and expected conversation flows
- **Data:** Active virtual agent deployment with conversation history

## Procedure

### Step 1: Retrieve Conversations for Evaluation

Query recent virtual agent conversations, optionally filtered by topic or outcome.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: state=closed^sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,number,topic,state,channel,opened_at,closed_at,close_reason,user,queue_time,handle_time
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_conversation?sysparm_query=state=closed^sys_created_onONLast 7 days@javascript:gs.daysAgoStart(7)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,topic,state,channel,opened_at,closed_at,close_reason,user,queue_time,handle_time&sysparm_limit=50
```

### Step 2: Extract Conversation Messages

Retrieve the full message history for each conversation being evaluated.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_message
  query: conversation=[conversation_sys_id]^ORDERBYsys_created_on
  fields: sys_id,conversation,body,type,sender_type,sys_created_on,is_hidden
  limit: 100
```

**Using REST API:**
```bash
GET /api/now/table/sys_cs_message?sysparm_query=conversation=[conversation_sys_id]^ORDERBYsys_created_on&sysparm_fields=sys_id,conversation,body,type,sender_type,sys_created_on,is_hidden&sysparm_limit=100
```

### Step 3: Retrieve Topic and Action Definitions

Get the designed topic flow to compare against actual conversation behavior.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cb_topic
  query: sys_id=[topic_sys_id]
  fields: sys_id,name,description,goal,utterances,active
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sys_cb_topic?sysparm_query=sys_id=[topic_sys_id]&sysparm_fields=sys_id,name,description,goal,utterances,active&sysparm_limit=1
```

Retrieve the expected actions for this topic:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cb_action
  query: topic=[topic_sys_id]^ORDERBYorder
  fields: sys_id,name,type,topic,order,script,table,field,mandatory
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_cb_action?sysparm_query=topic=[topic_sys_id]^ORDERBYorder&sysparm_fields=sys_id,name,type,topic,order,script,table,field,mandatory&sysparm_limit=50
```

### Step 4: Evaluate Coherence (Score 0-10)

Assess the logical flow and context management of the conversation:

| Criterion | Points | Description |
|-----------|--------|-------------|
| Logical flow | 0-3 | Responses follow a logical sequence without non-sequiturs |
| Context retention | 0-2 | Bot remembers earlier user inputs throughout conversation |
| Topic continuity | 0-2 | Conversation stays on-topic without unexplained jumps |
| Greeting/closing | 0-1 | Appropriate opening and closing messages |
| Recovery from confusion | 0-2 | Bot handles misunderstandings gracefully |

**Red flags:**
- Bot repeats the same question after user already answered
- Bot references information the user never provided
- Conversation jumps to unrelated topic without transition
- Bot fails to acknowledge user corrections

### Step 5: Evaluate Accuracy (Score 0-10)

Verify responses against ServiceNow data sources:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_context_entry
  query: conversation=[conversation_sys_id]
  fields: sys_id,name,value,source,conversation
  limit: 50
```

| Criterion | Points | Description |
|-----------|--------|-------------|
| Factual correctness | 0-3 | Responses match ServiceNow records and KB articles |
| Data freshness | 0-2 | Information is current, not outdated |
| Source attribution | 0-2 | Bot references correct records/articles |
| No contradictions | 0-2 | Bot does not contradict itself within conversation |
| Appropriate uncertainty | 0-1 | Bot expresses uncertainty when data is ambiguous |

### Step 6: Evaluate Slot Filling (Score 0-10)

Check if required user inputs were correctly captured:

| Criterion | Points | Description |
|-----------|--------|-------------|
| Required slots captured | 0-3 | All mandatory fields collected from user |
| Slot validation | 0-2 | Inputs validated (e.g., email format, date range) |
| Slot confirmation | 0-2 | Bot confirms critical inputs back to user |
| Graceful re-prompting | 0-2 | Bot handles invalid inputs with clear guidance |
| Slot carryover | 0-1 | Previously provided info reused, not re-asked |

Cross-reference captured slots with `sys_cb_action` definitions where `mandatory=true`.

### Step 7: Evaluate Intent Matching (Score 0-10)

Determine if the virtual agent selected the correct topic for the user's request:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_topic
  query: active=true
  fields: sys_id,name,description,utterances
  limit: 100
```

| Criterion | Points | Description |
|-----------|--------|-------------|
| Correct topic selected | 0-4 | Initial intent classification matches user request |
| Disambiguation quality | 0-2 | When ambiguous, bot offers relevant topic choices |
| Topic switching | 0-2 | Handles mid-conversation topic changes appropriately |
| Fallback behavior | 0-2 | Graceful degradation when no topic matches |

### Step 8: Detect Hallucinations

Identify fabricated content not grounded in ServiceNow data:

**Hallucination categories:**

| Type | Description | Severity |
|------|-------------|----------|
| Fabricated record | Bot cites an incident/KB number that does not exist | Critical |
| Invented procedure | Bot describes steps not in any KB article or playbook | High |
| False status | Bot states incorrect ticket status or assignment | High |
| Made-up policy | Bot references a policy that does not exist | Medium |
| Incorrect attribution | Bot attributes information to wrong source | Medium |

For each bot response containing specific claims, verify against the source table:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: kb_knowledge
  query: number=[cited_kb_number]
  fields: sys_id,number,short_description,workflow_state
  limit: 1
```

### Step 9: Generate Quality Scorecard

Compile evaluation results into a structured scorecard:

```
=== VIRTUAL AGENT CONVERSATION QUALITY SCORECARD ===
Conversation: CS0045678
Topic: Password Reset
Date: 2026-03-19
Evaluator: AI Quality Evaluator v1.0

Dimension Scores:
  Coherence:      8/10  - Minor context loss at turn 5
  Accuracy:       9/10  - All references verified correct
  Slot Filling:   7/10  - Did not confirm email address
  Intent Match:   10/10 - Correct topic on first utterance
  Hallucination:  10/10 - No fabricated content detected

Aggregate Score: 44/50 (88%) - GOOD

Issues Found:
  1. [MEDIUM] Turn 5: Bot asked for department after user already provided it
  2. [LOW] Turn 8: Bot did not confirm email address before sending reset link

Recommendations:
  1. Add context check for department slot before re-prompting
  2. Add confirmation step for email address in password reset topic
```

### Step 10: Track Quality Trends

Aggregate scores across conversations to identify systemic issues:

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_cs_conversation
  query: state=closed^close_reason=escalated^sys_created_onONLast 30 days@javascript:gs.daysAgoStart(30)@javascript:gs.daysAgoEnd(0)
  fields: sys_id,topic,close_reason,handle_time
  limit: 200
```

Key quality metrics:
- **Average score per topic**: Identifies worst-performing conversation flows
- **Escalation rate**: Percentage of conversations escalated to human agents
- **Hallucination frequency**: How often fabricated content appears
- **Slot completion rate**: Percentage of required slots successfully captured

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Query-Table` | Retrieve conversations, messages, topics, actions | Core evaluation data gathering |
| `SN-Natural-Language-Search` | Find conversations by natural language criteria | Targeted investigation |
| `SN-Update-Record` | Flag conversations with quality issues | Marking for review |
| `SN-Add-Work-Notes` | Document evaluation findings | Audit trail |
| `SN-Get-Table-Schema` | Explore conversation-related table structures | Setup and discovery |

## Best Practices

1. **Sample strategically** -- evaluate across all topics, not just high-volume ones
2. **Include escalated conversations** -- escalations reveal the most significant quality gaps
3. **Evaluate in batches** -- assess 20-50 conversations per evaluation cycle for statistical validity
4. **Separate dimensions** -- a high coherence score does not compensate for hallucinations
5. **Track over time** -- single-point evaluations miss trends; run evaluations weekly
6. **Involve topic designers** -- share findings with the team that built the conversation flows
7. **Weight severity** -- hallucinations and accuracy issues should weigh more than minor coherence gaps
8. **Benchmark against human agents** -- compare VA scores with human agent CSAT for context

## Troubleshooting

### "No messages found for conversation"

**Cause:** Messages may be stored in a different table or the conversation was very short
**Solution:** Check `sys_cs_message` and also `sys_journal_field` for related entries. Very short conversations (1-2 turns) may only have system messages.

### "Topic sys_id does not match any sys_cb_topic"

**Cause:** The conversation used a legacy or custom topic framework
**Solution:** Check `sys_cs_topic` in addition to `sys_cb_topic`. Some deployments use the newer Conversation Designer tables.

### "Cannot determine if response is a hallucination"

**Cause:** The response is vague enough that it cannot be verified against specific records
**Solution:** Flag as "unverifiable" rather than hallucination. Focus on responses with specific claims (ticket numbers, KB references, dates, names).

### "Scores vary widely for the same topic"

**Cause:** Topic flow has conditional branches that behave differently based on user input
**Solution:** Segment evaluations by conversation path (e.g., successful resolution vs. escalation path) for more meaningful comparisons.

## Examples

### Example 1: High-Quality Password Reset Conversation

**Conversation:** CS0045678 - User requests password reset

**Evaluation:**
- Coherence: 9/10 -- smooth flow, context maintained throughout
- Accuracy: 10/10 -- correctly referenced KB0012345 for self-service reset
- Slot Filling: 9/10 -- captured username, verified email, confirmed identity
- Intent Match: 10/10 -- matched "password reset" topic immediately
- Hallucination: 10/10 -- no fabricated content

**Score:** 48/50 (96%) - EXCELLENT

### Example 2: Poor VPN Troubleshooting Conversation

**Conversation:** CS0045679 - User reports VPN issues

**Evaluation:**
- Coherence: 5/10 -- asked for OS twice, lost context of error message
- Accuracy: 4/10 -- referenced KB0099999 which does not exist (hallucination)
- Slot Filling: 6/10 -- missed mandatory field: VPN client version
- Intent Match: 7/10 -- initially matched "network issues" before correcting to VPN
- Hallucination: 2/10 -- fabricated KB article number and invented resolution steps

**Score:** 24/50 (48%) - POOR. Requires immediate topic redesign.

### Example 3: Ambiguous Intent Handling

**Conversation:** CS0045680 - User says "it's broken"

**Evaluation:**
- Coherence: 8/10 -- bot asked clarifying questions methodically
- Accuracy: 9/10 -- once topic identified, responses were correct
- Slot Filling: 7/10 -- took 4 turns to capture enough detail
- Intent Match: 6/10 -- disambiguation menu was too broad (8 options)
- Hallucination: 10/10 -- no fabricated content

**Score:** 40/50 (80%) - GOOD. Recommendation: reduce disambiguation options to top 4.

## Related Skills

- `genai/chat-summarization-va` - Summarize conversations after evaluation
- `genai/now-assist-qa` - Quality assurance for Now Assist features
- `genai/playbook-generation` - Build improved conversation flows
- `itsm/incident-triage` - Handle incidents escalated from virtual agent
- `knowledge/content-recommendation` - Verify KB article references
