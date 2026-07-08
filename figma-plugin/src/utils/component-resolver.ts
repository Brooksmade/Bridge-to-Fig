// Shared component resolution.
//
// Historically swapComponent only accepted a component KEY and swapInstance only a node ID, and a
// component-SET key threw an unhelpful error — agents burned minutes discovering the right
// mechanism. This resolver accepts ANY identifier and returns a concrete ComponentNode:
//
//   { key }                 — component key OR component-set key (auto-detected, both tried)
//   { nodeId }              — COMPONENT or COMPONENT_SET node id
//   { name }                — exact (then case-insensitive) local component/set name
//   { variantProperties }   — when the identifier resolves to a set, picks the matching variant
//                             (otherwise the set's default variant)
//
// Every failure mode returns an instructive error saying what to try instead.

export interface ComponentRef {
  key?: string;
  nodeId?: string;
  name?: string;
  variantProperties?: { [prop: string]: string };
  /** Name resolution searches the CURRENT PAGE only by default — a whole-file sweep on a large
   *  file can block the plugin for a minute+. Set true to opt into searching all pages. */
  searchAllPages?: boolean;
}

export interface ResolvedComponent {
  component: ComponentNode;
  via: string; // how it was resolved, for the result report
  set?: ComponentSetNode; // present when resolution went through a set
}

function pickVariant(
  set: ComponentSetNode,
  variantProperties?: { [prop: string]: string }
): ComponentNode | { error: string } {
  var variants = set.children.filter(c => c.type === 'COMPONENT') as ComponentNode[];
  if (variants.length === 0) return { error: 'Component set "' + set.name + '" has no variants' };

  if (variantProperties && Object.keys(variantProperties).length > 0) {
    for (var i = 0; i < variants.length; i++) {
      var vp = (variants[i].variantProperties || {}) as { [k: string]: string };
      var all = true;
      for (var k in variantProperties) {
        if (String(vp[k]).toLowerCase() !== String(variantProperties[k]).toLowerCase()) {
          all = false;
          break;
        }
      }
      if (all) return variants[i];
    }
    var available = variants.slice(0, 10).map(v => JSON.stringify(v.variantProperties)).join(', ');
    return {
      error:
        'No variant of "' + set.name + '" matches ' + JSON.stringify(variantProperties) +
        '. Available variants: ' + available,
    };
  }

  // Default variant, falling back to the first
  var def = (set.defaultVariant as ComponentNode) || variants[0];
  return def;
}

/** Find local COMPONENT / COMPONENT_SET nodes by name.
 *  Current page ONLY by default — the all-pages sweep (loadAllPagesAsync + whole-document search)
 *  can block the plugin for a minute+ on large files, so it requires searchAllPages: true. */
async function findLocalComponentByName(
  name: string,
  searchAllPages: boolean
): Promise<Array<ComponentNode | ComponentSetNode>> {
  var lower = name.toLowerCase();

  function search(scope: PageNode | DocumentNode): Array<ComponentNode | ComponentSetNode> {
    // findAllWithCriteria is Figma's native fast path — do NOT use a JS-predicate findAll here.
    var candidates = scope.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }) as Array<
      ComponentNode | ComponentSetNode
    >;
    var exact = candidates.filter(c => c.name === name);
    if (exact.length > 0) return exact;
    return candidates.filter(c => c.name.toLowerCase() === lower);
  }

  var onPage = search(figma.currentPage);
  if (onPage.length > 0) return onPage;
  if (!searchAllPages) return [];

  await figma.loadAllPagesAsync();
  return search(figma.root);
}

export async function resolveComponent(ref: ComponentRef): Promise<ResolvedComponent | { error: string }> {
  if (!ref || (!ref.key && !ref.nodeId && !ref.name)) {
    return { error: 'Component reference requires one of: key, nodeId, or name' };
  }

  // --- by node id ---
  if (ref.nodeId) {
    var node = await figma.getNodeByIdAsync(ref.nodeId);
    if (!node) return { error: 'No node found with id ' + ref.nodeId };
    if (node.type === 'COMPONENT') {
      return { component: node as ComponentNode, via: 'nodeId' };
    }
    if (node.type === 'COMPONENT_SET') {
      var set = node as ComponentSetNode;
      var v = pickVariant(set, ref.variantProperties);
      if ('error' in v) return v;
      return { component: v, via: 'nodeId (set → variant "' + v.name + '")', set: set };
    }
    if (node.type === 'INSTANCE') {
      var main = await (node as InstanceNode).getMainComponentAsync();
      if (main) return { component: main, via: 'nodeId (instance → its main component)' };
      return { error: 'Node ' + ref.nodeId + ' is an INSTANCE with no resolvable main component' };
    }
    return {
      error:
        'Node ' + ref.nodeId + ' is a ' + node.type +
        ', not a COMPONENT/COMPONENT_SET. Pass a component node id, a key, or a name.',
    };
  }

  // --- by key: try component key, then component-set key ---
  if (ref.key) {
    var compErr = '';
    try {
      var comp = await figma.importComponentByKeyAsync(ref.key);
      if (comp) return { component: comp, via: 'key' };
    } catch (e) {
      compErr = e instanceof Error ? e.message : String(e);
    }
    try {
      var importedSet = await figma.importComponentSetByKeyAsync(ref.key);
      if (importedSet) {
        var pv = pickVariant(importedSet, ref.variantProperties);
        if ('error' in pv) return pv;
        return { component: pv, via: 'set key → variant "' + pv.name + '"', set: importedSet };
      }
    } catch (e2) {
      var setErr = e2 instanceof Error ? e2.message : String(e2);
      return {
        error:
          'Key "' + ref.key + '" is neither an importable component key (' + compErr +
          ') nor a component-set key (' + setErr +
          '). For a local (unpublished) component use nodeId or name instead of key.',
      };
    }
    return { error: 'Could not import any component for key "' + ref.key + '"' };
  }

  // --- by name (local components) ---
  var matches = await findLocalComponentByName(ref.name as string, !!ref.searchAllPages);
  if (matches.length === 0) {
    return {
      error:
        'No component or component set named "' + ref.name + '" on the CURRENT PAGE. ' +
        'Options: pass nodeId (from getComponents) or a library key; or retry with ' +
        'searchAllPages:true to sweep every page (slow on large files).',
    };
  }
  if (matches.length > 1) {
    var list = matches.slice(0, 10).map(m => m.type + ' "' + m.name + '" (' + m.id + ')').join('; ');
    return {
      error:
        matches.length + ' components match name "' + ref.name +
        '" — pass nodeId to disambiguate: ' + list,
    };
  }
  var found = matches[0];
  if (found.type === 'COMPONENT_SET') {
    var chosen = pickVariant(found as ComponentSetNode, ref.variantProperties);
    if ('error' in chosen) return chosen;
    return { component: chosen, via: 'name (set → variant "' + chosen.name + '")', set: found as ComponentSetNode };
  }
  return { component: found as ComponentNode, via: 'name' };
}

/** Collect all instances of a component — or of every variant in its set — using the native
 *  getInstancesAsync (fast; no tree walking). */
export async function collectInstances(
  resolved: ResolvedComponent,
  wholeSet: boolean
): Promise<InstanceNode[]> {
  if (wholeSet && resolved.set) {
    var out: InstanceNode[] = [];
    var variants = resolved.set.children.filter(c => c.type === 'COMPONENT') as ComponentNode[];
    for (var i = 0; i < variants.length; i++) {
      var ins = await variants[i].getInstancesAsync();
      for (var j = 0; j < ins.length; j++) out.push(ins[j]);
    }
    return out;
  }
  return resolved.component.getInstancesAsync();
}
