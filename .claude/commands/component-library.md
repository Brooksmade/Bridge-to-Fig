# /component-library - Create a Component Library

Build a production-ready component library with variants, auto layout, naming conventions, quality checks, and developer handoff.

**IMPORTANT:** For full implementation details, also read `.claude/agents/component-library-orchestrator.md`

## Workflow

### Step 1: Pre-Flight Check

Inventory existing assets:

```bash
# Check for existing components
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getComponents"}'

# Check for design system
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getDesignSystemStatus"}'

# Get current selection
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "selection"}}'
```

Report to user:
- Existing components: X
- Design system: exists/missing
- Selected frames: X

**If no design system exists:** Suggest running `/design-system-figma-file` first.

### Step 2: Ask for Input Source and Phases

**How would you like to create components?**

1. **From requirements** — Describe what components you need (e.g., Button, Input, Card)
2. **From existing frames** — Convert selected frames to components

**Which phases should we run?**

1. **All phases (Recommended)** — Create → Layout → Name → QA → Handoff
2. **Create only** — Just create components and variants
3. **Custom** — Let me choose which phases to run

**Should we pause between phases for approval?**

1. **Yes** — Confirm after each phase before continuing
2. **No** — Run all phases automatically

### Phase 1: Create Components

Create components with variant matrices (Size × Type × State):

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createComponent", "payload": {
    "name": "Button",
    "properties": {"x": 0, "y": 0, "width": 120, "height": 40}
  }}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createComponentSet", "payload": {
    "name": "Button",
    "variants": ["size=small", "size=medium", "size=large", "type=primary", "type=secondary"]
  }}'
```

Report: Components created, variants per component.

### Phase 2: Configure Layout

Apply auto layout and constraints to all variants:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setAutoLayout", "target": "NODE_ID", "payload": {
    "layoutMode": "HORIZONTAL",
    "itemSpacing": 8,
    "paddingLeft": 16, "paddingRight": 16,
    "paddingTop": 8, "paddingBottom": 8,
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "AUTO"
  }}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setConstraints", "target": "NODE_ID", "payload": {
    "horizontal": "SCALE",
    "vertical": "CENTER"
  }}'
```

Report: Auto layout applied to X variants, constraints set on X children.

### Phase 3: Enforce Naming

Rename all components and layers to follow conventions:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "renameNode", "target": "NODE_ID", "payload": {
    "name": "Button/size=medium, type=primary, state=default"
  }}'
```

Convention: `ComponentType/property=value, property=value`

Report: Layers audited, violations found, layers renamed, compliance score.

### Phase 4: Quality Check

Score each component (0-100) across dimensions:

| Dimension | Weight | Checks |
|-----------|--------|--------|
| Completeness | 30% | All variant combinations exist |
| Layout | 25% | Auto layout configured, sizing correct |
| Binding | 25% | Design system tokens bound |
| Accessibility | 20% | Touch targets ≥44px, contrast passes |

Report: Quality score per component, overall score, issues found.

### Phase 5: Engineering Handoff

Generate developer deliverables:

```bash
# Export assets
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "batchExport", "payload": {
    "nodes": ["COMPONENT_IDS"],
    "formats": ["PNG", "SVG"],
    "scales": [1, 2, 3]
  }}'
```

Generate: Spec sheets, CSS snippets, Tailwind utilities, token mapping.

### Step 3: Final Report

| Metric | Value |
|--------|-------|
| **Components Created** | X |
| **Total Variants** | X |
| **Quality Score** | X/100 |
| **Naming Compliance** | X% |
| **Assets Exported** | X |

## Reference Files

- `.claude/agents/component-library-orchestrator.md` - Full orchestrator agent
- `.claude/agents/component-creator.md` - Component creation
- `.claude/agents/layout-master.md` - Auto layout
- `.claude/agents/nomenclature-enforcer.md` - Naming conventions
- `.claude/agents/component-qa.md` - Quality checks
- `.claude/agents/engineering-handoff.md` - Dev handoff
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
