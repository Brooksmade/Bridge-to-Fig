// replaceComponent — the one-round-trip answer to "replace/swap components".
//
// Previously this task required the agent to orchestrate: look up keys (trial-and-error between
// component keys, set keys, and node ids) → import → find instances → swapInstance per instance.
// This command does the whole pipeline inside the plugin in ONE call:
//
//   { "type": "replaceComponent", "payload": {
//       "from": { "key" | "nodeId" | "name", "variantProperties"? , "wholeSet"? },
//       "to":   { "key" | "nodeId" | "name", "variantProperties"? },
//       "scope": "file" | "page" | "selection" | { "nodeId": "..." },   // default "file"
//       "dryRun": false                                                  // true = report only
//   }}
//
// Overrides (text, fills, nested props) are preserved by Figma's own swapComponent semantics.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { resolveComponent, collectInstances } from '../utils/component-resolver';
import type { ComponentRef } from '../utils/component-resolver';

interface ReplaceScope {
  nodeId?: string;
}

interface ReplacePayload {
  from?: ComponentRef & { wholeSet?: boolean };
  to?: ComponentRef;
  scope?: 'file' | 'page' | 'selection' | ReplaceScope;
  dryRun?: boolean;
}

async function isInScope(
  instance: InstanceNode,
  scope: 'file' | 'page' | 'selection' | ReplaceScope
): Promise<boolean> {
  if (scope === 'file') return true;

  if (scope === 'page') {
    var p: BaseNode | null = instance;
    while (p && p.type !== 'PAGE') p = p.parent;
    return !!p && p.id === figma.currentPage.id;
  }

  if (scope === 'selection') {
    var selection = figma.currentPage.selection;
    var q: BaseNode | null = instance;
    while (q) {
      for (var i = 0; i < selection.length; i++) {
        if (selection[i].id === q.id) return true;
      }
      q = q.parent;
    }
    return false;
  }

  // { nodeId } — instance must be inside that node
  var containerId = (scope as ReplaceScope).nodeId;
  if (!containerId) return true;
  var r: BaseNode | null = instance;
  while (r) {
    if (r.id === containerId) return true;
    r = r.parent;
  }
  return false;
}

export async function handleReplaceComponent(command: FigmaCommand): Promise<CommandResult> {
  var payload = (command.payload || {}) as ReplacePayload;

  if (!payload.from || !payload.to) {
    return errorResult(
      command.id,
      'replaceComponent requires "from" and "to", each {key | nodeId | name, variantProperties?}. ' +
        'Example: {"from":{"name":"Button/Old"},"to":{"key":"abc123"},"scope":"page"}'
    );
  }

  var scope = payload.scope || 'file';

  // Resolve both ends (forgiving identifiers, guiding errors).
  var fromRes = await resolveComponent(payload.from);
  if ('error' in fromRes) return errorResult(command.id, 'Could not resolve "from": ' + fromRes.error);

  var toRes = await resolveComponent(payload.to);
  if ('error' in toRes) return errorResult(command.id, 'Could not resolve "to": ' + toRes.error);

  if (fromRes.component.id === toRes.component.id) {
    return errorResult(command.id, '"from" and "to" resolved to the same component (' + fromRes.component.id + ')');
  }

  // Find all instances via the native fast path. wholeSet defaults to true when "from" was a set.
  var wholeSet = payload.from.wholeSet !== undefined ? payload.from.wholeSet : !!fromRes.set;
  var instances = await collectInstances(fromRes, wholeSet);

  // Scope filter
  var targets: InstanceNode[] = [];
  for (var i = 0; i < instances.length; i++) {
    if (await isInScope(instances[i], scope)) targets.push(instances[i]);
  }

  var report = {
    from: { id: fromRes.component.id, name: fromRes.component.name, via: fromRes.via, wholeSet: wholeSet },
    to: { id: toRes.component.id, name: toRes.component.name, via: toRes.via },
    scope: scope,
    instancesFound: instances.length,
    instancesInScope: targets.length,
  };

  if (payload.dryRun) {
    return successResult(command.id, {
      data: {
        ...report,
        dryRun: true,
        instances: targets.map(t => ({ id: t.id, name: t.name })),
      },
    });
  }

  // Swap them all — overrides are preserved by swapComponent's own matching.
  var swapped: Array<{ id: string; name: string }> = [];
  var failed: Array<{ id: string; error: string }> = [];
  for (var j = 0; j < targets.length; j++) {
    try {
      targets[j].swapComponent(toRes.component);
      swapped.push({ id: targets[j].id, name: targets[j].name });
    } catch (e) {
      failed.push({ id: targets[j].id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return successResult(command.id, {
    data: {
      ...report,
      swapped: swapped.length,
      failed: failed.length,
      swappedInstances: swapped,
      failedInstances: failed,
    },
  });
}
