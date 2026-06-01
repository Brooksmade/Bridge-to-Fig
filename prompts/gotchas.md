# Bridge to Fig — Gotchas

A consolidated reference of every known pitfall when working with the Bridge to Fig plugin. Each entry shows the **wrong** way and the **correct** way.

---

## Table of Contents

1. [Command Payload Format](#1-command-payload-format)
2. [Auto Layout](#2-auto-layout)
3. [Variables](#3-variables)
4. [Binding](#4-binding)
5. [Fonts & Text](#5-fonts--text)
6. [Images](#6-images)
7. [Components](#7-components)
8. [Queries & Performance](#8-queries--performance)
9. [Batch Operations](#9-batch-operations)
10. [Plugin Connection](#10-plugin-connection)
11. [Large Payloads & Temp Files](#11-large-payloads--temp-files)
12. [Exports](#12-exports)
13. [Website Extraction](#13-website-extraction)
14. [FigJam](#14-figjam)
15. [Design System Creation](#15-design-system-creation)
16. [Workflow Discipline](#16-workflow-discipline)

---

## 1. Command Payload Format

### setAutoLayout requires `target`, not `payload.nodeId`

```jsonc
// ❌ WRONG — "Target node ID is required" error
{"type": "setAutoLayout", "payload": {"nodeId": "1:23", "direction": "VERTICAL"}}

// ✅ CORRECT — target is a top-level field
{"type": "setAutoLayout", "target": "1:23", "payload": {"direction": "VERTICAL"}}
```

### bindFillVariable / bindStrokeVariable — `nodeId` goes in payload, NOT as target

```jsonc
// ❌ WRONG
{"type": "bindFillVariable", "target": "1:23", "payload": {"variableId": "VariableID:5:1", "fillIndex": 0}}

// ✅ CORRECT
{"type": "bindFillVariable", "payload": {"nodeId": "1:23", "variableId": "VariableID:5:1", "fillIndex": 0}}
```

### createVariable — field is `type`, not `resolvedType`

```jsonc
// ❌ WRONG
{"type": "createVariable", "payload": {"name": "Color/Red", "resolvedType": "COLOR", ...}}

// ✅ CORRECT
{"type": "createVariable", "payload": {"name": "Color/Red", "type": "COLOR", ...}}
```

### createVariable — requires `collectionId`, not `collectionName`

```jsonc
// ❌ WRONG
{"type": "createVariable", "payload": {"collectionName": "Primitive [ Level 1 ]", ...}}

// ✅ CORRECT — get the ID from getVariables or createVariableCollection first
{"type": "createVariable", "payload": {"collectionId": "VariableCollectionId:1:0", ...}}
```

### editVariable — `values` (plural), not `value`

```jsonc
// ❌ WRONG — returns error
{"type": "editVariable", "target": "VariableID:5:1", "payload": {"value": {"Light Mode": "#FF0000"}}}

// ✅ CORRECT
{"type": "editVariable", "target": "VariableID:5:1", "payload": {"values": {"Light Mode": "#FF0000"}}}
```

---

## 2. Auto Layout

### MANDATORY 3-step pattern: create → setAutoLayout → modify

Child layout properties (`layoutSizingHorizontal`, `layoutGrow`, `layoutSizingVertical`) **silently fail** if set during `create`. They require an auto-layout parent to already exist.

```jsonc
// ❌ WRONG — layoutSizingHorizontal silently ignored
{"type": "create", "payload": {
  "nodeType": "FRAME",
  "properties": {"layoutMode": "VERTICAL", "layoutSizingHorizontal": "FILL"}
}}

// ✅ CORRECT — 3 separate commands
// Step 1: Create
{"type": "create", "payload": {"nodeType": "FRAME", "properties": {"name": "Card"}}}
// Step 2: Set auto layout
{"type": "setAutoLayout", "target": "CARD_ID", "payload": {"direction": "VERTICAL", "spacing": 8}}
// Step 3: Modify child layout props
{"type": "modify", "target": "CARD_ID", "payload": {"properties": {"layoutSizingHorizontal": "FILL"}}}
```

### primaryAxisSizingMode — only `FIXED` or `AUTO`, never `HUG`

```jsonc
// ❌ WRONG — invalid value
{"type": "setAutoLayout", "target": "1:23", "payload": {"primaryAxisSizingMode": "HUG"}}

// ✅ CORRECT — "AUTO" means hug contents
{"type": "setAutoLayout", "target": "1:23", "payload": {"primaryAxisSizingMode": "AUTO"}}
```

### Field aliases accepted

`direction` / `mode`, `itemSpacing` / `spacing`, `primaryAxisSizingMode` / `primaryAxisSizing` — all work. `paddingLeft/Right/Top/Bottom` accepted directly.

---

## 3. Variables

### createVariable — values keyed by mode NAME

```jsonc
// ❌ WRONG — keyed by mode ID
{"values": {"0:0": "#FF0000", "0:1": "#CC0000"}}

// ✅ CORRECT — keyed by mode name
{"values": {"Light Mode": "#FF0000", "Dark Mode": "#CC0000"}}
```

### editVariable — at least one editable field required

If you pass only `target` and empty `payload`, it errors. Must include at least one of: `name`, `values`, `description`, `scopes`, `hiddenFromPublishing`.

### getVariables — `collectionName` filter is case-sensitive

```jsonc
// ❌ WRONG
{"type": "getVariables", "payload": {"collectionName": "primitive [ level 1 ]"}}

// ✅ CORRECT
{"type": "getVariables", "payload": {"collectionName": "Primitive [ Level 1 ]"}}
```

---

## 4. Binding

### bindMatchingColors — resolves alias chains, prefers Token > Semantic > Primitive

Collection priority: Token(4) > Semantic(3) > Theme(2) > Primitive(0). Previously it skipped all alias-based variables — Semantic/Token/Theme were invisible. Now fixed.

### autoBindByRole — better for wrong raw colors

`bindMatchingColors` requires exact hex match. If the frame has approximate or wrong colors, use `autoBindByRole` which uses semantic role detection (Surface/Page, Text/Primary, Border/Default).

### getNodeColors does NOT recurse deeply

Cannot be relied on for per-section variable binding. Use `extractDesignTokens` with `scope: "selection"` for deep extraction.

---

## 5. Fonts & Text

### "Inter SemiBold" fails — use "Inter Semi Bold" (with space)

```jsonc
// ❌ WRONG
{"fontName": {"family": "Inter", "style": "SemiBold"}}

// ✅ CORRECT
{"fontName": {"family": "Inter", "style": "Semi Bold"}}
```

"Inter Bold" and "Inter Regular" work fine. Always check `loadFont` results before creating text-heavy frames.

### create with TEXT children auto-triggers font loading

This can be slow. If you need many text nodes, consider loading fonts explicitly first with `loadFont`.

### Typography must use actual fonts from the file

Design system text styles must use the actual font+size combinations from the file (via `fontFamilyMap`), not generic defaults. E.g., if headings use Newsreader, the text styles must specify Newsreader — not Inter.

---

## 6. Images

### createImage — field is `data`, not `imageData`

```jsonc
// ❌ WRONG
{"type": "createImage", "payload": {"imageData": "base64...", "width": 200, "height": 200}}

// ✅ CORRECT — only supports: data, name, x, y, parent
{"type": "createImage", "payload": {"data": "base64...", "name": "photo"}}
```

`width`, `height`, `locked`, `properties` are NOT supported on createImage. To resize: use `resize` command after creation. To lock: use `modify` after creation.

---

## 7. Components

### addComponentProperty — only on COMPONENT or COMPONENT_SET, not variant children

```
// ❌ WRONG — "Can only set component property definitions on a product component"
addComponentProperty on a variant COMPONENT inside a COMPONENT_SET

// ✅ CORRECT — add to the COMPONENT_SET (shared) or a standalone COMPONENT
```

### INSTANCE_SWAP defaultValue takes node ID, not component key

```jsonc
// ❌ WRONG
{"defaultValue": "component_key_abc123"}

// ✅ CORRECT
{"defaultValue": "36:109"}
```

### successResult only copies nodeId/nodeIds/error/data

Custom fields must go inside `data`. If you add a custom field to the result object, it will be silently dropped.

---

## 8. Queries & Performance

### NEVER use `children` query on large components

`query(children)` on large components can take 15+ minutes (banner_component took 14m 48s).

```jsonc
// ❌ WRONG — could hang for 15 minutes
{"type": "query", "payload": {"queryType": "children"}, "target": "LARGE_COMPONENT_ID"}

// ✅ CORRECT — returns structure in 1-2 seconds
{"type": "query", "payload": {"queryType": "describe"}, "target": "LARGE_COMPONENT_ID"}
```

### Long-running commands — use extended timeout

Default timeout is 30 seconds. For `extractDesignTokens` with `scope: "file"`, use:

```bash
curl "http://localhost:4001/results/{id}?wait=true&timeout=300000"
```

Monitor with: `curl http://localhost:4001/logs/running`

---

## 9. Batch Operations

### batchCreate — payload is a direct array

```jsonc
// ❌ WRONG
{"type": "batchCreate", "payload": {"nodes": [...]}}

// ✅ CORRECT
{"type": "batchCreate", "payload": [{...}, {...}, {...}]}
```

### batchEditVariable — payload is a direct array

```jsonc
// ❌ WRONG
{"type": "batchEditVariable", "payload": {"edits": [...]}}

// ✅ CORRECT
{"type": "batchEditVariable", "payload": [{...}, {...}, {...}]}
```

Both support partial success — one failure doesn't block others.

---

## 10. Plugin Connection

### wsClients: 0 does NOT mean disconnected

The plugin defaults to **long polling** (HTTP), not WebSocket. `wsClients: 0` in `/health` is normal.

```bash
# ❌ WRONG — assuming plugin is disconnected
curl http://localhost:4001/health  # → wsClients: 0 ≠ disconnected

# ✅ CORRECT — send a ping to verify
curl -X POST http://localhost:4001/commands -H "Content-Type: application/json" \
  -d '{"type": "ping", "payload": {}}'
```

### Plugin cannot close during command execution

Figma's plugin thread is blocked during execution. The plugin closes automatically when the current command finishes.

---

## 11. Large Payloads & Temp Files

### Always use `.tmp/` for temp files, never project root

```bash
# ❌ WRONG
echo '{"large": "payload"}' > payload.json
curl -d @payload.json ...

# ✅ CORRECT
echo '{"large": "payload"}' > .tmp/payload.json
curl -d @.tmp/payload.json ...
rm .tmp/payload.json
```

### Inline JSON breaks with large payloads

Bash curl with inline JSON fails due to quoting issues on large payloads. Always write to file first.

---

## 12. Exports

### exportNode fails on very large frames

Frames like 1440x10839 fail with "too many arguments in function call". Export smaller individual sections instead.

---

## 13. Website Extraction

### Do NOT assume `:root` = light mode

Some sites use dark-first themes. `extractWebsiteCSS` auto-detects via `cssVariables.rootMode`. Check `cssVariables.variables[name].light` / `.dark` for correctly mapped mode values.

### extractWebsiteCSS blocks localhost URLs

Use Playwright `browser_evaluate` instead for local development servers.

### awwwards.com-scale sites may hit timeout

Use `timeout=300000` AND poll again without `wait` if initial poll times out.

---

## 14. FigJam

### ALWAYS use bridge server for FigJam, never MCP generate_diagram

```bash
# ❌ WRONG — creates a separate file, not in the user's open board
mcp__plugin_figma_figma__generate_diagram(...)

# ✅ CORRECT — draws in the user's open FigJam board
curl -X POST http://localhost:4001/commands -d '{"type": "createSection", "payload": {...}}'
curl -X POST http://localhost:4001/commands -d '{"type": "createShapeWithText", "payload": {...}}'
curl -X POST http://localhost:4001/commands -d '{"type": "createConnector", "payload": {...}}'
```

Only use MCP Figma tools for FigJam if the user explicitly requests it.

---

## 15. Design System Creation

### Effects/shadows — always auto-include, never ask

Extracted effects should always be included in the design system. Don't prompt the user about whether to include them.

### Typography must use fontFamilyMap

The design system must use `fontFamilyMap` from extracted tokens to pick the correct font per size. E.g., if Newsreader is used for headings, don't default to Inter.

### Screenshot before and after binding

MUST capture screenshots before and after variable binding to catch visual regressions.

---

## 16. Workflow Discipline

### Never stack elements — delete before recreating

Always delete old content and verify it's gone BEFORE creating new elements at the same location. Otherwise you get invisible overlapping layers.

### Debug, don't repeat

When something renders wrong, STOP and read source code. Never rebuild the same broken thing twice. Understand the failure first.

### Atomic decomposition is mandatory

Never hand an agent a flat component list. Always decompose into atoms → molecules → organisms first. Do the analysis yourself before delegating.

### Clone-first for component creation

The component-creator agent must copy existing frames, not build from scratch. Building from scratch loses text wrapping, atomic composition, and images.

### Bridge server must run from bridge-server/ directory

`pnpm dev` must be run from the `bridge-server/` directory, not the project root.

### Plugin must be rebuilt after code changes

After changing plugin code: `pnpm build:plugin`, then reopen the plugin in Figma.
