# Bridge to Fig

A real-time bridge enabling AI agents to interact with Figma directly. Create, modify, and manipulate design elements, manage variables, build design systems, and extract design tokens from live websites.

## Quick Start

```bash
# Start the bridge server
pnpm dev

# Server runs at http://localhost:4001
# Open Figma plugin: Plugins → Development → Bridge to Fig
```

## Project Structure

```
FigmaPlugin/
├── bridge-server/          # Express + WebSocket server (localhost:4001)
│   └── src/
│       ├── index.ts        # Server entry point
│       ├── routes/         # HTTP route handlers
│       │   ├── commands.ts # POST /commands endpoint
│       │   └── results.ts  # GET /results/:id endpoint
│       └── services/
│           ├── queue.ts           # Command queue management
│           ├── websocket.ts       # WebSocket connections
│           └── websiteExtractor.ts # Puppeteer CSS extraction
│
├── figma-plugin/           # Figma plugin (runs inside Figma)
│   └── src/
│       ├── code.ts         # Main plugin logic
│       ├── ui.html/ts      # Plugin UI
│       ├── commands/       # Command handlers (325 commands)
│       ├── data/           # Static data (boilerplate values)
│       └── utils/          # Helper utilities
│
├── shared/                 # Shared TypeScript types
│   └── types/
│       └── index.ts        # FigmaCommand, CommandPayload, etc.
│
├── prompts/                # User-facing documentation
│   ├── figma-bridge.md     # Main API reference (READ THIS FIRST)
│   ├── figma-variables.md  # Variable creation workflow
│   ├── bind-variables.md   # Variable binding workflow
│   ├── website-design-system.md # Website extraction workflow
│   └── figma-documentation.md   # Doc frame creation
│
└── .claude/
    └── agents/             # 30 AI agent definitions
        ├── figma-variables.md    # Design system creation
        ├── figma-binding.md      # Variable binding
        ├── website-design-system-extractor.md # Website extraction
        └── ... (27 more agents)
```

## How to Use figma-bridge.md

The `prompts/figma-bridge.md` file is the **primary reference** for all Figma Bridge operations. Use it to:

### 1. Send Commands to Figma

All interactions go through HTTP POST to `http://localhost:4001/commands`:

```bash
# Create a rectangle
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "create", "payload": {
    "nodeType": "RECTANGLE",
    "properties": {"x": 0, "y": 0, "width": 100, "height": 100}
  }}'

# Get result
curl "http://localhost:4001/results/{commandId}?wait=true"
```

### 2. Create Design Systems

Use `createDesignSystem` for complete 4-level variable hierarchy:

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "createDesignSystem", "payload": {
    "brandColors": {"primary": "#ff6d38"},
    "includeBoilerplate": true
  }}'
```

Creates: Primitive → Semantic → Tokens → Theme collections with 200+ variables.

### 3. Extract from Websites

Use headless browser extraction for live website CSS:

```bash
curl -X POST http://localhost:4001/commands \
  -H "Content-Type: application/json" \
  -d '{"type": "extractWebsiteCSS", "payload": {
    "url": "https://example.com/"
  }}'
```

Returns computed colors, typography, spacing, border radius, shadows, etc.

### 4. Modify Existing Nodes

Query selection, then modify:

```bash
# Get selection
curl -X POST http://localhost:4001/commands \
  -d '{"type": "query", "payload": {"queryType": "selection"}}'

# Modify by ID
curl -X POST http://localhost:4001/commands \
  -d '{"type": "modify", "target": "NODE_ID", "payload": {
    "properties": {"fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}]}
  }}'
```

## Key Command Categories

| Category | Examples |
|----------|----------|
| **Node Operations** | create, modify, move, resize, delete, clone, group |
| **Variables** | createDesignSystem, createVariable, editVariable, bindFillVariable |
| **Styles** | createPaintStyle, createTextStyle, applyStyle |
| **Components** | createComponent, createInstance |
| **Query** | query, getFrames, getVariables, getNodeColors |
| **Server-Side** | extractWebsiteCSS, extractWebsiteLayout (Puppeteer headless browser) |

## Available Agents (31)

Agents are AI instructions for complex multi-step workflows. Key agents:

| Agent | Purpose |
|-------|---------|
| `figma-variables` | Creates 4-level design systems from Figma frames |
| `figma-binding` | Binds variables to frame elements |
| `website-design-system-extractor` | Extracts CSS from websites, creates Figma variables |
| `design-system-orchestrator` | Full pipeline: extract → create → bind → document → validate |
| `engineering-handoff` | Generates dev specs, CSS, token maps |
| `figjam-workflow-design` | Creates FigJam diagrams for workflows, processes, and user journeys |
| `website-to-figma` | Captures a website into Figma via MCP, optionally creates design system variables |
| `code-connect-mapper` | Maintains bidirectional Figma ↔ code component mappings |

Full list in `prompts/figma-bridge.md` → Related Agents section.

## Why This Tool

Bridge to Fig is not a collection of individual Figma operations. It is a set of **automated pipelines** where each step's output feeds the next step's input. The value is in the data flow between steps, not any single command.

### Core Pipelines

| Pipeline | Steps | Manual Time | Bridge Time |
|----------|-------|-------------|-------------|
| Design System from File | Extract → Detect → Create → Bind → Validate | 8-12 hours | 5 min |
| Design System from Website | Extract CSS → Classify → Scale → Create/Update | 2-3 days | 15 min |
| Website-to-Figma Capture | MCP Capture → (Optional) Extract CSS → Design System | 1-2 weeks | 5 min |
| Variable Binding | Load → Map → Match → Bind → Report | 551+ manual clicks | 5 min |
| Component Library | Create → Layout → Name → QA → Handoff | 2-3 weeks | 2-3 hours |
| FigJam Diagrams | Plan → Measure → Position → Create → Connect | 1-2 hours | 15 min |
| Engineering Handoff | Analyze → Specs → Code → Assets → Docs | 1-2 days/component | 15 min |
| Full Design-to-Dev | Audit → System → Components → A11y → Handoff | 3-4 weeks | 1-2 hours |

### What Makes It Different from MCP Figma Tools

MCP tools expose individual operations (create a variable, resize a node). This bridge provides:

- **One-command design systems** — `createDesignSystem` builds 4-level hierarchy with 130+ variables in one call
- **Automatic binding during creation** — `extractDesignTokens` tracks which nodes use which values; `createDesignSystem` binds them automatically
- **Website CSS extraction** — Headless browser gets computed styles from live websites (works on any site regardless of CSS methodology)
- **Color classification** — Automatic primary/secondary/tertiary detection by saturation × frequency (no manual picking)
- **Color scale generation** — 50-950 scales (11 steps) from any base color
- **Conditional boilerplate** — Only fills gaps; extracted values take priority over defaults
- **8 organizing principles** — 4-level, 3-level, 2-level, Material Design 3, Tailwind, Adobe Spectrum (S1), **Adobe Spectrum 2** (full 2,919-variable mirror with .Color theme Light/Dark/Wireframe modes), Apple HIG
- **27 text range operations** — Character-level formatting (bold one word, color another)
- **FigJam native diagrams** — Sections, shapes, connectors with text measurement
- **31 agent workflows** — Pre-built multi-step pipelines
- **Design system validation** — Checks structure, modes, naming, alias chains

Full pipeline breakdowns with data flow notation: **`prompts/workflows.md`**

## Common Workflows

### Create Design System from Figma Frame

**Pipeline:** Extract → Detect → Create → Bind → Validate

1. `extractDesignTokens` with `scope: "file"` — returns colors, typography, spacing, shadows **with node ID maps** (`colorNodes`, `fontSizeNodes`, `strokeNodes`, `shadowNodeIds`)
2. Detect brand color — filter neutrals, sort by saturation × frequency, top 3 = primary/secondary/tertiary
3. `createDesignSystem` with `extractedTokens` from step 1 — creates 4-level hierarchy, auto-binds variables to nodes using the node ID maps
4. `editVariable` / `createVariable` for extracted values not in boilerplate
5. `validateDesignSystem` — check structure, modes, naming

### Create Design System from Website

**Pipeline:** Extract CSS → Classify → Scale → Create/Update

1. `extractWebsiteCSS` with URL — Puppeteer scans all DOM elements, returns computed colors (with usage count), typography, spacing, radius, shadows
2. Color classification (automatic) — filter neutrals, sort by saturation × frequency
3. Generate 50-950 scales (11 steps per color, 3 colors = 33 values)
4. `createDesignSystem` or `editVariable` × 33 to update existing system
5. `createVariable` for extracted values not in boilerplate

### Build Component Library

**Pipeline:** Create → Layout → Name → QA → Handoff

1. `getComponents` + `getVariables` to inventory existing assets
2. `createComponent` / `createComponentSet` with variant matrix (Size × Type × State)
3. `setAutoLayout` + `setConstraints` on every variant
4. Naming enforcement — `renameNode` to enforce "ComponentType/property=value"
5. QA — check completeness, layout, bindings, accessibility (score 0-100)
6. Engineering handoff — specs, CSS, Tailwind, assets at 1x/2x/3x

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start bridge server (dev mode with hot reload)
pnpm dev

# Build plugin only
pnpm build:plugin
```

### Prerequisites

- Node.js 18+
- pnpm
- Google Chrome (for website extraction)
- Figma desktop app

### Installing the Plugin

1. `pnpm build:plugin`
2. Figma → Plugins → Development → Import plugin from manifest
3. Select `figma-plugin/dist/manifest.json`
4. Open: Plugins → Development → Bridge to Fig

## File Reference

| Path | Purpose |
|------|---------|
| `prompts/figma-bridge.md` | **Main API reference** - all commands, examples |
| `prompts/api-2026-additions.md` | **2026 API additions** - grid layout, extended collections, new fills/effects, shaders, motion, slots, Draw, Buzz |
| `prompts/workflows.md` | **Pipeline breakdowns** - all 9 workflows with data flow |
| `prompts/component-best-practices.md` | **Component discipline** - naming, variants, properties, accessibility |
| `prompts/library-best-practices.md` | **Library discipline** - publishing, versioning, styles vs variables |
| `prompts/memory-server.md` | Memory server API for tracking progress/solutions |
| `prompts/website-design-system.md` | Website extraction workflow |
| `prompts/gotchas.md` | **Gotchas reference** - every known pitfall with WRONG/CORRECT examples |
| `prompts/code-connect.md` | **Code Connect** - Figma ↔ code component mapping system |
| `scripts/` | **Reusable script templates** - JSON payload templates for common operations |
| `.claude/agents/*.md` | AI agent definitions (32 agents) |
| `.figma/code-connect.json` | Component mapping file (Figma ↔ code) |
| `bridge-server/src/services/websiteExtractor.ts` | Puppeteer extraction logic |
| `figma-plugin/src/commands/` | Command implementations |
| `figma-plugin/src/commands/state-recovery.ts` | State recovery: run_id tagging, orphan cleanup, validation |
| `figma-plugin/src/data/boilerplate.ts` | Default design token values |

## Architecture

```
┌─────────────────┐     HTTP/WS      ┌─────────────────┐
│  Claude Code    │ ◄──────────────► │  Bridge Server  │
│  (CLI/Agent)    │   localhost:4001 │  (Express + WS) │
└─────────────────┘                  └────────┬────────┘
                                              │
                                              │ Long Poll
                                              │
                                     ┌────────▼────────┐
                                     │  Figma Plugin   │
                                     │  (Inside Figma) │
                                     └─────────────────┘
```

**Flow:**
1. Claude sends command to Bridge Server
2. Plugin polls for commands (or receives via WebSocket)
3. Plugin executes command in Figma
4. Plugin sends result back to Bridge Server
5. Claude retrieves result

## Long-Running Commands

Some commands (like `extractDesignTokens` with `scope: "file"`) can take several minutes on large files.

### Timeouts

- Default result timeout: 30 seconds
- Maximum result timeout: **5 minutes** (300,000ms)
- Use extended timeout for long commands:
  ```bash
  curl "http://localhost:4001/results/{id}?wait=true&timeout=300000"
  ```

### Monitoring Long Commands

Check command status without waiting:
```bash
curl http://localhost:4001/logs/running
# Returns: {"running":true,"commandType":"extractDesignTokens","elapsedMs":45000,"elapsedFormatted":"45s"}
```

Get plugin logs:
```bash
curl http://localhost:4001/logs
```

### Plugin UI During Long Commands

- Yellow status box with spinner shows when a command is running
- Command type is displayed (e.g., "extractDesignTokens")
- Elapsed time shown when command completes
- **Note:** Live timer cannot update during execution due to Figma's single-threaded plugin architecture

### Closing the Plugin

- **Cannot close during command execution** - Figma's plugin thread is blocked
- **Plugin closes automatically** when the current command finishes
- If you try to close during execution, it will close as soon as the command completes

### Graceful Server Shutdown

Press `Ctrl+C` to stop the bridge server. It will:
1. Close all active connections
2. Shut down gracefully
3. Force exit after 3 seconds if needed

## Tips

- **Building layouts** — MUST follow the 3-step rule: `create` → `setAutoLayout` → `modify` (for FILL/HUG/GROW). Child layout properties silently fail if set during creation. Always use Python scripts, not bash. Full pattern and helpers: **`.claude/prompts/figma-layout.md`**

- **FigJam diagrams** - ALWAYS use bridge server commands (`createSection`, `createShapeWithText`, `createConnector` via `localhost:4001`). NEVER use MCP tools like `generate_diagram` for FigJam — they create separate files instead of drawing in the user's open board. Only use MCP Figma tools for FigJam if the user explicitly requests it.
- **Always query first** - Get node IDs before modifying
- **Use Inter font** - Pre-loaded; others may cause errors
- **Batch operations** - Use `batchCreate`/`batchModify` for multiple items
- **Check results** - Poll `/results/{id}?wait=true` for confirmation
- **4-level variables** - Always use Primitive → Semantic → Tokens → Theme hierarchy
- **Long commands** - Use `timeout=300000` for file-scope operations
- **Plugin connection** - The plugin uses **long polling** by default, NOT WebSocket. `wsClients: 0` in `/health` does NOT mean disconnected. Send a `ping` command to verify connectivity.
- **Prefer `describe` over `children`** - `query(children)` on large components can take 15+ minutes. Use `query(describe)` for fast structural overviews (1-2 seconds).
- **Large JSON payloads** - Write to `.tmp/` directory (e.g., `.tmp/payload.json`) and use `curl -d @.tmp/payload.json`. Always delete temp files after use (`rm .tmp/payload.json`). **Never write temp files to the project root.**

## Temp File Hygiene

Session hooks (`.claude/hooks/cleanup-tmp.sh`) automatically clean `.tmp/` on session start and end. If the hook outputs `STRAY_TEMP_FILES_DETECTED`, it means temp files were found in the project root instead of `.tmp/`. **You MUST ask the user whether to delete each listed file before removing anything.** Do not silently delete root files — they may be intentional.

Rules:
- **All** temp/session files go in `.tmp/` — never the project root
- `.tmp/` is auto-cleaned on session start and end (only `.gitkeep` survives)
- If you create scripts, payloads, or state files during a session, put them in `.tmp/`
- Delete temp files as soon as they're no longer needed, don't wait for session end

## macOS Distribution — BLOCKER

The macOS DMG is **not code-signed or notarized**. Non-technical users CANNOT install it — Gatekeeper blocks unsigned apps with no user-friendly bypass. The `xattr -cr` Terminal workaround is not acceptable for end users.

**To fix this:** An Apple Developer account ($99/year) is required. Once obtained, add these GitHub repo secrets and the Tauri build action will handle signing + notarization automatically:
- `APPLE_CERTIFICATE` — base64-encoded .p12 Developer ID Application certificate
- `APPLE_CERTIFICATE_PASSWORD` — .p12 password
- `APPLE_SIGNING_IDENTITY` — e.g., `Developer ID Application: Name (TEAMID)`
- `APPLE_ID` — Apple ID email
- `APPLE_PASSWORD` — app-specific password from appleid.apple.com
- `APPLE_TEAM_ID` — 10-character team ID

Then add these env vars to the `Build Tauri app` step in `.github/workflows/release.yml` (macOS jobs only):
```yaml
APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
APPLE_ID: ${{ secrets.APPLE_ID }}
APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
```

**Until this is resolved, macOS builds are not distributable to non-technical users.**

## Memory Integration

Vector memory server at `http://localhost:8080` for tracking progress and solutions across sessions. Search before solving errors, save after fixing them. See `prompts/memory-server.md` for full API reference.
