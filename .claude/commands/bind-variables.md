# /bind-variables - Bind Design System Variables to Elements

Bind existing design system variables to frame elements using **exact value matching only**. No fuzzy matching — if no exact match exists, the element is skipped and reported.

**IMPORTANT:** For full implementation details, also read `.claude/agents/figma-binding.md`

## Workflow

### Step 1: Ask for Scope

Present these options to the user:

**What scope should we bind variables to?**

1. **Selection** - Bind variables to the currently selected frame(s) only
2. **File** - Bind variables across the entire file (may take longer)

Store the user's selection for the binding steps.

### Step 2: Load Variables — Build Exact Match Maps

Query all variables and build lookup maps by exact value:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getVariables", "payload": {"includeValues": true}}'
```

Build 4 exact-match maps from the response:

| Map | Key | Value |
|-----|-----|-------|
| `COLOR_MAP` | hex string (e.g., `#f4f4f5`) | variableId |
| `FONT_SIZE_MAP` | number (e.g., `16`) | variableId |
| `RADIUS_MAP` | number (e.g., `8`) | variableId |
| `FONT_FAMILY_MAP` | string (e.g., `Inter`) | variableId |

**Important:** Use the resolved value from the variable, not its name.

Report to user:
- Variables loaded: X total
- Color variables: X
- Font size variables: X
- Radius variables: X
- Font family variables: X

### Step 3: Extract Frame Properties

Get all colors from target frames:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getNodeColors", "payload": {"nodeId": "FRAME_ID", "includeChildren": true, "includeStrokes": true}}'
```

Get fonts used:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getUsedFonts", "payload": {"nodeId": "FRAME_ID"}}'
```

For text nodes (fontSize) and frames/rectangles (cornerRadius), find by type:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "findAllByType", "payload": {"nodeType": "TEXT", "parentId": "FRAME_ID"}}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "findAllByType", "payload": {"nodeType": "FRAME", "parentId": "FRAME_ID"}}'
```

### Step 4: Match — Exact Matches Only

For each extracted value, look up in the maps:

```
Element: nodeId="123:456", hex="#f4f4f5", source="fill"
Lookup: COLOR_MAP["#f4f4f5"] → "VariableID:4:124"
Result: MATCH → queue for binding

Element: nodeId="123:459", hex="#f8f8f8", source="fill"
Lookup: COLOR_MAP["#f8f8f8"] → undefined
Result: NO MATCH → add to unbound report
```

**CRITICAL:** Never use fuzzy matching, closest-color algorithms, or RGB distance calculations. Only exact matches.

Track two lists:
1. `toBind` — elements with exact variable matches
2. `unbound` — elements with no matching variable

### Step 5: Bind Variables

For fills:
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "bindFillVariable", "payload": {"nodeId": "NODE_ID", "variableId": "VAR_ID", "fillIndex": 0}}'
```

For strokes:
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "bindStrokeVariable", "payload": {"nodeId": "NODE_ID", "variableId": "VAR_ID", "strokeIndex": 0}}'
```

For fontSize:
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "bindVariable", "payload": {"nodeId": "NODE_ID", "variableId": "VAR_ID", "field": "fontSize"}}'
```

For fontFamily (load fonts first):
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "loadFont", "payload": {"family": "Inter", "style": "Regular"}}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "bindVariable", "payload": {"nodeId": "NODE_ID", "variableId": "VAR_ID", "field": "fontFamily"}}'
```

For cornerRadius:
```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "bindVariable", "payload": {"nodeId": "NODE_ID", "variableId": "VAR_ID", "field": "cornerRadius"}}'
```

### Step 6: Report Results

Show a summary of what was bound and what was skipped:

| Type | Bound | Unbound |
|------|-------|---------|
| Fills | X | Y |
| Strokes | X | Y |
| Font Size | X | Y |
| Font Family | X | Y |
| Corner Radius | X | Y |
| **Total** | **X** | **Y** |

**Unbound values (no exact variable match):**

List colors, font sizes, and corner radii that had no matching variable, with node counts.

**Recommended Actions:**
1. Create variables for missing values if they should be in the design system
2. Or update design to use existing variable values

## Key Constraints

- **EXACT MATCH ONLY** — Never bind if values don't match exactly
- **REPORT UNBOUND** — Always tell user what couldn't be bound
- **FRESH VARIABLE IDS** — Query variables each time, never hardcode IDs
- **LOAD FONTS FIRST** — Before binding fontFamily

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open Figma → Plugins → Bridge to Fig |
| Design system exists | `getDesignSystemStatus` or `getVariables` | ≥1 variable collection | Run `/design-system` first — binding requires variables to exist |
| Frames exist to bind | Query selection or page | ≥1 frame with fills/text | Select frames in Figma before running |

**If no design system exists, STOP.** Binding requires variables. Suggest `/design-system` or `/design-system-website` first.

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| `getVariables` returns empty | No variable collections in file | Run `/design-system` first to create variables |
| `getNodeColors` returns empty | Frame has no color fills | Verify correct frame is selected; check nested children |
| All values unbound (0 matches) | COLOR_MAP has no overlapping values with frame | Check extracted colors vs variable values — likely different color format (rgb vs hex) or rounding |
| Font binding fails | `loadFont` errors | Font not available in Figma — skip font binding, report which fonts missing |
| Timeout on large file | >5 min with file scope | Switch to page scope, bind one page at a time |
| Partial binding (X bound, Y skipped) | Unbound report shows off-palette colors | Expected — report unbound values, suggest creating new variables for them |

**On partial failure:** Binding is inherently partial — not every value will match. This is normal. Always:
1. Report exact match count vs unbound count
2. List the unbound values with usage frequency
3. Suggest creating variables for frequently-used unbound values

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Scope** | selection / page / file |
| **Variables Loaded** | X (X color, X fontSize, X radius, X fontFamily) |
| **Fills Bound** | X of Y |
| **Strokes Bound** | X of Y |
| **Font Sizes Bound** | X of Y |
| **Font Families Bound** | X of Y |
| **Corner Radii Bound** | X of Y |
| **Total Bound** | X of Y (X%) |
| **Unbound Values** | List with counts |

## Reference Files

- `.claude/agents/figma-binding.md` - Full agent instructions
- `prompts/bind-variables.md` - Quick reference
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
- `prompts/skill-patterns.md` - Skill patterns reference
