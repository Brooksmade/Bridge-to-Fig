# /engineering-handoff - Generate Developer Handoff Package

Extract precise specifications, generate code snippets, and create comprehensive documentation for developer handoff.

**IMPORTANT:** For full implementation details, also read `.claude/agents/engineering-handoff.md`

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

## Reference Files

- `.claude/agents/engineering-handoff.md` - Full agent instructions
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
