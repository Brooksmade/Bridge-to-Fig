# /figjam-workflow - Create FigJam Workflow Diagrams

Create workflow diagrams, flowcharts, and process maps in FigJam using native, editable shapes.

> **CRITICAL:** ALWAYS use bridge server commands (`createSection`, `createShapeWithText`, `createConnector` at `localhost:4001`) to create FigJam diagrams. NEVER use MCP tools like `generate_diagram` — they create separate files instead of drawing in the user's open FigJam board. Only use MCP Figma tools for FigJam if the user explicitly requests it.

**IMPORTANT:** For full implementation details, also read `.claude/agents/figjam-workflow-design.md`

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

### Step 8a: Wrap Existing Content in a Section — Build First, Wrap After

**Mirror Figma's native "Section from selection" behavior**: build all the shapes and connectors FIRST, then call `wrapInSection` to enclose them. Figma auto-fits the section bounds — you don't need to compute anything.

1. Create every shape and connector for the workflow at its final coordinates (Steps 6–8). **Capture the returned `id` of every node.**
2. Call `wrapInSection`:
   ```bash
   curl -X POST http://localhost:4001/commands -H "Content-Type: application/json" -d '{
     "type": "wrapInSection",
     "payload": {
       "nodeIds": ["1:23", "1:24", "1:25", "..."],
       "name": "WF1: Design System from Figma File",
       "fillColor": "#ffffff"
     }
   }'
   ```
3. Verify the response (`data.id`, `data.x/y/width/height`) — the section should enclose every node you passed in.

**Why this is better than computing the bbox manually:** Figma's `section.appendChild(node)` reparents the node and the section auto-resizes to fit. You don't risk off-by-pixel errors, you don't have to track padding, and shapes that nudged during connector creation are still enclosed correctly.

**When to use `createSection` instead:** only when you genuinely need an empty section at fixed coordinates that you'll fill in later — rare in workflow diagrams.

### Step 10: Report

Show what was created:
- Sections: X
- Shapes: X
- Connectors: X

## Reference Files

- `.claude/agents/figjam-workflow-design.md` - Full agent instructions
- `.claude/prompts/charts/_base.md` - Colors and spacing
- `.claude/prompts/charts/*.md` - Chart-specific prompts
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
