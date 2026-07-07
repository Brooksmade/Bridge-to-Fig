# Bridge to Fig — 2026 API Additions

Commands added to cover Figma Plugin API features shipped **Nov 2025 → June 2026**
(typings `@figma/plugin-typings` v1.120 → v1.130). Every command below **guards for capability**:
if the user's Figma desktop client is too old to support the feature, the command returns a clean
error (e.g. `"Shaders are not available in this Figma client version"`) instead of crashing.

> Requires the Figma desktop app updated to a build that includes the feature (roughly the dates noted
> per section). Send commands the usual way: `POST http://localhost:4001/commands` → poll `GET /results/{id}?wait=true`.

---

## Grid Auto-Layout (`layoutMode: 'GRID'`) — Nov 2025 / May 2026

The legacy `setAutoLayout` only handles `HORIZONTAL`/`VERTICAL`. These handle CSS-grid-style layout.

| Command | Purpose |
|---|---|
| `setGridLayout` | Turn a frame into a grid; set row/column counts, gaps, track sizes, auto-flow |
| `getGridLayout` | Read a frame's grid configuration |
| `setGridChildPosition` | Place a child at a row/column, set span & alignment |
| `reorderGridTracks` | Move rows or columns |

```jsonc
// setGridLayout — target is the frame node ID
{ "type": "setGridLayout", "target": "NODE_ID", "payload": {
  "columnCount": 3, "rowCount": 2,
  "gap": 16,                                  // or rowGap / columnGap
  "columnSizes": [ {"type":"FIXED","value":120}, {"type":"FLEX","value":1}, {"type":"HUG"} ],
  "itemsPositioning": "MANUAL"                // or "ROW_AUTO_FLOW"
}}

// setGridChildPosition — target is the CHILD node ID
{ "type": "setGridChildPosition", "target": "CHILD_ID", "payload": {
  "row": 0, "column": 1, "rowSpan": 1, "columnSpan": 2,
  "horizontalAlign": "CENTER", "verticalAlign": "MIN"
}}

// reorderGridTracks
{ "type": "reorderGridTracks", "target": "NODE_ID",
  "payload": { "axis": "ROWS", "fromIndices": [0], "insertionIndex": 3 } }
```

Track types: `FLEX` (CSS `fr` — `value` is the fr count), `FIXED` (`value` = px), `HUG`.
Note: setting `rowCount` throws if `autoTracks: "ROWS"` is active — the handler skips it automatically in that case.

---

## Extended Variable Collections (theming) — Nov 2025 / Jan 2026 · Enterprise

Native collection inheritance: an extension inherits every mode + variable from a parent collection,
and you override individual values per mode. The evolution of the modes/theming system.

| Command | Purpose |
|---|---|
| `extendVariableCollection` | Extend a **local** collection → returns the extension + inherited modes |
| `extendLibraryCollection` | Extend a **published library** collection by key |
| `setVariableOverride` | Override one variable's value for one extended mode |
| `removeVariableOverride` | Revert a variable to its inherited value for a mode |
| `getExtendedCollection` | Read modes (with `parentModeId`), overrides, and `rootVariableCollectionId` |

```jsonc
{ "type": "extendVariableCollection", "payload": { "collectionId": "COLL_ID", "name": "Brand B Theme" } }
// → { extendedCollectionId, modes: [{modeId, name, parentModeId}], rootVariableCollectionId, ... }

{ "type": "setVariableOverride", "payload": {
  "variableId": "VAR_ID", "extendedModeId": "MODE_ID", "colorHex": "#ff6d38"   // or value / aliasId
}}

{ "type": "removeVariableOverride", "payload": { "variableId": "VAR_ID", "extendedModeId": "MODE_ID" } }
```

---

## New Fill Types — via `setFills` (Pattern / Image / Video)

`setFills` now builds `IMAGE`, `VIDEO`, and `PATTERN` fills in addition to `SOLID`/`GRADIENT_*`.
(Shader fills use `applyShaderFill` below.)

```jsonc
{ "type": "setFills", "target": "NODE_ID", "payload": { "fills": [
  { "type": "IMAGE",   "imageHash": "HASH", "scaleMode": "FILL" },
  { "type": "VIDEO",   "videoHash": "HASH", "scaleMode": "FIT" },
  { "type": "PATTERN", "sourceNodeId": "TILE_NODE_ID", "tileType": "RECTANGULAR",
                       "scalingFactor": 1, "spacing": {"x":0,"y":0}, "horizontalAlignment": "CENTER" }
] }}
```

> PATTERN fills reference a source node and are rejected by Figma's synchronous `fills` setter, so
> `setFills` transparently falls back to `setFillsAsync` for them — the result carries `"async": true`.

## New Effect Types — via `setEffects` (Noise / Texture / Glass / Progressive blur)

`setEffects` now builds these in addition to the legacy shadows/normal blur:

```jsonc
{ "type": "setEffects", "target": "NODE_ID", "payload": { "effects": [
  { "type": "NOISE", "noiseType": "MONOTONE", "color": "#000000", "noiseSize": 4, "density": 0.5 },
  { "type": "NOISE", "noiseType": "DUOTONE",  "color": "#000000", "secondaryColor": "#ffffff" },
  { "type": "TEXTURE", "noiseSize": 10, "radius": 20, "clipToShape": true },
  { "type": "GLASS", "lightIntensity": 0.5, "lightAngle": 135, "refraction": 0.2, "depth": 1, "dispersion": 0, "radius": 10 },
  { "type": "LAYER_BLUR", "blurType": "PROGRESSIVE", "radius": 12,
    "startRadius": 0, "startOffset": {"x":0,"y":0}, "endOffset": {"x":0,"y":1} }
] }}
```

---

## Shaders — June 2026

Discover → import → apply. A shader must be imported before it can be applied (handlers do this for you).

| Command | Purpose |
|---|---|
| `listShaders` | List shaders available to the file (`{id, name, type:'fill'\|'effect', propertyDefinitions}`) |
| `importShader` | Materialize a shader into the file by id |
| `applyShaderFill` | Apply a shader as a fill (or stroke via `"target":"strokes"`) |
| `applyShaderEffect` | Apply a shader as an effect |

```jsonc
{ "type": "applyShaderFill", "target": "NODE_ID",
  "payload": { "shaderId": "SHADER_ID", "properties": { "PROP_DEF_ID": 0.5 }, "append": false } }
```

## Motion / Animation — June 2026

| Command | Purpose |
|---|---|
| `listAnimationStyles` | The file's available animation-style templates |
| `getMotionData` | A node's applied styles, timelines, and manual keyframe tracks |
| `applyAnimationStyle` | Apply a style → returns the applied-instance id |
| `removeAnimationStyle` | Remove an applied style by instance id |
| `setTimelineDuration` | Set a timeline's duration (seconds) |

```jsonc
{ "type": "applyAnimationStyle", "target": "NODE_ID", "payload": { "styleId": "STYLE_ID" } }
{ "type": "setTimelineDuration", "target": "NODE_ID", "payload": { "timelineId": "TL_ID", "duration": 1.2 } }
```

## Slots — June 2026

| Command | Purpose |
|---|---|
| `createSlot` | Create a slot inside a `COMPONENT` (freeform content area) |
| `resetSlot` | Reset a slot to its default state |

```jsonc
{ "type": "createSlot", "target": "COMPONENT_ID", "payload": { "name": "Content" } }
```

## Figma Draw — Jan 2026

| Command | Purpose |
|---|---|
| `createTextPath` | Lay text along a `VECTOR` path |
| `transformGroup` | Group nodes with linear/radial repeat modifiers |
| `loadBrushes` | Load `STRETCH` or `SCATTER` brushes before stroking |
| `setFillsAsync` / `setStrokesAsync` | Async setters for paints that need loading (patterns/brushes); pass raw Paint objects |
| `setVariableWidthStroke` | Set a variable-width stroke profile (pass-through `variableWidthStrokeProperties`) |

```jsonc
{ "type": "createTextPath", "target": "VECTOR_ID",
  "payload": { "startSegment": 0, "startPosition": 0.5, "characters": "Curved text", "fontSize": 24 } }
```

## Figma Buzz + Canvas Moves — Oct 2025

`figma.buzz.*` exists only in the **Buzz** editor. `moveNodesToCoord` works in canvas-grid editors (Buzz/Slides).

| Command | Purpose |
|---|---|
| `getBuzzAssetType` / `setBuzzAssetType` | Read/set a node's Buzz asset type |
| `buzzSmartResize` | Smart-resize a Buzz node (re-lays-out content) |
| `createBuzzFrame` | Create a Buzz frame at a canvas coordinate |
| `getBuzzContent` | Read a node's text + media fields |
| `moveNodesToCoord` | Move nodes to a canvas grid `(rowIndex, columnIndex)` |

## Dev Mode Focused Node — Mar 2026

`figma.currentPage.focusedNode` only exists in the **Dev Mode** editor. In the Design/FigJam editors
these commands fall back to the **current selection** (the practical equivalent), so they work
everywhere and never error on the editor. The result includes a `source` field.

| Command | Purpose |
|---|---|
| `getFocusedNode` | Dev Mode focus, else the current selection. Returns `{source:'dev-mode-focus'\|'selection'\|'none', editorType, focusedNode, selectionCount?}` |
| `setFocusedNode` | Focus a node in Dev Mode, else select it. Clear with a null/absent `nodeId`. |

```jsonc
{ "type": "getFocusedNode", "payload": {} }
// Design mode → { "source": "selection", "editorType": "figma", "focusedNode": {id,name,type}, "selectionCount": 1 }
// Dev Mode    → { "source": "dev-mode-focus", "editorType": "dev", "focusedNode": {id,name,type} }
```

---

## Also updated

- **Sections** (`createSection`) now accept `strokeColor`, `strokeWeight`, and `cornerRadius` (May 2026).
- **Component properties** accept `'SLOT'` in the type union.
- **Manifest `editorType`** is now `['figma','figjam','dev','slides','buzz']` — `dev` enables Dev Mode
  (required for real `focusedNode`), and `slides`/`buzz` make the Slides and Buzz command handlers
  reachable in those editors. Re-import `dist/manifest.json` after building to pick up editor changes.
- **`createImageFromUrl`** now surfaces the real failure reason. Remote image URLs are still blocked
  unless their host is added to the manifest's `networkAccess.allowedDomains` (default: `localhost:4001`).
