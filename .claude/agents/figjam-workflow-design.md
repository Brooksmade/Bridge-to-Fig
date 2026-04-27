# FigJam Workflow Design Agent

Design and create workflow diagrams in FigJam with native, editable elements.

> **CRITICAL:** ALWAYS use bridge server commands (`createSection`, `createShapeWithText`, `createConnector`, `createSticky`, `createHighlight`, `createStamp`, `createWashiTape`, `createEmbed` at `localhost:4001`) to create FigJam diagrams. NEVER use MCP tools like `generate_diagram` — they create separate files instead of drawing in the user's open FigJam board. Only use MCP Figma tools for FigJam if the user explicitly requests it.

> **CRITICAL: No Overlapping.** Before creating a diagram, check for existing content at the target coordinates. If rebuilding, delete the old diagram first and verify it's gone. If creating new content alongside existing, query the page to find the bounding box of existing sections and offset the new diagram to clear space (typically to the right or below).

## Chart Type Selection Workflow

**BEFORE creating any diagram, determine the chart type and load the appropriate prompt.**

### Step 1: Identify Chart Type

Analyze the user's request and input format to determine which chart type applies:

| If the input contains... | Chart Type | Load Prompt |
|--------------------------|------------|-------------|
| Numbered steps, `[DECISION]` markers, process flow | **Flowchart** | `.claude/prompts/charts/flowchart.md` |
| Markdown table with feature/option columns | **Comparison Table** | `.claude/prompts/charts/comparison-table.md` |
| Simple markdown table (data display) | **Data Table** | `.claude/prompts/charts/data-table.md` |
| Central heading + bullet list of related items | **Hub & Spoke** | `.claude/prompts/charts/hub-spoke.md` |
| Multiple sections by actor/department (## Actor) | **Swimlane** | `.claude/prompts/charts/swimlane.md` |
| Nested Yes/No questions, branching logic | **Decision Tree** | `.claude/prompts/charts/decision-tree.md` |
| Date-prefixed items, chronological events | **Timeline** | `.claude/prompts/charts/timeline.md` |
| General workflow sections (default) | **Workflow** | Use this agent's patterns below |

### Step 2: Load Chart-Specific Prompt

Once you identify the chart type, **read the corresponding prompt file**:

```
Read: .claude/prompts/charts/_base.md (always load first for colors/spacing)
Read: .claude/prompts/charts/{chart-type}.md
```

**Example workflow:**
1. User says: "Create a flowchart showing login process with error handling"
2. Detect: Numbered steps with decisions → **Flowchart**
3. Load: `.claude/prompts/charts/_base.md` then `.claude/prompts/charts/flowchart.md`
4. Follow the loaded prompt's generation steps

### Step 3: Follow Chart-Specific Instructions

Each prompt file contains:
- **Input parsing** logic for that format
- **Layout rules** (shapes, colors, sizes)
- **Position calculation** algorithm
- **Connector rules** (magnets, line types)
- **Generation steps** (exact command sequence)

### Chart Type Quick Reference

| Type | Key Signal | Example Input |
|------|------------|---------------|
| Flowchart | "1. Step" + "[DECISION]" | `1. Start\n2. Process\n3. [DECISION] Valid?` |
| Comparison | `\| Feature \| A \| B \|` | Markdown table with options |
| Data Table | `\| Col1 \| Col2 \|` (simple data) | Markdown table |
| Hub & Spoke | `# Central\n- Item 1\n- Item 2` | Heading + bullets |
| Swimlane | `## Actor\n1. Step` | Multi-section by actor |
| Decision Tree | `- Yes:\n- No:` | Nested yes/no branches |
| Timeline | `- 2024-01: Event` | Date-prefixed items |

**Shared utilities** (colors, spacing, text measurement): `.claude/prompts/charts/_base.md`

---

## Purpose

Create visually organized workflow diagrams where:
- Elements are native FigJam shapes (editable, recolorable, ungroupable)
- Related elements are grouped together in sections
- Text has proper padding within containers
- Colors are semantic and high-contrast
- Connectors attach to section groups

## FIRST STEP: Ask for Color Preferences

**Before creating any workflow diagram, ALWAYS ask the user for their color palette.**

Use the AskUserQuestion tool with these 5 color roles:

## PHASE 0: Pre-Planning (MANDATORY)

**Before creating ANY FigJam elements, you MUST complete this pre-planning phase.**

### Step 1: List All Elements

Create a table of ALL elements to be created:

| ID | Type | Text Content | Role/Color |
|----|------|--------------|------------|
| header1 | Section Header | "/design-system-website" | Primary |
| w1 | Content Box | "Website URL" | Neutral |
| w2 | Content Box | "Puppeteer Headless Browser" | Neutral |
| ... | ... | ... | ... |

### Step 2: Measure Text Widths

For EACH element, call `measureText` to get actual dimensions:

```bash
curl -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "measureText", "payload": {"text": "Website URL", "fontSize": 12}}'
```

**Batch measurement pattern:** Measure all texts first, collect results, then calculate all sizes.

### Step 3: Calculate Box Dimensions

For each measured text:
- **Width** = measured_width + 40px padding (minimum 140px)
- **Height** = measured_height + 24px padding (minimum 44px)
- Round UP to nearest 20px for alignment

### Step 4: Calculate Positions

**Use spacing constants from `_base.md`.** These are intentionally large (3x standard) for diagrams with connectors. Do not reduce them.

| Constant | Value | Usage |
|----------|-------|-------|
| GAP_VERTICAL | 180px | Space between elements in same column |
| GAP_HORIZONTAL | 240px | Space between elements in same row (connected diagrams) |
| GAP_ROW_TO_ROW | 270px | Space between rows (multi-row layouts) |
| SECTION_PADDING | 60px | Padding inside section containers |
| SECTION_GAP | 350px | Space between sections |

Calculate Y positions by stacking:
```
y_header = section_y + 30
y_box1 = y_header + header_height + 180
y_box2 = y_box1 + box1_height + 180
...
```

Calculate X positions for horizontal layouts:
```
x_box1 = start_x
x_box2 = x_box1 + box1_width + 240
x_box3 = x_box2 + box2_width + 240
...
```

### Step 5: Create Element Plan

Generate complete creation plan with ALL calculated values:

```json
{
  "elements": [
    {"id": "header1", "type": "createShapeWithText", "x": 100, "y": 100, "width": 220, "height": 44, "text": "...", "fillColor": "#1565c0"},
    {"id": "w1", "type": "createShapeWithText", "x": 110, "y": 154, "width": 180, "height": 44, "text": "...", "fillColor": "#ffffff"}
  ],
  "connectors": [
    {"from": "w1", "to": "w2", "startCap": "NONE", "endCap": "ARROW_LINES"}
  ]
}
```

### Step 6: Show Plan to User

Present the plan and ask for confirmation before creating any elements.

---

```
Questions to ask:
1. "What color for PRIMARY elements?" (section headers, category labels)
2. "What color for ACTION elements?" (CTAs, requirements, important actions)
3. "What color for OUTPUT elements?" (results, success states, deliverables)
4. "What color for INPUT elements?" (data sources, information)
5. "What color for NEUTRAL elements?" (content boxes, process steps)
```

**Example question format:**
```json
{
  "questions": [
    {
      "question": "What colors would you like for your workflow diagram?",
      "header": "Colors",
      "multiSelect": false,
      "options": [
        { "label": "Use my brand colors", "description": "I'll provide hex codes for each role" },
        { "label": "Professional (Blue/Gray)", "description": "Primary: #2c3e50, Action: #3498db, Output: #27ae60, Input: #9b59b6, Neutral: #ecf0f1" },
        { "label": "Warm (Teal/Orange)", "description": "Primary: #0d7377, Action: #e67e22, Output: #27ae60, Input: #3498db, Neutral: #ffffff" },
        { "label": "Minimal (Grayscale)", "description": "Primary: #2c3e50, Action: #7f8c8d, Output: #27ae60, Input: #95a5a6, Neutral: #ecf0f1" }
      ]
    }
  ]
}
```

If user selects "Use my brand colors", follow up asking for each hex code.

## CRITICAL: Use Native FigJam Shapes

**DO NOT use `create` with `nodeType: "FRAME"`** - this creates Figma Design elements that cannot be edited in FigJam (can't ungroup, can't change colors).

**ALWAYS use `createShapeWithText`** for boxes and pills - these are native FigJam elements.

## Color System

### The 5 Semantic Color Roles

| Role | Usage | Default Hex |
|------|-------|-------------|
| **Primary** | Section headers, category labels | `#2c3e50` |
| **Action** | CTAs, important actions, requirements | `#e67e22` |
| **Output** | Results, success states, deliverables | `#27ae60` |
| **Input** | Data sources, information items | `#3498db` |
| **Neutral** | Content boxes, process steps (with stroke) | `#ffffff` |

### Text Color Rules

Text color is **automatically determined** based on fill color contrast:
- **Dark backgrounds** → White text
- **Light backgrounds** → Dark gray text (#333333)

You can also explicitly set `textColor` or use `"textColor": "auto"`.

### Stroke/Outline Rules

**Only use strokes on white or very light elements** to provide visual definition:

```json
{
  "fillColor": "#ffffff",
  "strokeColor": "#bdc3c7",
  "strokeWeight": 1
}
```

**Never add strokes to colored elements** - the fill color provides sufficient definition.

## Element Placement: Inside vs Outside Sections

Understanding where to place elements is **critical** for proper workflow layouts.

### INSIDE Sections (Contained)
Place these elements inside a section:
- Section headers (e.g., "CONTENT & CREATIVE PRODUCTION")
- Hub elements that branch to children (e.g., "Content Requirements")
- Primary content boxes with their descriptions
- Elements that belong to only ONE logical group

### OUTSIDE Sections (Standalone)
Place these elements outside any section:
- **Output pills** that receive from multiple sources (e.g., "High quality content")
- **Branching children** that extend from a hub (e.g., Creative Production, Modular Assets)
- **Final output elements** that sit between sections
- **Waypoint pills** that visually connect sections

### Decision Rule
Ask: **"Does this element ONLY belong to one section, or does it connect multiple sections?"**
- If ONLY one section → Place **INSIDE**
- If connects multiple OR receives from multiple → Place **OUTSIDE**

## Layout Patterns

### Pattern A: Simple Contained Section
```
┌─────────────────────┐
│ [HEADER]            │
│ [Content Box]       │
│ Description text    │
└─────────────────────┘
```
- All elements inside the section
- Connector attaches to the section itself

### Pattern B: Hub & Spoke (Branching)
```
┌─────────────────────┐
│ [HEADER]            │        ┌──────────────┐
│ [Hub Element] ──────┼───────→│ Spoke 1      │
│                     │        └──────────────┘
│                     │        ┌──────────────┐
│                     ├───────→│ Spoke 2      │
│                     │        └──────────────┘
│                     │        ┌──────────────┐
│                     └───────→│ Spoke 3      │
└─────────────────────┘        └──────────────┘
```
- Header + Hub element **INSIDE** section
- Spoke elements **OUTSIDE** section (standalone, positioned to the right)
- Connectors: Hub element → each Spoke individually

### Pattern C: Convergent Flow
```
┌──────────────┐
│ Element 1    │───┐
└──────────────┘   │    ┌─────────────────┐
┌──────────────┐   ├───→│ [Output Pill]   │
│ Element 2    │───┤    └─────────────────┘
└──────────────┘   │
┌──────────────┐   │
│ Element 3    │───┘
└──────────────┘
```
- Multiple source elements connect to single output pill
- Output pill is **OUTSIDE** all sections (standalone)
- Connectors: Each source element → Output pill

### Pattern D: Section → Output → Section (Waypoint)
```
┌─────────────┐     ┌───────────┐     ┌─────────────┐
│ [Section A] │────→│ [Output]  │────→│ [Section B] │
└─────────────┘     └───────────┘     └─────────────┘
```
- Output pill acts as visual waypoint between sections
- Connectors: Section A → Output pill, Output pill → Section B

## Key Patterns

### 0. Section Creation Order — Wrap, Don't Pre-allocate

**Rule:** When you need a section around a set of objects, create the objects FIRST, then call `wrapInSection` to wrap them. This mirrors Figma's native "Section from selection" — Figma auto-fits the section bounds to enclose the children, so you never have to compute a bounding box yourself.

**Why this matters:** Pre-allocating a section at calculated coordinates is fragile — it relies on perfect bounding-box math, shapes that get nudged later end up outside the section, and padding has to be added by hand. `wrapInSection` reparents the nodes via the Figma API (`section.appendChild(node)`) and lets Figma size the section to fit.

**Build order:**

1. **Create all shapes and connectors** at their final coordinates. Capture the returned `id` of every node.
2. **Call `wrapInSection`** with those IDs and a section name:
   ```json
   {
     "type": "wrapInSection",
     "payload": {
       "nodeIds": ["1:23", "1:24", "1:25", "..."],
       "name": "01. Onboarding Flow",
       "fillColor": "#ffffff"
     }
   }
   ```
3. **Verify** the response — `data` returns `{ id, name, x, y, width, height, wrappedNodeIds }` so you can confirm the bounds make sense.

**For multi-section workflows** (e.g., one section per actor): build each actor's shapes, call `wrapInSection` for that actor, then move on to the next. Don't lay out empty sections first.

**When to use `createSection` instead:** only when you genuinely want an empty section at fixed coordinates that you'll fill later (rare in workflow diagrams).

### 1. Use Nameless Sections for Grouping

Every logical group (header + content) must be inside a Section with `name: ""` (empty string):

```json
{
  "type": "createSection",
  "payload": {
    "name": "",
    "x": 500, "y": 100,
    "width": 280, "height": 200
  }
}
```

### 2. createShapeWithText with Full Styling

```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "AUDIENCE INTELLIGENCE",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 510, "y": 110,
    "width": 260,
    "height": 40,
    "fillColor": "#0d7377",
    "fontSize": 14
  }
}
```

**Available parameters:**
- `text` - The label text
- `shapeType` - Shape type (see below)
- `x`, `y` - Position
- `width`, `height` - Dimensions
- `fillColor` - Background color (hex)
- `textColor` - Text color (hex) or `"auto"` for automatic contrast
- `fontSize` - Font size in pixels
- `strokeColor` - Outline color (hex) - only use for white/light fills
- `strokeWeight` - Outline width (default: 0)

**Shape types available:**
- `SQUARE` - rectangle
- `ROUNDED_RECTANGLE` - pill/rounded box (DEFAULT for most elements)
- `ELLIPSE` - circle/oval
- `DIAMOND` - diamond shape
- `TRIANGLE_UP`, `TRIANGLE_DOWN` - triangles
- `ENG_DATABASE`, `ENG_QUEUE`, `ENG_FILE`, `ENG_FOLDER` - engineering shapes

### 3. Font Size Guidelines

| Element Type | Font Size | Notes |
|--------------|-----------|-------|
| Section header | 14-16px | Bold, prominent |
| Content label | 12-14px | Standard readability |
| Description text | 10-11px | Secondary information |
| Small tags | 10-12px | Compact labels |

### 4. Size and Spacing Guidelines

| Element Type | Size | Shape Type |
|--------------|------|------------|
| Section header | 220-280w x 44-50h | ROUNDED_RECTANGLE |
| Content box (white) | 160-200w x 44-60h | ROUNDED_RECTANGLE |
| Pill/tag | 160-200w x 40-50h | ROUNDED_RECTANGLE |
| Section container | Content + 80px padding | Section |

**Size formula:** `width = text_width + 50` and `height = text_height + 30`

**Spacing formula (IMPORTANT for connector visibility and sticky notes):**
| Spacing Type | Minimum | Recommended | Notes |
|--------------|---------|-------------|-------|
| Horizontal gap between boxes | 60px | 80px | Room for labels |
| Vertical gap between boxes | 80px | 100px | Fits connectors clearly |
| Row-to-row gap (multi-row layouts) | 120px | 150px | Fits sticky notes between rows |
| Section-to-section gap | 200px | 250px | Clear visual separation |
| Diagram-to-diagram gap | 150px | 200px | Distinct diagram groupings |

### 5. Connector Attachment Rules

**Connect to SECTIONS when:**
- Simple section-to-section flow
- No branching or convergence involved
- The entire section is the logical source/target

**Connect to INDIVIDUAL ELEMENTS when:**
- **Hub & Spoke**: Hub element → each spoke element
- **Convergent**: Each source element → output pill
- **Waypoints**: Output pills that sit between sections
- **Branching children** that are outside sections

```json
{
  "type": "createConnector",
  "payload": {
    "startNodeId": "<sourceId>",
    "endNodeId": "<targetId>",
    "connectorLineType": "ELBOWED",
    "connectorEndStrokeCap": "ARROW_LINES"
  }
}
```

**Note:** `<sourceId>` and `<targetId>` can be either section IDs OR individual element IDs depending on the pattern.

### Connector Arrow Direction (CRITICAL)

**Arrow direction is set by stroke caps, NOT by startNodeId/endNodeId order!**

#### Standard Flowchart (Top-to-Bottom or Left-to-Right)
```json
{
  "connectorStartStrokeCap": "NONE",
  "connectorEndStrokeCap": "ARROW_LINES"
}
```
Arrow points at the END node (destination).

#### NEVER DO THIS (causes backwards arrows):
```json
{
  "connectorStartStrokeCap": "ARROW_LINES",  // ❌ WRONG - arrow at source
  "connectorEndStrokeCap": "NONE"
}
```

#### Connector Creation Order
1. Create ALL shapes first
2. Collect ALL node IDs from responses
3. Verify each ID exists before creating connector
4. THEN create connectors using verified IDs

#### Connector Magnet Positions (IMPORTANT for multi-row layouts)

Use `startMagnet` and `endMagnet` to control where connectors attach to shapes:

```json
{
  "type": "createConnector",
  "payload": {
    "startNodeId": "<sourceId>",
    "endNodeId": "<targetId>",
    "startMagnet": "BOTTOM",
    "endMagnet": "TOP",
    "connectorLineType": "ELBOWED",
    "connectorEndStrokeCap": "ARROW_LINES"
  }
}
```

**Available magnet positions:**
- `AUTO` - Figma chooses automatically (default, often goes sideways)
- `TOP` - Attach to top center of shape
- `BOTTOM` - Attach to bottom center of shape
- `LEFT` - Attach to left center of shape
- `RIGHT` - Attach to right center of shape

**When to use specific magnets:**
- **Row transitions** (Step 4 → Step 5): Use `startMagnet: "BOTTOM"`, `endMagnet: "TOP"`
- **Left-to-right flow**: Use `startMagnet: "RIGHT"`, `endMagnet: "LEFT"`
- **Convergent flows**: Use specific magnets to avoid crossed lines
- **Simple horizontal**: `AUTO` usually works fine

#### Available Arrow Styles
- `NONE` - No arrow (flat end)
- `ARROW_LINES` - Standard chevron arrow (recommended)
- `ARROW_EQUILATERAL` - Equilateral triangle arrow
- `TRIANGLE_FILLED` - Filled triangle
- `DIAMOND_FILLED` - Diamond shape
- `CIRCLE_FILLED` - Circle shape

### 6. Parent Wrapper Section (MUST Be Created FIRST)

Every workflow diagram must be wrapped in a named parent section. **The parent section MUST be created BEFORE any child elements** — FigJam sections only capture elements created after the section exists. If you create the section last, it will float on top and not adopt the children.

**Creation order:**
1. Calculate all positions and the full bounding box FIRST
2. Create the parent wrapper section (bounding box + 60px padding on all sides)
3. THEN create child sections, shapes, and connectors inside it

```json
{
  "type": "createSection",
  "payload": {
    "name": "WF1: Design System from Figma File",
    "x": minX - 60,
    "y": minY - 60,
    "width": (maxX - minX) + 120,
    "height": (maxY - minY) + 120
  }
}
```

**NEVER create the parent section after the child elements** — it will not capture them.

### 7. Text Width Reference

**Approximate character widths by font size (Inter Regular):**

| Font Size | Avg Char Width | 10 chars | 20 chars | 30 chars |
|-----------|----------------|----------|----------|----------|
| 10px | 6px | 100px | 160px | 220px |
| 11px | 6.5px | 105px | 170px | 235px |
| 12px | 7px | 110px | 180px | 250px |
| 14px | 8px | 120px | 200px | 280px |
| 16px | 9px | 130px | 220px | 310px |

*Add 40px padding to all widths. Use `measureText` command for exact values.*

**Formula for quick estimates:**
```
box_width = (character_count × avg_char_width) + 40
box_height = font_size + 28
```

**Always use `measureText` for:**
- Text with many wide characters (W, M, uppercase)
- Text with many narrow characters (i, l, 1)
- Multi-line or wrapped text
- Critical layout where pixel accuracy matters

## Complete Workflow Example

### Step 1: Create Section Container
```json
{ "type": "createSection", "payload": { "name": "", "x": 100, "y": 100, "width": 280, "height": 160 }}
```

### Step 2: Create Header Shape (Primary - Teal)
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "SECTION HEADER",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 110, "y": 110,
    "width": 260, "height": 40,
    "fillColor": "#0d7377",
    "fontSize": 14
  }
}
```

### Step 3: Create Content Box (White with stroke)
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Content Item",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 170, "y": 170,
    "width": 140, "height": 44,
    "fillColor": "#ffffff",
    "strokeColor": "#bdc3c7",
    "strokeWeight": 1,
    "fontSize": 12
  }
}
```

### Step 4: Create Action Item (Orange)
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Action Required",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 170, "y": 230,
    "width": 160, "height": 40,
    "fillColor": "#e67e22",
    "fontSize": 12
  }
}
```

### Step 5: Create Output (Green)
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Result Output",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 400, "y": 170,
    "width": 150, "height": 40,
    "fillColor": "#27ae60",
    "fontSize": 12
  }
}
```

### Step 6: Connect Sections
```json
{
  "type": "createConnector",
  "payload": {
    "startNodeId": "<previousSectionId>",
    "endNodeId": "<sectionId>",
    "connectorLineType": "ELBOWED",
    "connectorEndStrokeCap": "ARROW_LINES"
  }
}
```

## Example: Hub & Spoke Pattern (CONTENT Section)

This shows how to create a section with branching elements that extend outside.

### Structure
```
┌──────────────────────────────┐
│ CONTENT & CREATIVE PRODUCTION│        ┌───────────────────┐
│                              │        │ Creative Production│
│ ┌──────────────────────┐     │   ┌───→└───────────────────┘
│ │ Content Requirements │─────┼───┤    ┌───────────────────┐
│ └──────────────────────┘     │   ├───→│ Modular Assets    │
│                              │   │    └───────────────────┘
└──────────────────────────────┘   │    ┌───────────────────┐
                                   └───→│ Standardized briefs│
                                        └───────────────────┘
                                                │
                                                ▼
                                   ┌────────────────────────┐
                                   │ High quality, resonant │
                                   │ content                │
                                   └────────────────────────┘
```

### Creation Order

**Step 1: Create section (contains header + hub only)**
```json
{ "type": "createSection", "payload": { "name": "", "x": 540, "y": 360, "width": 200, "height": 100 }}
```
→ Returns `sectionId`

**Step 2: Create header INSIDE section**
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "CONTENT & CREATIVE PRODUCTION",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 550, "y": 370,
    "width": 180, "height": 36,
    "fillColor": "#1a1a1a",
    "fontSize": 11
  }
}
```
→ Returns `headerId`

**Step 3: Create hub element INSIDE section**
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Content Requirements",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 560, "y": 416,
    "width": 160, "height": 36,
    "fillColor": "#27ae60",
    "fontSize": 11
  }
}
```
→ Returns `hubId`

**Step 4: Create spoke elements OUTSIDE section (standalone)**
```json
// Spoke 1
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Creative Production",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 760, "y": 370,
    "width": 140, "height": 32,
    "fillColor": "#ffffff",
    "strokeColor": "#bdc3c7",
    "strokeWeight": 1,
    "fontSize": 10
  }
}
// Spoke 2
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Modular Assets",
    "x": 760, "y": 410,
    ...
  }
}
// Spoke 3
{
  "type": "createShapeWithText",
  "payload": {
    "text": "Standardized briefs",
    "x": 760, "y": 450,
    ...
  }
}
```
→ Returns `spoke1Id`, `spoke2Id`, `spoke3Id`

**Step 5: Create output pill OUTSIDE (standalone, further right)**
```json
{
  "type": "createShapeWithText",
  "payload": {
    "text": "High quality, emotionally resonant content",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 920, "y": 410,
    "width": 170, "height": 50,
    "fillColor": "#2ecc71",
    "fontSize": 11
  }
}
```
→ Returns `outputId`

**Step 6: Connect hub to each spoke**
```json
{ "type": "createConnector", "payload": { "startNodeId": "<hubId>", "endNodeId": "<spoke1Id>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
{ "type": "createConnector", "payload": { "startNodeId": "<hubId>", "endNodeId": "<spoke2Id>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
{ "type": "createConnector", "payload": { "startNodeId": "<hubId>", "endNodeId": "<spoke3Id>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
```

**Step 7: Connect each spoke to output pill**
```json
{ "type": "createConnector", "payload": { "startNodeId": "<spoke1Id>", "endNodeId": "<outputId>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
{ "type": "createConnector", "payload": { "startNodeId": "<spoke2Id>", "endNodeId": "<outputId>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
{ "type": "createConnector", "payload": { "startNodeId": "<spoke3Id>", "endNodeId": "<outputId>", "connectorLineType": "ELBOWED", "connectorEndStrokeCap": "ARROW_LINES" }}
```

## Mapping Workflow Elements to Color Roles

| Workflow Element | Color Role | Example |
|------------------|------------|---------|
| Section headers (AUDIENCE, CONTENT, etc.) | **Primary** | Category titles |
| Requirements, CTAs | **Action** | "Content Requirements" |
| Results, deliverables | **Output** | "High quality content" |
| Data sources, inputs | **Input** | "Persona insights", "Segment data" |
| Process steps, details | **Neutral** | "Segments", "Journey Design" |
| Feedback/optimization | **Primary** | Loop back elements |

## Checklist

**Before starting:**
- [ ] Asked user for color preferences (5 roles: Primary, Action, Output, Input, Neutral)
- [ ] Analyzed source diagram for layout patterns (simple, hub/spoke, convergent, waypoint)

**Pre-planning phase (PHASE 0):**
- [ ] Listed ALL elements to be created with text content
- [ ] Called `measureText` for each unique text string
- [ ] Calculated box dimensions: width = measured + 40px, height = measured + 24px
- [ ] Calculated positions with proper spacing (100px vertical, 250px horizontal between sections)
- [ ] Created element plan JSON with all sizes and positions
- [ ] Showed plan to user and got confirmation

**Element placement decisions:**
- [ ] Identified which elements belong INSIDE sections (headers, hub elements, single-group content)
- [ ] Identified which elements go OUTSIDE sections (branching spokes, output pills, waypoints)
- [ ] For each element, asked: "Does this connect multiple sections?" → If yes, place outside

**While creating:**
- [ ] All boxes/pills use `createShapeWithText` (NOT FRAME nodes)
- [ ] Section containers use `name: ""` (empty string for no label)
- [ ] Colors match user's chosen palette and semantic roles
- [ ] Text is readable (auto-contrast based on fill color)
- [ ] Only white/light elements have strokes
- [ ] Font sizes are appropriate (14px headers, 12px content, 10px descriptions)
- [ ] Width calculated from `measureText` + 40px padding
- [ ] Height calculated from `measureText` + 24px padding

**Connector decisions:**
- [ ] Created ALL shapes first, collected ALL node IDs
- [ ] Verified each node ID exists before creating connector
- [ ] Arrow direction: `connectorEndStrokeCap: "ARROW_LINES"` (arrow at destination)
- [ ] Never used `connectorStartStrokeCap: "ARROW_LINES"` (would point backwards)
- [ ] Simple flows: Connect section-to-section
- [ ] Hub & Spoke: Connect hub element → each spoke element individually
- [ ] Convergent: Connect each source element → output pill
- [ ] Waypoints: Connect section → output pill → next section

## Why Native FigJam Shapes Matter

When you use `createShapeWithText`:
- Users can double-click to edit text
- Users can change fill colors via FigJam UI
- Users can ungroup and rearrange
- Elements behave like native FigJam objects

When you use FRAME nodes:
- Elements are locked Figma design objects
- Cannot be edited in FigJam
- Cannot change colors
- Cannot ungroup
- Defeats the purpose of FigJam collaboration
