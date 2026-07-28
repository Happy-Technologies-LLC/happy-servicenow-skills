---
name: ot-incident-summarization
version: 1.0.0
description: Summarize OT incidents with affected device inventory, safety impact analysis, containment status, and operational continuity assessment for industrial environments
author: Happy Technologies LLC
tags: [otsm, ot, incident, summarization, safety, devices, containment, industrial]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Natural-Language-Search
    - SN-Query-Table
    - SN-Get-Record
  rest:
    - /api/now/table/sn_ot_incident
    - /api/now/table/sn_ot_vulnerability
    - /api/now/table/cmdb_ci_ot_device
    - /api/now/table/sys_journal_field
    - /api/now/table/task_sla
  native:
    - Bash
complexity: intermediate
estimated_time: 10-20 minutes
---

# OT Incident Summarization

## Overview

This skill generates comprehensive summaries of Operational Technology (OT) incidents in ServiceNow, tailored for OT security analysts, plant managers, and safety officers. OT incident summaries differ from IT incident summaries because they must address physical safety implications, affected industrial processes, device inventory across OT zones, and regulatory reporting requirements.

Key capabilities:
- Consolidate OT incident details with safety impact classification
- Inventory all affected OT devices with zone mapping and criticality ratings
- Assess containment status and isolation effectiveness
- Track operational continuity impact on industrial processes
- Summarize vulnerability context for exploited weaknesses
- Produce summaries suitable for regulatory reporting and management briefing

**When to use:** When an OT security analyst needs to brief management on an active or recent OT incident, when a safety officer requires incident context for safety review, when preparing shift handover documentation for OT security operations, or when generating regulatory compliance reports.

## Prerequisites

- **Roles:** `sn_ot_admin`, `sn_ot_analyst`, `sn_si_analyst`, or equivalent OT security role
- **Access:** Read access to `sn_ot_incident`, `sn_ot_vulnerability`, `cmdb_ci_ot_device`, `sys_journal_field`, and `task_sla` tables
- **Plugins:** Operational Technology (com.snc.ot) must be active
- **Knowledge:** Familiarity with OT/ICS environments, Purdue Model architecture, and industrial safety concepts

## Procedure

### Step 1: Retrieve OT Incident Record

Fetch the primary incident record with safety and operational fields.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_ot_incident
  sys_id: [INCIDENT_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,opened_by,resolved_at,closed_at,impact,urgency,safety_impact,business_impact,ot_zone,attack_vector,containment_status,affected_ci,cmdb_ci,location,resolution_code,resolution_notes,escalation,correlation_id
```

If searching by number:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: number=OT0012345
  fields: sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,impact,safety_impact,ot_zone,attack_vector,containment_status,affected_ci,location,escalation
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_ot_incident?sysparm_query=number=OT0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,impact,safety_impact,ot_zone,attack_vector,containment_status,affected_ci,location,escalation&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Inventory Affected OT Devices

Retrieve all OT devices affected by or related to the incident.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: cmdb_ci_ot_device
  sys_id: [AFFECTED_CI_SYS_ID]
  fields: sys_id,name,sys_class_name,device_type,manufacturer,model_id,firmware_version,ip_address,mac_address,ot_zone,protocol,location,operational_status,install_status,safety_critical,serial_number,support_group
```

Query additional devices in the same zone:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_ot_device
  query: ot_zone=[ZONE_VALUE]^location=[LOCATION_SYS_ID]
  fields: sys_id,name,device_type,manufacturer,ip_address,ot_zone,safety_critical,operational_status,firmware_version
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci_ot_device/{AFFECTED_CI_SYS_ID}?sysparm_fields=sys_id,name,sys_class_name,device_type,manufacturer,model_id,firmware_version,ip_address,ot_zone,protocol,safety_critical,operational_status&sysparm_display_value=true

GET /api/now/table/cmdb_ci_ot_device?sysparm_query=ot_zone=[ZONE_VALUE]^location=[LOCATION_SYS_ID]&sysparm_fields=sys_id,name,device_type,manufacturer,ip_address,safety_critical,operational_status&sysparm_limit=50&sysparm_display_value=true
```

### Step 3: Assess Containment Status

Retrieve containment-related work notes and status updates.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[INCIDENT_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 30
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[INCIDENT_SYS_ID]^element=work_notes^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=30
```

### Step 4: Check Related Vulnerabilities

Identify vulnerabilities associated with the affected devices.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_vulnerability
  query: affected_ci=[AFFECTED_CI_SYS_ID]^ORDERBYDESCseverity
  fields: sys_id,number,short_description,severity,state,cve_id,risk_score,remediation_status,published_date,affected_ci
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_ot_vulnerability?sysparm_query=affected_ci=[AFFECTED_CI_SYS_ID]^ORDERBYDESCseverity&sysparm_fields=sys_id,number,short_description,severity,state,cve_id,risk_score,remediation_status&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Check SLA and Response Time Metrics

Retrieve SLA status for the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: task_sla
  query: task=[INCIDENT_SYS_ID]
  fields: sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage
  limit: 5
```

**Using REST API:**
```bash
GET /api/now/table/task_sla?sysparm_query=task=[INCIDENT_SYS_ID]&sysparm_fields=sys_id,sla,stage,has_breached,planned_end_time,percentage,business_percentage&sysparm_limit=5&sysparm_display_value=true
```

### Step 6: Retrieve Related Incidents

Check for correlated or similar incidents in the OT environment.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: ot_zone=[ZONE_VALUE]^sys_id!=[CURRENT_INCIDENT_SYS_ID]^opened_at>=javascript:gs.daysAgoStart(30)^ORDERBYDESCopened_at
  fields: sys_id,number,short_description,state,severity,category,opened_at,containment_status
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_ot_incident?sysparm_query=ot_zone=[ZONE_VALUE]^sys_id!=[CURRENT_INCIDENT_SYS_ID]^opened_at>=javascript:gs.daysAgoStart(30)^ORDERBYDESCopened_at&sysparm_fields=number,short_description,state,severity,category,opened_at,containment_status&sysparm_limit=10&sysparm_display_value=true
```

### Step 7: Build the Incident Summary

Assemble all data into a structured OT incident summary:

```
=== OT INCIDENT SUMMARY ===
Incident: [number]
Title: [short_description]
Status: [state] | Priority: [priority] | Severity: [severity]
Opened: [opened_at] | Age: [duration]
Category: [category] / [subcategory]
Attack Vector: [attack_vector]

SAFETY IMPACT:
Safety Classification: [None/Low/Medium/High/Critical]
Personnel Risk: [assessment]
Environmental Risk: [assessment]
Process Safety: [assessment]
Safety Systems Status: [operational/degraded/offline]

AFFECTED ENVIRONMENT:
OT Zone: [ot_zone] (Purdue Level [level])
Facility: [location]
Primary Device: [device_name]
  Type: [device_type] | Make: [manufacturer] [model]
  Firmware: [firmware_version] | Protocol: [protocol]
  Safety Critical: [YES/NO]

DEVICE IMPACT INVENTORY:
| Device | Type | Zone | Safety Critical | Status |
|--------|------|------|----------------|--------|
| [name] | [type] | [zone] | [Y/N] | [operational/isolated/offline] |
| [name] | [type] | [zone] | [Y/N] | [operational/isolated/offline] |
Total Devices Affected: [count]

CONTAINMENT STATUS: [Contained/Partially/Not Contained]
Isolation Method: [network/physical/logical]
Containment Timeline:
- [timestamp]: [action taken]
- [timestamp]: [action taken]

VULNERABILITY CONTEXT:
| CVE | Severity | Risk Score | Remediation |
|-----|----------|-----------|-------------|
| [cve_id] | [severity] | [score] | [status] |

OPERATIONAL IMPACT:
Processes Affected: [list of industrial processes]
Production Impact: [none/partial/full shutdown]
Estimated Recovery: [timeframe]

ACTIVITY TIMELINE: (most recent first)
- [date] [user]: [summary]
- [date] [user]: [summary]

SLA STATUS:
Response SLA: [on-track/breached] | Due: [time]
Resolution SLA: [on-track/breached] | Due: [time]

RELATED INCIDENTS: [count] in same zone (last 30 days)
- [number]: [description] - [status]

REGULATORY CONSIDERATIONS:
- [applicable frameworks: NERC CIP, IEC 62443, NIST 800-82]
- [reporting obligations]
- [notification requirements]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language searches (e.g., "show critical OT incidents this week") |
| `SN-Query-Table` | Structured queries for incidents, devices, vulnerabilities |
| `SN-Get-Record` | Retrieve specific records by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_ot_incident` | GET | OT incident records |
| `/api/now/table/cmdb_ci_ot_device` | GET | OT device inventory |
| `/api/now/table/sn_ot_vulnerability` | GET | OT vulnerability data |
| `/api/now/table/sys_journal_field` | GET | Work notes and timeline |
| `/api/now/table/task_sla` | GET | SLA compliance status |

## Best Practices

- **Lead with safety:** Always present safety impact assessment before technical details in OT summaries
- **Map to Purdue levels:** Reference the Purdue Model level for affected zones to help stakeholders understand network position
- **Distinguish IT vs OT impact:** Clearly separate IT network impacts from OT process impacts
- **Include device firmware versions:** Firmware versions are critical for OT vulnerability assessment and remediation planning
- **Note protocol specifics:** Industrial protocols (Modbus, DNP3, OPC UA, EtherNet/IP) affect containment and remediation approaches
- **Track safety system status:** Always report the status of Safety Instrumented Systems (SIS), Emergency Shutdown (ESD), and fire suppression systems
- **Document physical verification:** Note when conclusions are based on remote monitoring vs. physical on-site verification
- **Flag regulatory obligations:** Identify applicable regulatory frameworks and any mandatory reporting deadlines

## Troubleshooting

### "OT incident records return empty results"

**Cause:** The OT incident table may use a different name or be a custom extension.
**Solution:** Check for `sn_ot_incident`, `sn_si_incident` (Security Incident), or custom tables. Some organizations track OT incidents within standard `incident` table with a category filter.

### "Device zone information is missing"

**Cause:** OT zone classification may not be populated in the CMDB.
**Solution:** Check the `ot_zone` or `network_zone` field. Some implementations use custom fields or location-based zone mapping. Consult the OT CMDB administrator.

### "Safety impact field not available"

**Cause:** The safety_impact field may be a custom addition not present in the base OT plugin.
**Solution:** Check for custom fields like `u_safety_impact`, `u_safety_classification`, or similar. Review work notes for safety-related assessments documented manually.

### "Related incidents query returns too many results"

**Cause:** Broad zone queries may match a large number of incidents.
**Solution:** Narrow the date range, add severity filters, or filter by specific category/subcategory to find the most relevant related incidents.

## Examples

### Example 1: Active OT Incident Briefing

**Scenario:** OT security analyst briefs the plant manager on an active incident affecting manufacturing line PLCs.

**Step 1 - Get incident:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: number=OT0005678
  fields: sys_id,number,short_description,state,severity,safety_impact,ot_zone,containment_status,affected_ci,opened_at
  limit: 1
```

**Generated Summary:**
```
OT INCIDENT OT0005678 - ACTIVE
Unauthorized Firmware Modification on Line 3 PLCs
Status: In Progress | Severity: Critical
Opened: Mar 19, 2026 06:15 | Age: 4 hours

SAFETY IMPACT: MEDIUM
- No immediate personnel risk (manual overrides active)
- Process safety: Batch mixing ratios may be affected
- SIS and ESD systems: FULLY OPERATIONAL

AFFECTED DEVICES (Zone 2 - Process Control):
| Device | Type | Safety Critical | Status |
|--------|------|----------------|--------|
| PLC-L3-001 | Siemens S7-1500 | YES | Isolated |
| PLC-L3-002 | Siemens S7-1500 | YES | Isolated |
| HMI-L3-01 | Wonderware | NO | Monitoring |
Total: 3 devices | 2 isolated, 1 under monitoring

CONTAINMENT: CONTAINED
- 06:30: PLCs isolated from OT network
- 06:45: Manual process control engaged for Line 3
- 07:00: Network capture initiated for forensics

PRODUCTION IMPACT: Line 3 operating at 60% via manual control
ESTIMATED RECOVERY: 4-6 hours (pending firmware validation)

VULNERABILITY: CVE-2026-0987 (CVSS 8.1) - S7-1500 firmware
upload authentication bypass
```

### Example 2: Weekly OT Incident Summary for Management

**Scenario:** OT security team generates a weekly summary of all OT incidents.

```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: opened_at>=javascript:gs.daysAgoStart(7)^ORDERBYDESCseverity
  fields: number,short_description,severity,state,ot_zone,safety_impact,containment_status,opened_at
  limit: 20
```

**Output:**
```
OT INCIDENT WEEKLY SUMMARY (Mar 12-19, 2026)
Total Incidents: 6 | Critical: 1 | High: 2 | Medium: 3

CRITICAL:
- OT0005678: PLC firmware modification (Zone 2) - In Progress
  Safety: Medium | Contained | Line 3 at 60%

HIGH:
- OT0005671: Anomalous DNP3 traffic (Zone 1) - Resolved
  Safety: Low | False positive (monitoring tool config)
- OT0005675: HMI malware detection (Zone 3) - Resolved
  Safety: None | Isolated and reimaged

MEDIUM: 3 incidents (all resolved, no safety impact)

KEY METRICS:
- Avg containment time: 38 minutes
- SLA compliance: 100% (response), 83% (resolution)
- Safety incidents: 0
- Production impact: 1 partial (Line 3, 4 hours)
```

## Related Skills

- `otsm/ot-incident-resolution` - Generate detailed OT incident resolution notes
- `secops/incident-summarization` - IT security incident summarization
- `secops/shift-handover` - Security operations shift handover
- `itsm/major-incident` - Major incident management procedures
