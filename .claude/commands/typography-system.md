# /typography-system - Typography Management

Audit fonts, apply mixed text styles, manage font replacements, and create hyperlinks.

**IMPORTANT:** For full implementation details, also read `.claude/agents/typography-specialist.md`

## Workflow

### Step 1: Ask for Task Type

**What typography task would you like to perform?**

1. **Font audit** — Discover all fonts used, find missing fonts, suggest replacements
2. **Mixed text styles** — Apply bold, color, size to specific words within text
3. **Font replacement** — Replace one font family with another across the file
4. **Hyperlinks** — Add clickable links to text ranges with underline + blue styling

### Step 2: Get Font Inventory

For all task types, start by discovering current fonts:

```bash
# Get fonts used in selection or file
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getUsedFonts", "payload": {"nodeId": "FRAME_ID"}}'

# Check for missing fonts
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "checkMissingFonts"}'
```

Report to user:
- Font families found: X
- Font styles used: list
- Missing fonts: X (list)

### Step 3: Load Required Fonts

**CRITICAL:** Always load fonts before modifying text. Load ALL styles used:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "loadFont", "payload": {"family": "Inter", "style": "Regular"}}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "loadFont", "payload": {"family": "Inter", "style": "Bold"}}'

curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "loadFont", "payload": {"family": "Inter", "style": "Italic"}}'
```

### Step 4: Execute Task

#### For Font Audit:
Report used/missing/replacement candidates. No modifications needed.

#### For Mixed Styles:

Ask user which words to style and how. Apply range operations:

```bash
# Bold specific characters
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeFont", "target": "TEXT_NODE_ID", "payload": {
    "start": 0, "end": 5,
    "fontName": {"family": "Inter", "style": "Bold"}
  }}'

# Color specific characters
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeColor", "target": "TEXT_NODE_ID", "payload": {
    "start": 10, "end": 20,
    "color": {"r": 0.2, "g": 0.4, "b": 1}
  }}'

# Underline/strikethrough
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeTextDecoration", "target": "TEXT_NODE_ID", "payload": {
    "start": 10, "end": 20,
    "decoration": "UNDERLINE"
  }}'

# Text case (UPPER, LOWER, TITLE, SMALL_CAPS)
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeTextCase", "target": "TEXT_NODE_ID", "payload": {
    "start": 0, "end": 10,
    "textCase": "UPPER"
  }}'
```

#### For Font Replacement:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "modify", "target": "TEXT_NODE_ID", "payload": {
    "properties": {
      "fontName": {"family": "Inter", "style": "Regular"}
    }
  }}'
```

#### For Hyperlinks:

Apply link color + underline + hyperlink:

```bash
# Set blue color
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeColor", "target": "TEXT_NODE_ID", "payload": {
    "start": 10, "end": 20,
    "color": {"r": 0.2, "g": 0.4, "b": 1}
  }}'

# Add underline
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setRangeTextDecoration", "target": "TEXT_NODE_ID", "payload": {
    "start": 10, "end": 20,
    "decoration": "UNDERLINE"
  }}'

# Set hyperlink URL
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "setTextHyperlink", "target": "TEXT_NODE_ID", "payload": {
    "start": 10, "end": 20,
    "url": "https://example.com"
  }}'
```

### Step 5: Report

| Action | Count |
|--------|-------|
| Fonts loaded | X |
| Text ranges styled | X |
| Fonts replaced | X |
| Hyperlinks created | X |
| Issues found | X |

## Reference Files

- `.claude/agents/typography-specialist.md` - Full agent instructions
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
