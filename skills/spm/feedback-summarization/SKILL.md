---
name: feedback-summarization
version: 1.0.1
description: Summarize feedback from retrospectives, sprint reviews, and stakeholder surveys to identify themes and action items
author: Happy Technologies LLC
tags: [spm, feedback, retrospective, sprint-review, summarization, themes, action-items, agile, continuous-improvement]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Create-Record
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/rm_sprint
    - /api/now/table/rm_story
    - /api/now/table/rm_scrum_task
    - /api/now/table/rm_release
    - /api/now/table/asmt_assessment_instance
    - /api/now/table/asmt_assessment_instance_question
    - /api/now/table/sys_journal_field
    - /api/now/table/pm_project_task
  native:
    - Bash
complexity: intermediate
estimated_time: 15-30 minutes
---

# Feedback Summarization

## Overview

This skill summarizes feedback collected from agile ceremonies, stakeholder surveys, and project reviews within ServiceNow SPM. It covers:

- Extracting feedback from sprint retrospective records and comments in `rm_sprint`
- Analyzing sprint review notes and stakeholder assessments from `asmt_assessment_instance`
- Identifying recurring themes across multiple feedback sources
- Categorizing feedback into actionable themes (process, tools, communication, quality, workload)
- Generating prioritized action items from aggregated feedback
- Tracking action item resolution across sprints for continuous improvement

**When to use:** When scrum masters need to summarize retrospective feedback, when project managers want to aggregate stakeholder sentiment, when leadership needs a cross-team view of recurring improvement themes, or when preparing for quarterly planning sessions.

**Value proposition:** Transforms scattered feedback into structured insights, reveals cross-sprint patterns that individual retros miss, and creates accountability for improvement actions by tracking them across iterations.

## Prerequisites

- **Plugins:** `com.snc.sdlc.agile.2.0` (Agile Development 2.0), `com.snc.assessment` (optional, for surveys)
- **Roles:** `scrum_master`, `scrum_admin`, `pa_admin`, or `admin`
- **Access:** Read access to `rm_sprint`, `rm_story`, `asmt_assessment_instance`, and journal field tables
- **Knowledge:** Understanding of agile ceremonies, retrospective formats, and the team's sprint cadence

## Procedure

### Step 1: Gather Sprint Retrospective Data

Retrieve retrospective feedback from sprint records and associated journal entries.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_sprint
  query: release.product.sys_id=[product_sys_id]^state=3^ORDERBYDESCend_date
  fields: sys_id,number,short_description,start_date,end_date,state,story_points,capacity,retrospective_notes,velocity
  limit: 6
```

**Using REST API:**
```bash
GET /api/now/table/rm_sprint?sysparm_query=release.product.sys_id=[product_sys_id]^state=3^ORDERBYDESCend_date&sysparm_fields=sys_id,number,short_description,start_date,end_date,state,story_points,capacity,retrospective_notes,velocity&sysparm_limit=6&sysparm_display_value=true
```

**Retrieve journal/work notes for detailed feedback:**
```
Tool: SN-Query-Table
Parameters:
  table_name: sys_journal_field
  query: name=rm_sprint^element=work_notes^element_id=[sprint_sys_id]
  fields: value,sys_created_on,sys_created_by
  limit: 30
  order_by: -sys_created_on
```

### Step 2: Collect Stakeholder Survey Responses

Gather assessment data from sprint review or stakeholder surveys.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance
  query: metric_type.nameLIKEsprint review^ORmetric_type.nameLIKEstakeholder^state=complete^taken_on>=javascript:gs.monthsAgoStart(3)
  fields: sys_id,number,metric_type,user,user.department,taken_on,percent,state,trigger_id
  limit: 50
  order_by: -taken_on
```

**Get individual question responses:**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance_question
  query: instance.metric_type.nameLIKEsprint review^instance.taken_on>=javascript:gs.monthsAgoStart(3)^metric.datatype=string^string_valueISNOTEMPTY
  fields: string_value,metric.name,metric.question,instance.taken_on,instance.user.name
  limit: 100
  order_by: -instance.taken_on
```

**Using REST API:**
```bash
GET /api/now/table/asmt_assessment_instance_question?sysparm_query=instance.metric_type.nameLIKEsprint%20review^metric.datatype=string^string_valueISNOTEMPTY^instance.taken_on>=javascript:gs.monthsAgoStart(3)&sysparm_fields=string_value,metric.name,instance.taken_on,instance.user.name&sysparm_limit=100&sysparm_display_value=true
```

### Step 3: Analyze Sprint Performance Metrics

Correlate feedback with actual sprint performance data.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Analyze sprint performance metrics for feedback context
  script: |
    var productId = '[product_sys_id]';
    var sprintMetrics = [];

    var sprint = new GlideRecord('rm_sprint');
    sprint.addQuery('release.product.sys_id', productId);
    sprint.addQuery('state', 3); // Complete
    sprint.orderByDesc('end_date');
    sprint.setLimit(6);
    sprint.query();

    while (sprint.next()) {
      var metrics = {
        sprint: sprint.short_description.toString(),
        number: sprint.number.toString(),
        dates: sprint.start_date.getDisplayValue() + ' to ' + sprint.end_date.getDisplayValue(),
        planned_points: parseInt(sprint.capacity) || 0,
        completed_points: parseInt(sprint.story_points) || 0,
        velocity: 0,
        stories: { total: 0, completed: 0, carried_over: 0 },
        defects_found: 0
      };

      metrics.velocity = metrics.planned_points > 0
        ? Math.round((metrics.completed_points / metrics.planned_points) * 100) : 0;

      // Story completion
      var stories = new GlideAggregate('rm_story');
      stories.addQuery('sprint', sprint.sys_id);
      stories.addAggregate('COUNT');
      stories.groupBy('state');
      stories.query();
      while (stories.next()) {
        var count = parseInt(stories.getAggregate('COUNT'));
        metrics.stories.total += count;
        var state = parseInt(stories.state);
        if (state >= 3) metrics.stories.completed += count;
        else metrics.stories.carried_over += count;
      }

      // Defects
      var defects = new GlideAggregate('rm_story');
      defects.addQuery('sprint', sprint.sys_id);
      defects.addQuery('classification', 'Defect');
      defects.addAggregate('COUNT');
      defects.query();
      if (defects.next()) metrics.defects_found = parseInt(defects.getAggregate('COUNT'));

      sprintMetrics.push(metrics);
    }

    gs.info(JSON.stringify(sprintMetrics, null, 2));
```

### Step 4: Identify Themes from Feedback

Analyze collected feedback to extract recurring themes.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Categorize feedback into themes
  script: |
    var sprintIds = ['sprint_sys_id_1', 'sprint_sys_id_2', 'sprint_sys_id_3'];
    var themes = {
      process: { count: 0, items: [] },
      tools: { count: 0, items: [] },
      communication: { count: 0, items: [] },
      quality: { count: 0, items: [] },
      workload: { count: 0, items: [] },
      positive: { count: 0, items: [] },
      other: { count: 0, items: [] }
    };

    // Keyword mapping for theme detection
    var keywords = {
      process: ['standup', 'ceremony', 'planning', 'refinement', 'workflow', 'process', 'methodology', 'sprint', 'retro'],
      tools: ['jira', 'servicenow', 'jenkins', 'pipeline', 'tooling', 'environment', 'infrastructure', 'slow', 'broken'],
      communication: ['communication', 'unclear', 'alignment', 'stakeholder', 'meeting', 'update', 'inform', 'silos'],
      quality: ['bug', 'defect', 'testing', 'review', 'code review', 'quality', 'regression', 'production issue'],
      workload: ['overloaded', 'capacity', 'bandwidth', 'too many', 'burnout', 'deadline', 'overtime', 'scope creep'],
      positive: ['great', 'improved', 'well done', 'excellent', 'good job', 'kudos', 'thank', 'appreciate']
    };

    sprintIds.forEach(function(sprintId) {
      var journal = new GlideRecord('sys_journal_field');
      journal.addQuery('name', 'rm_sprint');
      journal.addQuery('element_id', sprintId);
      journal.addQuery('element', 'work_notes');
      journal.query();

      while (journal.next()) {
        var text = journal.value.toString().toLowerCase();
        var categorized = false;

        for (var theme in keywords) {
          keywords[theme].forEach(function(kw) {
            if (text.indexOf(kw) >= 0 && !categorized) {
              themes[theme].count++;
              themes[theme].items.push({
                text: journal.value.toString().substring(0, 200),
                sprint: sprintId,
                date: journal.sys_created_on.getDisplayValue()
              });
              categorized = true;
            }
          });
        }

        if (!categorized) {
          themes.other.count++;
          themes.other.items.push({
            text: journal.value.toString().substring(0, 200),
            sprint: sprintId
          });
        }
      }
    });

    gs.info(JSON.stringify(themes, null, 2));
```

### Step 5: Generate Action Items

Create trackable action items from identified themes.

**Using MCP:**
```
Tool: SN-Create-Record
Parameters:
  table_name: rm_story
  fields:
    short_description: "Retro Action: Implement automated regression test suite for checkout flow"
    description: |
      ## Source
      Sprint retrospective feedback across Sprints 23-25

      ## Theme
      Quality - recurring defects in checkout flow detected late in sprint

      ## Feedback Summary
      - Sprint 23: "We found 3 production bugs in checkout that should have been caught"
      - Sprint 24: "Still seeing regression issues in payment processing"
      - Sprint 25: "Need automated tests before we add more features"

      ## Action
      Create ATF test suite covering all checkout scenarios. Target: 80% coverage of critical paths.

      ## Success Criteria
      - ATF suite running in CI/CD pipeline
      - Zero checkout regressions for 2 consecutive sprints
    classification: Improvement
    priority: 2
    state: -6
    epic: [improvement_epic_sys_id]
    sprint: [next_sprint_sys_id]
    story_points: 8
    product: [product_sys_id]
```

### Step 6: Generate the Feedback Summary Report

Compile all analysis into a comprehensive summary.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: rm_sprint
  sys_id: [current_sprint_sys_id]
  work_notes: |
    === FEEDBACK SUMMARY REPORT ===
    Product: Customer Portal
    Period: Sprints 23-25 (Feb 3 - Mar 14, 2026)
    Sources: 3 sprint retros, 12 stakeholder surveys, 45 work note entries

    SPRINT PERFORMANCE TREND:
    - Sprint 23: 34/40 pts completed (85% velocity)
    - Sprint 24: 38/40 pts completed (95% velocity) - Improved
    - Sprint 25: 32/45 pts completed (71% velocity) - Declined (scope increase)

    TOP THEMES (by frequency):
    1. QUALITY (18 mentions) - Recurring defects in checkout flow, need for automated testing
    2. WORKLOAD (14 mentions) - Scope creep in Sprint 25, team overloaded with support tickets
    3. COMMUNICATION (11 mentions) - Stakeholder requirements changing mid-sprint
    4. TOOLS (7 mentions) - CI/CD pipeline reliability issues causing deployment delays
    5. POSITIVE (9 mentions) - Improved sprint planning, better story refinement

    RECURRING ISSUES (appeared in 2+ sprints):
    - Checkout regression bugs (Sprints 23, 24, 25)
    - Mid-sprint scope changes (Sprints 24, 25)
    - Environment instability (Sprints 23, 25)

    ACTION ITEMS GENERATED:
    1. [P2] Create automated regression suite for checkout (8 pts) - Sprint 26
    2. [P2] Implement change freeze policy for mid-sprint scope (3 pts) - Sprint 26
    3. [P3] Investigate and stabilize CI/CD pipeline (5 pts) - Sprint 27
    4. [P3] Establish support ticket rotation to protect sprint capacity (2 pts) - Sprint 26

    STAKEHOLDER SENTIMENT:
    - Overall satisfaction: 72% (down from 78% last quarter)
    - Key concern: "Delivery predictability has decreased"
    - Key positive: "Quality of delivered features has improved"

    PREVIOUS ACTION ITEM STATUS:
    - [DONE] Improve story refinement process - Completed Sprint 24
    - [IN PROGRESS] Reduce meeting overhead - 50% reduction achieved
    - [NOT STARTED] Cross-training initiative - Deferred to Q2

    RECOMMENDATIONS:
    1. Protect sprint scope with formal change request process
    2. Invest in test automation to reduce manual regression effort
    3. Address stakeholder concern about predictability with revised velocity baseline
```

### Step 7: Track Action Items Across Sprints

Monitor resolution of feedback-generated action items.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: rm_story
  query: classification=Improvement^epic=[improvement_epic_sys_id]
  fields: number,short_description,state,sprint,story_points,assigned_to,priority,sys_updated_on
  limit: 25
  order_by: -sys_created_on
```

**Using REST API:**
```bash
GET /api/now/table/rm_story?sysparm_query=classification=Improvement^epic=[improvement_epic_sys_id]&sysparm_fields=number,short_description,state,sprint,story_points,assigned_to,priority&sysparm_limit=25&sysparm_display_value=true
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query sprints, stories, assessments, and journal entries |
| `SN-Get-Record` | Retrieve specific sprint or assessment details |
| `SN-Natural-Language-Search` | Find feedback by keyword or topic description |
| `SN-Create-Record` | Create action items as improvement stories |
| `SN-Execute-Background-Script` | Aggregate metrics, categorize themes, batch analysis |
| `SN-Add-Work-Notes` | Post summary reports to sprint or project records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/rm_sprint` | GET | Query sprint records and retrospective data |
| `/api/now/table/rm_story` | GET/POST | Query stories and create action items |
| `/api/now/table/asmt_assessment_instance` | GET | Retrieve stakeholder survey responses |
| `/api/now/table/asmt_assessment_instance_question` | GET | Get individual survey question answers |
| `/api/now/table/sys_journal_field` | GET | Read work notes and comments |
| `/api/now/table/rm_release` | GET | Release-level feedback aggregation |

## Best Practices

- **Collect feedback consistently:** Use the same retrospective format each sprint so themes can be compared across periods
- **Categorize before summarizing:** Group feedback into themes first, then summarize; raw lists are less actionable
- **Track action items formally:** Create stories or tasks for every action item; verbal commitments are forgotten
- **Close the loop:** Start each retro by reviewing status of previous action items before collecting new feedback
- **Quantify where possible:** "3 production bugs" is more actionable than "quality issues"
- **Separate observation from recommendation:** Clearly distinguish what happened (theme) from what to do about it (action)
- **Aggregate across teams:** Cross-team theme analysis reveals systemic issues that individual team retros miss
- **Limit action items per sprint:** Focus on 2-3 improvement actions per sprint; too many dilutes focus

## Troubleshooting

### Retrospective Notes Field Is Empty

**Cause:** Team may store retro feedback in work notes, comments, or external tools rather than the `retrospective_notes` field
**Solution:** Query `sys_journal_field` for the sprint record to find work note entries. Check if the team uses an external retro tool that needs integration.

### Survey Responses Not Linked to Sprint

**Cause:** Assessment instances may not have the `trigger_id` set to the sprint sys_id
**Solution:** Match surveys by date range (survey `taken_on` within sprint start/end dates) rather than direct reference.

### Theme Categorization Misses Feedback

**Cause:** Keyword-based categorization is limited; feedback may use different terminology
**Solution:** Expand the keyword lists based on your team's language. Consider using NLU or text analysis APIs for more accurate categorization.

### Action Items Not Being Completed

**Cause:** Action items are created but not prioritized or assigned in the next sprint
**Solution:** Add action item review as a mandatory step in sprint planning. Set the `sprint` field to the next sprint when creating the improvement story.

## Examples

### Example 1: Single Sprint Retro Summary

**Input:** "Summarize the retrospective from Sprint 25"

**Process:** Run Steps 1, 3, and 6 for the specific sprint to generate a focused summary with themes, metrics, and 2-3 action items.

### Example 2: Quarterly Improvement Trend

**Input:** "What improvement themes have recurred over the last quarter?"

**Process:** Run Steps 1-4 across all sprints in the quarter, then identify themes appearing in 3+ sprints for escalation.

### Example 3: Stakeholder Sentiment Analysis

**Input:** "How do stakeholders feel about our delivery quality this quarter?"

```
# 1. Query stakeholder assessments (Step 2)
# 2. Aggregate scores by question (quality-related questions)
# 3. Extract free-text comments about quality
# 4. Compare with previous quarter
# 5. Correlate with defect counts from Step 3
```

## Related Skills

- `spm/agile-story-generation` - Generate stories from improvement action items
- `spm/acceptance-criteria` - Define acceptance criteria for improvement stories
- `spm/project-insights` - Project health and velocity tracking
- `spm/planning-summarization` - Sprint and release planning summaries
- `reporting/survey-analysis` - Detailed survey response analysis
- `reporting/trend-analysis` - General trend analysis capabilities
