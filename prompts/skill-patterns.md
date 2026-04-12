# Skill Patterns — Best Practices for Claude Code Skills

Portable patterns for writing high-quality `.claude/commands/*.md` skills in any project.
Distilled from [Memento-Skills](https://github.com/Memento-Teams/Memento-Skills) framework patterns, adapted for Claude Code.

---

## 1. Skill Anatomy

Every skill should contain these sections in order:

```markdown
# /skill-name - One-Line Description

Trigger description: 2-3 sentences explaining WHEN to use this skill
and WHAT it produces. Optimized for routing accuracy — the AI reads
this to decide whether to invoke the skill.

## Prerequisites Gate

Systematic checks before execution begins.

## Workflow

Step-by-step execution logic.

## Error Recovery

Common failures, diagnostics, and recovery actions.

## Outcome Tracking

Standardized success/failure reporting.

## Reference Files

Links to agents, prompts, and documentation.
```

---

## 2. Trigger Description (Routing Accuracy)

The first paragraph after the title is the **trigger description**. It determines whether the skill gets invoked for a given user request. Write it like a search index entry:

**Bad** (too vague):
> Create a design system.

**Good** (specific triggers):
> Create a complete design system with variables, color scales, typography styles, and effect styles from the connected Figma file. Use when the user wants to extract tokens from an existing design and organize them into a multi-level variable hierarchy (4-level, 3-level, Material Design, Tailwind, etc.).

**Rules:**
- Include the key nouns users would say ("design system", "variables", "accessibility audit")
- Include the verbs ("create", "extract", "bind", "audit", "capture")
- Mention what it produces ("color scales", "CSS snippets", "handoff package")
- Mention when NOT to use it if there's a similar skill ("not for website extraction — use /design-system-website instead")

---

## 3. Prerequisites Gate

Check everything the skill needs before doing any work. Fail fast with clear guidance.

```markdown
## Prerequisites Gate

Before starting, verify:

| Check | Command | Expected | If Missing |
|-------|---------|----------|------------|
| Server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` |
| Plugin connected | Send `ping` command | Response within 15s | Open plugin in Figma |
| Selection exists | Query selection | ≥1 frame selected | Ask user to select frames |
| Design system exists | `getDesignSystemStatus` | Collections found | Run /design-system first |

**If any check fails, STOP and tell the user what to fix. Do not proceed.**
```

**Pattern**: Check → Report → Gate (pass/fail) → Proceed or Stop

**Universal checks** (adapt per project):
- Service availability (API server, database, external tools)
- Required state (files exist, correct branch, dependencies installed)
- User input validity (selection, configuration, parameters)
- Permissions (write access, API keys, credentials)

---

## 4. Execution Modes

Offer two modes when a skill has many configuration options:

```markdown
### Execution Mode

**How would you like to proceed?**

1. **Quick mode** — Use sensible defaults, minimal questions
   - Default organizing principle, auto-detect brand colors, include boilerplate
   - Best for: First-time use, prototyping, "just make it work"

2. **Detailed mode** — Full customization, confirm each step
   - Choose organizing principle, confirm colors, configure boilerplate
   - Best for: Production use, specific requirements, team standards
```

**Rules:**
- Quick mode should produce good results with zero user input beyond the trigger
- Detailed mode should never skip a configuration step
- Both modes produce the same output format
- Default to Quick mode if the user just says "do it"

---

## 5. Error Recovery

Every skill should anticipate its top 3-5 failure modes with specific recovery actions.

### Error Classification (adapted from Memento-Skills)

| Category | Description | Example |
|----------|-------------|---------|
| `CONNECTION` | Service unreachable | Bridge server not running |
| `TIMEOUT` | Operation took too long | File-scope extraction on large file |
| `INPUT` | Bad parameters or missing data | No frames selected |
| `STATE` | Wrong precondition | No design system exists |
| `RUNTIME` | Unexpected failure during execution | Figma API error |
| `PARTIAL` | Some operations succeeded, others failed | 80% of bindings succeeded |

### Recovery Template

```markdown
## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| Bridge server not responding | `curl localhost:4001/health` | Run `pnpm dev` from bridge-server/ |
| Plugin not connected | `ping` command times out | Open Figma → Plugins → Bridge to Fig |
| Extraction timeout | Command runs >5 min | Retry with `scope: "page"` instead of `scope: "file"` |
| No matching variables | Binding returns 0 matches | Verify design system exists first |
| Partial binding failure | X of Y nodes bound | Check unbound report, create missing variables |

**On partial failure:** Report what succeeded, what failed, and offer:
1. Retry failed operations only
2. Continue with partial results
3. Abort and roll back (if possible)
```

**Rules:**
- Never silently fail — always surface what went wrong
- Classify the error so the user understands the category
- Provide the diagnostic command to verify the issue
- Give the specific recovery action, not "try again"
- For partial failures, preserve successful work

---

## 6. Outcome Tracking

After every skill execution, produce a standardized outcome report. This enables cross-session learning when paired with a memory/logging system.

### Outcome Schema

```markdown
## Outcome Tracking

After execution, log the outcome:

**Status:** `success` | `partial` | `failed`
**Duration:** Time from start to completion
**Inputs:** Key parameters used
**Outputs:** What was created/modified (with counts)
**Issues:** Problems encountered (with severity)
**Score:** Quality metric if applicable (0-100)

### Memory Integration (optional)

If a memory server is available, save the outcome:
POST http://localhost:8080/memories
{
  "type": "skill_outcome",
  "skill": "/skill-name",
  "status": "success|partial|failed",
  "summary": "Created 4-level design system with 130 variables, bound 450 nodes",
  "issues": ["3 unbound nodes with off-palette colors"],
  "score": 95,
  "timestamp": "ISO-8601"
}

Before executing, search for past outcomes:
GET http://localhost:8080/search?q=skill-name+common+issues
Use past failures to preemptively avoid known problems.
```

**Rules:**
- Always report outcome even on failure
- Include counts (nodes processed, variables created, errors found)
- Include timing for performance tracking
- Score only when the skill has measurable quality criteria
- Memory integration is optional — the outcome report itself is the minimum

---

## 7. Progressive Phases with Confirmation Points

For multi-step workflows, use the phase pattern with explicit gates:

```markdown
### Phase 1: Extract (automatic)
  ↓ Report results
  ↓ [Confirmation Point] "Found X colors, Y fonts. Continue?"

### Phase 2: Create (automatic)
  ↓ Report results
  ↓ [Confirmation Point] "Created X variables. Continue to binding?"

### Phase 3: Bind (automatic)
  ↓ Report results
  ↓ [Final Report]
```

**Rules:**
- Each phase is self-contained — it can be retried independently
- Confirmation points show what was done and what comes next
- On failure, report which phase failed and offer to retry from that phase
- Store phase outputs so later phases can reference earlier results
- Mark phases as completed in TodoWrite as they finish

---

## 8. Data Collection Table

For skills that gather inputs across multiple steps, maintain an explicit data table:

```markdown
## Data to Collect

| Variable | Collected In | Used In | Required | Default |
|----------|--------------|---------|----------|---------|
| `scope` | Step 1 | Step 3-5 | Yes | "selection" |
| `primaryColor` | Step 2 | Step 4 | Yes | auto-detect |
| `includeBoilerplate` | Step 3 | Step 4 | Yes | true |

**Pre-flight check before execution:** Verify all required variables are set.
```

This prevents the most common skill failure: reaching an execution step with missing data.

---

## 9. Scope Selection (Universal Pattern)

Most skills need a scope. Standardize the question:

```markdown
**What scope should we process?**

1. **Current selection** — Process selected elements only (fastest)
2. **Current page** — Process all elements on the active page
3. **Entire file** — Process everything (may take several minutes)
```

Always default to the narrowest scope that makes sense. Warn about timing for broader scopes.

---

## 10. Report Format (Standardized)

End every skill with a consistent report:

```markdown
### Final Report

| Metric | Value |
|--------|-------|
| **Status** | Success / Partial / Failed |
| **Duration** | Xs |
| **Items Processed** | X |
| **Items Created** | X |
| **Items Modified** | X |
| **Issues Found** | X (Y critical, Z warnings) |
| **Quality Score** | X/100 (if applicable) |

**What was done:**
- Bullet list of completed actions

**Issues (if any):**
- Bullet list of problems with severity

**Recommended next steps:**
1. Numbered list of follow-up actions
```

---

## 11. Skill Composition

Skills can invoke other skills. Document the dependency:

```markdown
## Skill Dependencies

This skill may invoke:
- `/design-system` — If no design system exists (Phase 2)
- `/accessibility-audit` — For compliance checking (Phase 4)
- `/engineering-handoff` — For developer deliverables (Phase 5)

Each sub-skill runs with its own prerequisites gate.
```

---

## 12. Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Better Approach |
|-------------|-------------|-----------------|
| Asking 10 questions before doing anything | User loses patience | Quick mode with defaults + detailed mode option |
| Silent failures | User doesn't know what went wrong | Always report errors with diagnostics |
| Hardcoded IDs or values | Break across sessions | Always query fresh state |
| No pre-flight checks | Fails mid-execution | Gate all prerequisites upfront |
| No outcome report | Can't improve over time | Standardized report format |
| Monolithic execution | Can't retry partial failures | Phase-based with checkpoints |
| Vague descriptions | Wrong skill gets triggered | Specific trigger descriptions with key nouns/verbs |
| No error recovery section | User is stuck | Top 5 failure modes with recovery actions |

---

## Applying to Existing Skills

To retrofit these patterns into existing skills:

1. **Add trigger description** — Rewrite the first paragraph for routing accuracy
2. **Add Prerequisites Gate** — What must be true before this skill runs?
3. **Add Error Recovery** — What are the top 5 failure modes?
4. **Add Outcome Tracking** — What does the success report look like?
5. **Add Quick Mode** — Can this skill run with zero questions?
6. **Review data flow** — Is every variable collected before it's used?

These improvements can be applied incrementally — start with the skills that fail most often.
