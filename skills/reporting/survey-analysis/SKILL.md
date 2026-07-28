---
name: survey-analysis
version: 1.0.1
description: Analyze survey responses by aggregating scores, identifying trends, comparing across periods, and generating improvement recommendations
author: Happy Technologies LLC
tags: [reporting, survey, analysis, feedback, trends, assessment, satisfaction, metrics]
platforms: [claude-code, claude-desktop, chatgpt, cursor, any]
tools:
  mcp:
    - SN-Query-Table
    - SN-Get-Record
    - SN-Natural-Language-Search
    - SN-Execute-Background-Script
    - SN-Add-Work-Notes
  rest:
    - /api/now/table/asmt_assessment_instance
    - /api/now/table/asmt_assessment_instance_question
    - /api/now/table/survey_response
    - /api/now/table/asmt_metric_definition
    - /api/now/table/asmt_assessable_record
    - /api/now/table/asmt_metric_result
  native:
    - Bash
complexity: intermediate
estimated_time: 15-35 minutes
---

# Survey Analysis

## Overview

This skill provides structured analysis of survey and assessment responses in ServiceNow. It covers:

- Aggregating survey scores from `asmt_assessment_instance` and `asmt_assessment_instance_question`
- Analyzing individual response data from `survey_response` for detailed breakdowns
- Identifying trends across time periods by comparing assessment results
- Segmenting responses by department, location, group, or custom dimensions
- Generating statistical summaries (mean, median, distribution) for each question
- Producing actionable improvement recommendations based on score patterns

**When to use:** When analyzing customer satisfaction (CSAT), employee engagement, service quality surveys, or any assessment data collected through ServiceNow Performance Analytics assessments or surveys.

**Value proposition:** Transforms raw survey data into actionable insights, identifies areas needing attention before they become systemic issues, and provides data-driven recommendations for improvement initiatives.

## Prerequisites

- **Plugins:** `com.snc.assessment` (Assessment and Survey), `com.snc.pa` (Performance Analytics, optional)
- **Roles:** `assessment_admin`, `survey_admin`, `pa_admin`, or `admin`
- **Access:** Read access to `asmt_assessment_instance`, `asmt_assessment_instance_question`, `survey_response`, and related metric tables
- **Knowledge:** Understanding of survey structure, scoring scales, and organizational hierarchy

## Procedure

### Step 1: Identify the Survey or Assessment

Find the survey definition and understand its structure.

**Using MCP (Claude Code/Desktop):**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_metric_definition
  query: active=true^typeLIKEsurvey^ORtypeLIKEassessment
  fields: sys_id,name,description,type,category,state,evaluation_method,scale,number_of_responses
  limit: 20
  order_by: name
```

**Using REST API:**
```bash
GET /api/now/table/asmt_metric_definition?sysparm_query=active=true&sysparm_fields=sys_id,name,description,type,category,state,evaluation_method,scale,number_of_responses&sysparm_limit=20&sysparm_display_value=true
```

**Get the survey questions/metrics:**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_metric
  query: metric_definition=[definition_sys_id]^active=true
  fields: sys_id,name,question,datatype,weight,scale,min_value,max_value,order,category
  limit: 50
  order_by: order
```

### Step 2: Retrieve Assessment Instances

Pull completed survey instances for analysis.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance
  query: metric_type=[definition_sys_id]^state=complete^taken_on>=javascript:gs.monthsAgoStart(3)
  fields: sys_id,number,metric_type,user,taken_on,percent,state,group,department,trigger_id
  limit: 100
  order_by: -taken_on
```

**Using REST API:**
```bash
GET /api/now/table/asmt_assessment_instance?sysparm_query=metric_type=[definition_sys_id]^state=complete^taken_on>=javascript:gs.monthsAgoStart(3)&sysparm_fields=sys_id,number,metric_type,user,taken_on,percent,state,group,department&sysparm_limit=100&sysparm_display_value=true
```

### Step 3: Aggregate Scores by Question

Analyze response distributions for each survey question.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Aggregate survey scores by question
  script: |
    var definitionId = '[definition_sys_id]';
    var startDate = gs.monthsAgoStart(3);
    var results = { survey: '', period: 'Last 3 months', total_responses: 0, questions: [] };

    var def = new GlideRecord('asmt_metric_definition');
    def.get(definitionId);
    results.survey = def.name.toString();

    // Count total responses
    var countGa = new GlideAggregate('asmt_assessment_instance');
    countGa.addQuery('metric_type', definitionId);
    countGa.addQuery('state', 'complete');
    countGa.addQuery('taken_on', '>=', startDate);
    countGa.addAggregate('COUNT');
    countGa.query();
    if (countGa.next()) results.total_responses = parseInt(countGa.getAggregate('COUNT'));

    // Get questions
    var metrics = new GlideRecord('asmt_metric');
    metrics.addQuery('metric_definition', definitionId);
    metrics.addQuery('active', true);
    metrics.orderBy('order');
    metrics.query();

    while (metrics.next()) {
      var question = {
        name: metrics.name.toString(),
        question_text: metrics.question.toString(),
        responses: 0,
        avg_score: 0,
        min_score: 999,
        max_score: 0,
        distribution: {}
      };

      var qa = new GlideAggregate('asmt_assessment_instance_question');
      qa.addQuery('metric', metrics.sys_id);
      qa.addQuery('instance.state', 'complete');
      qa.addQuery('instance.taken_on', '>=', startDate);
      qa.addAggregate('AVG', 'value');
      qa.addAggregate('MIN', 'value');
      qa.addAggregate('MAX', 'value');
      qa.addAggregate('COUNT');
      qa.query();

      if (qa.next()) {
        question.responses = parseInt(qa.getAggregate('COUNT'));
        question.avg_score = parseFloat(qa.getAggregate('AVG', 'value')).toFixed(2);
        question.min_score = parseFloat(qa.getAggregate('MIN', 'value'));
        question.max_score = parseFloat(qa.getAggregate('MAX', 'value'));
      }

      // Score distribution
      var dist = new GlideAggregate('asmt_assessment_instance_question');
      dist.addQuery('metric', metrics.sys_id);
      dist.addQuery('instance.state', 'complete');
      dist.addQuery('instance.taken_on', '>=', startDate);
      dist.addAggregate('COUNT');
      dist.groupBy('value');
      dist.query();

      while (dist.next()) {
        question.distribution[dist.value.toString()] = parseInt(dist.getAggregate('COUNT'));
      }

      results.questions.push(question);
    }

    gs.info(JSON.stringify(results, null, 2));
```

### Step 4: Identify Trends Across Periods

Compare survey results across time periods to detect improvements or degradation.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Compare survey scores across monthly periods
  script: |
    var definitionId = '[definition_sys_id]';
    var trends = { survey: '', monthly_scores: [] };

    var def = new GlideRecord('asmt_metric_definition');
    def.get(definitionId);
    trends.survey = def.name.toString();

    for (var i = 5; i >= 0; i--) {
      var monthStart = gs.monthsAgoStart(i);
      var monthEnd = gs.monthsAgoEnd(i);

      var ga = new GlideAggregate('asmt_assessment_instance');
      ga.addQuery('metric_type', definitionId);
      ga.addQuery('state', 'complete');
      ga.addQuery('taken_on', '>=', monthStart);
      ga.addQuery('taken_on', '<=', monthEnd);
      ga.addAggregate('AVG', 'percent');
      ga.addAggregate('COUNT');
      ga.query();

      var monthData = {
        period: new GlideDateTime(monthStart).getMonthLocalTime() + '/' + new GlideDateTime(monthStart).getYearLocalTime(),
        avg_score: 0,
        response_count: 0
      };

      if (ga.next()) {
        monthData.avg_score = parseFloat(ga.getAggregate('AVG', 'percent')).toFixed(1);
        monthData.response_count = parseInt(ga.getAggregate('COUNT'));
      }

      trends.monthly_scores.push(monthData);
    }

    // Calculate trend direction
    var scores = trends.monthly_scores.filter(function(m) { return m.response_count > 0; });
    if (scores.length >= 2) {
      var latest = parseFloat(scores[scores.length - 1].avg_score);
      var previous = parseFloat(scores[scores.length - 2].avg_score);
      trends.trend_direction = latest > previous ? 'Improving' : latest < previous ? 'Declining' : 'Stable';
      trends.change_percentage = ((latest - previous) / previous * 100).toFixed(1) + '%';
    }

    gs.info(JSON.stringify(trends, null, 2));
```

### Step 5: Segment by Department or Group

Break down results by organizational dimension for targeted insights.

**Using MCP:**
```
Tool: SN-Execute-Background-Script
Parameters:
  description: Segment survey results by department
  script: |
    var definitionId = '[definition_sys_id]';
    var segments = [];

    var ga = new GlideAggregate('asmt_assessment_instance');
    ga.addQuery('metric_type', definitionId);
    ga.addQuery('state', 'complete');
    ga.addQuery('taken_on', '>=', gs.monthsAgoStart(3));
    ga.addAggregate('AVG', 'percent');
    ga.addAggregate('COUNT');
    ga.groupBy('user.department');
    ga.orderByAggregate('AVG', 'percent');
    ga.query();

    while (ga.next()) {
      segments.push({
        department: ga.user.department.getDisplayValue() || 'Unknown',
        avg_score: parseFloat(ga.getAggregate('AVG', 'percent')).toFixed(1),
        response_count: parseInt(ga.getAggregate('COUNT'))
      });
    }

    gs.info(JSON.stringify(segments, null, 2));
```

### Step 6: Analyze Free-Text Responses

Extract themes from open-ended survey responses.

**Using MCP:**
```
Tool: SN-Query-Table
Parameters:
  table_name: asmt_assessment_instance_question
  query: instance.metric_type=[definition_sys_id]^metric.datatype=string^string_valueISNOTEMPTY^instance.taken_on>=javascript:gs.monthsAgoStart(3)
  fields: string_value,metric.name,instance.taken_on,instance.user.department
  limit: 100
  order_by: -instance.taken_on
```

**Using REST API:**
```bash
GET /api/now/table/asmt_assessment_instance_question?sysparm_query=instance.metric_type=[definition_sys_id]^metric.datatype=string^string_valueISNOTEMPTY^instance.taken_on>=javascript:gs.monthsAgoStart(3)&sysparm_fields=string_value,metric.name,instance.taken_on,instance.user.department&sysparm_limit=100&sysparm_display_value=true
```

### Step 7: Generate Recommendations Report

Compile findings into an actionable report.

**Using MCP:**
```
Tool: SN-Add-Work-Notes
Parameters:
  table_name: asmt_metric_definition
  sys_id: [definition_sys_id]
  work_notes: |
    === SURVEY ANALYSIS REPORT ===
    Survey: IT Service Satisfaction Q1 2026
    Period: January - March 2026
    Total Responses: 342

    OVERALL SCORE: 78.4% (Previous quarter: 74.2%, +5.7%)

    QUESTION BREAKDOWN:
    1. Response Time Satisfaction: 72.3% (Low - needs attention)
    2. Resolution Quality: 85.1% (Good)
    3. Communication Clarity: 81.7% (Good)
    4. Overall Experience: 74.5% (Below target of 80%)

    DEPARTMENT SEGMENTS:
    - Engineering: 82.1% (Highest)
    - Sales: 71.3% (Lowest - declined 8% from Q4)
    - Marketing: 78.9% (Stable)
    - Finance: 76.2% (Improved +4%)

    KEY THEMES FROM COMMENTS:
    - Positive: Knowledge base improvements noted (23 mentions)
    - Negative: Long wait times for priority 3 tickets (31 mentions)
    - Negative: Inconsistent updates during resolution (18 mentions)

    RECOMMENDATIONS:
    1. Focus on P3 response times for Sales department (dedicated queue recommended)
    2. Implement automated status updates every 4 hours for open tickets
    3. Continue knowledge base investment (showing positive ROI)
    4. Schedule targeted follow-up survey for Sales department

    TREND: Improving (+5.7% QoQ)
    RISK: Sales department declining - escalate to VP Sales
```

## Tool Usage

### MCP Tools Reference

| Tool | When to Use |
|------|-------------|
| `SN-Query-Table` | Query survey definitions, instances, questions, and responses |
| `SN-Get-Record` | Retrieve specific survey or assessment details |
| `SN-Natural-Language-Search` | Find surveys by keyword or description |
| `SN-Execute-Background-Script` | Complex aggregations, trend analysis, segmentation |
| `SN-Add-Work-Notes` | Post analysis reports to survey or assessment records |

### REST API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/now/table/asmt_metric_definition` | GET | Query survey/assessment definitions |
| `/api/now/table/asmt_metric` | GET | Retrieve survey questions and metrics |
| `/api/now/table/asmt_assessment_instance` | GET | Query completed survey instances |
| `/api/now/table/asmt_assessment_instance_question` | GET | Get individual question responses |
| `/api/now/table/survey_response` | GET | Access legacy survey response data |
| `/api/now/table/asmt_metric_result` | GET | Query pre-aggregated metric results |

## Best Practices

- **Set minimum response thresholds:** Do not draw conclusions from segments with fewer than 10 responses
- **Use percentage scores for comparison:** Raw scores vary by scale; normalize to percentages for cross-survey comparison
- **Include response rates:** Low response rates may indicate survey fatigue or distribution issues
- **Segment meaningfully:** Break down by dimensions that align with organizational accountability (department, region, support group)
- **Track trends over 3+ periods:** Single-period analysis is less reliable than multi-period trend data
- **Weight questions appropriately:** Not all questions are equally important; consider weighted averages for composite scores
- **Act on results:** Every analysis should produce at least one actionable recommendation with a clear owner
- **Close the loop:** Follow up on previous recommendations in subsequent survey analyses to track improvement

## Troubleshooting

### No Assessment Instances Found

**Cause:** Assessment definition sys_id is incorrect, or no instances are in "complete" state
**Solution:** Query `asmt_assessment_instance` without the state filter to see all instances. Check if the definition uses a different `state` value (e.g., "closed" vs "complete").

### Question Scores Showing Zero

**Cause:** The `value` field in `asmt_assessment_instance_question` may not be populated; some assessments store results in `string_value` or `scaled_value`
**Solution:** Check the question `datatype` field and query the appropriate value column. For scaled questions, use `scaled_value` instead of `value`.

### Department Segmentation Returns "Unknown"

**Cause:** Survey respondents' user records do not have the `department` field populated
**Solution:** Try alternative grouping fields such as `user.company`, `user.location`, or `user.cost_center`.

### Historical Data Missing for Trend Analysis

**Cause:** Assessment instances may be archived or the survey was recently created
**Solution:** Extend the date range or check if the instance uses table rotation. For new surveys, note that trends require at least 2-3 periods of data.

## Examples

### Example 1: CSAT Score Dashboard

**Input:** "Analyze customer satisfaction survey results for Q1 2026"

**Process:** Query assessment instances for the CSAT survey, aggregate by question, segment by support group, compare with Q4 2025, and generate a dashboard-ready summary.

### Example 2: Employee Engagement Trend

**Input:** "Show me the trend for employee engagement scores over the last 6 months"

```
# Run the trend analysis from Step 4 with definitionId for employee engagement survey
# Output: Monthly scores with trend direction and percentage change
```

### Example 3: Low-Score Investigation

**Input:** "Why did satisfaction scores drop in the Sales department?"

```
# 1. Segment by department (Step 5) to confirm the drop
# 2. Drill into question-level scores for Sales respondents
# 3. Extract free-text responses from Sales (Step 6)
# 4. Cross-reference with incident/request data for Sales during the period
# 5. Generate targeted recommendations
```

## Related Skills

- `reporting/trend-analysis` - General trend analysis across ServiceNow data
- `reporting/executive-dashboard` - Build executive summary dashboards
- `reporting/sla-analysis` - Correlate survey scores with SLA performance
- `csm/sentiment-analysis` - Sentiment analysis for customer feedback
- `hrsd/sentiment-analysis` - Employee sentiment analysis
