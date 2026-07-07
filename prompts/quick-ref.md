# Bridge to Fig — Quick Reference

Server: `http://localhost:4001` | Full docs: `prompts/bridge-to-fig/figma-bridge.md`

## Send/Receive

```bash
# Send command
curl -X POST http://localhost:4001/commands -H "Content-Type: application/json" -d '{"type": "TYPE", "payload": {...}}'
# With target (for modify/move/resize/delete/query)
curl -X POST http://localhost:4001/commands -H "Content-Type: application/json" -d '{"type": "TYPE", "target": "NODE_ID", "payload": {...}}'
# Get result (wait up to 30s; use timeout=300000 for long ops)
curl "http://localhost:4001/results/{commandId}?wait=true"
# Check health / running command
curl http://localhost:4001/health
curl http://localhost:4001/logs/running
```

## Node Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `create` | `{nodeType, properties, children?}` | Types: FRAME, RECTANGLE, ELLIPSE, TEXT, LINE, POLYGON, STAR, COMPONENT |
| `modify` | `{properties}` + `target` | Any create properties. Supports child layout props (layoutSizingHorizontal, layoutGrow) |
| `move` | `{x, y, relative?}` + `target` | |
| `resize` | `{width, height}` + `target` | |
| `delete` | `target` only | |
| `clone` | `{offset: {x, y}}` + `target` | |
| `group` | `{nodeIds, name}` | |
| `ungroup` | `target` only | |
| `select` | `{nodeIds}` | |
| `boolean` | `{operation, nodeIds}` | UNION, SUBTRACT, INTERSECT, EXCLUDE |
| `renameNode` | `{nodeId, name}` | |

## Batch Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `batchCreate` | Direct array of create payloads | NOT `{nodes: [...]}` |
| `batchModify` | `{modifications: [{target, properties}]}` | |
| `batchDelete` | `{nodeIds}` | |
| `deleteSelection` | (none) | |

## Properties Reference

**Common:** `name, x, y, width, height, fills, strokes, strokeWeight, cornerRadius, opacity, visible, locked, effects`

**Fill:** `[{type: "SOLID", color: {r: 0-1, g: 0-1, b: 0-1}}]`

**Text:** `characters, fontSize, fontName: {family: "Inter", style: "Regular|Medium|Semi Bold|Bold"}, textAlignHorizontal: LEFT|CENTER|RIGHT, textAlignVertical: TOP|CENTER|BOTTOM, lineHeight: {value, unit: "PIXELS|PERCENT|AUTO"}, letterSpacing: {value, unit}`

**Auto Layout (FRAME):** `layoutMode: HORIZONTAL|VERTICAL, primaryAxisAlignItems: MIN|CENTER|MAX|SPACE_BETWEEN, counterAxisAlignItems: MIN|CENTER|MAX|BASELINE, itemSpacing, paddingLeft/Right/Top/Bottom, primaryAxisSizingMode: FIXED|AUTO, counterAxisSizingMode: FIXED|AUTO`

**Effects:** `[{type: "DROP_SHADOW|INNER_SHADOW|LAYER_BLUR|BACKGROUND_BLUR", color: {r,g,b,a}, offset: {x,y}, radius, spread, visible}]`

## Auto Layout (setAutoLayout)

```json
{"type": "setAutoLayout", "target": "NODE_ID", "payload": {
  "direction": "HORIZONTAL|VERTICAL", "spacing": 8,
  "paddingLeft": 16, "paddingRight": 16, "paddingTop": 12, "paddingBottom": 12,
  "primaryAxisSizing": "FIXED|AUTO", "counterAxisSizing": "FIXED|AUTO"
}}
```

**3-STEP RULE:** `create` → `setAutoLayout` → `modify` (for FILL/HUG/GROW sizing). Never set layoutSizingHorizontal/layoutGrow during create.

## Query Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `query` | `target` OR `{queryType: "selection\|describe\|children"}` | Prefer `describe` over `children` (fast vs 15min) |
| `getFrames` | (none) | All top-level frames |
| `getViewport` | (none) | |
| `findChildren` | `{nodeId, criteria: {type?, name?}}` | Direct children only |
| `findAll` | `{nodeId, criteria: {name?}}` | All descendants |
| `findOne` | `{nodeId, criteria: {type?, name?}}` | First match |
| `findAllByType` | `{nodeId, nodeType}` | |
| `findByName` | `{name, scope: "selection\|page\|file"}` | |
| `findByRegex` | `{pattern, nodeType?}` | |
| `findWithCriteria` | `{types?, hasAutoLayout?, minWidth?}` | |
| `getSelectionColors` | `{includeStrokes?, includeEffects?}` | |
| `getCss` | `{nodeId}` | Returns CSS string |
| `getAbsoluteBounds` | `{nodeId}` | |
| `getAutoLayoutProperties` | `{nodeId}` | |
| `getConstraints` | `{nodeId}` | |
| `getMeasurements` | `{nodeIds: [id1, id2]}` | Between two nodes |

## Variable Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `createDesignSystem` | `{brandColors: {primary}, organizingPrinciple?, grayBase?, includeBoilerplate?, extractedTokens?}` | One-command full system. Principles: `four-level`, `three-level`, `two-level`, `material-design`, `tailwind`, `spectrum`, `spectrum-2`, `apple-hig`. `spectrum-2` mirrors Adobe's 2,919-variable library (Light/Dark/Wireframe modes) and doesn't need `brandColors` — retheme by editing `.Color theme`. |
| `validateDesignSystem` | (none) | Check structure/completeness |
| `getDesignSystemStatus` | (none) | Quick check |
| `getOrganizingPrinciples` | (none) | List available structures |
| `createVariableCollection` | `{name, modes}` | |
| `createVariable` | `{collectionId, name, type: "COLOR\|FLOAT\|STRING\|BOOLEAN", values: {modeName: val}}` | Field is `type` not `resolvedType`. Uses `collectionId` not name |
| `editVariable` | `{variableId, values?: {modeName: val}, name?, description?, scopes?}` | Must use `values` (plural), NOT `value` |
| `batchEditVariable` | Direct array of editVariable payloads | NOT `{edits: [...]}` |
| `getVariables` | `{collectionId?\|collectionName?, includeValues?}` | Name is case-sensitive |
| `getVariableById` | `{variableId, includeCollection?}` | Full details with valuesByMode |
| `createBoilerplate` | `{categories: ["all"\|"typography"\|"shadows"\|etc]}` | Adds standard tokens to Primitive collection |

**Alias syntax:** `{type: "VARIABLE_ALIAS", id: "VariableID:123:456"}`

## Variable Binding

| Command | Payload | Notes |
|---------|---------|-------|
| `bindFillVariable` | `{nodeId, variableId, fillIndex: 0}` | nodeId in **payload**, NOT as target |
| `bindStrokeVariable` | `{nodeId, variableId, strokeIndex: 0}` | |
| `bindVariable` | `{nodeId, variableId, field}` | Fields: fontSize, fontFamily, letterSpacing, cornerRadius |
| `bindMatchingColors` | `{scope, tolerance?, includeStrokes?, forceRebind?, validCollectionIds?, dryRun?}` | Auto-bind by color match. Token > Semantic > Primitive priority |
| `autoBindByRole` | `{scope, minConfidence?, dryRun?, bindFills?, bindStrokes?, forceRebind?}` | Semantic role detection (background, text, border, accent) |
| `getBoundVariables` | `{nodeId}` | List all bindings |
| `unbindVariable` | `{nodeId, field}` | e.g., field: "fills[0]" |
| `getVariableConsumers` | `{variableId}` | All nodes using this variable |

## Variable Alias & Collection Operations

| Command | Payload |
|---------|---------|
| `createVariableAlias` | `{sourceVariableId, targetCollectionId, name, modeValues}` |
| `setBoundVariableForPaint` | `{nodeId, fillIndex, variableId}` |
| `setBoundVariableForEffect` | `{nodeId, effectIndex, field, variableId}` |
| `resolveVariableValue` | `{variableId, modeId}` |
| `cloneVariableCollection` | `{collectionId, newName}` |
| `addCollectionMode` | `{collectionId, modeName}` |
| `removeCollectionMode` | `{collectionId, modeId}` |

## Token Extraction

| Command | Payload | Notes |
|---------|---------|-------|
| `extractDesignTokens` | `{scope: "selection\|page\|file", includeChildren?}` | Returns colors, typography, numbers, effects with node ID maps. Long-running on file scope |
| `getNodeColors` | `{nodeId, includeChildren?, includeStrokes?}` | Does NOT recurse deeply |
| `extractWebsiteCSS` | `{url}` | Server-side Puppeteer. Returns colors, typography, spacing, cssVariables with light/dark |
| `extractWebsiteLayout` | `{url, maxElements?, maxDepth?, captureScreenshot?, viewport?}` | DOM structure with bounding boxes |

## Style Operations

| Command | Payload |
|---------|---------|
| `createPaintStyle` | `{name, paints}` |
| `createTextStyle` | `{name, fontSize, fontName, lineHeight?, letterSpacing?}` |
| `applyStyle` | `{styleId, property: "fills\|strokes\|effects\|text"}` + `target` |
| `getStyles` | `{styleType: "PAINT\|TEXT\|EFFECT\|GRID"}` |
| `deleteStyle` | `{styleId}` |
| `bindTextStyleVariable` | `{styleId, field, variableId}` |
| `createGridStyle` | `{name, description?, grids: [{pattern, count?, gutterSize?, alignment?, offset?, sectionSize?, color?}]}` |
| `applyGridStyle` | `{nodeId, styleId}` |
| `getGridStyles` | `{}` |

## Component Operations

| Command | Payload |
|---------|---------|
| `createComponent` | `{name, properties, children}` |
| `createComponentSet` | `{name, variants: [...]}` |
| `createInstance` | `{componentId, x, y}` |
| `getComponents` | (none) |
| `addComponentProperty` | `{nodeId, name, type, defaultValue}` |
| `getComponentPropertyDefinitions` | `{nodeId}` |
| `setComponentPropertyReferences` | `{nodeId, references: {visible: "key", mainComponent: "key"}}` |
| `deleteComponentProperty` | `{nodeId, propertyName}` |
| `swapComponent` | `{instanceId, newComponentKey}` |
| `importComponentByKey` | `{key, x, y}` |

## Media Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `createImage` | `{url\|data, x, y, width?, height?}` | `data` for base64. No width/height support with `data` — use resize after |
| `createImageAsync` | `{url, x, y}` | For large files |
| `createVideo` | `{url, x, y, width, height}` | |
| `createGif` | `{url, x, y}` | |
| `replaceImage` | `{nodeId, url}` | |
| `exportNode` | `{nodeId, format: "PNG\|JPG\|SVG\|PDF", scale?}` | Fails on very large frames |
| `exportSelection` | `{format, scale?}` | |

## Text Operations

| Command | Payload |
|---------|---------|
| `loadFont` | `{family, style}` |
| `measureText` | `{text, fontSize?, fontFamily?, fontStyle?}` |
| `setRangeFills` | `{nodeId, start, end, fills}` |
| `setRangeFontSize` | `{nodeId, start, end, fontSize}` |
| `setRangeFontName` | `{nodeId, start, end, fontName: {family, style}}` |
| `setRangeTextDecoration` | `{nodeId, start, end, decoration: "NONE\|UNDERLINE\|STRIKETHROUGH"}` |
| `setRangeLetterSpacing` | `{nodeId, start, end, letterSpacing: {value, unit}}` |
| `setRangeLineHeight` | `{nodeId, start, end, lineHeight: {value, unit}}` |
| `setRangeHyperlink` / `setTextHyperlink` | `{start, end, url}` (external) or `{start, end, nodeId}` (jump to a node in-file) + `target` = the text node. Aliases. |
| `insertCharacters` | `{nodeId, position, characters}` |
| `deleteCharacters` | `{nodeId, start, end}` |
| `getTextSegments` | `{nodeId}` |
| `setTextCase` | `{nodeId, textCase: "ORIGINAL\|UPPER\|LOWER\|TITLE"}` |

## FigJam Commands

| Command | Payload | Notes |
|---------|---------|-------|
| `createShapeWithText` | `{shapeType, text, x, y, width, height, fillColor?, textColor?, fontSize?}` | Shapes: ROUNDED_RECTANGLE, ELLIPSE, DIAMOND, SQUARE, TRIANGLE_UP/DOWN, PARALLELOGRAM_LEFT/RIGHT |
| `createConnector` | `{startNodeId, endNodeId, startMagnet?, endMagnet?, connectorEndStrokeCap?, strokeColor?, strokeWeight?}` | Magnets: AUTO, TOP, BOTTOM, LEFT, RIGHT. Use `connectorEndStrokeCap: "ARROW_LINES"` for arrows |
| `createSection` | `{name, x, y, width, height, fillColor?}` | |
| `createSticky` | `{text, x, y, color?}` | Colors: YELLOW, BLUE, GREEN, PINK, ORANGE, PURPLE, GRAY |
| `createHighlight` | `{x?, y?, parent?}` | FigJam only |
| `createStamp` | `{stampType?, x?, y?, parent?}` | FigJam only |
| `createWashiTape` | `{connectorStartNodeId?, connectorEndNodeId?, startMagnet?, endMagnet?}` | Decorative connector, FigJam only |
| `createEmbed` | `{url, x?, y?, parent?}` | URL embed, async, FigJam only |

**ALWAYS use bridge commands for FigJam, NEVER MCP `generate_diagram`.**

## Table Operations

| Command | Payload |
|---------|---------|
| `createTable` | `{x, y, rows, columns, cellWidth?, cellHeight?}` |
| `setTableCell` | `{tableId, row, column, content}` |
| `styleTableRow` | `{tableId, row, fills?, fontWeight?}` |
| `styleTableColumn` | `{tableId, column, width?, textAlignHorizontal?}` |
| `addTableRow` | `{tableId, position}` |
| `addTableColumn` | `{tableId, position}` |
| `removeTableRow` | `{tableId, row}` |
| `removeTableColumn` | `{tableId, column}` |

## Prototyping

| Command | Payload | Notes |
|---------|---------|-------|
| `getReactions` | `target` only | Returns all prototype interactions with triggers, actions, transitions |
| `setReactions` | `{reactions: [...]}` + `target` | Set full reactions array |
| `createOverlay` | `{name?, x?, y?, width?, height?, overlayPositionType?}` | Creates frame configured as overlay |
| `setOverlaySettings` | `{overlayPositionType?, overlayBackground?, overlayBackgroundInteraction?}` + `target` | |
| `setTransition` | `{reactionIndex, actionIndex?, transitionType?, duration?, easing?, direction?}` + `target` | Modifies transition on existing reaction |

## Annotations

| Command | Payload | Notes |
|---------|---------|-------|
| `addAnnotation` | `{label?, labelMarkdown?, categoryId?}` + `target` | `label` **or** `labelMarkdown` required (not both). Markdown links are NOT clickable — use `setDevResources` for a clickable link. No `description` field. |
| `editAnnotation` | `{annotationIndex, label?, labelMarkdown?, categoryId?}` + `target` | |
| `deleteAnnotation` | `{annotationIndex}` + `target` | |
| `getAnnotationCategories` | (none) | Returns all annotation categories |

## Guides

| Command | Payload | Notes |
|---------|---------|-------|
| `addGuide` | `{axis: "X"\|"Y", offset}` + optional `target` | Defaults to current page |
| `getGuides` | optional `target` | Returns all guides |
| `removeGuide` | `{guideIndex}` or `{axis, offset}` + optional `target` | Remove by index or match |

## Vector Operations

| Command | Payload | Notes |
|---------|---------|-------|
| `getVectorNetwork` | `target` only | Returns vertices, segments, regions |
| `getVectorPaths` | `target` only | Returns SVG path data |
| `setVectorNetwork` | `{vectorNetwork}` + `target` | Set vertices, segments, regions |

## Dev Resources & Plugin Data

| Command | Payload |
|---------|---------|
| `setDevResources` | `{nodeId, resources: [{name, url}], replace?}` (nodeId or `target`) |
| `getDevResources` | `target` (node id) |
| `setPluginData` | `{nodeId, key, value}` |
| `getPluginData` | `{nodeId, key}` |
| `setSharedPluginData` | `{nodeId, namespace, key, value}` |
| `getSharedPluginData` | `{nodeId, namespace, key}` |
| `setDocumentPluginData` | `{key, value}` |
| `setExportSettings` | `{nodeId, settings: [{format, scale, suffix?}]}` |
| `getCodeSnippets` | `{nodeId, format: "css\|ios\|android"}` | ⚠️ not implemented (Dev Mode codegen only) |

**Clickable link on a node (e.g. link a frame back to a user-story card):** `setDevResources` adds links that are clickable in Dev Mode — the supported mechanism for a "jump to" / back-link. For an in-file jump use the target node's Figma URL (`...?node-id=4409-25320`) as the `url`. Annotation `labelMarkdown` links render as plain, non-clickable text, so do **not** use annotations for clickable links. `replace: true` clears existing resources first; re-adding the same `url` updates its name (idempotent). Round-trip with `getDevResources`.

## 2026 API Additions

Full payloads & examples: **`prompts/api-2026-additions.md`**. Every command below capability-guards — if your Figma desktop build is too old it returns a clear "update Figma" message instead of crashing.

| Command | Payload | Notes |
|---------|---------|-------|
| `setGridLayout` | `{columnCount, rowCount, gap?, rowGap?, columnGap?, columnSizes?, rowSizes?, autoTracks?, itemsPositioning?}` + `target` | Grid auto-layout (`layoutMode:'GRID'`). Track size: `{type:'FLEX'\|'FIXED'\|'HUG', value?}` |
| `getGridLayout` | `target` | Read grid config |
| `setGridChildPosition` | `{row, column, rowSpan?, columnSpan?, horizontalAlign?, verticalAlign?}` + `target` (child) | Place/span a child |
| `reorderGridTracks` | `{axis:'ROWS'\|'COLUMNS', fromIndices, insertionIndex}` + `target` | Move rows/cols |
| `extendVariableCollection` | `{collectionId, name}` | Theming: extend a local collection |
| `extendLibraryCollection` | `{collectionKey, name}` | Extend a published library collection |
| `setVariableOverride` | `{variableId, extendedModeId, colorHex? \| value? \| aliasId?}` | Override one value per extended mode |
| `removeVariableOverride` | `{variableId, extendedModeId}` | Revert to inherited value |
| `getExtendedCollection` | `{collectionId}` | Modes (+parentModeId), overrides, root id |
| `setFills` (new types) | `fills:[{type:'IMAGE'\|'VIDEO'\|'PATTERN', …}]` + `target` | PATTERN auto-uses `setFillsAsync` |
| `setEffects` (new types) | `effects:[{type:'NOISE'\|'TEXTURE'\|'GLASS'}, {type:'LAYER_BLUR', blurType:'PROGRESSIVE'}]` + `target` | Noise/texture/glass/progressive |
| `listShaders` / `importShader` | `{}` / `{id}` | Discover / materialize shaders |
| `applyShaderFill` / `applyShaderEffect` | `{shaderId, properties?, append?}` + `target` | Apply a shader |
| `listAnimationStyles` / `getMotionData` | `{}` / `target` | Motion read |
| `applyAnimationStyle` / `removeAnimationStyle` / `setTimelineDuration` | `{styleId}` / `{appliedStyleId}` / `{timelineId, duration}` + `target` | Motion write |
| `createSlot` / `resetSlot` | `{name?}` + `target` (component / slot) | Component slots |
| `createTextPath` | `{startSegment?, startPosition?, characters?, fontSize?}` + `target` (vector) | Text on a path |
| `transformGroup` / `loadBrushes` / `setVariableWidthStroke` | see full doc | Figma Draw |
| `setFillsAsync` / `setStrokesAsync` | `{fills\|strokes:[raw Paint]}` + `target` | Async setters (patterns/brushes) |
| `getBuzzAssetType` / `setBuzzAssetType` / `buzzSmartResize` / `createBuzzFrame` / `getBuzzContent` | see full doc | Figma Buzz (buzz editor only) |
| `moveNodesToCoord` | `{nodeIds, rowIndex?, columnIndex?}` | Canvas grid move (Buzz/Slides) |
| `getFocusedNode` / `setFocusedNode` | `{}` / `{nodeId}` or `target` | Dev Mode focus; **falls back to selection** in Design/FigJam. Result carries `source: 'dev-mode-focus'\|'selection'\|'none'` |

## Critical Gotchas

1. **Colors are 0-1 scale**, not 0-255. `{r: 1, g: 0, b: 0}` = red
2. **3-step layout rule**: `create` → `setAutoLayout` → `modify` (FILL/HUG/GROW)
3. **batchCreate payload** is a direct array, NOT `{nodes: [...]}`
4. **batchEditVariable payload** is a direct array, NOT `{edits: [...]}`
5. **bindFillVariable**: `nodeId` goes in payload, NOT as `target`
6. **createVariable**: field is `type` not `resolvedType`, needs `collectionId` not name
7. **editVariable**: must use `values` (plural), not `value`
8. **Use Inter font** — pre-loaded. "Inter Semi Bold" (with space), not "SemiBold"
9. **Prefer `describe` over `children`** queryType — children can take 15+ min on large nodes
10. **Large JSON**: write to `.tmp/payload.json`, use `curl -d @.tmp/payload.json`, delete after
11. **Long commands**: use `timeout=300000` for file-scope extractDesignTokens, extractWebsiteCSS
12. **Plugin uses long polling** — `wsClients: 0` in /health does NOT mean disconnected
13. **extractWebsiteCSS**: don't assume `:root` = light — check `cssVariables.rootMode`
