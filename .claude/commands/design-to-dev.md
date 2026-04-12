# /design-to-dev - Complete Design-to-Development Pipeline

Master orchestrator that runs the full design-to-development handoff pipeline in 5 phases: pre-flight analysis, design system creation, component library, accessibility audit, and engineering handoff. Use when the user wants an end-to-end pipeline from raw designs to production-ready developer packages. Produces an overall readiness score (0-100) and a complete handoff package. For individual phases, use the specific skills instead (`/design-system`, `/component-library`, `/accessibility-audit`, `/engineering-handoff`).

**IMPORTANT:** For full implementation details, also read `.claude/agents/design-to-dev-orchestrator.md`

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open Figma → Plugins → Bridge to Fig |
| File has content | `getFileInfo` | ≥1 page with frames | Open a Figma file with design content |

**Note:** Design system and components are NOT prerequisites — this skill creates them if they don't exist.

## Workflow

### Step 1: Pre-Flight Check

Inventory the current state:

```bash
# Get file information
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getFileInfo"}'

# Check design system status
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getDesignSystemStatus"}'

# Get existing components
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getComponents"}'

# Get current selection
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "selection"}}'
```

Report to user:
- File: name, pages, frames
- Design system: exists/missing, variable count
- Components: X existing
- Selection: X frames selected

### Step 2: Ask for Scope and Options

**What scope should we process?**

1. **Entire file** — Process all frames and pages
2. **Current selection** — Process selected frames only

**Should we confirm between phases?**

1. **Yes (Recommended for first run)** — Pause after each phase for approval
2. **No** — Run all 5 phases automatically

### Phase 1: Pre-Flight Analysis (Consistency Check)

Scan all frames for inconsistencies:

- Unbound values (colors, typography not using variables)
- Off-palette colors (colors not in the design system)
- Magic numbers (arbitrary spacing/sizing values)
- Naming violations (generic layer names)

Report: X issues found across X frames.

**Confirmation point:** Continue to Phase 2?

### Phase 2: Design System

If design system exists:
- Validate existing system
- Report issues and suggest fixes

If no design system:
- Run the `/design-system-figma-file` workflow
- Create 4-level hierarchy
- Bind variables to elements

Report: X collections, X variables, X bindings, validation score X/100.

**Confirmation point:** Continue to Phase 3?

### Phase 3: Component Library

If components exist:
- Audit existing components
- Standardize layout and naming
- Run quality checks

If no components:
- Identify componentizable patterns
- Run the `/component-library` workflow

Report: X components, X variants, quality score X/100.

**Confirmation point:** Continue to Phase 4?

### Phase 4: Accessibility Audit

Run WCAG AA compliance checks:
- Color contrast validation
- Touch target verification
- Text size checks
- Focus state presence
- Heading hierarchy

Uses the `/accessibility-audit` workflow.

Report: Score X/100, X failures, X warnings.

**Confirmation point:** Continue to Phase 5?

### Phase 5: Engineering Handoff

Generate complete developer package:
- Spec sheets for all components
- CSS/Tailwind code snippets
- Design token to CSS variable mapping
- Asset exports at 1x/2x/3x
- Platform-specific documentation

Uses the `/engineering-handoff` workflow.

Report: X spec sheets, X code snippets, X assets exported.

### Step 3: Final Report

**Design-to-Development Handoff Complete**

| Phase | Score | Status |
|-------|-------|--------|
| Pre-Flight Analysis | — | X issues found |
| Design System | X/100 | X variables, X bindings |
| Components | X/100 | X components, X variants |
| Accessibility | X/100 | X failures, X warnings |
| Handoff | — | X specs, X assets |

**Overall Readiness: X/100**

**Outstanding Items:**
- High priority: list
- Medium priority: list
- Low priority: list

**Next Steps:**
1. Fix accessibility failures
2. Review token mapping with dev team
3. Schedule handoff walkthrough meeting

## Critical vs Non-Critical Failures

| Phase | Failure Type | Action |
|-------|--------------|--------|
| 1 (Analysis) | Critical | Stop — cannot proceed without analysis |
| 2 (Design System) | Critical | Stop — design system required |
| 3 (Components) | Non-Critical | Continue with warning |
| 4 (Accessibility) | Non-Critical | Continue, generate report only |
| 5 (Handoff) | Non-Critical | Continue, partial handoff possible |

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| Phase 1 (Analysis) fails | Consistency checker crashes or times out | Retry with page scope; if still fails, skip to Phase 2 with warning |
| Phase 2 (Design System) fails | `createDesignSystem` error | Check if collections already exist; delete and retry, or use existing system |
| Phase 3 (Components) fails | Component creation errors | Continue — components are non-critical; handoff can proceed with frames |
| Phase 4 (Accessibility) fails | Color analysis timeout | Generate partial report for what succeeded; mark rest as "needs manual review" |
| Phase 5 (Handoff) fails | Export errors | Retry exports individually; generate specs without images if exports fail |
| Sub-skill invocation fails | `/design-system` or `/accessibility-audit` errors | Run the sub-skill independently to diagnose; check its prerequisites |
| Entire pipeline stalls | No progress for >5 minutes | Check `curl localhost:4001/logs/running` for stuck commands; restart plugin |

**Phase failure strategy** (from Critical vs Non-Critical table above):
- Phase 1-2 failures are critical — fix before continuing
- Phase 3-5 failures are non-critical — continue with partial results
- Always save checkpoint after each successful phase so restart is possible

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Overall Readiness** | X/100 |
| **Phases Completed** | X of 5 |
| **Phase 1 (Analysis)** | X issues found |
| **Phase 2 (Design System)** | X/100 — X variables, X bindings |
| **Phase 3 (Components)** | X/100 — X components, X variants |
| **Phase 4 (Accessibility)** | X/100 — X failures, X warnings |
| **Phase 5 (Handoff)** | X specs, X assets |
| **Duration** | Total time across all phases |

## Reference Files

- `.claude/agents/design-to-dev-orchestrator.md` - Full orchestrator agent
- `.claude/agents/consistency-checker.md` - Phase 1
- `.claude/agents/design-system-orchestrator.md` - Phase 2
- `.claude/agents/component-library-orchestrator.md` - Phase 3
- `.claude/agents/accessibility-auditor.md` - Phase 4
- `.claude/agents/engineering-handoff.md` - Phase 5
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
- `prompts/skill-patterns.md` - Skill patterns reference
