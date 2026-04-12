# /improve-skill - Audit and Improve Claude Code Skills

Evaluate an existing skill (`.claude/commands/*.md`) against best practices and generate an improved version. Use when skills are failing, underperforming, or missing critical sections like error recovery, prerequisites gates, or outcome tracking. Works on any project's skills — not specific to Bridge-to-Fig.

Inspired by [Memento-Skills](https://github.com/Memento-Teams/Memento-Skills) framework patterns: structured metadata, error recovery with diagnostics, pre-execution gates, reflection/outcome tracking, and description optimization for trigger accuracy.

## Workflow

### Step 1: Select Skill to Improve

List available skills:

```bash
ls .claude/commands/*.md
```

Ask the user:

**Which skill would you like to improve?**

1. **Specific skill** — Name the skill (e.g., `/design-system`, `/bind-variables`)
2. **Audit all** — Score every skill and prioritize improvements
3. **New skill** — Create a new skill from scratch using best practices

### Step 2: Audit the Skill

Read the skill file completely and evaluate against these criteria:

#### Scoring Rubric (0-100)

| Criterion | Weight | What to Check |
|-----------|--------|---------------|
| **Trigger Description** | 15% | First paragraph: specific nouns/verbs, when to use, what it produces, disambiguation from similar skills |
| **Prerequisites Gate** | 15% | Systematic checks before execution (service availability, required state, user input) |
| **Workflow Clarity** | 20% | Steps are numbered, each step has clear inputs/outputs, no ambiguous instructions |
| **Error Recovery** | 20% | Top 3-5 failure modes identified, diagnostics provided, recovery actions specific |
| **Outcome Tracking** | 10% | Standardized report format, success/partial/failed status, counts and timing |
| **Data Flow** | 10% | Variables collected before used, pre-flight checklist, no dangling references |
| **Quick Mode** | 10% | Can run with sensible defaults, not just a wall of questions |

#### Scoring Guide

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Production-ready, all patterns present |
| 70-89 | B | Good, missing 1-2 patterns |
| 50-69 | C | Functional but fragile, missing key patterns |
| 30-49 | D | Likely to fail, needs significant work |
| 0-29 | F | Skeleton only, needs rewrite |

### Step 3: Report Findings

Present the audit as a scorecard:

```
Skill Audit: /skill-name
═══════════════════════════

Score: XX/100 (Grade: X)

 Trigger Description:  XX/15  ✓ specific triggers | ✗ missing disambiguation
 Prerequisites Gate:   XX/15  ✗ no systematic checks
 Workflow Clarity:     XX/20  ✓ numbered steps | ✗ ambiguous step 4
 Error Recovery:       XX/20  ✗ no error recovery section
 Outcome Tracking:     XX/10  ✗ no standardized report
 Data Flow:            XX/10  ✓ data table present | ✗ missing pre-flight
 Quick Mode:           XX/10  ✗ asks 6 questions before any work

Top Issues:
1. No error recovery — users get stuck when bridge server is down
2. No prerequisites gate — fails mid-execution if plugin not connected
3. No quick mode — always asks 6 configuration questions

Recommended Improvements:
1. Add Error Recovery section with top 5 failure modes
2. Add Prerequisites Gate before Step 1
3. Add Quick Mode option at Step 1
```

### Step 4: Ask What to Improve

**What would you like to do?**

1. **Apply all recommendations** — Add all missing sections
2. **Fix specific issues** — Choose which improvements to apply
3. **Rewrite from scratch** — Full rewrite using best practices template
4. **Just the report** — No changes, just the audit

### Step 5: Apply Improvements

For each improvement, edit the skill file. Follow these patterns from `prompts/skill-patterns.md`:

#### Adding Prerequisites Gate

Insert after the title and trigger description, before the workflow:

```markdown
## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| [Service] running | [command] | [expected output] | [fix instruction] |
| [State] exists | [command] | [expected output] | [fix instruction] |

**If any check fails, STOP and tell the user what to fix.**
```

#### Adding Error Recovery

Insert after the workflow, before reference files:

```markdown
## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| [Most common failure] | [How to diagnose] | [How to fix] |
| [Second most common] | [How to diagnose] | [How to fix] |
| [Timeout/slow operation] | [How to diagnose] | [How to fix] |
| [Partial failure] | [How to diagnose] | [How to fix] |
| [Missing prerequisite] | [How to diagnose] | [How to fix] |

**On partial failure:** Report what succeeded, what failed, and offer:
1. Retry failed operations only
2. Continue with partial results
3. Abort
```

#### Adding Outcome Tracking

Insert after error recovery:

```markdown
## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Duration** | Xs |
| **Items Processed** | X |
| **Items Created** | X |
| **Issues** | X (Y critical, Z warnings) |
```

#### Adding Quick Mode

Insert at the first user-facing question:

```markdown
**How would you like to proceed?**

1. **Quick mode** — Sensible defaults, minimal questions
   [List what defaults will be used]
2. **Detailed mode** — Full customization
   [Continue to existing questions]
```

#### Improving Trigger Description

Rewrite the first paragraph to include:
- Key nouns users would say
- Key verbs (create, extract, audit, bind, capture)
- What it produces
- When NOT to use it (disambiguation)

### Step 6: Verify Improvements

After editing, re-run the audit to confirm the score improved:

```
Before: XX/100 (Grade: X)
After:  XX/100 (Grade: X)

Improvements applied:
✓ Added Prerequisites Gate (+15 points)
✓ Added Error Recovery (+20 points)
✓ Added Outcome Tracking (+10 points)
✓ Added Quick Mode (+10 points)
```

### Step 7: Audit All (if selected in Step 1)

If user chose "Audit all", score every skill and present a summary:

```
Skill Audit Summary
════════════════════

| Skill | Score | Grade | Top Issue |
|-------|-------|-------|-----------|
| /design-system | 72/100 | B | No error recovery |
| /bind-variables | 65/100 | C | No prerequisites gate |
| /accessibility-audit | 58/100 | C | No quick mode |
| /component-library | 80/100 | B | Missing outcome tracking |
| ... | ... | ... | ... |

Average Score: XX/100
Skills Needing Attention: X (score < 70)

Recommended priority:
1. /skill-name (score: XX) — [top issue]
2. /skill-name (score: XX) — [top issue]
```

## Creating New Skills from Scratch

If the user wants a new skill, use this template:

```markdown
# /skill-name - One-Line Description

[Trigger description: 2-3 sentences. Key nouns, verbs, outputs, disambiguation.]

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| ... | ... | ... | ... |

**If any check fails, STOP and tell the user what to fix.**

## Workflow

### Step 1: Scope and Mode

**How would you like to proceed?**
1. **Quick mode** — [defaults]
2. **Detailed mode** — [full customization]

**What scope?**
1. Current selection
2. Current page
3. Entire file

### Step 2-N: [Execution Steps]

[Each step: clear input, action, output, confirmation point if multi-phase]

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| ... | ... | ... |

## Outcome Tracking

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| ... | ... |

## Reference Files

- [Agent file if applicable]
- [Relevant prompts]
```

## Portability

This skill works on any project with `.claude/commands/*.md` files. The patterns are framework-agnostic:

- **Prerequisites Gate** — Adapt checks to your project's services (API servers, databases, CLI tools)
- **Error Recovery** — Replace failure modes with your project's common errors
- **Outcome Tracking** — Use your project's logging/memory system (or just the report format)
- **Quick Mode** — Identify your project's most common defaults

To use in another project, copy:
1. This file (`.claude/commands/improve-skill.md`)
2. The patterns guide (`prompts/skill-patterns.md`)

## Reference Files

- `prompts/skill-patterns.md` — Complete patterns reference
