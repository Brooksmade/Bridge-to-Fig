# /typography-system - Typography Management

Audit fonts used across the file, apply mixed text styles (bold/color/size on specific words within text), replace one font family with another across all nodes, and create styled hyperlinks. Use when the user needs to manage typography at scale — font audits, bulk replacements, rich text formatting, or link styling. For creating typography variables and styles as part of a design system, use `/design-system` instead.

**IMPORTANT:** For full implementation details, also read `.claude/agents/typography-specialist.md`

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open Figma → Plugins → Bridge to Fig |
| Text nodes exist | Query selection or file | ≥1 text node in scope | Need text content to work with |

**Note:** Fonts must be loaded before any text modification. This skill handles font loading automatically in Step 3.

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

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| `loadFont` fails | Font not available in Figma | Use Inter as fallback (always available); report which fonts couldn't be loaded |
| `setRangeFont` fails with "Font not loaded" | Font style variant not loaded | Load ALL styles (Regular, Bold, Italic, etc.) before applying — not just the family |
| Character range out of bounds | `start`/`end` exceed text length | Query text node first to get character count; clamp range to valid bounds |
| `setTextHyperlink` has no visible effect | Hyperlink set but no visual styling | Must also apply blue color + underline decoration separately — hyperlink alone is invisible |
| Font replacement breaks mixed-style text | Node has multiple font styles | Load all style variants of the replacement font before bulk replacement |
| `getUsedFonts` returns empty | No text nodes in scope | Expand scope or verify correct frame is targeted |
| Missing font detected | Font used in file not installed locally | Report missing fonts with suggestions for similar alternatives |

**On partial failure:** Typography operations are per-node. If some nodes fail (missing font, invalid range), other nodes still succeed. Report failures with node IDs so user can fix individually.

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Task Type** | Audit / Mixed Styles / Replacement / Hyperlinks |
| **Fonts Loaded** | X |
| **Text Ranges Styled** | X |
| **Fonts Replaced** | X nodes |
| **Hyperlinks Created** | X |
| **Issues Found** | X (missing fonts, range errors) |

## Reference Files

- `.claude/agents/typography-specialist.md` - Full agent instructions
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
- `prompts/skill-patterns.md` - Skill patterns reference
