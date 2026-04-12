# /design-system-website - Create a Design System from a Website

Extract CSS from a live website using Puppeteer and create a complete design system in Figma.

**IMPORTANT:** For full implementation details, also read `.claude/agents/website-design-system-extractor.md`

## Workflow

### Step 1: Get Website URL

Ask the user for the website URL to extract from:

**What website URL would you like to extract design tokens from?**

Example: `https://example.com` or `https://tailwindcss.com`

### Step 2: Ask for Organizing Principle

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

Store the user's selection for Step 5.

### Step 2.5: Ask for Additional Options

Present these options to the user using AskUserQuestion:

**Additional design system options:**

1. **Include boilerplate values?**
   - Yes (Recommended) - Fill gaps with standard values (spacing, typography, system colors)
   - No - Only use extracted values from website

2. **Create grid styles?**
   - Yes - Create layout grid styles (8px, 12-column, etc.)
   - No (Default) - Skip grid styles

3. **Gray base tone:**
   - Neutral (Default) - Pure gray scale
   - Warm - Slightly warm/brown tint
   - Cool - Slightly cool/blue tint

4. **Clean up existing variables/styles?**
   - Yes (Recommended for new files) - Delete all existing variable collections and styles before creating
   - No - Keep existing and add new alongside

Store these selections for Step 5.

### Step 3: Extract Website CSS (with Screenshot)

Use the Puppeteer-based extraction with screenshot capture:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "extractWebsiteCSS", "payload": {
    "url": "USER_PROVIDED_URL",
    "captureScreenshot": true,
    "screenshotFullPage": false
  }}'
```

Wait for result (this may take 30-60 seconds for complex sites).

The extraction returns:
- `colors` - Array of ColorToken objects with hex, rgb, **usage** (background/text/border), count
- `typography` - fontFamilies, fontSizes, fontWeights, lineHeights, letterSpacing
- `spacing` - Detected spacing values (px)
- `borderRadius` - Detected border radii (px)
- `shadows` - CSS box-shadow values
- `meta` - extractedAt, elementsScanned, extractionTimeMs
- `screenshot` - Base64 PNG of the page (if captureScreenshot: true)

**IMPORTANT:** The `usage` field tells you HOW each color is used:
- `background` - Used as background-color
- `text` - Used as text color
- `border` - Used as border color

### Step 4: Confirm Brand Colors AND Usage Mapping

Analyze the extracted colors **by their usage** and present to user:

**Extracted colors from {URL}:**

Group colors by usage type:
- **Background colors:** Show colors with usage="background", sorted by count
- **Text colors:** Show colors with usage="text", sorted by count
- **Border/Accent colors:** Show colors with usage="border", sorted by count

Ask user to confirm the color-to-variable mapping:

**How should these colors be mapped to variables?**

Example mapping (based on ironhill.au):
- Background color `#344128` (dark green) → **Brand-500** (for frame backgrounds)
- Text color `#CFD0C0` (light sage) → **Tertiary-500** (for text on dark backgrounds)
- Accent color `#FEC820` (gold) → **Secondary-500** (for accents/borders)

Store the user's mapping for Step 6.

### Step 5: Create Design System in Figma

Transform website tokens to Figma format and create:

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
      "includeBoilerplate": USER_SELECTED_BOILERPLATE,
      "createGridStyles": USER_SELECTED_GRID_STYLES,
      "createTypographyStyles": true,
      "createEffectStyles": true,
      "grayBase": "USER_SELECTED_GRAY_BASE",
      "deleteExistingCollections": USER_SELECTED_CLEANUP,
      "deleteExistingStyles": USER_SELECTED_CLEANUP,
      "extractedTokens": {
        "colors": {TRANSFORMED_WEBSITE_COLORS},
        "typography": {TRANSFORMED_TYPOGRAPHY},
        "numbers": {
          "spacing": {WEBSITE_SPACING},
          "borderRadius": {WEBSITE_BORDER_RADIUS}
        }
      },
      "primaryFontFamily": "WEBSITE_FONT_FAMILY"
    }
  }'
```

**New options:**
- `deleteExistingCollections: true` - Removes all existing variable collections first
- `deleteExistingStyles: true` - Removes all existing text/effect/grid styles first

### Step 6: Bind Variables by Extracted Usage (NEW - Replaces autoBindByRole)

Use the new `bindByExtractedUsage` command that preserves semantic intent:

```bash
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{
    "type": "bindByExtractedUsage",
    "payload": {
      "extractedColors": [
        {"hex": "#344128", "usage": "background"},
        {"hex": "#CFD0C0", "usage": "text"},
        {"hex": "#FEC820", "usage": "border"}
      ],
      "usageMapping": {
        "background": "Brand-500",
        "text": "Tertiary-500",
        "border": "Secondary-500"
      },
      "scope": "file"
    }
  }'
```

**Key difference from autoBindByRole:**
- `autoBindByRole` maps colors by FREQUENCY - most-used color becomes Primary
- `bindByExtractedUsage` maps colors by SEMANTIC USAGE - background colors stay backgrounds

This ensures:
- Dark green backgrounds → Brand-500 (not Gray-50)
- Light text on dark backgrounds → Tertiary-500 (not incorrectly mapped to gray)
- Gold accents → Secondary-500

**IMPORTANT:** Use extended timeout for large files:
```bash
curl -s "http://localhost:4001/results/{commandId}?wait=true&timeout=300000"
```

### Step 7: Apply Text and Effect Styles

After color binding, apply matching styles:

```bash
# Apply text styles
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "applyMatchingTextStyles", "payload": {"scope": "file", "forceRestyle": true, "snapToNearest": true}}'

# Apply effect styles
curl -s -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "applyMatchingEffectStyles", "payload": {"scope": "file", "forceRestyle": true}}'
```

### Step 8: Report Results

Show a summary of what was extracted, created, and bound:

**Website Extraction:**
- URL: {url}
- Elements scanned: {count}
- Colors found: {count} (by usage: {background}, {text}, {border})
- Font families: {list}
- Screenshot: {captured/not captured}

**Cleanup Performed:**
- Collections deleted: {count}
- Variables deleted: {count}
- Styles deleted: {count}

**Figma Design System Created:**
- Collections and variable counts
- Color scales generated (Primary, Secondary, Tertiary, Gray, System)
- Typography styles created
- Effect styles created

**Variable Bindings Applied:**
- Background bindings: {count}
- Text bindings: {count}
- Border bindings: {count}
- Total nodes processed: {count}

## Prerequisites

- Bridge server running: `pnpm dev`
- Figma plugin connected
- Google Chrome installed (for Puppeteer)
- Internet connection

## Notes

- Website extraction uses headless Chrome via Puppeteer
- CSS is computed from rendered elements, not just stylesheets
- The `usage` field from extraction tells you how colors are used (background/text/border)
- Use `bindByExtractedUsage` to preserve semantic color relationships
- Use `deleteExistingCollections` to start fresh (recommended for new design systems)
- Screenshots can help verify color relationships visually

## Reference Files

- `.claude/agents/website-design-system-extractor.md` - Full agent instructions
- `prompts/website-design-system.md` - Website extraction workflow
- `bridge-server/src/services/websiteExtractor.ts` - Puppeteer extraction logic
