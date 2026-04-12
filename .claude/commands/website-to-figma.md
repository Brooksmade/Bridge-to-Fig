# /website-to-figma - Capture a Website into Figma

Capture a live website's visual layout into a Figma file using Figma MCP and Playwright browser automation, then optionally create design system variables and styles from the captured content. Use when the user wants to import a website's actual design (not just CSS tokens) into Figma for redesign, documentation, or analysis. For extracting only design tokens/CSS without capturing the layout, use `/design-system-website` instead.

**IMPORTANT:** For full implementation details, also read `.claude/agents/website-to-figma.md`

## Prerequisites Gate

Before starting, verify:

| Check | How to Verify | Expected | If Missing |
|-------|--------------|----------|------------|
| Bridge server running | `curl localhost:4001/health` | `{"status":"ok"}` | Run `pnpm dev` from bridge-server/ |
| Plugin connected | Send `ping` command | Response within 15s | Open Figma → Plugins → Bridge to Fig |
| Figma MCP available | Check MCP tool list | `generate_figma_design` tool exists | Configure Figma MCP server |
| Playwright MCP available | Check MCP tool list | `browser_navigate` tool exists | Configure Playwright MCP server |
| Internet connection | Website URL accessible | HTTP 200 from target URL | Check network connectivity |

**If Figma MCP or Playwright MCP is missing, STOP.** This skill requires both MCP servers to capture websites.

## Workflow

### Step 1: Get Website URL

Ask the user:

**What website URL would you like to capture into Figma?**

Example: `https://linear.app` or `https://stripe.com`

### Step 2: Start Bridge Server & Verify Plugin

Start the bridge server in background:

```bash
cd bridge-server && pnpm dev &
```

Poll `http://localhost:4001/health` until responsive.

Remind user: **Please open the Figma plugin: Plugins → Development → Bridge to Fig**

Send `ping` command to verify plugin connection. If no response after 15 seconds, prompt user again.

### Step 3: Get File Key from Figma

```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "getFileInfo", "payload": {}}'
```

Poll result — extract `fileKey` from the response.

### Step 4: Initiate Figma MCP Capture

Call the `generate_figma_design` MCP tool:
- `outputMode: "existingFile"`
- `fileKey`: from Step 3

This returns a JavaScript capture snippet and a `captureId`.

### Step 5: Run Capture via Playwright

1. Use Playwright MCP `browser_navigate` to open the website URL
2. Use Playwright MCP `browser_evaluate` to execute the JS capture snippet returned from Step 4
3. No manual user action required — Playwright handles it automatically

### Step 6: Poll for Completion

Call `generate_figma_design` again with the `captureId` from Step 4 to poll for completion.

The website is now captured in the Figma file.

### Step 7: Ask About Design System

Ask the user:

**Do you want to create design system variables and styles from this website?**

- **Yes** — Continue to Step 8
- **No** — Skip to Step 9

### Step 8: Create Design System (Optional)

**8a: Ask organizing principle preference:**
- 4-Level Hierarchy (Default) — Primitive → Semantic → Tokens → Theme
- 3-Level Simplified — Primitives → Tokens → Theme
- 2-Level Flat — Primitives → Tokens
- Material Design 3 — Reference → System → Component
- Tailwind CSS Style — Colors → Semantic

**8b: Extract design tokens:**
```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "extractWebsiteCSS", "payload": {"url": "USER_URL"}}'
```

Poll result with extended timeout (300000ms).

**8b.1: Check theme direction:**
The result includes `cssVariables` with automatic theme mode detection.
- `cssVariables.rootMode` — whether `:root` is `"light"`, `"dark"`, or `"unknown"`
- `cssVariables.variables` — CSS custom properties with `.light` and `.dark` values already mapped correctly

**IMPORTANT:** Do NOT assume `:root` = light. Use `cssVariables.variables[name].light` and `.dark` directly for Token variable creation.

**8c: Classify brand colors:**
1. Filter neutrals (saturation < 10%)
2. Sort remaining by saturation × frequency
3. Present top 3 as Primary, Secondary, Tertiary

**Detected brand colors from {URL}:**
- Primary: `#XXXXXX` (most vibrant, {count} uses)
- Secondary: `#XXXXXX` ({count} uses)
- Tertiary: `#XXXXXX` ({count} uses)

Ask: **Is this mapping correct, or would you like to adjust?**

**8d: Create design system:**
```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "createDesignSystem",
    "payload": {
      "brandColors": {
        "primary": "#CONFIRMED_PRIMARY",
        "secondary": "#CONFIRMED_SECONDARY",
        "tertiary": "#CONFIRMED_TERTIARY"
      },
      "organizingPrinciple": "USER_SELECTED",
      "includeBoilerplate": true,
      "createTypographyStyles": true,
      "createEffectStyles": true,
      "primaryFontFamily": "EXTRACTED_FONT"
    }
  }'
```

Report created variables and styles.

**8e: Bind typography styles to captured nodes:**
```bash
curl -s -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "applyMatchingTextStyles", "payload": {"scope": "page", "forceRestyle": true, "snapToNearest": true}}'
```

This automatically matches each text node on the page to the closest typography style by font size. Reports exact matches vs snapped (nearest) matches.

### Step 9: Report Results

```
Website Capture Complete!
=========================

Source: {url}
Figma file: {fileKey}

Capture: Website captured via Figma MCP
Design System: {N variables created / skipped}

Next steps:
1. Review the captured page in Figma
2. Adjust any elements as needed
```

### Step 10: Shutdown Server

Kill the background bridge server process.

## Prerequisites

- Bridge server available (`pnpm dev` from bridge-server/)
- Figma plugin installed and connectable (needed for `getFileInfo`)
- Figma MCP server connected (for `generate_figma_design`)
- Playwright MCP available (for browser automation)
- Internet connection

## Error Recovery

| Failure | Diagnostic | Recovery |
|---------|-----------|----------|
| Bridge server won't start | Port 4001 in use | Kill existing process on port 4001: `lsof -i :4001` then retry |
| Plugin not responding to ping | Plugin closed or Figma not open | Open Figma desktop app, then open plugin |
| `getFileInfo` fails | Plugin not connected to file | Ensure a Figma file is open (not just the app) |
| Figma MCP `generate_figma_design` fails | MCP server not configured | Check MCP server configuration in Claude settings |
| Playwright `browser_navigate` fails | MCP not available or site blocks automation | Verify Playwright MCP is configured; try alternative URL |
| Capture JS snippet fails | Website has strict CSP headers | Site may block injected scripts — report as incompatible |
| `extractWebsiteCSS` timeout (design system step) | Complex website | Retry with homepage only; reduce scope |
| Design system creation fails after capture | Variable creation error | Capture succeeded — the website is in Figma. Design system can be created separately with `/design-system` |

**On partial failure:** Website capture and design system creation are independent phases. If capture succeeds but design system fails, the captured website is still in the Figma file. Offer to retry design system creation separately.

## Outcome Tracking

After execution, report:

| Metric | Value |
|--------|-------|
| **Status** | success / partial / failed |
| **Source URL** | Captured website |
| **Figma File Key** | Target file |
| **Capture** | Completed / Failed |
| **Design System** | Created / Skipped / Failed |
| **Variables Created** | X (if design system created) |
| **Text Styles Applied** | X matched, Y snapped |

## Reference Files

- `.claude/agents/website-to-figma.md` — Full agent instructions
- `prompts/quick-ref.md` — Compact API reference (~200 lines)
- `prompts/figma-bridge.md` — Full API reference (detailed examples)
- `bridge-server/src/services/websiteExtractor.ts` — CSS extraction logic (for design system)
- `prompts/skill-patterns.md` — Skill patterns reference
