# /replace-design-system - Replace Design System Variables

Replace the variable collections in the current Figma file with a new organizing principle. Simple 3-question flow, then fully automated.

## Flow

### Question 1: Pick a Structure

Ask the user:

**Which design system structure do you want?**

1. **4-Level Hierarchy** — Primitive → Semantic → Tokens → Theme
   _Best for: Large teams, complex dark mode_

2. **3-Level Simplified** — Primitives → Tokens → Theme
   _Best for: Mid-size projects, faster setup_

3. **2-Level Flat** — Primitives → Tokens
   _Best for: Small projects, prototypes_

4. **Material Design 3** — Reference → System → Component
   _Best for: Android, Material UI_

5. **Tailwind CSS** — Colors → Semantic
   _Best for: Tailwind web projects_

6. **Adobe Spectrum** — Global → Alias → Component → System
   _Best for: Enterprise, multi-brand, accessibility_

7. **Apple Human Interface Guidelines** — System Palette → Dynamic Colors → Component Tokens
   _Best for: iOS/macOS apps, SwiftUI_

Map selection to: `four-level`, `three-level`, `two-level`, `material-design`, `tailwind`, `spectrum`, or `apple-hig`

### Question 2: Pick a Brand Color

Ask the user:

**What's your primary brand color?** (hex like `#0265dc`, or say "keep default")

- Default for Spectrum: `#0265dc` (Spectrum blue)
- Default for Apple HIG: `#007AFF` (systemBlue)
- Default for others: `#6366f1` (Indigo)

Optionally ask for secondary/tertiary if user wants them.

### Question 3: What to Do with Boilerplate

Ask the user:

**How should we handle the standard design tokens?** (typography, spacing, shadows, borders, etc.)

1. **Full boilerplate** — Include all standard tokens (typography, spacing, shadows, borders, opacity, etc.)
2. **Colors only** — Just create the color variable collections, skip boilerplate tokens
3. **Fill gaps** — Extract what's already in the file first, only add boilerplate for what's missing

---

## Execution (fully automated after the 3 questions)

### Step 1: Delete Existing Collections

Query current collections and delete them all:

```bash
# Get existing collections
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "getVariables"}'
```

For each collection returned, delete it:

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "deleteVariableCollection", "payload": {"collectionId": "COLLECTION_ID"}}'
```

Wait for each delete to confirm before proceeding.

### Step 2: Extract Tokens (if user chose "Fill gaps")

Only if user selected option 3 above:

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "extractDesignTokens", "payload": {"scope": "file", "includeChildren": true, "includeStyles": true}}'
```

Use `timeout=300000` for the result poll. Store the full `data` response as `extractedTokens`.

### Step 3: Create Design System

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "createDesignSystem",
    "payload": {
      "organizingPrinciple": "USER_CHOICE",
      "brandColors": {"primary": "USER_HEX"},
      "includeBoilerplate": true_or_false,
      "extractedTokens": extracted_data_or_null,
      "createTypographyStyles": true,
      "createEffectStyles": true
    }
  }'
```

Set `includeBoilerplate`:
- Option 1 (Full boilerplate) → `true`
- Option 2 (Colors only) → `false`
- Option 3 (Fill gaps) → `true`, AND pass `extractedTokens` from Step 2

Use `timeout=300000` for the result poll. Store the response — it contains `variableMap` and collection IDs needed for binding.

### Step 4: Bind Variables — 3-Pass Strategy

**Pass 1 — Exact + near color match (tolerance 30):**

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "bindMatchingColors", "payload": {"scope": "page", "tolerance": 30, "includeStrokes": true, "forceRebind": true}}'
```

**Pass 2 — Semantic role detection for remaining unbound:**

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "autoBindByRole", "payload": {"scope": "page", "minConfidence": 0.5, "bindFills": true, "bindStrokes": true, "forceRebind": false}}'
```

**Pass 3 — Manual sweep for stubborn outliers:**

Run a dry-run check:

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "bindMatchingColors", "payload": {"scope": "page", "tolerance": 50, "forceRebind": false, "dryRun": true}}'
```

If `skipped > 0`, identify the unbound nodes from the response and bind them manually to the closest semantic variable using `bindFillVariable` / `bindStrokeVariable`. Common outliers:

- **Success green text** → `positive-content-color-default`
- **Error red text** → `negative-content-color-default`
- **Warning orange** → `notice-content-color-default`
- **Info blue** → `informative-content-color-default`
- **Frame outer strokes** → `border-color-default`
- **Divider lines** → `divider-color-default`

Repeat until the dry-run shows `skipped: 0`.

### Step 5: Verify & Report

Run final verification:

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "bindMatchingColors", "payload": {"scope": "page", "tolerance": 50, "forceRebind": false, "dryRun": true}}'
```

Report to user:

```
Done! Here's what was created:

Structure: [principle name]
Collections: [list collection names and variable counts]
Total variables: X
Typography styles: X
Effect styles: X

Binding results:
- X nodes bound to color variables
- X nodes bound by semantic role
- X nodes manually bound
- 0 unbound nodes remaining
```

## Key Rules

- **Always delete ALL existing collections first** — createDesignSystem skips collections that already exist
- **Always do 3 binding passes** — exact match alone misses ~15-20% of nodes
- **Always verify with dry run** — the job isn't done until `skipped: 0`
- **Use `timeout=300000`** for extractDesignTokens and createDesignSystem result polls
- **bindFillVariable format**: `{"type": "bindFillVariable", "payload": {"nodeId": "...", "variableId": "...", "fillIndex": 0}}` — nodeId goes in PAYLOAD, not as target
