# /engineering-handoff - Generate Developer Handoff Package

Extract precise specifications, generate CSS/Tailwind code snippets, create design token to CSS variable mappings, and export assets at multiple scales for developer handoff. Use when designs are ready for implementation and developers need spec sheets, code, and assets. Produces a complete handoff package per component. Not for creating designs — use `/component-library` for building components first.

**IMPORTANT:** For full implementation details, also read `.claude/agents/engineering-handoff.md`

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open Figma → Plugins → Bridge to Fig |
| Components exist | `getComponents` | ≥1 component in file | Select frames to handoff, or run `/component-library` first |
| Design system exists | `getDesignSystemStatus` | Variables found | Token mapping requires variables — run `/design-system` first |

**If no components or frames exist, STOP.** Handoff requires content to analyze.

## Workflow

### Step 1: Ask for Scope and Platforms

**Which components or frames should we generate handoff for?**

1. **Current selection** — Generate handoff for selected frames
2. **All components** — Generate handoff for all components in the file
3. **Specific components** — Let me list which ones

**Which target platforms?**

1. **Web only (Recommended)** — CSS, Tailwind, HTML
2. **Web + iOS** — Add Swift/UIKit mappings
3. **Web + Android** — Add Material/Compose mappings
4. **All platforms** — Web, iOS, Android

### Step 2: Analyze Design

Query selected components and their properties:

```bash
# Query selection
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "selection"}}'

# Get auto layout settings
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getAutoLayout", "target": "NODE_ID"}'

# Get variables with values
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getVariables", "payload": {"includeValues": true}}'

# Analyze colors
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "analyzeColors"}'
```

### Step 3: Extract Specifications

Extract from each component:
- Dimensions (width, height, min/max)
- Spacing (padding, margin, gap)
- Typography (font, size, weight, line-height)
- Colors (fills, strokes, effects)
- Corner radius
- Effects (shadows, blurs)
- Constraints and layout mode

### Step 4: Generate Code

Transform Figma properties to code:

**CSS custom properties:**
```css
.component {
  display: flex;
  gap: var(--space-s);
  padding: var(--space-m);
  background: var(--surface-primary);
  border-radius: var(--radius-md);
}
```

**Tailwind utilities:**
```html
<div class="flex gap-3 p-4 bg-white rounded-lg shadow-sm">
```

**Token mapping (design variable → CSS variable):**
```json
{
  "Surface/Primary": "--surface-primary",
  "Space-M": "--space-m",
  "Radius-MD": "--radius-md"
}
```

### Step 5: Export Assets

```bash
# Batch export at multiple scales
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "batchExport", "payload": {
    "nodes": ["NODE_ID_1", "NODE_ID_2"],
    "formats": ["PNG", "SVG"],
    "scales": [1, 2, 3]
  }}'
```

Export icons as SVG, images as PNG at 1x/2x/3x.

### Step 6: Report

**Handoff Package:**

| Deliverable | Count |
|-------------|-------|
| Spec sheets | X |
| CSS snippets | X |
| Tailwind classes | X |
| Token mappings | X |
| Exported assets | X |

For each component, provide:
- Dimensions and spacing table
- Typography table
- Color table with token references
- CSS and Tailwind code snippets
- State variations (hover, active, disabled, focus)
- Accessibility notes (contrast, touch targets, focus ring)
- Platform-specific guidelines

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| No selection and no components | `getComponents` returns empty, no selection | Ask user to select specific frames to handoff |
| `getAutoLayout` fails | Node doesn't have auto layout configured | Report layout as "manual positioning" — still extract dimensions |
| `getVariables` empty (no design system) | No variable collections | Generate code with hardcoded values instead of tokens; warn about missing design system |
| `batchExport` fails | Export format not supported or node too complex | Retry with single exports per node; skip failing nodes with report |
| `analyzeColors` timeout | Complex file with many color instances | Narrow scope to selected components only |
| Token mapping incomplete | Some properties have no matching variable | Report as "unbound property" with the raw value — developer can decide |

**On partial failure:** Handoff should produce what it can. Missing design system means hardcoded values instead of tokens. Failed exports mean the spec still ships without images. Always report what was generated and what was skipped.

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Components Analyzed** | X |
| **Spec Sheets Generated** | X |
| **CSS Snippets** | X |
| **Tailwind Classes** | X |
| **Token Mappings** | X (Y unmapped properties) |
| **Assets Exported** | X (PNG: Y, SVG: Z) |
| **Platforms** | Web / iOS / Android |

## Reference Files

- `.claude/agents/engineering-handoff.md` - Full agent instructions
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
- `prompts/skill-patterns.md` - Skill patterns reference
