// getInstanceMasters — bulk inventory of which component masters are in use within a scope.
//
// Replaces the per-instance getMainComponent loop (thousands of round trips) with ONE command:
// walks the scope once (native findAllWithCriteria + skipInvisibleInstanceChildren), resolves each
// instance's main component in-plugin, and returns an aggregated histogram:
//
//   { "type": "getInstanceMasters", "payload": { "nodeId": "<page or container>",
//       "topLevelOnly": true } }
//   → { masters: { "<masterId>": { name, key, remote, count, parentSetId?, parentSetName?,
//                                   instanceIds: [...] } }, totalInstances, truncated }
//
// topLevelOnly (default true) skips instances nested inside other instances — those swap with
// their host and are not independently migratable.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

interface MasterEntry {
  name: string;
  key: string;
  remote: boolean;
  count: number;
  parentSetId?: string;
  parentSetName?: string;
  instanceIds: string[];
}

export async function handleGetInstanceMasters(command: FigmaCommand): Promise<CommandResult> {
  var payload = (command.payload || {}) as {
    nodeId?: string;
    topLevelOnly?: boolean;
    maxInstanceIdsPerMaster?: number;
  };
  var scopeId = payload.nodeId || command.target;
  if (!scopeId) return errorResult(command.id, 'nodeId (scope: page or container) is required');

  var scope = await figma.getNodeByIdAsync(scopeId);
  if (!scope) return errorResult(command.id, 'Node not found: ' + scopeId);
  if (scope.type === 'PAGE') {
    await (scope as PageNode).loadAsync();
  }
  if (!('findAllWithCriteria' in scope)) {
    return errorResult(command.id, 'Node cannot be searched: ' + scope.type);
  }

  var topLevelOnly = payload.topLevelOnly !== false;
  var maxIds = payload.maxInstanceIdsPerMaster !== undefined ? payload.maxInstanceIdsPerMaster : 500;

  var prevSkip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;
  var instances: InstanceNode[];
  try {
    instances = (scope as PageNode | FrameNode).findAllWithCriteria({ types: ['INSTANCE'] }) as InstanceNode[];
  } finally {
    figma.skipInvisibleInstanceChildren = prevSkip;
  }

  var masters: { [id: string]: MasterEntry } = {};
  var total = 0;

  for (var i = 0; i < instances.length; i++) {
    var inst = instances[i];
    // Nested-in-instance nodes have composite ids (contain ';') — skip when topLevelOnly.
    if (topLevelOnly && inst.id.indexOf(';') >= 0) continue;
    total++;

    var main: ComponentNode | null = null;
    try {
      main = await inst.getMainComponentAsync();
    } catch (e) {
      continue;
    }
    if (!main) continue;

    var entry = masters[main.id];
    if (!entry) {
      entry = {
        name: main.name,
        key: main.key,
        remote: main.remote,
        count: 0,
        instanceIds: [],
      };
      var parent = main.parent;
      if (parent && parent.type === 'COMPONENT_SET') {
        entry.parentSetId = parent.id;
        entry.parentSetName = parent.name;
      }
      masters[main.id] = entry;
    }
    entry.count++;
    if (entry.instanceIds.length < maxIds) entry.instanceIds.push(inst.id);

    // Yield periodically so a huge page doesn't freeze the plugin thread.
    if (total % 500 === 0) {
      await new Promise<void>(function (resolve) { setTimeout(resolve, 1); });
    }
  }

  return successResult(command.id, {
    data: {
      scope: scopeId,
      totalInstances: total,
      distinctMasters: Object.keys(masters).length,
      masters: masters,
    },
  });
}
