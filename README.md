# Bridge to Fig

A real-time bridge that enables AI agents to create, modify, and manipulate design elements directly on Figma canvases through natural language commands.

**Current Version:** 1.0.4 | **Commands:** 329 | **Workflows:** 11 slash commands | **Agents:** 14 | **Last Updated:** August 2026

**[View Pipeline & Agent Workflows (FigJam)](https://www.figma.com/board/FlZ6wXhS4pwOaUJIDnGaRS/Bridge-to-Fig---Pipeline---Agent-Workflows?node-id=0-1&t=sc5z843n81FYYugn-1)** — Visual diagrams of all 9 core pipelines and 14 agent workflows

## Overview

This bridge consists of three components:

1. **Bridge Server** - A Node.js HTTP server that queues commands between Claude Code and Figma
2. **Figma Plugin** - A plugin that polls the bridge server and executes commands on the canvas
3. **Shared Types** - TypeScript definitions shared between components

```
Claude Code → HTTP POST → Bridge Server → Figma Plugin → Figma Canvas
                              ↓
                         Results Queue
                              ↓
Claude Code ← HTTP GET ← Bridge Server
```

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org/) or `brew install node`)
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`, or `brew install pnpm`)
- Figma desktop or web app
- [Figma MCP server](https://www.npmjs.com/package/@anthropic-ai/claude-code-figma-mcp) (used by website-to-figma capture, screenshots in QA/audit workflows, and design implementation)

## Quick Start

### 1. Verify Prerequisites

```bash
bash scripts/check-prereqs.sh
```

This checks for Node.js 18+ and pnpm and prints install instructions if either is missing. Run it first — `pnpm install` will fail with a generic "command not found" if Node isn't installed.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start the Bridge Server

```bash
pnpm dev
```

The server starts at `http://localhost:4001`. The `dev` script runs the prerequisite check and builds the shared types package automatically before starting.

To build all packages for production: `pnpm build`.

### 4. Install the Figma Plugin

There are three ways to get the plugin files. Pick one:

- **Already installed the desktop app?** You have them. The app writes the plugin to
  `~/.bridge-to-fig/figma-plugin` on every launch, and its dashboard has a **Show folder** button
  that opens it. This path also keeps the plugin current — an app update refreshes those files.
- **Otherwise**, download `Bridge-to-Fig-Figma-Plugin.zip` from the
  [latest release](https://github.com/Brooksmade/Bridge-to-Fig/releases/latest) and unzip it.
- **Working on the plugin itself?** Build it, once and after every plugin code change:

  ```bash
  pnpm build:plugin
  ```

Then in Figma:

1. Go to **Plugins → Development → Import plugin from manifest**
2. Select the `manifest.json` — in `~/.bridge-to-fig/figma-plugin`, in the unzipped download, or at `figma-plugin/dist/manifest.json` if you built it
3. Open the plugin from **Plugins → Development → Bridge to Fig**

The plugin UI will show a green "Connected" status when successfully connected to the bridge server.

### 5. Figma REST API Token (Recommended)

Adding a Figma API token enables additional design system workflows — fetching published component library metadata, reading file structure without the plugin open, and richer component use cases.

1. Generate a personal access token at [figma.com/developers/api#access-tokens](https://www.figma.com/developers/api#access-tokens)
2. Create or edit `~/.claude/.env`:
   ```
   FIGMA_API_TOKEN=figd_your_token_here
   ```
3. Restart Claude Code to pick up the new environment variable

This makes `FIGMA_API_TOKEN` available to all Claude Code sessions across every project.

## Bridge to Fig vs MCP Tools

| Capability | Bridge to Fig | MCP Tools |
|------------|--------------|-----------|
| One-command design system | `createDesignSystem` creates 4-level hierarchy with 130+ variables, 200+ with `includeBoilerplate` | Must call individual CRUD operations 130+ times |
| Automatic binding | `extractDesignTokens` tracks node→value maps, `createDesignSystem` binds during creation | No node tracking, no automatic binding |
| Website extraction | Headless browser extracts computed CSS from live websites | Not available |
| Color classification | Automatic primary/secondary/tertiary detection by saturation × frequency | Manual classification |
| Color scale generation | 50-950 scales generated from any base color | Manual scale creation |
| Conditional boilerplate | Only fills gaps — extracted values take priority over defaults | No boilerplate system |
| Design System Organizing principles | 8 configurable hierarchy patterns (4-level, 3-level, 2-level, Material Design 3, Tailwind, Adobe Spectrum, Adobe Spectrum 2, Apple HIG) | Single flat structure |
| Text range operations | 27 commands for character-level formatting | Single `set_text` (full replacement) |
| FigJam diagrams | Sections, shapes, connectors with text measurement and position calculation | Not available |
| 14 agent workflows | Pre-built multi-step pipelines with data flow between steps | Individual tool calls only |
| Design system validation | Checks structure, modes, naming, alias chains | Not available |
| 11 slash commands | One-command workflows: `/design-system-figma-file`, `/accessibility-audit`, `/figjam-workflow`, etc. | Not available |

## Workflow Slash Commands

Ready-to-use pipelines invoked directly in Claude Code with `/command-name`:

| Command | Pipeline | What It Does |
|---------|----------|-------------|
| `/design-system-figma-file` | Extract → Detect → Create → Bind → Validate | Creates a complete 4-level design system from selected Figma frames |
| `/design-system-website` | Extract CSS → Classify → Scale → Create/Update | Extracts CSS from a live website and creates a design system from it |
| `/bind-variables` | Load → Map → Match → Bind → Report | Binds existing design system variables to frame elements (exact match) |
| `/component-library` | Discover → Create → Layout → Name → QA → Handoff | Builds a component library with variants, auto layout, and QA scoring |
| `/figjam-workflow` | Plan → Measure → Position → Create → Connect | Creates FigJam diagrams (flowcharts, process maps, user journeys) |
| `/engineering-handoff` | Analyze → Specs → Code → Assets → Document | Generates developer specs, CSS, Tailwind utilities, and asset exports |
| `/typography-system` | Audit → Load → Style/Format → Report | Font audits, mixed text styles, font replacement, hyperlink formatting |
| `/accessibility-audit` | Extract → Contrast → Targets → Text → Report | WCAG 2.1 AA/AAA audit with contrast checks, touch targets, and visual reports |
| `/design-to-dev` | Audit → System → Components → A11y → Handoff | Master pipeline that orchestrates all 5 phases of design-to-development |

### Design System Commands

`createDesignSystem` creates all 4 collection levels with proper mode configuration in one command:
- **Primitive [ Level 1 ]**: Gray scale, brand color scales, and boilerplate tokens
- **Semantic [ Level 2 ]**: Brand colors and system feedback colors (Light/Dark modes)
- **Tokens [ Level 3 ]**: Surface, text, border, icon tokens (Light Mode/Dark Mode)
- **Theme**: Background, foreground, border, interactive, feedback colors (Light/Dark modes)

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "createDesignSystem", "payload": {"brandColors": {"primary": "#ff6d38"}}}'
```

| Command | Description |
|---------|-------------|
| `createDesignSystem` | Create complete 4-level variable hierarchy in one command |
| `validateDesignSystem` | Validate design system completeness and identify issues |
| `getDesignSystemStatus` | Quick status check for design system readiness |

## Sending Commands

Commands are sent via HTTP POST to the bridge server. Claude Code can use curl or any HTTP client.

### Basic Command Structure

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "create",
    "payload": {
      "nodeType": "RECTANGLE",
      "properties": {
        "name": "My Rectangle",
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 100,
        "fills": [{"type": "SOLID", "color": {"r": 0.2, "g": 0.4, "b": 1}}]
      }
    }
  }'
```

### Getting Results

Results can be retrieved by command ID:

```bash
# Wait for result (long-polling, 30s timeout)
curl "http://localhost:4001/results/{commandId}?wait=true"

# Check without waiting
curl "http://localhost:4001/results/{commandId}"
```

## Command Reference

The plugin implements 329 commands. The tables below cover 134 of them, grouped by category. No
single document lists all 329; [`prompts/quick-ref.md`](prompts/quick-ref.md) has the widest
coverage (177, one line each with payload shape), and
[`prompts/figma-bridge.md`](prompts/figma-bridge.md) goes deepest on the 144 it documents.

### Node Creation (13 commands)

| Command | Description |
|---------|-------------|
| `create` | Create a single node with optional nested children |
| `batchCreate` | Create multiple nodes at once |
| `createInstance` | Create an instance of a component |
| `createComponent` | Create a reusable component |
| `createComponentSet` | Create component set with variants |
| `createFromSvg` | Import SVG as vector node |
| `createSection` | Create a section container |
| `createSlice` | Create export slice |
| `createTable` | Create FigJam table |
| `createSticky` | Create FigJam sticky note |
| `createConnector` | Create FigJam connector |
| `createShapeWithText` | Create FigJam shape with text |
| `createCodeBlock` | Create FigJam code block |

**Supported Node Types:** `FRAME`, `RECTANGLE`, `ELLIPSE`, `TEXT`, `LINE`, `POLYGON`, `STAR`, `VECTOR`, `COMPONENT`, `GROUP`

### Node Modification (5 commands)

| Command | Description |
|---------|-------------|
| `modify` | Change properties of a node |
| `batchModify` | Modify multiple nodes |
| `move` | Move node to x,y position |
| `resize` | Change width/height |
| `reparent` | Move node to different parent |

### Query & Selection (7 commands)

| Command | Description |
|---------|-------------|
| `query` | Get node info (selection, page, node, children, find, deep, describe, findByType, pages) |
| `getFrames` | Get all frames on current page |
| `getViewport` | Get current viewport info |
| `setViewport` | Scroll/zoom to specific area |
| `select` | Select one or more nodes |
| `setPage` | Switch to a different page |
| `analyzeColors` | Analyze colors used in selection/node |

### Deletion Commands (4 commands)

| Command | Description |
|---------|-------------|
| `delete` | Delete a single node |
| `batchDelete` | Delete multiple nodes |
| `deleteChildren` | Delete all children of a node |
| `deleteSelection` | Delete currently selected nodes |

### Grouping & Organization (5 commands)

| Command | Description |
|---------|-------------|
| `group` | Group multiple nodes |
| `ungroup` | Ungroup a group |
| `flatten` | Flatten group structure |
| `clone` | Clone node(s) with optional offset |
| `boolean` | Boolean operations (UNION, SUBTRACT, INTERSECT, EXCLUDE) |

### Variables (12 commands)

| Command | Description |
|---------|-------------|
| `createVariableCollection` | Create design token collection |
| `editVariableCollection` | Modify collection properties |
| `deleteVariableCollection` | Delete a collection |
| `createVariable` | Create individual variable |
| `editVariable` | Modify variable values |
| `deleteVariable` | Delete a variable |
| `bindVariable` | Bind variable to property |
| `unbindVariable` | Remove variable binding |
| `getVariables` | List all variables |
| `exportTokens` | Export as token JSON |
| `importTokens` | Import from token JSON |
| `createBoilerplate` | Create standard variable boilerplate (typography, spacing, etc.) |

### Styles (11 commands)

| Command | Description |
|---------|-------------|
| `createPaintStyle` | Create fill/stroke style |
| `createTextStyle` | Create typography style |
| `createEffectStyle` | Create effect style |
| `createGridStyle` | Create layout grid style |
| `editStyle` | Modify style properties |
| `deleteStyle` | Delete a style |
| `applyStyle` | Apply style to node |
| `detachStyle` | Detach style from node |
| `getStyles` | List all styles |
| `getGridStyles` | List all grid styles |
| `applyGridStyle` | Apply grid style to frame |

### Components & Instances (12 commands)

| Command | Description |
|---------|-------------|
| `addVariant` | Add variant to component set |
| `editComponentProperties` | Modify component properties |
| `getComponents` | List all components |
| `editInstanceText` | Override instance text |
| `overrideInstanceFills` | Override instance fills |
| `overrideInstanceStrokes` | Override instance strokes |
| `overrideInstanceEffects` | Override instance effects |
| `resetOverrides` | Reset instance overrides |
| `swapInstance` | Swap instance to different component |
| `detachInstance` | Detach instance from component |
| `replaceComponent` | Swap every instance of one component for another in one call (accepts key, set key, node ID, or name; supports `dryRun`) |
| `getInstanceMasters` | Resolve the main component for many instances in one call |

### Auto Layout & Constraints (7 commands)

| Command | Description |
|---------|-------------|
| `setAutoLayout` | Configure auto layout on frame |
| `getAutoLayout` | Get auto layout settings |
| `setLayoutChild` | Set child layout properties (align, grow) |
| `setConstraints` | Set horizontal/vertical constraints |
| `getConstraints` | Get current constraints |
| `setSizeConstraints` | Set min/max width/height |
| `inferAutoLayout` | Infer auto layout from existing layout |

### Text Range Operations (11 commands)

| Command | Description |
|---------|-------------|
| `setRangeFont` | Apply font to text range |
| `setRangeFontSize` | Set font size for range |
| `setRangeColor` | Set text color for range |
| `setRangeTextDecoration` | Set underline/strikethrough |
| `setRangeTextCase` | Set text case (upper/lower/title) |
| `setRangeLineHeight` | Set line height for range |
| `setRangeLetterSpacing` | Set letter spacing for range |
| `insertText` | Insert text at position |
| `deleteText` | Delete text in range |
| `getRangeStyles` | Get styles for text range |
| `setTextHyperlink` | Set hyperlink on text range |

### Node Properties (14 commands)

| Command | Description |
|---------|-------------|
| `setBlendMode` | Set blend mode (NORMAL, MULTIPLY, etc.) |
| `setOpacity` | Set node opacity (0-1) |
| `setVisible` | Show/hide node |
| `setLocked` | Lock/unlock node |
| `setClipsContent` | Enable/disable content clipping |
| `setCornerRadius` | Set corner radius |
| `setMask` | Set node as mask |
| `setEffects` | Set effects (shadows, blurs) |
| `setRotation` | Rotate node |
| `setFills` | Set fill paints |
| `setStrokes` | Set stroke paints |
| `setPluginData` | Store plugin data on node |
| `getPluginData` | Retrieve plugin data from node |
| `renameNode` | Rename a node |

### Pages (6 commands)

| Command | Description |
|---------|-------------|
| `createPage` | Create new page |
| `deletePage` | Delete a page |
| `renamePage` | Rename a page |
| `duplicatePage` | Duplicate a page |
| `loadAllPages` | Load all pages into memory |
| `setPage` | Switch to a different page |

### Fonts (4 commands)

| Command | Description |
|---------|-------------|
| `listFonts` | List available fonts |
| `loadFont` | Load a font for use |
| `checkMissingFonts` | Check for missing fonts |
| `getUsedFonts` | Get fonts used in selection |

### Images (4 commands)

| Command | Description |
|---------|-------------|
| `createImage` | Create image from base64 data |
| `createImageFromUrl` | Create image from URL |
| `getImageData` | Get image data as base64 |
| `replaceImage` | Replace existing image |

### Export (4 commands)

| Command | Description |
|---------|-------------|
| `exportNode` | Export node as PNG/JPG/SVG/PDF |
| `batchExport` | Export multiple nodes |
| `getExportSettings` | Get export settings for node |
| `setExportSettings` | Set export settings for node |

### Utilities (14 commands)

| Command | Description |
|---------|-------------|
| `notify` | Show notification toast |
| `commitUndo` | Commit undo history |
| `triggerUndo` | Trigger undo |
| `saveVersion` | Save version to history |
| `getCurrentUser` | Get current user info |
| `getActiveUsers` | Get active collaborators |
| `getFileInfo` | Get file metadata |
| `openExternal` | Open external URL |
| `getFileThumbnail` | Get file thumbnail |
| `setFileThumbnail` | Set file thumbnail |
| `base64Encode` | Encode data to base64 |
| `base64Decode` | Decode base64 data |
| `getNodeColors` | Get colors from node |
| `analyzeColors` | Analyze colors in selection |

## Property Reference

### Colors

Colors use 0-1 range for RGB values:

```json
{
  "fills": [
    {"type": "SOLID", "color": {"r": 0.2, "g": 0.4, "b": 1}, "opacity": 1}
  ]
}
```

### Text Properties

```json
{
  "characters": "Hello World",
  "fontSize": 16,
  "fontName": {"family": "Inter", "style": "Regular"},
  "textAlignHorizontal": "CENTER",
  "textAlignVertical": "CENTER"
}
```

### Layout (Auto Layout)

```json
{
  "layoutMode": "VERTICAL",
  "primaryAxisAlignItems": "CENTER",
  "counterAxisAlignItems": "CENTER",
  "itemSpacing": 12,
  "paddingLeft": 16,
  "paddingRight": 16,
  "paddingTop": 16,
  "paddingBottom": 16
}
```

### Effects

```json
{
  "effects": [
    {
      "type": "DROP_SHADOW",
      "color": {"r": 0, "g": 0, "b": 0, "a": 0.25},
      "offset": {"x": 0, "y": 4},
      "radius": 8,
      "visible": true
    }
  ]
}
```

## Examples

### Create a Button

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "create",
    "payload": {
      "nodeType": "FRAME",
      "properties": {
        "name": "Button",
        "width": 120,
        "height": 40,
        "x": 100,
        "y": 100,
        "fills": [{"type": "SOLID", "color": {"r": 0.2, "g": 0.4, "b": 1}}],
        "cornerRadius": 8,
        "layoutMode": "HORIZONTAL",
        "primaryAxisAlignItems": "CENTER",
        "counterAxisAlignItems": "CENTER"
      },
      "children": [
        {
          "nodeType": "TEXT",
          "properties": {
            "name": "Label",
            "characters": "Click Me",
            "fontSize": 14,
            "fontName": {"family": "Inter", "style": "Medium"},
            "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}]
          }
        }
      ]
    }
  }'
```

### Create a Card Layout

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "create",
    "payload": {
      "nodeType": "FRAME",
      "properties": {
        "name": "Card",
        "width": 320,
        "height": 200,
        "x": 100,
        "y": 100,
        "fills": [{"type": "SOLID", "color": {"r": 1, "g": 1, "b": 1}}],
        "cornerRadius": 12,
        "layoutMode": "VERTICAL",
        "itemSpacing": 12,
        "paddingLeft": 16,
        "paddingRight": 16,
        "paddingTop": 16,
        "paddingBottom": 16,
        "effects": [
          {
            "type": "DROP_SHADOW",
            "color": {"r": 0, "g": 0, "b": 0, "a": 0.1},
            "offset": {"x": 0, "y": 2},
            "radius": 8,
            "visible": true
          }
        ]
      },
      "children": [
        {
          "nodeType": "TEXT",
          "properties": {
            "name": "Title",
            "characters": "Card Title",
            "fontSize": 18,
            "fontName": {"family": "Inter", "style": "Semi Bold"},
            "fills": [{"type": "SOLID", "color": {"r": 0.1, "g": 0.1, "b": 0.1}}]
          }
        },
        {
          "nodeType": "TEXT",
          "properties": {
            "name": "Description",
            "characters": "This is a description of the card content.",
            "fontSize": 14,
            "fontName": {"family": "Inter", "style": "Regular"},
            "fills": [{"type": "SOLID", "color": {"r": 0.4, "g": 0.4, "b": 0.4}}]
          }
        }
      ]
    }
  }'
```

### Modify an Existing Node

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "modify",
    "target": "123:456",
    "payload": {
      "properties": {
        "fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}],
        "cornerRadius": 16
      }
    }
  }'
```

### Query Current Selection

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{
    "type": "query",
    "payload": {
      "selection": true
    }
  }'
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status and queue stats |
| `/commands` | POST | Queue a new command |
| `/commands` | GET | Poll pending commands (used by plugin) |
| `/commands/:id` | DELETE | Cancel a pending command |
| `/results/:id` | GET | Get result for a command |
| `/results/:id?wait=true` | GET | Long-poll for result (30s timeout) |
| `/ws` | WebSocket | Real-time status updates |

## Development

### Watch Mode

```bash
# Run both in separate terminals
pnpm --filter bridge-server dev
pnpm --filter figma-plugin watch
```

### Build for Production

```bash
pnpm build
```

## Architecture Notes

- **Polling Interval:** 200ms (configurable in `figma-plugin/src/code.ts`)
- **Result Retention:** 5 minutes before automatic cleanup
- **Sequential Execution:** Commands execute one at a time to maintain order
- **Font Preloading:** Inter font family is preloaded for text operations

## Security

Bridge to Fig is a **localhost-only development tool**. Keep the following in mind:

- **No authentication** — The bridge server binds to `localhost:4001` and is designed for local use only. Do not expose it to the network.
- **Open CORS** — CORS is permissive by design so CLI tools (curl, Claude Code) can reach the server. This is safe on localhost but would be a risk if exposed externally.
- **SSRF protection** — The `extractWebsiteCSS` command validates URLs before launching a headless browser. Requests to localhost, private IPs (`10.x`, `172.16-31.x`, `192.168.x`), link-local/cloud metadata (`169.254.x`), and non-HTTP protocols are blocked.
- **No secrets in the repo** — The project has no `.env` files, API keys, or credentials. The `.gitignore` blocks `.env*` files preventively.

## Troubleshooting

### Plugin shows "Disconnected"

1. Ensure the bridge server is running (`pnpm dev`)
2. Check that port 4001 is not in use by another application
3. Restart the Figma plugin

### Commands not executing

1. Check the bridge server console for errors
2. Verify the plugin is showing "Connected" status
3. Check the plugin's log panel for command execution details

### Font errors

The plugin preloads Inter font variants. For other fonts, ensure they are available in your Figma file before creating text with them.

## License

MIT
