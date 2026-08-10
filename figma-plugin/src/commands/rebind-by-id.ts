// rebindVariablesById — migrate bindings from one set of variables to another in ONE walk.
//
//   { "type": "rebindVariablesById", "payload": {
//       "nodeId": "<scope>", "map": { "<fromVariableId>": "<toVariableId>", ... } } }
//
// Unlike rebindVariables (COLOR-only, local-only), this resolves targets via
// getVariableByIdAsync (works for imported library variables) and handles paint fields
// (fills/strokes) plus scalar fields (padding*, itemSpacing, width, height, etc.).

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

export async function handleRebindVariablesById(command: FigmaCommand): Promise<CommandResult> {
  var payload = (command.payload || {}) as { nodeId?: string; map?: { [from: string]: string } };
  var scopeId = payload.nodeId || command.target;
  var map = payload.map || {};
  if (!scopeId) return errorResult(command.id, 'nodeId (scope) is required');
  if (Object.keys(map).length === 0) return errorResult(command.id, 'map of fromVariableId -> toVariableId is required');

  // Resolve all target variables up front
  var toVars: { [from: string]: Variable } = {};
  for (var from in map) {
    var tv = await figma.variables.getVariableByIdAsync(map[from]);
    if (!tv) return errorResult(command.id, 'Target variable not found: ' + map[from]);
    toVars[from] = tv;
  }

  var scope = await figma.getNodeByIdAsync(scopeId);
  if (!scope) return errorResult(command.id, 'Scope node not found: ' + scopeId);
  if (scope.type === 'PAGE') await (scope as PageNode).loadAsync();
  if (!('findAll' in scope)) return errorResult(command.id, 'Scope cannot be searched: ' + scope.type);

  var prevSkip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;
  var nodes: SceneNode[];
  try {
    nodes = (scope as PageNode | FrameNode).findAll(function () { return true; });
  } finally {
    figma.skipInvisibleInstanceChildren = prevSkip;
  }

  var rebound = 0;
  var skipped: { [field: string]: number } = {};
  var perVariable: { [from: string]: number } = {};

  for (var i = 0; i < nodes.length; i++) {
    var node: any = nodes[i];
    var bv: any = node.boundVariables;
    if (!bv) continue;

    for (var field in bv) {
      var val = bv[field];
      var isArray = Array.isArray(val);
      var aliases: any[] = isArray ? val : [val];
      var hit = aliases.some(function (a) { return a && a.id && map[a.id]; });
      if (!hit) continue;

      try {
        if (field === 'fills' || field === 'strokes') {
          var paints = (node[field] as readonly Paint[]).slice();
          for (var p = 0; p < aliases.length && p < paints.length; p++) {
            var alias = aliases[p];
            if (alias && alias.id && map[alias.id]) {
              paints[p] = figma.variables.setBoundVariableForPaint(paints[p] as SolidPaint, 'color', toVars[alias.id]);
              rebound++; perVariable[alias.id] = (perVariable[alias.id] || 0) + 1;
            }
          }
          node[field] = paints;
        } else if (!isArray) {
          var a2 = aliases[0];
          if (a2 && a2.id && map[a2.id]) {
            node.setBoundVariable(field, toVars[a2.id]);
            rebound++; perVariable[a2.id] = (perVariable[a2.id] || 0) + 1;
          }
        } else {
          // other array-valued binding fields (textRangeFills, effects, layout grids) — report, skip
          skipped[field] = (skipped[field] || 0) + 1;
        }
      } catch (e) {
        skipped[field] = (skipped[field] || 0) + 1;
      }
    }

    if (i % 2000 === 0) {
      await new Promise<void>(function (r) { setTimeout(r, 1); });
    }
  }

  return successResult(command.id, {
    data: { scope: scopeId, nodesScanned: nodes.length, rebound: rebound, perVariable: perVariable, skippedFields: skipped },
  });
}
