# Building Layouts in Figma

When creating frames with auto-layout and children via the bridge server, you MUST follow this exact sequence. Deviating causes silent failures where children don't fill width.

## The 3-Step Rule

```
1. create       → frame with basic properties (fills, cornerRadius, strokes)
2. setAutoLayout → on that frame (direction, spacing, padding)
3. modify        → child sizing (layoutSizingHorizontal, layoutGrow, layoutSizingVertical)
```

**Why:** Child layout properties (`layoutSizingHorizontal: "FILL"`, `layoutGrow: 1`, etc.) require the node to already be inside an auto-layout parent. `create` runs before `setAutoLayout`, so these properties silently fail if set during creation.

## How to send commands

- **≤ ~15 nodes:** three `./scripts/fig batch '[...]'` calls (create / layout / child-sizing) — no
  scripts, no temp files.
- **Larger builds:** a **Python script** (written to `.tmp/`, deleted after) — bash with inline JSON
  breaks on complex payloads at that scale.

### Reusable Helpers

```python
import requests

BASE = "http://localhost:4001/commands"
WAIT = "http://localhost:4001/results"

def send_wait(cmd, timeout=15000):
    cmd_id = requests.post(BASE, json=cmd).json()["commandId"]
    result = requests.get(f"{WAIT}/{cmd_id}?wait=true&timeout={timeout}").json()
    if not result.get("success"):
        print(f"  ERROR: {result.get('error', 'unknown')}")
    return result.get("nodeId", "")

def create(parent, node_type, props):
    return send_wait({
        "type": "create",
        "payload": {"nodeType": node_type, "parent": parent, "properties": props}
    })

def auto_layout(target, **kwargs):
    send_wait({"type": "setAutoLayout", "target": target, "payload": kwargs})

def modify(target, **props):
    send_wait({"type": "modify", "target": target, "payload": {"properties": props}})

def text_node(parent, text, size, style="Regular", color=None):
    c = color or {"r": 0.9, "g": 0.9, "b": 0.9}
    return create(parent, "TEXT", {
        "characters": text,
        "fontSize": size,
        "fontName": {"family": "Inter", "style": style},
        "fills": [{"type": "SOLID", "color": c}]
    })
```

## Common Sizing Patterns

```python
# Child fills parent width, hugs content height
modify(child, layoutSizingHorizontal="FILL", layoutSizingVertical="HUG")

# Child grows to fill remaining space (like flex: 1)
modify(child, layoutGrow=1)

# Child fills width AND grows vertically (like flex: 1 + width: 100%)
modify(child, layoutSizingHorizontal="FILL", layoutGrow=1)

# Fixed-size element (no auto-sizing)
# Just don't call modify — create with explicit width/height is enough
```

## Building a Complete Layout

```python
# 1. Create root frame
root = create(PAGE, "FRAME", {
    "name": "My Layout",
    "width": 280, "height": 400,
    "fills": [{"type": "SOLID", "color": {"r": 0.17, "g": 0.17, "b": 0.17}}],
    "clipsContent": True
})
auto_layout(root,
    direction="VERTICAL", itemSpacing=12,
    paddingTop=12, paddingRight=12, paddingBottom=12, paddingLeft=12,
    primaryAxisSizingMode="FIXED", counterAxisSizingMode="FIXED"
)

# 2. Create a row (horizontal auto-layout child)
row = create(root, "FRAME", {"name": "Row", "fills": []})
auto_layout(row, direction="HORIZONTAL", itemSpacing=8, counterAxisAlignItems="CENTER")
modify(row, layoutSizingHorizontal="FILL", layoutSizingVertical="HUG")

# 3. Add children to the row
label = text_node(row, "Label", 12, "Regular")
modify(label, layoutGrow=1)  # pushes next item to the right
value = text_node(row, "Value", 12, "Semi Bold")

# 4. Add a growing area (like a log/content area that fills remaining space)
content = create(root, "FRAME", {
    "name": "Content",
    "fills": [{"type": "SOLID", "color": {"r": 0.15, "g": 0.15, "b": 0.15}}],
    "cornerRadius": 6, "clipsContent": True
})
auto_layout(content, direction="VERTICAL", itemSpacing=0, paddingTop=8, paddingBottom=8, paddingLeft=8, paddingRight=8)
modify(content, layoutSizingHorizontal="FILL", layoutGrow=1)
```

## Checklist

- [ ] Load fonts first (`loadFont` for each family+style used)
- [ ] Create parent frame, THEN `setAutoLayout` on it
- [ ] Create children inside the parent
- [ ] `modify` each child for FILL/HUG/GROW AFTER both create and setAutoLayout are done
- [ ] Use `clipsContent: true` on frames that should clip overflow
- [ ] Set `primaryAxisSizingMode: "FIXED"` and `counterAxisSizingMode: "FIXED"` on root frames with explicit dimensions
- [ ] `fig batch` for ≤~15 nodes; Python scripts in `.tmp/` (deleted after) for larger builds
- [ ] **Screenshot the FINISHED layout and compare against reference** — once at the end (or per major screen on multi-screen builds), not after every frame

## Verify: Screenshot and Compare (at the end)

After the build is COMPLETE, screenshot the result and compare it against the reference — once per
deliverable, not per step. Don't assume it looks right.

1. **Screenshot your work** using the Figma desktop MCP tool:
   ```
   mcp__plugin_figma_figma-desktop__get_screenshot(nodeId="YOUR_FRAME_ID")
   ```

2. **Compare against the reference** — if the user provided a screenshot, compare side by side. Check:
   - Do all elements fill their parent width? (most common failure)
   - Are spacing and padding correct?
   - Are colors accurate?
   - Is text truncated or overflowing?
   - Does the overall structure match?

3. **If something is off**, fix it and screenshot again. Don't report done until the screenshot matches.

---

## Figma Color Format

Figma uses 0–1 floats, not 0–255 integers:

```python
# Convert hex to Figma color
def hex_to_figma(hex_str):
    h = hex_str.lstrip("#")
    return {
        "r": int(h[0:2], 16) / 255,
        "g": int(h[2:4], 16) / 255,
        "b": int(h[4:6], 16) / 255,
    }

# Dark theme palette
BG       = hex_to_figma("#2c2c2c")
BG_SEC   = hex_to_figma("#383838")
BORDER   = hex_to_figma("#444444")
TEXT     = hex_to_figma("#e5e5e5")
TEXT_SEC = hex_to_figma("#999999")
GREEN    = hex_to_figma("#22c55e")
RED      = hex_to_figma("#ef4444")

# Light theme palette
BG       = hex_to_figma("#ffffff")
BG_SEC   = hex_to_figma("#f5f5f5")
BORDER   = hex_to_figma("#e5e5e5")
TEXT     = hex_to_figma("#333333")
TEXT_SEC = hex_to_figma("#666666")
```
