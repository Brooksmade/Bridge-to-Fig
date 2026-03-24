# /design-system - Create a Design System from Figma

Create a complete design system from the connected Figma file following the correct workflow.

## MANDATORY: Use TodoWrite to Track Progress

**BEFORE STARTING**: You MUST create a todo list with ALL steps. This ensures no steps are skipped.

```
TodoWrite with these items:
1. Ask user for organizing principle
2. Extract design tokens from file (colors, typography, effects, styles)
2.5. Review font families (if multi-font file — confirm sans/serif/mono roles)
3. Confirm brand colors with user
4. Ask about boilerplate preferences
5. Ask about clearing existing styles and collections
6. PRE-FLIGHT CHECK: Verify all data collected
7. Create design system with ALL extracted data
8. Bind variables to nodes
9. Report results to user
```

Mark each todo as `in_progress` when starting and `completed` when done.

---

## Data to Collect (MUST store these values)

Throughout the workflow, you MUST collect and store:

| Variable | Collected In | Used In | Required |
|----------|--------------|---------|----------|
| `organizingPrinciple` | Step 1 | Step 7 | ✓ |
| `extractedTokens` | Step 2 | Step 7 | ✓ |
| `extractedTokens.effects.shadows` | Step 2 | Step 7 | ✓ |
| `existingStyles` | Step 2 | Step 4, 7 | ✓ |
| `primaryColor` | Step 3 | Step 7 | ✓ |
| `secondaryColor` | Step 3 | Step 7 | optional |
| `tertiaryColor` | Step 3 | Step 7 | optional |
| `includeBoilerplate` | Step 4 | Step 7 | ✓ |
| `deleteExistingCollections` | Step 5 | Step 7 | ✓ |
| `deleteExistingStyles` | Step 5 | Step 7 | ✓ |
| `primaryFontFamily` | Step 2 | Step 7 | ✓ |
| `fontFamilies` | Step 2.5 | Step 7 | if multi-font |

---

## Workflow

### Step 1: Ask for Organizing Principle

Present these options to the user:

**Which organizing principle would you like for your design system?**

1. **4-Level Hierarchy (Default)** - Full enterprise system
   - Collections: Primitive [ Level 1 ] → Semantic [ Level 2 ] → Tokens [ Level 3 ] → Theme
   - Best for: Large teams, complex projects, extensive dark mode support

2. **3-Level Simplified** - Streamlined structure
   - Collections: Primitives → Tokens → Theme
   - Best for: Mid-size projects, faster setup, simpler token management

3. **2-Level Flat** - Minimal overhead
   - Collections: Primitives → Tokens
   - Best for: Small projects, prototypes, simple theming needs

4. **Material Design 3** - Google's design language
   - Collections: Reference → System → Component
   - Best for: Android apps, Google ecosystem, Material UI projects

5. **Tailwind CSS Style** - Utility-first approach
   - Collections: Colors → Semantic
   - Best for: Web projects using Tailwind, developer-first workflows

Store the user's selection for Step 7.

### Step 2: Extract Design Tokens

**CRITICAL**: This step extracts ALL tokens including effects/shadows. You MUST save the FULL response.

Extract tokens from the entire file:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "extractDesignTokens", "payload": {"scope": "file", "includeChildren": true, "includeStyles": true}}'
```

**MUST STORE** the full `data` object from the response. Key fields to verify:

| Field | Description | VERIFY EXISTS |
|-------|-------------|---------------|
| `tokens.colors.all` | All unique colors | ✓ |
| `tokens.colors.brandCandidates` | Top colors for brand selection | ✓ |
| `tokens.typography.fontFamily` | Font families found | ✓ |
| `tokens.typography.fontSizeNodes` | **Node IDs per font size (for text style binding)** | ✓ CRITICAL |
| `tokens.effects.shadows` | **Shadow effects from nodes** | ✓ CRITICAL |
| `existingStyles.textStyles` | Text styles in file | ✓ |
| `existingStyles.effectStyles` | Effect styles in file | ✓ |
| `existingStyles.gridStyles` | Grid styles in file | ✓ |

**After extraction, report to user:**
- Colors found: X total, Y chromatic, Z gray
- Typography: X font families, Y sizes
- **Effects: X shadow effects found** ← MUST REPORT THIS
- Existing styles: X text, Y effect, Z grid

### Step 2.5: Review Font Families (Multi-Font Files)

**Check `tokens.typography.fontFamily` from extraction.** If the file uses **2 or more font families**, present them to the user:

**Your file uses multiple font families:**

| Font | Role (auto-detected) |
|------|---------------------|
| Inter | Sans (primary) |
| Georgia | Serif |
| SF Mono | Mono |

Auto-detection classifies fonts by name heuristics (e.g., "Mono", "Courier" → mono; "Georgia", "Merriweather" → serif). The `fontFamilyMap` from extraction shows which font is used at each size.

**Ask the user to confirm or reassign roles:**
1. **Sans (primary)** — Used for headings, body text, labels
2. **Serif** — Used for the `Font-Serif` primitive variable
3. **Mono** — Used for `code-*` text styles and `Font-Mono` variable

Store as `fontFamilies: { sans: "...", serif: "...", mono: "..." }` for Step 7.

**If only 1 font family exists**, skip this step — it becomes `primaryFontFamily` automatically.

**IMPORTANT:** The `fontFamilyMap` from extraction maps each font size to its most-used font family. When passed to `createDesignSystem`, text styles will automatically use the correct font per size (e.g., headings in Playfair Display, body in Inter). You do NOT need to manually assign fonts to individual styles.

### Step 3: Confirm Brand Colors

Check the `summary.brandColorAnalysis` from the extraction:

- If `needsUserPrompt: true`, show the `candidates` array to the user
- Ask user to confirm/select:
  - **Primary color** (main brand color)
  - **Secondary color** (if applicable - accent/complementary)
  - **Tertiary color** (if applicable - additional accent)

Show the hex values and usage percentages from the candidates.

The design system will generate 11-shade color scales for each:
- Primary → Brand Scale (11 shades)
- Secondary → Secondary Scale (11 shades)
- Tertiary → Tertiary Scale (11 shades)
- Plus Gray Scale (11 shades) and System colors (6)

### Step 4: Ask About Boilerplate

Check what was found in the extraction and ask:

**Should we include boilerplate tokens for gaps in your design system?**

Show what was found vs what's missing:
- Text styles: Found X, boilerplate would add Y
- Effect styles: Found X, boilerplate would add Y
- Grid styles: Found X, boilerplate would add 5 (12-col, 8-col, 4-col, 8px square, baseline rows)
- Typography variables: Found X, boilerplate would add Y
- Spacing variables: Found X, boilerplate would add Y

Options:
1. **Yes, fill gaps with boilerplate** - Add standard tokens for anything not found in file
2. **No, only use what's in the file** - Create design system from extracted values only
3. **Custom** - Let me choose which boilerplate categories to include

### Step 5: Clear Existing Styles and Collections

**Before creating a new design system, existing styles and variable collections should be cleared** to avoid conflicts, duplicates, and stale bindings.

First, query existing variable collections:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getVariables", "payload": {}}'
```

Then ask the user:

**Should we clear existing styles and variable collections before creating the new design system?**

Show what currently exists (collections from query above, styles from Step 2 extraction):
- Variable collections: X existing collections (list names)
- Text styles: X existing text styles
- Effect styles: X existing effect styles
- Grid styles: X existing grid styles

Options:
1. **Yes, clear everything (Recommended)** - Delete all existing variable collections and styles before creating the new design system. This ensures a clean slate with no conflicts.
2. **No, keep existing** - Preserve all existing styles and collections. New styles will be added alongside them (may cause duplicates).
3. **Clear styles only** - Delete existing text/effect/grid styles but keep variable collections.
4. **Clear collections only** - Delete existing variable collections but keep styles.

Store the user's selection:
- `deleteExistingCollections` = true/false
- `deleteExistingStyles` = true/false

### Step 5.5: PRE-FLIGHT CHECK (MANDATORY)

**STOP. Before proceeding to Step 6, verify you have collected ALL required data.**

Print this checklist and confirm each item:

```
PRE-FLIGHT CHECKLIST:
[ ] organizingPrinciple = "________" (from Step 1)
[ ] primaryColor = "#______" (from Step 3)
[ ] secondaryColor = "#______" or null (from Step 3)
[ ] tertiaryColor = "#______" or null (from Step 3)
[ ] includeBoilerplate = true/false (from Step 4)
[ ] deleteExistingCollections = true/false (from Step 5)
[ ] deleteExistingStyles = true/false (from Step 5)
[ ] primaryFontFamily = "________" (from Step 2 extraction)
[ ] fontFamilies = { sans: "...", serif: "...", mono: "..." } (from Step 2.5, if multi-font)
[ ] extractedTokens.typography.fontFamilyMap = present (from Step 2) ← maps each size to its font
[ ] extractedTokens.typography.fontSizeNodes = X sizes (from Step 2) ← CRITICAL for text style binding
[ ] extractedTokens.effects.shadows = X items (from Step 2) ← CRITICAL for effect style binding
[ ] existingStyles collected (from Step 2)
```

**If any required field is missing, GO BACK to that step.**

If `extractedTokens.effects.shadows` is empty or missing, the extraction may have timed out. Re-run extraction with `scope: "page"` on pages that contain shadows (e.g., "Shadows & blurs" page).

---

### Step 6: Create Design System

**CRITICAL**: The `extractedTokens` field MUST contain the FULL extraction data including `effects.shadows`.

Use the user's selections to create the design system:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{
    "type": "createDesignSystem",
    "payload": {
      "brandColors": {
        "primary": "#USER_SELECTED_PRIMARY",
        "secondary": "#USER_SELECTED_SECONDARY",
        "tertiary": "#USER_SELECTED_TERTIARY"
      },
      "organizingPrinciple": "USER_SELECTED_PRINCIPLE",
      "includeBoilerplate": USER_CHOICE,
      "deleteExistingCollections": USER_CHOICE_FROM_STEP_5,
      "deleteExistingStyles": USER_CHOICE_FROM_STEP_5,
      "extractedTokens": {
        "colors": { ... },
        "typography": { ... },
        "effects": {
          "shadows": [ ... ]   // ← MUST INCLUDE THIS
        }
      },
      "primaryFontFamily": "EXTRACTED_FONT",
      "fontFamilies": {
        "sans": "PRIMARY_SANS_FONT",
        "serif": "SERIF_FONT_OR_OMIT",
        "mono": "MONO_FONT_OR_OMIT"
      },
      "createTypographyStyles": true,
      "createEffectStyles": true,
      "createGridStyles": true
    }
  }'
```

**VERIFY before sending**: Does `extractedTokens.effects.shadows` have data? If not, STOP and re-extract.

The system will:
1. **Delete existing collections and styles** (if requested in Step 5) - clears the slate before creating
2. Create effect styles from extracted shadows
3. Use existing text styles from the file as the foundation (if not cleared)
4. Use existing effect styles from the file as the foundation (if not cleared)
5. Use existing grid styles from the file as the foundation (if not cleared)
6. Only add boilerplate styles for gaps (if user opted in)

### Step 7: Bind Variables to Nodes

After creation, bind variables and styles to matching elements in the file.

**7a. Bind Color Variables to Nodes (MANDATORY)**

Bind ALL colors by semantic role. This maps document colors to design system variables based on their PURPOSE, not their exact hex value:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "autoBindByRole", "payload": {"scope": "file"}}'
```

**IMPORTANT:** This can take several minutes on large files. Use extended timeout:
```bash
curl -s "http://localhost:4001/results/{commandId}?wait=true&timeout=300000"
```

This will:
- Analyze document colors and their usage frequency
- Map most-used chromatic color → Brand/Primary variable
- Map 2nd most-used chromatic → Secondary variable
- Map 3rd most-used chromatic → Tertiary variable
- Map all neutral colors to Gray scale by luminance

Wait for result and store binding count.

**7b. Apply Text Styles to Text Nodes**

If `typographyStyles.nodesStyled` was 0 in Step 6 (or text styles weren't auto-applied), apply them now:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "applyMatchingTextStyles", "payload": {"scope": "file"}}'
```

This matches text nodes by font size to the corresponding text styles created.

**7c. Apply Effect Styles to Nodes**

If effect bindings were 0 in Step 6 (or effects weren't auto-applied), apply them now:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "applyMatchingEffectStyles", "payload": {"scope": "file"}}'
```

This matches nodes with shadows to the corresponding effect styles created.

**Store all binding counts** for the Step 8 report:
- `colorBindings`: Number of nodes with color variables bound
- `textStyleBindings`: Number of text nodes with text styles applied
- `effectStyleBindings`: Number of nodes with effect styles applied

### Step 8: Report Results

**Query actual results to verify creation:**

```bash
# Get created styles to verify
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "getStyles", "payload": {"styleType": "EFFECT"}}'
```

Show a summary of what was created:

| Category | Expected | Actual | Status |
|----------|----------|--------|--------|
| Variables | X | Y | ✓/✗ |
| Effect styles | X from file + Y boilerplate | Z | ✓/✗ |
| Text styles | X | Y | ✓/✗ |
| Color bindings | - | Y | ✓/✗ |

**VERIFY**: Effect styles count should include:
- Styles from extracted shadows (if any)
- Boilerplate styles (if user opted in)

If effect styles are missing, the `extractedTokens.effects.shadows` was not passed correctly.

Full report should include:
- **Cleanup performed** (collections deleted, styles deleted - from Step 5 choice)
- Collections and variable counts
- Extraction summary (colors, typography, **effects/shadows found**)
- Existing styles preserved or cleared (text styles, effect styles, grid styles)
- **Effect styles created from extracted shadows**
- Boilerplate added (if any)
- Bindings applied

## Color Scales Created

| Scale | Shades | Based On |
|-------|--------|----------|
| Gray Scale | 11 (50-950) | Cool/Neutral grays |
| Brand Scale | 11 (50-950) | Primary color |
| Secondary Scale | 11 (50-950) | Secondary color |
| Tertiary Scale | 11 (50-950) | Tertiary color |
| System | 6 | White, Black, Success, Warning, Error, Info |

**Total: 50 color variables** (plus typography, spacing, effects)

## Grid Styles Created

| Style | Pattern | Description |
|-------|---------|-------------|
| Grid/12 Column | COLUMNS | Standard 12-column responsive grid (24px gutter) |
| Grid/8 Column (Tablet) | COLUMNS | 8-column grid for tablet layouts (20px gutter) |
| Grid/4 Column (Mobile) | COLUMNS | 4-column grid for mobile layouts (16px gutter) |
| Grid/8px Square | GRID | 8px square grid for alignment |
| Grid/Baseline Rows | ROWS | Row grid for vertical rhythm (8px gutter) |

## Reference Files

- `.claude/agents/figma-variables.md` - Full agent instructions
- `prompts/figma-variables.md` - Quick reference
- `prompts/quick-ref.md` - Compact API reference (~200 lines)
- `prompts/figma-bridge.md` - Full API reference (detailed examples)
