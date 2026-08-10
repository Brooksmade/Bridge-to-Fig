// getBoundVariableUsage — bulk inventory of which variables are bound within a scope.
//
// One round trip instead of per-variable getVariableConsumers walks: traverses the scope once,
// reads every node's boundVariables, and returns an aggregated histogram keyed by variable id:
//   { "type": "getBoundVariableUsage", "payload": { "nodeId": "<page/container>" } }
//   → { usage: { "<variableId>": { name, remote, collectionId, collectionName, count,
//                                   fields: {fills: n, strokes: n, ...} } }, nodesScanned }

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

export async function handleGetBoundVariableUsage(command: FigmaCommand): Promise<CommandResult> {
  var payload = (command.payload || {}) as { nodeId?: string };
  var scopeId = payload.nodeId || command.target;
  if (!scopeId) return errorResult(command.id, 'nodeId (scope) is required');

  var scope = await figma.getNodeByIdAsync(scopeId);
  if (!scope) return errorResult(command.id, 'Node not found: ' + scopeId);
  if (scope.type === 'PAGE') await (scope as PageNode).loadAsync();
  if (!('findAll' in scope)) return errorResult(command.id, 'Node cannot be searched: ' + scope.type);

  var prevSkip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;
  var nodes: SceneNode[];
  try {
    nodes = (scope as PageNode | FrameNode).findAll(function () { return true; });
  } finally {
    figma.skipInvisibleInstanceChildren = prevSkip;
  }

  var usage: { [id: string]: { count: number; fields: { [f: string]: number } } } = {};
  var scanned = 0;
  for (var i = 0; i < nodes.length; i++) {
    var bv: any = (nodes[i] as any).boundVariables;
    scanned++;
    if (!bv) continue;
    for (var field in bv) {
      var val = bv[field];
      var aliases: any[] = Array.isArray(val) ? val : [val];
      for (var a = 0; a < aliases.length; a++) {
        var alias = aliases[a];
        if (!alias || !alias.id) continue;
        var u = usage[alias.id] || (usage[alias.id] = { count: 0, fields: {} });
        u.count++;
        u.fields[field] = (u.fields[field] || 0) + 1;
      }
    }
    if (scanned % 2000 === 0) {
      await new Promise<void>(function (r) { setTimeout(r, 1); });
    }
  }

  // Enrich with variable metadata (name, collection, remote)
  var out: { [id: string]: any } = {};
  var collNames: { [id: string]: string } = {};
  for (var vid in usage) {
    try {
      var v = await figma.variables.getVariableByIdAsync(vid);
      if (!v) { out[vid] = { name: '(deleted)', ...usage[vid] }; continue; }
      var cn = collNames[v.variableCollectionId];
      if (cn === undefined) {
        var coll = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        cn = collNames[v.variableCollectionId] = coll ? coll.name : '?';
      }
      out[vid] = { name: v.name, remote: v.remote, key: v.key, collectionId: v.variableCollectionId,
                   collectionName: cn, resolvedType: v.resolvedType, ...usage[vid] };
    } catch (e) {
      out[vid] = { name: '(error)', ...usage[vid] };
    }
  }

  return successResult(command.id, {
    data: { scope: scopeId, nodesScanned: scanned, distinctVariables: Object.keys(out).length, usage: out },
  });
}
