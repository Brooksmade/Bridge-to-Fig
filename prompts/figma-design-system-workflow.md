# Figma Design System Creation Workflow

**Prerequisites:**
- Figma Bridge server running at `http://localhost:4001`
- A frame selected in Figma to extract colors from

---

## Step 0: Extract Design Tokens (for One-Shot Binding)

**NEW**: Extract tokens first to enable automatic binding during creation:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "extractDesignTokens", "payload": {"scope": "file", "includeChildren": true}}'
```

This returns:
- All colors, typography, numbers, effects
- **`fontSizeNodes`**: Map of font sizes to node IDs (for text style binding)
- Brand color analysis with auto-detection

---

## Step 1: Create 4-Level Variable System (with One-Shot Binding)

Create a complete design system with these collections:

| Level | Collection Name | Modes |
|-------|----------------|-------|
| 1 | Primitive [ Level 1 ] | Value |
| 2 | Semantic [ Level 2 ] | Light, Dark |
| 3 | Tokens [ Level 3 ] | Light Mode, Dark Mode |
| 4 | Theme | Light, Dark |

**Command (with extractedTokens for one-shot binding):**
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createDesignSystem", "payload": {
    "brandColors": {"primary": "#171717"},
    "includeBoilerplate": true,
    "extractedTokens": {/* tokens from Step 0 */}
  }}'
```

**One-Shot Binding Result:**
- `colorBindings`: Number of color variables bound to nodes
- `typographyStyles.nodesStyled`: Number of text nodes styled
- `effectStyles.nodesStyled`: Number of nodes with effect styles applied

This creates 50+ variables including:
- Gray scale (Gray-50 to Gray-950)
- Brand scale (Brand-50 to Brand-950)
- System colors (White, Black, Success, Warning, Error, Info)
- Font sizes (Size-10 to Size-72)
- Spacing (Space-1 to Space-12)
- Border radius (Radius-1 to Radius-6)
- Font family (Font-Sans = "Geist")

---

## Step 2: Bind Variables to Selected Frame

**Note:** When using one-shot binding (Step 0 + Step 1 with `extractedTokens`), most bindings are automatic:
- ✅ Color variables → nodes (automatic)
- ✅ Text styles → text nodes (automatic via `fontSizeNodes`)
- ✅ Effect styles → nodes with shadows (automatic)

**Manual binding** is only needed for additional properties or re-binding:

1. Get selection: `{"type": "query", "payload": {"queryType": "selection"}}`
2. Get node colors: `{"type": "getNodeColors", "payload": {"nodeId": "FRAME_ID", "includeChildren": true}}`
3. Get variables: `{"type": "getVariables", "payload": {"includeValues": true}}`
4. Build exact hex→variableId maps
5. Bind fills: `{"type": "bindFillVariable", "payload": {"nodeId": "X", "variableId": "Y", "fillIndex": 0}}`
6. Bind strokes: `{"type": "bindStrokeVariable", "payload": {"nodeId": "X", "variableId": "Y", "strokeIndex": 0}}`
7. Bind fontSize: `{"type": "bindVariable", "payload": {"nodeId": "X", "variableId": "Y", "field": "fontSize"}}`
8. Bind fontWeight: `{"type": "bindVariable", "payload": {"nodeId": "X", "variableId": "Y", "field": "fontWeight"}}`
9. Bind cornerRadius: `{"type": "bindVariable", "payload": {"nodeId": "X", "variableId": "Y", "field": "cornerRadius"}}`
10. Bind fontFamily: `{"type": "bindVariable", "payload": {"nodeId": "X", "variableId": "Y", "field": "fontFamily"}}`

---

## Step 3: Create Documentation Frames

Create 4 visual documentation frames (one per collection) showing swatches, typography samples, and labels.

**CRITICAL RULES:**
- `parentId` does NOT work - nest all children in `children` array
- Use flat structure - section headers as direct TEXT children
- Use `layoutMode: "HORIZONTAL"` for swatch rows
- Build entire frame in ONE create command

**Structure Pattern:**
```json
{"type": "create", "payload": {
  "nodeType": "FRAME",
  "properties": {
    "name": "Documentation / Primitive [ Level 1 ]",
    "x": 1500, "y": -2000, "width": 1200,
    "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}],
    "layoutMode": "VERTICAL",
    "primaryAxisSizingMode": "AUTO",
    "counterAxisSizingMode": "FIXED",
    "itemSpacing": 24,
    "paddingLeft": 48, "paddingRight": 48, "paddingTop": 48, "paddingBottom": 48
  },
  "children": [
    {"nodeType": "TEXT", "properties": {"characters": "Primitive [ Level 1 ]", "fontSize": 48, "fontName": {"family": "Inter", "style": "Bold"}}},
    {"nodeType": "TEXT", "properties": {"characters": "Color / Gray Scale", "fontSize": 20, "fontName": {"family": "Inter", "style": "SemiBold"}}},
    {"nodeType": "FRAME", "properties": {"name": "Gray Row", "layoutMode": "HORIZONTAL", "itemSpacing": 8, "fills": []}, "children": [
      {"nodeType": "FRAME", "properties": {"layoutMode": "VERTICAL", "itemSpacing": 6, "fills": []}, "children": [
        {"nodeType": "RECTANGLE", "properties": {"width": 56, "height": 56, "cornerRadius": 6, "fills": [{"type": "SOLID", "color": {"r": 0.98, "g": 0.98, "b": 0.98}}]}},
        {"nodeType": "TEXT", "properties": {"characters": "Gray-50", "fontSize": 10}}
      ]}
    ]}
  ]
}}
```

**Frame Positions:**
- Primitive [ Level 1 ]: x = 1500
- Semantic [ Level 2 ]: x = 2800 (show Light/Dark side by side)
- Tokens [ Level 3 ]: x = 3700 (show Light Mode/Dark Mode)
- Theme: x = 4700 (show Light/Dark aliases)

---

## Styles Auto-Created by createDesignSystem

### Typography Styles (default: enabled)
15 text styles with variable bindings for `fontFamily`, `fontSize`, `fontWeight`:
- Display 1-2, Headers H1-H5
- Body Large/Regular/Small
- Label Large/Regular/Small
- Caption Regular/Small

**One-Shot Binding**: When `extractedTokens` with `fontSizeNodes` is provided, text styles are automatically applied to source text nodes during creation. Result includes `nodesStyled` count.

Disable with: `"createTypographyStyles": false`

### Effect Styles (default: enabled)
10 shadow styles mapped from extracted values or boilerplate:
- Elevation: Shadow/xxsmall through Shadow/xxlarge
- Components: Shadow/button, Shadow/input, Shadow/block

**One-Shot Binding**: Effect styles are automatically applied to nodes with matching shadow properties. Result includes `nodesStyled` count.

Disable with: `"createEffectStyles": false`

### Grid Styles (default: disabled)
12 layout grid styles - only created if file has existing grids OR explicitly requested:
- Column grids: Grid/4-Column, Grid/6-Column, Grid/8-Column, Grid/12-Column, Grid/16-Column
- Centered: Grid/12-Column-Centered
- Baseline: Grid/Baseline-4, Grid/Baseline-8
- Square: Grid/Square-8, Grid/Square-16
- Combined: Grid/12-Column+Baseline, Grid/4-Column+Baseline

Enable with: `"createGridStyles": true`

---

## Agents Available

| Agent | Purpose |
|-------|---------|
| `figma-variables` | Creates 4-level design system, auto-detects brand color, binds to frame |
| `figma-binding` | Binds existing variables to selected frame elements |
| `figma-documentation` | Creates visual documentation frames for all collections |

---

## Key API Endpoints

```
POST http://localhost:4001/commands   - Send command
GET  http://localhost:4001/results/{id}?wait=true - Get result
```

---

## Variable Binding Field Reference

| Property | Bind Command | Field | Variable Type |
|----------|--------------|-------|---------------|
| Fill color | `bindFillVariable` | `fillIndex: 0` | COLOR |
| Stroke color | `bindStrokeVariable` | `strokeIndex: 0` | COLOR |
| Font size | `bindVariable` | `field: "fontSize"` | FLOAT |
| Font weight | `bindVariable` | `field: "fontWeight"` | FLOAT (400, 500, 700...) |
| Corner radius | `bindVariable` | `field: "cornerRadius"` | FLOAT |
| Font family | `bindVariable` | `field: "fontFamily"` | STRING |

---

## Color Format Conversion

Figma uses 0-1 RGB values. To convert hex to Figma:

```
#171717 → r: 0.09, g: 0.09, b: 0.09
#f5f5f5 → r: 0.96, g: 0.96, b: 0.96
#ffffff → r: 1, g: 1, b: 1
```

Formula: `figmaValue = hexValue / 255`

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Plugin freezes on large files | Sequential async operations | See `prompts/performance-analysis.md` |
| Extraction timeout | Too many nodes to process | Use `scope: "selection"` or `scope: "page"` |
| Variables not binding | No exact hex match | Check extracted colors match variable values |
| Font binding fails | Font not loaded | Call `loadFont` before binding |
| Grid styles not created | Not enabled by default | Set `createGridStyles: true` |

### Performance Tips

For large files (1000+ nodes):
- Use `scope: "selection"` instead of `scope: "file"` when possible
- Use extended timeout: `timeout=300000` (5 minutes)
- Monitor progress: `GET /logs/running`

See `prompts/performance-analysis.md` for detailed performance optimization guidance.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| `prompts/figma-bridge.md` | Complete API reference (325 commands; 2026 additions in `prompts/api-2026-additions.md`) |
| `prompts/figma-variables.md` | Fast variable creation workflow |
| `prompts/bind-variables.md` | Variable binding workflow (one-shot vs manual) |
| `prompts/performance-analysis.md` | Performance optimization for large files |
| `.claude/agents/figma-variables.md` | Variable creation agent |
| `.claude/agents/figma-binding.md` | Variable binding agent |
| `.claude/agents/design-system-orchestrator.md` | Full pipeline orchestration |
