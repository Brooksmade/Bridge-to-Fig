# /accessibility-audit - WCAG Accessibility Audit

Audit designs for WCAG compliance including color contrast, touch targets, text sizing, focus states, and heading hierarchy.

**IMPORTANT:** For full implementation details, also read `.claude/agents/accessibility-auditor.md`

## Workflow

### Step 1: Ask for Audit Options

**What WCAG conformance level should we target?**

1. **AA (Recommended)** — Standard conformance (4.5:1 normal text, 3:1 large text)
2. **AAA** — Enhanced conformance (7:1 normal text, 4.5:1 large text)

**How should we output the report?**

1. **Markdown report** — Structured report with tables and recommendations
2. **Visual Figma frames** — Create annotation frames in the file highlighting issues
3. **Both** — Markdown report plus visual annotations

### Step 2: Scope the Audit

Query the current selection:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "payload": {"queryType": "selection"}}'
```

If nothing selected, ask:
**What should we audit?**
1. **Current selection** — Audit selected frames only
2. **Entire file** — Audit all frames in the file

### Step 3: Extract Color Data

```bash
# Get all colors from frame
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getNodeColors", "payload": {"nodeId": "FRAME_ID", "includeChildren": true}}'

# Analyze colors for contrast pairs
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "analyzeColors"}'
```

### Step 4: Deep Query for Dimensions

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "query", "target": "FRAME_ID", "payload": {"queryType": "deep"}}'
```

Extract from the response:
- Text node sizes and font sizes
- Interactive element dimensions
- Layout structure

### Step 5: Run Checks

#### Color Contrast (WCAG 2.1)

Calculate relative luminance and contrast ratio for each text/background pair:

| Level | Normal Text | Large Text | UI Components |
|-------|-------------|------------|---------------|
| AA | 4.5:1 | 3:1 | 3:1 |
| AAA | 7:1 | 4.5:1 | 4.5:1 |

**Large text:** 18pt (24px) regular or 14pt (18.67px) bold.

#### Touch Targets

| Platform | Minimum Size |
|----------|-------------|
| Web/iOS | 44x44 px |
| Android | 48x48 dp |

#### Text Sizes

| Check | Minimum |
|-------|---------|
| Body text | 16px |
| Minimum any text | 12px |
| Interactive labels | 14px |

#### Focus States and Heading Hierarchy

These require manual verification — flag for review.

### Step 6: Generate Report

**Accessibility Audit Summary**

| Category | Passed | Failed | Warnings |
|----------|--------|--------|----------|
| Color Contrast | X | X | X |
| Touch Targets | X | X | X |
| Text Sizing | X | X | X |
| Focus States | — | — | X (manual) |
| Headings | X | X | X |

**Score: X/100 — Level: AA/AAA**

For each failing element, provide:
- Node ID and name
- Current value vs required value
- Specific fix recommendation

**Recommendations:**
1. Increase contrast on X text elements
2. Enlarge X touch targets to meet minimum
3. Manually verify focus states are visible

## Reference Files

- `.claude/agents/accessibility-auditor.md` - Full agent instructions
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
