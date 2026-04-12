# /figjam-workflow - Create FigJam Workflow Diagrams

Create workflow diagrams, flowcharts, comparison tables, hub-and-spoke diagrams, swimlanes, decision trees, and timelines in FigJam using native editable shapes, sections, and connectors. Use when the user wants to visualize a process, user flow, CI/CD pipeline, approval workflow, or any diagram in their open FigJam board. Auto-detects chart type from the user's description. Not for Figma design files — this creates FigJam elements only.

> **CRITICAL:** ALWAYS use bridge server commands (`createSection`, `createShapeWithText`, `createConnector` at `localhost:4001`) to create FigJam diagrams. NEVER use MCP tools like `generate_diagram` — they create separate files instead of drawing in the user's open FigJam board. Only use MCP Figma tools for FigJam if the user explicitly requests it.

**IMPORTANT:** For full implementation details, also read `.claude/agents/figjam-workflow-design.md`

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open FigJam file → Plugins → Bridge to Fig |
| FigJam file open | User confirms FigJam (not Figma design file) | FigJam board active | Open a FigJam file — FigJam shapes don't work in design files |

**If a Figma design file is open instead of FigJam, STOP.** FigJam shapes (`createSection`, `createShapeWithText`, `createConnector`) only work in FigJam files.

## Workflow

### Step 1: Describe the Workflow

Ask the user:

**What workflow, process, or diagram would you like to create?**

Examples:
- "User onboarding flow with email verification"
- "CI/CD pipeline from commit to deploy"
- "Content approval process with review stages"

### Step 2: Detect Chart Type

Analyze the user's input to determine the chart type:

| If the input contains... | Chart Type | Load Prompt |
|--------------------------|------------|-------------|
| Numbered steps, decisions | **Flowchart** | `.claude/prompts/charts/flowchart.md` |
| Feature comparison table | **Comparison Table** | `.claude/prompts/charts/comparison-table.md` |
| Central item + branches | **Hub & Spoke** | `.claude/prompts/charts/hub-spoke.md` |
| Sections by actor/role | **Swimlane** | `.claude/prompts/charts/swimlane.md` |
| Nested Yes/No logic | **Decision Tree** | `.claude/prompts/charts/decision-tree.md` |
| Chronological events | **Timeline** | `.claude/prompts/charts/timeline.md` |
| General process | **Workflow** | Use default patterns |

Always load `.claude/prompts/charts/_base.md` first for colors/spacing.

### Step 3: Ask for Color Preferences

**What colors would you like for your workflow diagram?**

5 semantic color roles:

| Role | Usage | Default |
|------|-------|---------|
| **Primary** | Section headers, category labels | `#2c3e50` |
| **Action** | CTAs, requirements, important actions | `#e67e22` |
| **Output** | Results, success states, deliverables | `#27ae60` |
| **Input** | Data sources, information items | `#3498db` |
| **Neutral** | Content boxes, process steps | `#ffffff` |

Options:
1. **Professional (Blue/Gray)** — Primary: #2c3e50, Action: #3498db, Output: #27ae60
2. **Warm (Teal/Orange)** — Primary: #0d7377, Action: #e67e22, Output: #27ae60
3. **Minimal (Grayscale)** — Primary: #2c3e50, Action: #7f8c8d, Output: #27ae60
4. **Custom** — Provide hex codes for each role

### Step 4: Pre-Plan All Elements (MANDATORY)

List ALL elements with IDs, types, text, and color roles in a table:

| ID | Type | Text Content | Role/Color |
|----|------|--------------|------------|
| header1 | Section Header | "User Registration" | Primary |
| step1 | Content Box | "Enter Email" | Neutral |
| decision1 | Decision | "Valid Email?" | Action |
| output1 | Output | "Welcome Screen" | Output |

### Step 5: Measure Text

For EACH element, call `measureText` to get actual dimensions:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "measureText", "payload": {"text": "User Registration", "fontSize": 14}}'
```

Calculate box dimensions:
- **Width** = measured_width + 40px padding (minimum 140px)
- **Height** = measured_height + 24px padding (minimum 44px)

### Step 6: Calculate Positions

Layout rules:
- **Horizontal gap** between boxes: 80px
- **Vertical gap** between boxes: 100px
- **Section-to-section gap**: 250px
- **Section padding**: 60px on all sides

### Step 7: Show Plan and Get Approval

Present the complete element plan with sizes and positions. Ask user to confirm before creating.

### Step 8: Create Elements

Create sections, shapes, and connectors:

```bash
# Create section
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createSection", "payload": {"name": "", "x": 100, "y": 100, "width": 280, "height": 200}}'

# Create shape with text
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createShapeWithText", "payload": {
    "text": "Enter Email",
    "shapeType": "ROUNDED_RECTANGLE",
    "x": 110, "y": 110, "width": 180, "height": 44,
    "fillColor": "#ffffff",
    "strokeColor": "#bdc3c7",
    "strokeWeight": 1,
    "fontSize": 12
  }}'

# Create connector (arrow at END only)
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "createConnector", "payload": {
    "startNodeId": "SOURCE_ID",
    "endNodeId": "TARGET_ID",
    "connectorLineType": "ELBOWED",
    "connectorEndStrokeCap": "ARROW_LINES"
  }}'
```

**Key constraints:**
- Elements INSIDE sections = headers/hubs
- Elements OUTSIDE sections = spokes/outputs
- Arrow at END only (`connectorEndStrokeCap: "ARROW_LINES"`)
- Create ALL shapes first, THEN connectors

### Step 8a: Create Parent Wrapper Section FIRST

**BEFORE creating any child elements**, create the parent wrapper section:
1. Calculate full bounding box from planned positions (Step 6)
2. Add 60px padding on all sides
3. Create the parent section with the workflow name (e.g., "WF1: Design System from Figma File")
4. THEN proceed to create child sections, shapes, and connectors inside it

**FigJam sections only capture elements created AFTER the section exists.** If you create the parent last, it floats on top and children are not adopted.

### Step 10: Report

Show what was created:
- Sections: X
- Shapes: X
- Connectors: X

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| `createSection` fails | "Cannot create section" error | Verify FigJam file is open (not Figma design file); sections are FigJam-only |
| `createShapeWithText` fails | Shape type not supported | Check supported shapes: ROUNDED_RECTANGLE, DIAMOND, ELLIPSE, TRIANGLE_UP, TRIANGLE_DOWN |
| `createConnector` fails: "Node not found" | Source or target shape ID is wrong | Verify shape IDs from creation responses; shapes must exist before connectors |
| `measureText` returns unexpected dimensions | Font or fontSize not available | Default to estimated width (text.length * fontSize * 0.6); proceed with approximation |
| Elements not inside sections | Section created AFTER children | Create parent section FIRST, then add children — FigJam only adopts elements created after the section |
| Overlapping elements | Position calculations wrong | Review spacing constants (80px horizontal, 100px vertical, 250px between sections) |
| Too many elements for one diagram | >50 shapes makes layout unwieldy | Split into multiple linked diagrams; use sections as visual grouping |

**On partial failure:** Diagrams are additive. If some shapes created but connectors fail, the shapes are still usable. Report what was created and offer to retry connectors.

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Chart Type** | Flowchart / Swimlane / Hub-Spoke / etc. |
| **Sections Created** | X |
| **Shapes Created** | X |
| **Connectors Created** | X |
| **Color Scheme** | Professional / Warm / Minimal / Custom |

## Reference Files

- `.claude/agents/figjam-workflow-design.md` - Full agent instructions
- `.claude/prompts/charts/_base.md` - Colors and spacing
- `.claude/prompts/charts/*.md` - Chart-specific prompts
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
- `prompts/skill-patterns.md` - Skill patterns reference
