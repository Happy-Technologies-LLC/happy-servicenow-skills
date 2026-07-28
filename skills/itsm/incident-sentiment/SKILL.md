---
name: incident-sentiment
version: 1.0.0
description: Analyze incident sentiment from work notes, customer communications, and activity entries to track escalation risk and customer satisfaction
author: Happy Technologies LLC
tags: [itsm, incident, sentiment, escalation, customer-satisfaction, nlp, work-notes, analytics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Update-Record
    - SN-Add-Work-Notes
    - SN-Get-Table-Schema
  rest:
    - /api/now/table/incident
    - /api/now/table/sys_journal_field
    - /api/now/table/sn_si_incident
    - /api/now/table/sys_audit
    - /api/now/table/sys_email
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# Incident Sentiment Analysis

## Overview

This skill analyzes the sentiment of incident-related communications -- work notes, additional comments, email correspondence, and activity log entries -- to detect negative trends, predict escalation risk, and track customer satisfaction throughout the incident lifecycle.

- Extract and analyze text from work notes, comments, and email communications
- Classify sentiment as positive, neutral, negative, or critical
- Calculate escalation risk scores based on sentiment trajectory and language signals
- Identify frustrated customers before they formally escalate
- Track sentiment trends across incident lifecycle stages
- Generate sentiment-aware prioritization recommendations

**When to use:** When monitoring active incidents for escalation risk, analyzing customer satisfaction patterns, or building proactive intervention workflows for at-risk tickets.

## Prerequisites

- **Roles:** `itil`, `incident_manager`, or `analytics_admin`
- **Plugins:** `com.snc.incident` (Incident Management)
- **Access:** Read on `incident`, `sys_journal_field`, `sn_si_incident`, `sys_audit`, `sys_email`
- **Knowledge:** Understanding of your organization's escalation criteria and SLA thresholds
- **Data:** Incidents with work notes and customer communications for analysis

## Procedure

### Step 1: Select Incidents for Sentiment Analysis

Query active incidents, prioritizing those with recent activity or approaching SLA breach.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Natural-Language-Search
Parameters:
  table_name: incident
  query: "active incidents with priority 1 or 2 that have been updated in the last 24 hours"
  fields: sys_id,number,short_description,priority,state,assigned_to,assignment_group,sla_due,sys_updated_on
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/incident?sysparm_query=active=true^priorityIN1,2^sys_updated_onONLast 24 hours@javascript:gs.daysAgoStart(1)@javascript:gs.daysAgoEnd(0)&sysparm_fields=sys_id,number,short_description,priority,state,assigned_to,assignment_group,sla_due,sys_updated_on&sysparm_limit=30
```

### Step 2: Retrieve Work Notes and Comments

Extract all journal entries (work notes and additional comments) for each incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[incident_sys_id]^elementINwork_notes,comments^ORDERBYsys_created_on
  fields: sys_id,element,value,sys_created_by,sys_created_on
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[incident_sys_id]^elementINwork_notes,comments^ORDERBYsys_created_on&sysparm_fields=sys_id,element,value,sys_created_by,sys_created_on&sysparm_limit=50
```

### Step 3: Retrieve Email Communications

Check for email correspondence related to the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_email
  query: instance=[incident_sys_id]^type=received
  fields: sys_id,subject,body_text,sender,sys_created_on
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_email?sysparm_query=instance=[incident_sys_id]^type=received&sysparm_fields=sys_id,subject,body_text,sender,sys_created_on&sysparm_limit=20
```

### Step 4: Classify Sentiment of Each Entry

Analyze each text entry and assign a sentiment classification:

| Sentiment | Score Range | Indicators |
|-----------|-----------|------------|
| Critical | -1.0 to -0.7 | Threats, profanity, executive escalation mentions, legal references |
| Negative | -0.7 to -0.3 | Frustration, repeated complaints, urgency language, ALL CAPS |
| Neutral | -0.3 to 0.3 | Factual updates, status checks, technical information |
| Positive | 0.3 to 0.7 | Appreciation, acknowledgment, satisfaction expressed |
| Very Positive | 0.7 to 1.0 | Explicit praise, issue resolved to satisfaction |

**Negative sentiment keywords and phrases:**

| Category | Keywords / Phrases | Weight |
|----------|-------------------|--------|
| Frustration | "still not working", "again", "how many times", "unacceptable" | -0.4 |
| Urgency | "ASAP", "immediately", "critical", "business impact", "revenue loss" | -0.3 |
| Escalation intent | "manager", "supervisor", "escalate", "executive", "CIO" | -0.5 |
| Dissatisfaction | "disappointed", "poor service", "no response", "ignored" | -0.4 |
| Threats | "legal", "contract", "SLA penalty", "vendor review" | -0.6 |
| Repeat contact | "calling again", "third time", "follow up again" | -0.3 |

**Positive sentiment keywords and phrases:**

| Category | Keywords / Phrases | Weight |
|----------|-------------------|--------|
| Gratitude | "thank you", "appreciate", "great job", "helpful" | +0.4 |
| Resolution | "fixed", "working now", "resolved", "all good" | +0.5 |
| Acknowledgment | "understand", "makes sense", "will try that" | +0.2 |

### Step 5: Calculate Escalation Risk Score

Compute an overall escalation risk score based on sentiment trajectory:

```
escalation_risk = (current_sentiment * 0.40)
                + (sentiment_trend * 0.25)
                + (sla_proximity * 0.20)
                + (reassignment_count * 0.15)
```

Where:
- **current_sentiment**: Latest sentiment score (inverted: -1.0 critical = 1.0 risk)
- **sentiment_trend**: Rate of change (worsening = higher risk)
- **sla_proximity**: How close to SLA breach (0.0 = plenty of time, 1.0 = breached)
- **reassignment_count**: Normalized count of reassignments (each adds friction)

| Risk Level | Score | Recommended Action |
|-----------|-------|-------------------|
| Low | 0.0-0.3 | Continue normal handling |
| Moderate | 0.3-0.5 | Monitor more frequently |
| High | 0.5-0.7 | Notify team lead, consider proactive outreach |
| Critical | 0.7-1.0 | Immediate manager intervention required |

### Step 6: Check Structured Incident Data

Query the structured incident intelligence table for additional signals.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_si_incident
  query: incident=[incident_sys_id]
  fields: sys_id,incident,sentiment_score,customer_effort_score,escalation_likelihood
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_si_incident?sysparm_query=incident=[incident_sys_id]&sysparm_fields=sys_id,incident,sentiment_score,customer_effort_score,escalation_likelihood&sysparm_limit=1
```

### Step 7: Generate Sentiment Report

Produce a per-incident sentiment analysis report:

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  sys_id: [incident_sys_id]
  work_notes: |
    === SENTIMENT ANALYSIS REPORT ===
    Incident: [number]
    Analysis Date: [current_date]
    Entries Analyzed: [count]

    SENTIMENT TIMELINE:
    [timestamp] Comment (Customer): NEGATIVE (-0.6)
      "This is the third time I've called about this issue..."
    [timestamp] Work Note (Agent): NEUTRAL (0.1)
      "Reassigned to Network team for further investigation"
    [timestamp] Comment (Customer): CRITICAL (-0.8)
      "I need this escalated to management immediately..."

    CURRENT SENTIMENT: CRITICAL (-0.8)
    SENTIMENT TREND: Worsening (declined -0.4 over 48 hours)
    ESCALATION RISK: HIGH (0.78)

    RISK FACTORS:
    - Customer used escalation language ("management", "escalate")
    - Third contact about same issue (repeat contact indicator)
    - SLA at 85% consumed with no resolution path identified
    - Two reassignments in 48 hours

    RECOMMENDED ACTIONS:
    1. Immediate callback from team lead or manager
    2. Provide clear timeline for resolution
    3. Offer interim workaround if available
    4. Document escalation handling in work notes
```

### Step 8: Batch Sentiment Analysis for Trends

Analyze sentiment across multiple incidents for pattern detection.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: incident
  query: active=true^assignment_group=[group_sys_id]
  fields: sys_id,number,priority,state,assignment_group,sys_updated_on
  limit: 100
```

Aggregate metrics:

| Metric | Value | Benchmark |
|--------|-------|-----------|
| Avg sentiment score | -0.22 | -0.10 |
| Incidents with negative sentiment | 34% | 20% |
| Critical sentiment incidents | 8% | 3% |
| Sentiment-predicted escalations | 12 | -- |
| Actual escalations (validated) | 10 | -- |
| Prediction accuracy | 83% | -- |

### Step 9: Set Up Proactive Alerts

Define thresholds for automated sentiment-based alerts:

**Using MCP:**
```
Tool: SN-Update-Record
Parameters:
  table_name: incident
  sys_id: [incident_sys_id]
  data:
    work_notes: "SENTIMENT ALERT: Escalation risk score exceeded 0.7. Automated notification sent to incident manager. Customer sentiment has declined from neutral to critical over the last 3 interactions."
    urgency: 1
```

## Tool Usage

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `SN-Natural-Language-Search` | Find incidents using natural language criteria | Initial discovery |
| `SN-Query-Table` | Retrieve journal entries, emails, incident data | Core data gathering |
| `SN-Update-Record` | Flag at-risk incidents, update urgency | Proactive intervention |
| `SN-Add-Work-Notes` | Document sentiment analysis findings | Reports and audit trail |
| `SN-Get-Table-Schema` | Explore table structures for sentiment data | Setup and discovery |

## Best Practices

1. **Analyze both channels** -- work notes reflect agent perspective, comments reflect customer perspective; both matter
2. **Weight recent entries higher** -- the most recent communication is the strongest signal
3. **Account for technical language** -- words like "critical" in a technical context (critical server) differ from emotional context (critical of support)
4. **Track trajectory, not just snapshots** -- a neutral score that was previously positive is more concerning than a stable neutral
5. **Combine with structured data** -- sentiment alone is insufficient; cross-reference with SLA status, reassignment count, and priority
6. **Respect privacy** -- sentiment analysis should focus on service quality, not profile individual customers
7. **Calibrate thresholds per team** -- different support groups may have different baseline sentiment patterns
8. **Act on insights** -- sentiment analysis without intervention adds no value; ensure alerts trigger real actions

## Troubleshooting

### "No journal entries found for incident"

**Cause:** Work notes and comments are stored in `sys_journal_field` with the incident's sys_id as `element_id`
**Solution:** Verify the query uses `element_id` (not `sys_id`) to match the incident record. Also check that journal entries exist -- new incidents may not have any yet.

### "Sentiment scores seem inaccurate"

**Cause:** Technical jargon, abbreviations, or domain-specific language can confuse sentiment analysis
**Solution:** Build a domain-specific keyword dictionary. Terms like "kill the process" or "terminate the session" are technical actions, not negative sentiment.

### "Too many false positive escalation alerts"

**Cause:** Thresholds are too sensitive or not calibrated to your environment
**Solution:** Analyze historical escalation data. Raise thresholds gradually until false positive rate drops below 15%. Consider requiring multiple consecutive negative entries before alerting.

### "Email body_text is HTML formatted"

**Cause:** Emails are stored with HTML markup in `sys_email`
**Solution:** Strip HTML tags before sentiment analysis. Focus on `body_text` rather than `body` field, or apply HTML-to-text conversion.

## Examples

### Example 1: Escalation Detected Early

**Incident:** INC0056789 - "Email server is down for marketing department"

**Sentiment Timeline:**
- Hour 0: Neutral (0.0) - "Email is not working for our team"
- Hour 4: Negative (-0.4) - "Still no update, this is affecting our campaign launch"
- Hour 8: Critical (-0.8) - "Unacceptable. I need the CIO's office involved immediately"

**Escalation Risk:** 0.82 (CRITICAL)
**Action:** Incident manager called customer within 15 minutes. Provided timeline and workaround. Prevented formal executive escalation.

### Example 2: Positive Resolution Tracking

**Incident:** INC0056790 - "Cannot access shared drive from VPN"

**Sentiment Timeline:**
- Hour 0: Neutral (0.0) - "I can't see the shared drive when connected via VPN"
- Hour 2: Neutral (0.1) - "Thanks for looking into this"
- Hour 3: Positive (0.6) - "That fixed it, the drive mapping is working now. Thank you!"

**Escalation Risk:** 0.05 (LOW)
**Action:** No intervention needed. Incident resolved with positive customer outcome.

### Example 3: Subtle Frustration Detection

**Incident:** INC0056791 - "Printer on 4th floor not printing"

**Sentiment Timeline:**
- Day 1: Neutral (0.0) - "Printer in room 401 is not printing"
- Day 3: Mild negative (-0.2) - "Just following up on this, still not working"
- Day 5: Negative (-0.5) - "This is the third time I'm following up. Our team has been without a printer for a week."

**Escalation Risk:** 0.61 (HIGH)
**Action:** Alert sent to team lead. Agent called customer, arranged loaner printer, escalated repair.

## Related Skills

- `itsm/incident-triage` - Triage with sentiment-informed prioritization
- `itsm/suggested-steps` - Generate resolution steps for at-risk incidents
- `csm/sentiment-analysis` - Customer service management sentiment analysis
- `hrsd/sentiment-analysis` - HR case sentiment analysis
- `itsm/major-incident` - Major incident management with stakeholder communication
