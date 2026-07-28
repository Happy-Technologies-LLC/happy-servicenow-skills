---
name: ot-incident-resolution
version: 1.0.0
description: Generate OT incident resolution notes with safety considerations, containment procedures, and remediation steps for industrial control systems and operational technology environments
author: Happy Technologies LLC
tags: [otsm, ot, incident-resolution, industrial, ics, safety, scada, containment]
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
    - /api/now/table/sn_si_incident
    - /api/now/table/sys_journal_field
    - /api/now/table/change_request
  native:
    - Bash
complexity: advanced
estimated_time: 15-30 minutes
---

# OT Incident Resolution

## Overview

This skill provides a structured approach to generating resolution notes for Operational Technology (OT) incidents in ServiceNow. OT incidents require specialized handling due to the safety-critical nature of industrial control systems (ICS), SCADA systems, and operational technology environments where cyber-physical consequences can impact human safety and critical infrastructure.

Key capabilities:
- Document incident containment actions taken for OT/ICS environments
- Capture safety impact assessments and physical consequence analysis
- Record remediation steps with safety validation checkpoints
- Track affected OT devices, zones, and network segments
- Generate resolution notes that satisfy regulatory and audit requirements
- Ensure operational safety protocols are documented throughout the resolution lifecycle

**When to use:** When resolving OT security incidents, ICS anomalies, SCADA system alerts, or any incident affecting operational technology environments where safety and operational continuity are paramount.

## Prerequisites

- **Roles:** `sn_ot_admin`, `sn_ot_analyst`, `sn_si_analyst`, or `itil` with OT scope access
- **Access:** Read/write access to `sn_ot_incident`, `sn_ot_vulnerability`, `cmdb_ci_ot_device`, and `sys_journal_field` tables
- **Plugins:** Operational Technology (com.snc.ot) and Security Incident Response (com.snc.si) must be active
- **Knowledge:** Understanding of ICS/SCADA systems, Purdue Model network segmentation, and industrial safety protocols

## Procedure

### Step 1: Retrieve OT Incident Details

Fetch the OT incident record with all classification and impact fields.

**Using MCP:**
```
Tool: SN-Get-Record
Parameters:
  table_name: sn_ot_incident
  sys_id: [INCIDENT_SYS_ID]
  fields: sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,resolved_at,affected_ci,cmdb_ci,location,impact,urgency,business_impact,safety_impact,ot_zone,attack_vector,containment_status,resolution_code,resolution_notes,close_notes
```

If searching by number:
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: number=OT0012345
  fields: sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,affected_ci,cmdb_ci,location,impact,safety_impact,ot_zone,attack_vector,containment_status
  limit: 1
```

**Using REST API:**
```bash
GET /api/now/table/sn_ot_incident?sysparm_query=number=OT0012345&sysparm_fields=sys_id,number,short_description,description,state,priority,severity,category,subcategory,assigned_to,assignment_group,opened_at,affected_ci,cmdb_ci,location,impact,safety_impact,ot_zone,attack_vector,containment_status&sysparm_limit=1&sysparm_display_value=true
```

### Step 2: Retrieve Affected OT Devices

Identify all OT devices impacted by the incident.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_ot_device
  query: sys_id=[AFFECTED_CI_SYS_ID]
  fields: sys_id,name,sys_class_name,device_type,manufacturer,model_id,firmware_version,ip_address,mac_address,location,operational_status,install_status,ot_zone,protocol,serial_number,asset_tag,support_group,safety_critical
  limit: 1
```

For all devices in the affected zone:
```
Tool: SN-Query-Table
Parameters:
  table_name: cmdb_ci_ot_device
  query: ot_zone=[ZONE_VALUE]^operational_status=1
  fields: sys_id,name,device_type,manufacturer,ip_address,ot_zone,safety_critical,operational_status
  limit: 50
```

**Using REST API:**
```bash
GET /api/now/table/cmdb_ci_ot_device/{AFFECTED_CI_SYS_ID}?sysparm_fields=sys_id,name,sys_class_name,device_type,manufacturer,model_id,firmware_version,ip_address,ot_zone,protocol,safety_critical&sysparm_display_value=true

GET /api/now/table/cmdb_ci_ot_device?sysparm_query=ot_zone=[ZONE_VALUE]^operational_status=1&sysparm_fields=sys_id,name,device_type,manufacturer,ip_address,safety_critical&sysparm_limit=50&sysparm_display_value=true
```

### Step 3: Assess Safety Impact

Review and document the safety impact of the incident on physical operations.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[INCIDENT_SYS_ID]^element=work_notes^valueLIKEsafety^ORDERBYDESCsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[INCIDENT_SYS_ID]^element=work_notes^valueLIKEsafety^ORDERBYDESCsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=20
```

### Step 4: Review Related Vulnerabilities

Check if the incident is linked to known OT vulnerabilities.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_vulnerability
  query: affected_ci=[AFFECTED_CI_SYS_ID]^ORDERBYDESCseverity
  fields: sys_id,number,short_description,severity,state,cve_id,affected_ci,risk_score,remediation_status,published_date,vendor_advisory
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/sn_ot_vulnerability?sysparm_query=affected_ci=[AFFECTED_CI_SYS_ID]^ORDERBYDESCseverity&sysparm_fields=sys_id,number,short_description,severity,state,cve_id,risk_score,remediation_status,vendor_advisory&sysparm_limit=10&sysparm_display_value=true
```

### Step 5: Document Containment Actions

Record the containment measures taken to isolate the threat.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: element_id=[INCIDENT_SYS_ID]^element=work_notes^valueLIKEcontainment^ORDERBYsys_created_on
  fields: value,sys_created_on,sys_created_by
  limit: 20
```

**Using REST API:**
```bash
GET /api/now/table/sys_journal_field?sysparm_query=element_id=[INCIDENT_SYS_ID]^element=work_notes^valueLIKEcontainment^ORDERBYsys_created_on&sysparm_fields=value,sys_created_on,sys_created_by&sysparm_limit=20
```

### Step 6: Check Related Change Requests

Identify any change requests created for remediation activities.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: change_request
  query: parent=[INCIDENT_SYS_ID]^ORcorrelation_id=[INCIDENT_NUMBER]
  fields: sys_id,number,short_description,state,type,risk,category,assigned_to,start_date,end_date,approval
  limit: 10
```

**Using REST API:**
```bash
GET /api/now/table/change_request?sysparm_query=parent=[INCIDENT_SYS_ID]^ORcorrelation_id=[INCIDENT_NUMBER]&sysparm_fields=sys_id,number,short_description,state,type,risk,category,assigned_to,start_date,end_date,approval&sysparm_limit=10&sysparm_display_value=true
```

### Step 7: Build the Resolution Notes

Assemble comprehensive resolution documentation:

```
=== OT INCIDENT RESOLUTION NOTES ===
Incident: [number] | Priority: [priority] | Severity: [severity]
Category: [category] / [subcategory]
Opened: [opened_at] | Resolved: [resolved_at]
Duration: [resolution_duration]

AFFECTED ENVIRONMENT:
OT Zone: [ot_zone] (Purdue Level [level])
Primary Device: [device_name] ([device_type])
  Manufacturer: [manufacturer] | Firmware: [firmware_version]
  Protocol: [protocol] | IP: [ip_address]
  Safety Critical: [YES/NO]
Additional Affected Devices: [count]

SAFETY IMPACT ASSESSMENT:
Physical Safety Risk: [None/Low/Medium/High/Critical]
Personnel Hazard: [description]
Environmental Impact: [description]
Process Safety Impact: [description]
Safety Systems Affected: [SIS/ESD/fire suppression status]

INCIDENT SUMMARY:
[description of what occurred, attack vector, initial detection]

CONTAINMENT ACTIONS:
1. [timestamp] - [action taken] - [performed by]
2. [timestamp] - [action taken] - [performed by]
3. [timestamp] - [action taken] - [performed by]
Containment Status: [Contained/Partially Contained/Not Contained]

ROOT CAUSE:
[root cause analysis findings]
Related Vulnerability: [CVE if applicable]

REMEDIATION STEPS:
1. [step] - Status: [Complete/Pending]
   Safety Validation: [validation performed]
2. [step] - Status: [Complete/Pending]
   Safety Validation: [validation performed]

CHANGE REQUESTS:
- [CHG number]: [description] - [status]

POST-RESOLUTION VERIFICATION:
[ ] Device operational status restored
[ ] Safety systems verified functional
[ ] Network segmentation confirmed
[ ] Monitoring alerts re-enabled
[ ] Operations team sign-off obtained
[ ] Regulatory notification completed (if required)

LESSONS LEARNED:
- [observation and recommendation]
- [process improvement suggestion]
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Natural-Language-Search` | Natural language search (e.g., "find critical OT incidents in Zone 3") |
| `SN-Query-Table` | Structured queries for incidents, devices, vulnerabilities, and work notes |
| `SN-Get-Record` | Retrieve specific incident or device records by sys_id |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/sn_ot_incident` | GET | OT incident records |
| `/api/now/table/cmdb_ci_ot_device` | GET | OT device inventory |
| `/api/now/table/sn_ot_vulnerability` | GET | OT vulnerability records |
| `/api/now/table/sn_si_incident` | GET | Security incident correlation |
| `/api/now/table/sys_journal_field` | GET | Work notes and activity |
| `/api/now/table/change_request` | GET | Related change requests |

## Best Practices

- **Safety first:** Always document safety impact assessment before technical remediation details
- **Never patch without change control:** OT environments require formal change management even for security patches
- **Preserve forensic evidence:** Document device states and network captures before containment actions alter evidence
- **Coordinate with operations:** OT incident response must involve plant/operations personnel, not just IT security
- **Respect Purdue Model boundaries:** Document which network zones were affected and ensure containment respects zone segmentation
- **Verify safety systems:** After remediation, explicitly verify that Safety Instrumented Systems (SIS) and Emergency Shutdown (ESD) systems are fully operational
- **Document regulatory requirements:** Note any mandatory reporting obligations (NERC CIP, IEC 62443, NIST SP 800-82)
- **Include physical verification:** Resolution of OT incidents often requires physical on-site verification, not just remote confirmation

## Troubleshooting

### "OT incident table not available"

**Cause:** The Operational Technology plugin is not installed or activated.
**Solution:** Verify that `com.snc.ot` plugin is active. Check if the OT module is licensed for your instance. The table may be `sn_ot_incident` or a custom extension.

### "Device records missing OT-specific fields"

**Cause:** OT devices may be stored in base CMDB classes without OT extensions.
**Solution:** Check `cmdb_ci_ot_device` and its child classes (`cmdb_ci_ot_plc`, `cmdb_ci_ot_rtu`, `cmdb_ci_ot_hmi`). Some organizations use custom classes for OT equipment.

### "Cannot find related vulnerabilities"

**Cause:** OT vulnerability data may not be synced or the affected_ci reference may use a different field.
**Solution:** Try querying `sn_ot_vulnerability` by device name or IP address instead of sys_id. Check if vulnerability data is imported from a third-party OT security tool.

### "Safety impact fields are empty"

**Cause:** Custom safety assessment fields may not be populated, or the organization uses a separate safety management system.
**Solution:** Check work notes for safety-related entries. Review any linked records in risk or safety management tables. Consult the safety officer for manual assessment documentation.

## Examples

### Example 1: PLC Firmware Exploit Resolution

**Scenario:** A programmable logic controller (PLC) in a manufacturing plant was compromised via a known firmware vulnerability.

**Step 1 - Get incident:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sn_ot_incident
  query: number=OT0004521
  fields: sys_id,number,short_description,state,severity,affected_ci,ot_zone,safety_impact,containment_status
  limit: 1
```

**Resolution Notes:**
```
OT INCIDENT OT0004521 - RESOLVED
PLC Firmware Exploitation - Siemens S7-1500 (Zone 2)
Severity: High | Safety Impact: Medium
Duration: 8 hours | Containment: 45 minutes

AFFECTED DEVICE:
Siemens S7-1500 PLC | FW: V2.8.3 (vulnerable)
Zone 2 - Process Control | Safety Critical: YES
Controls: Batch mixing process Line 4

SAFETY ASSESSMENT:
- No personnel safety incident occurred
- Process was safely shut down via manual override
- SIS remained fully operational throughout
- No environmental release detected

CONTAINMENT:
1. 08:15 - Isolated PLC from OT network at Zone 2 switch
2. 08:30 - Engaged manual process control for Line 4
3. 08:45 - Confirmed no lateral movement to other PLCs
4. 09:00 - Preserved PLC memory dump for forensics

REMEDIATION:
1. Applied firmware update V2.9.1 (CVE-2026-1234 fix) - COMPLETE
2. Reset all PLC credentials and certificates - COMPLETE
3. Updated firewall rules at Zone 2/3 boundary - COMPLETE
4. Verified PLC logic integrity against golden image - COMPLETE
5. Restored automated process control - COMPLETE
6. Operations sign-off obtained - COMPLETE

CHANGE REQUEST: CHG0098765 - Emergency firmware update
```

### Example 2: SCADA Network Anomaly Resolution

**Scenario:** Anomalous network traffic detected on SCADA communication channels.

```
OT INCIDENT OT0004533 - RESOLVED
Anomalous Modbus Traffic on SCADA Network
Severity: Critical | Safety Impact: Low (monitoring only)
Duration: 12 hours

AFFECTED: 3 RTUs in Zone 1 (Water Treatment Facility)
Root Cause: Misconfigured network monitoring tool generating
excessive Modbus polling requests

CONTAINMENT: Disabled monitoring tool polling, verified RTU
operation unaffected.

REMEDIATION: Reconfigured monitoring tool with correct polling
intervals. Added Modbus traffic rate limiting at Zone 1 firewall.

LESSONS LEARNED: Network monitoring tools in OT environments
must be validated against OT protocol specifications before
deployment to prevent false positives and operational disruption.
```

## Related Skills

- `otsm/ot-incident-summarization` - Summarize OT incidents with device and safety context
- `secops/incident-summarization` - IT security incident summarization
- `secops/post-incident-analysis` - Post-incident review and analysis
- `itsm/change-management` - Change management for OT remediation activities
