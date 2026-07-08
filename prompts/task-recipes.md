# Task Recipes — the fast path

**Read this file INSTEAD of the big references for common tasks.** Each recipe is the minimal
correct call sequence. Only open `quick-ref.md` (command dictionary) or `figma-bridge.md`
(exhaustive manual) if your task isn't here or you need an unusual option.

## How to call — use `fig`, not curl

`scripts/fig` sends a command, waits, and prints the result in ONE bash call:

```bash
./scripts/fig <type> [target] --payload '<json>'     # one command
./scripts/fig batch '<json-array>'                   # N commands, one HTTP call, executed in order
./scripts/fig query --payload '{"queryType":"selection"}'
```

Exit code 0 = success, 1 = command failed (read `.error`), 2 = server unreachable.
Raw HTTP equivalent: `POST /commands?wait=true` (single or array body) — response IS the result.

**Rules of engagement (they override old habits):**
- Modify by node ID directly when you already have it — query first ONLY when you don't.
- Batch everything repetitive (`batch`, `batchCreate`, `batchModify`, `batchDelete`, `batchEditVariable`).
- Never enter a known-slow path (see bottom) without an explicit reason.
- Verify with ONE screenshot at the end (or at a milestone), not after every step.
- Don't write Python orchestration scripts for ≤10 commands — `fig batch` does it in one call.

---

## 1. Replace / swap components

**Ask ONE question first if ambiguous:** "Re-link instances to a different component (e.g. the
design-system library), or just restyle the existing ones?" Re-link → this recipe. Restyle → recipe 2.

One call does everything (resolve → find instances → swap, overrides preserved):

```bash
./scripts/fig replaceComponent --payload '{
  "from": {"name": "Button/Old"},
  "to":   {"key": "LIBRARY_COMPONENT_OR_SET_KEY"},
  "scope": "page"
}'
```

- `from`/`to` each accept `{key}` (component OR component-set key — sets auto-resolve), `{nodeId}`,
  or `{name}` (local exact name, **current page only** — add `"searchAllPages": true` to sweep the
  whole file, slow on large files; prefer `nodeId` from `getComponents`). Add
  `"variantProperties": {"Style":"Accent","Size":"M"}` to pick a variant from a set.
- `scope`: `"file"` (default) | `"page"` | `"selection"` | `{"nodeId":"…"}` (inside one container).
- Add `"dryRun": true` to preview what would swap (count + instance list) without changing anything.
- Single instance instead? `fig swapInstance --payload '{"instanceId":"1:23","newComponentName":"Button/New"}'`
  (also accepts `newComponentKey` — set keys fine — or `newComponentId`).

Then ONE verification screenshot: `fig exportNode <containerId> --payload '{"format":"PNG","scale":1}'`.

## 2. Restyle existing instances (no re-link)

Get the instance IDs (selection or `getComponentInstances` on the master), then one batch:

```bash
./scripts/fig getComponentInstances <componentNodeId>
./scripts/fig batch '[
  {"type":"setFills","target":"1:10","payload":{"fills":[{"type":"SOLID","color":"#0d99ff"}]}},
  {"type":"setFills","target":"1:11","payload":{"fills":[{"type":"SOLID","color":"#0d99ff"}]}}
]'
```

For instance sub-parts prefer `setInstanceProperties` / `overrideInstanceFills` (see quick-ref).

## 3. Find nodes — fast

```bash
./scripts/fig findAllByType --payload '{"types":["INSTANCE"],"nodeId":"<containerId>"}'   # scoped = fast
./scripts/fig findByName --payload '{"name":"Card","nodeId":"<containerId>"}'
./scripts/fig query --payload '{"queryType":"selection"}'                                  # what user selected
./scripts/fig query <nodeId> --payload '{"queryType":"describe"}'                          # structure overview, 1-2s
```

- Always pass a container `nodeId` or use the current page. File-wide searches require
  `"allowSlow": true` and can take minutes on big files — you almost never need them.
- NEVER `query children` on a large component/instance (documented 14m48s case) — use `describe`.
- To find instances of a component, use `getComponentInstances <componentId>` (native, fast) — not a tree search.

## 4. Bind variables to a frame (batched)

```bash
./scripts/fig getVariables --payload '{"includeValues":false}'        # collection + variable IDs
./scripts/fig batch '[
  {"type":"bindFillVariable","payload":{"nodeId":"1:10","variableId":"VariableID:1:2"}},
  {"type":"bindStrokeVariable","payload":{"nodeId":"1:10","variableId":"VariableID:1:3"}},
  {"type":"bindVariable","payload":{"nodeId":"1:10","field":"itemSpacing","variableId":"VariableID:1:4"}}
]'
```

Bulk by match instead of by hand: `bindMatchingColors` (colors→variables across a scope),
`autoBindSpacing`, `autoBindText`, `rebindVariables`. See quick-ref §Variable Binding.

## 5. Build a small layout (≤ ~15 nodes)

Still 3 steps (create → setAutoLayout → child sizing) but batched, not scripted:

```bash
./scripts/fig batch '[
  {"type":"create","payload":{"nodeType":"FRAME","properties":{"name":"Card","width":320,"height":200}}},
  {"type":"create","payload":{"nodeType":"TEXT","parent":"<frameId>","properties":{"characters":"Title","fontSize":18}}}
]'
./scripts/fig setAutoLayout <frameId> --payload '{"mode":"VERTICAL","spacing":12,"padding":16,"primaryAxisSizing":"AUTO"}'
./scripts/fig setLayoutChild <childId> --payload '{"layoutSizingHorizontal":"FILL"}'   # only if FILL/HUG needed
```

Child layout properties (FILL/HUG/GROW) still silently fail during creation — set them AFTER
parenting. Grid: `setGridLayout` (see api-2026-additions.md). Screenshot once at the end.

## 6. Rename / bulk-edit many nodes

One `batch` of `renameNode` / `modify` commands. Get IDs from `findAllByType` scoped to the container.

## 7. Create variables / design system

- Full system in one call: `fig createDesignSystem --payload '{"brandColors":{"primary":"#ff6d38"},"organizingPrinciple":"four-level"}'`
- A few variables: one `batch` of `createVariable` (needs `collectionId`, field is `type` not `resolvedType`).
- Edit values: `batchEditVariable` — payload is a DIRECT ARRAY of edits.

## 8. Export / screenshot verification

```bash
./scripts/fig exportNode <nodeId> --payload '{"format":"PNG","scale":1}'   # returns base64
```
Giant nodes (>4096px) fail — export a child or use scale 0.5. Verify at checkpoints, not per step.

## 9. Component keys & libraries

- Local component: you need the NODE ID (or name) — local components have no usable import key.
  `getComponents` lists them.
- Library component: you need the KEY — from `search_design_system`/`get_design_context` (Figma MCP)
  or the library file. `replaceComponent`/`swapInstance` accept either kind and auto-import;
  component-SET keys are auto-resolved to a variant (pass `variantProperties` to choose).

## 10. Migrate a page's components to a library (bulk)

Proven at 4,578 instances / 108 masters in ~5.5 min. Three phases, resumable:

```bash
# 1. INVENTORY — one call returns every master in use (id, name, key, remote?, counts, parent set)
./scripts/fig getInstanceMasters --payload '{"nodeId":"<pageId>","topLevelOnly":true}'

# 2. MAP — for each LOCAL master's set name, find the library key via Figma MCP
#    search_design_system (filter includeLibraryKeys to the target library). Match by exact name.
#    Hold back: dot-prefixed privates (.Foo — published only inside containers), unpublished icons.

# 3. EXECUTE — one variant-faithful replaceComponent per local master, scoped to the page:
#    {"from":{"nodeId":"<masterId>"},
#     "to":{"key":"<libSetKey>","variantProperties":{...parsed from master variant name...}},
#     "scope":{"nodeId":"<pageId>"}}
#    Batch ~5 per call; save results after each batch (resume = skip done); check /logs/running between.
```

- If `to` resolution fails with "No variant matches", the error lists available variants — usually the
  local set has an extra dimension (e.g. `Variant=01`); drop that key and retry.
- Never resolve masters per-instance (`getMainComponent` loops) — that's thousands of round trips;
  `getInstanceMasters` is one.

## 11. FigJam quick diagram

Use bridge commands (`createSection`, `createShapeWithText`, `createConnector`) — never MCP
`generate_diagram` (draws into the wrong file). Batch the shapes, then batch the connectors
(connectors need the shape IDs, so two batches).

---

## Known-slow operations — do not enter casually

| Slow thing | Cost | Fast alternative |
|---|---|---|
| `query children` on big component/instance | up to **15 min** | `query describe` (1-2s) |
| File-wide `findAll`/`findByName` (no scope) | minutes | scope to `nodeId`/page; needs `allowSlow:true` |
| `extractDesignTokens` scope:file | minutes | scope:selection / page; `timeout=300000` |
| Per-node curl loops | ~1s each + your reasoning time | `fig batch` — one call |
| Re-reading figma-bridge.md (2,900 lines) | your whole context | this file + quick-ref.md |

## Timeout protocol (a timeout means the command may STILL be running)

The plugin is single-threaded: one long command blocks everything behind it, and a synchronous
tree-walk cannot be aborted. When `fig` exits 3 / prints ⏳ TIMEOUT:

1. **STOP. Do not send more commands** — they queue behind the wedge (and will be auto-expired).
2. `curl localhost:4001/logs/running` — see what's executing and for how long.
3. Still busy → wait and re-check. The queued commands you already sent carry a TTL and will be
   skipped as "expired" if the sender's wait passed — resend only what you still need.
4. Wedged > 2 minutes → ask the user to **close and reopen the plugin** (the only way to abort a
   stuck synchronous call), then resend.
5. Never retry blind, and never "verify" a timeout by sending the same command again.

**Reading deep structure on big files:** prefer Figma MCP `get_metadata` (reads via the desktop app,
doesn't touch the plugin thread) or `query describe`. `query deep`/`children` serialization is
budget-capped (~1,500 nodes) and returns `truncated: true` with guidance instead of walking forever.
