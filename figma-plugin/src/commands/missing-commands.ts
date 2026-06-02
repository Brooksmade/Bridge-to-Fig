// Handlers for commands that were documented but never implemented.
// Grouped: variables, text, find/bounds, components, plugin-data, images, export, annotations.
import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
async function loadFontsForText(node: any): Promise<void> {
  var len = node.characters ? node.characters.length : 0;
  if (len === 0) {
    if (node.fontName && node.fontName !== figma.mixed) {
      await figma.loadFontAsync(node.fontName);
    }
    return;
  }
  var fonts = node.getRangeAllFontNames(0, len);
  for (var i = 0; i < fonts.length; i++) {
    await figma.loadFontAsync(fonts[i]);
  }
}

// Collect every {field, variableId} bound on a node (flattening array fields).
function nodeBindings(node: any): Array<{ field: string; variableId: string }> {
  var out: Array<{ field: string; variableId: string }> = [];
  var bound = node && node.boundVariables;
  if (!bound) return out;
  var fields = Object.keys(bound);
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    var v = bound[f];
    if (!v) continue;
    if (Array.isArray(v)) {
      for (var j = 0; j < v.length; j++) {
        if (v[j] && v[j].id) out.push({ field: f + '[' + j + ']', variableId: v[j].id });
      }
    } else if (v.id) {
      out.push({ field: f, variableId: v.id });
    }
  }
  return out;
}

function nodeSummary(node: any) {
  return { id: node.id, name: node.name, type: node.type };
}

// ===========================================================================
// VARIABLES
// ===========================================================================

// resolveVariableValue {variableId, modeId} -> resolved value (following aliases)
export async function handleResolveVariableValue(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { variableId?: string; modeId?: string };
  if (!p.variableId) return errorResult(command.id, 'variableId is required');
  try {
    var chain: Array<{ variableId: string; modeId: string }> = [];
    var currentId: string | null = p.variableId;
    var modeId = p.modeId || '';
    var value: any = null;
    var guard = 0;
    while (currentId && guard < 50) {
      guard++;
      var variable: any = await figma.variables.getVariableByIdAsync(currentId);
      if (!variable) return errorResult(command.id, 'Variable not found: ' + currentId);
      var byMode = variable.valuesByMode || {};
      var useMode = modeId && Object.prototype.hasOwnProperty.call(byMode, modeId) ? modeId : Object.keys(byMode)[0];
      chain.push({ variableId: currentId, modeId: useMode });
      value = byMode[useMode];
      if (value && value.type === 'VARIABLE_ALIAS' && value.id) {
        currentId = value.id;
        continue;
      }
      break;
    }
    return successResult(command.id, { data: { variableId: p.variableId, value: value, aliasChain: chain } });
  } catch (err) {
    return errorResult(command.id, 'Failed to resolve variable value: ' + String(err));
  }
}

// addCollectionMode {collectionId, modeName} -> new modeId
export async function handleAddCollectionMode(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { collectionId?: string; modeName?: string };
  if (!p.collectionId || !p.modeName) return errorResult(command.id, 'collectionId and modeName are required');
  try {
    var col: any = await figma.variables.getVariableCollectionByIdAsync(p.collectionId);
    if (!col) return errorResult(command.id, 'Collection not found: ' + p.collectionId);
    var modeId = col.addMode(p.modeName);
    return successResult(command.id, { data: { collectionId: col.id, modeId: modeId, modeName: p.modeName, modes: col.modes } });
  } catch (err) {
    return errorResult(command.id, 'Failed to add mode (Figma caps modes per plan): ' + String(err));
  }
}

// removeCollectionMode {collectionId, modeId}
export async function handleRemoveCollectionMode(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { collectionId?: string; modeId?: string };
  if (!p.collectionId || !p.modeId) return errorResult(command.id, 'collectionId and modeId are required');
  try {
    var col: any = await figma.variables.getVariableCollectionByIdAsync(p.collectionId);
    if (!col) return errorResult(command.id, 'Collection not found: ' + p.collectionId);
    col.removeMode(p.modeId);
    return successResult(command.id, { data: { collectionId: col.id, removedModeId: p.modeId, modes: col.modes } });
  } catch (err) {
    return errorResult(command.id, 'Failed to remove mode: ' + String(err));
  }
}

// cloneVariableCollection {collectionId, newName} -> deep copy (values copied as-is; aliases keep original targets)
export async function handleCloneVariableCollection(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { collectionId?: string; newName?: string };
  if (!p.collectionId) return errorResult(command.id, 'collectionId is required');
  try {
    var src: any = await figma.variables.getVariableCollectionByIdAsync(p.collectionId);
    if (!src) return errorResult(command.id, 'Collection not found: ' + p.collectionId);
    var newName = p.newName || src.name + ' Copy';
    var dst: any = figma.variables.createVariableCollection(newName);

    // map source modes -> destination modes
    var modeMap: Record<string, string> = {};
    dst.renameMode(dst.modes[0].modeId, src.modes[0].name);
    modeMap[src.modes[0].modeId] = dst.modes[0].modeId;
    for (var m = 1; m < src.modes.length; m++) {
      modeMap[src.modes[m].modeId] = dst.addMode(src.modes[m].name);
    }

    var copied = 0;
    for (var v = 0; v < src.variableIds.length; v++) {
      var sv: any = await figma.variables.getVariableByIdAsync(src.variableIds[v]);
      if (!sv) continue;
      var nv: any = (figma.variables as any).createVariable(sv.name, dst, sv.resolvedType);
      for (var sm = 0; sm < src.modes.length; sm++) {
        var smId = src.modes[sm].modeId;
        if (Object.prototype.hasOwnProperty.call(sv.valuesByMode, smId)) {
          nv.setValueForMode(modeMap[smId], sv.valuesByMode[smId]);
        }
      }
      try { nv.scopes = sv.scopes; } catch (e) {}
      try { if (sv.description) nv.description = sv.description; } catch (e) {}
      copied++;
    }
    return successResult(command.id, { data: { collectionId: dst.id, name: dst.name, variablesCopied: copied, note: 'Alias values still reference the original collection variables.' } });
  } catch (err) {
    return errorResult(command.id, 'Failed to clone collection: ' + String(err));
  }
}

// getVariableConsumers {variableId} -> nodes on the current page bound to it
export async function handleGetVariableConsumers(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { variableId?: string };
  if (!p.variableId) return errorResult(command.id, 'variableId is required');
  try {
    var consumers: Array<{ nodeId: string; nodeName: string; nodeType: string; field: string }> = [];
    var all = figma.currentPage.findAll(function () { return true; });
    for (var i = 0; i < all.length; i++) {
      var bindings = nodeBindings(all[i] as any);
      for (var b = 0; b < bindings.length; b++) {
        if (bindings[b].variableId === p.variableId) {
          consumers.push({ nodeId: all[i].id, nodeName: all[i].name, nodeType: all[i].type, field: bindings[b].field });
        }
      }
    }
    return successResult(command.id, { data: { variableId: p.variableId, scope: 'currentPage', count: consumers.length, consumers: consumers } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get variable consumers: ' + String(err));
  }
}

// ===========================================================================
// TEXT
// ===========================================================================

// getTextSegments {nodeId} -> styled segments
export async function handleGetTextSegments(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'TEXT') return errorResult(command.id, 'Node is not a TEXT node');
    var fields = ['fontName', 'fontSize', 'fontWeight', 'textDecoration', 'textCase', 'lineHeight', 'letterSpacing', 'fills', 'textStyleId', 'fillStyleId', 'listOptions', 'hyperlink'];
    var segments = node.getStyledTextSegments(fields);
    return successResult(command.id, { data: { nodeId: node.id, segments: segments } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get text segments: ' + String(err));
  }
}

// setTextCase {nodeId, textCase}
export async function handleSetTextCase(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; textCase?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (!p.textCase) return errorResult(command.id, 'textCase is required (ORIGINAL|UPPER|LOWER|TITLE)');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'TEXT') return errorResult(command.id, 'Node is not a TEXT node');
    await loadFontsForText(node);
    var len = node.characters.length;
    if (len > 0) {
      node.setRangeTextCase(0, len, p.textCase);
    } else {
      node.textCase = p.textCase;
    }
    return successResult(command.id, { data: { nodeId: node.id, textCase: p.textCase } });
  } catch (err) {
    return errorResult(command.id, 'Failed to set text case: ' + String(err));
  }
}

// insertCharacters {nodeId, position, characters}
export async function handleInsertCharacters(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; position?: number; characters?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (typeof p.characters !== 'string') return errorResult(command.id, 'characters is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'TEXT') return errorResult(command.id, 'Node is not a TEXT node');
    await loadFontsForText(node);
    var pos = typeof p.position === 'number' ? p.position : node.characters.length;
    node.insertCharacters(pos, p.characters);
    return successResult(command.id, { data: { nodeId: node.id, position: pos, inserted: p.characters.length, characters: node.characters } });
  } catch (err) {
    return errorResult(command.id, 'Failed to insert characters: ' + String(err));
  }
}

// deleteCharacters {nodeId, start, end}
export async function handleDeleteCharacters(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; start?: number; end?: number };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (typeof p.start !== 'number' || typeof p.end !== 'number') return errorResult(command.id, 'start and end are required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'TEXT') return errorResult(command.id, 'Node is not a TEXT node');
    await loadFontsForText(node);
    node.deleteCharacters(p.start, p.end);
    return successResult(command.id, { data: { nodeId: node.id, deleted: p.end - p.start, characters: node.characters } });
  } catch (err) {
    return errorResult(command.id, 'Failed to delete characters: ' + String(err));
  }
}

// ===========================================================================
// FIND / BOUNDS
// ===========================================================================

function rootsForScope(scope?: string): BaseNode[] {
  if (scope === 'selection') return figma.currentPage.selection.slice();
  if (scope === 'file') return figma.root.children.slice();
  return [figma.currentPage];
}

async function ensurePagesLoaded(scope?: string): Promise<void> {
  if (scope === 'file' && (figma as any).loadAllPagesAsync) {
    try { await (figma as any).loadAllPagesAsync(); } catch (e) {}
  }
}

function findAllAcross(roots: BaseNode[], predicate: (n: BaseNode) => boolean): BaseNode[] {
  var results: BaseNode[] = [];
  for (var i = 0; i < roots.length; i++) {
    var r: any = roots[i];
    if (predicate(r)) results.push(r);
    if (typeof r.findAll === 'function') {
      var found = r.findAll(predicate);
      for (var j = 0; j < found.length; j++) results.push(found[j]);
    }
  }
  return results;
}

// findByName {name, scope}
export async function handleFindByName(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { name?: string; scope?: string };
  if (!p.name) return errorResult(command.id, 'name is required');
  try {
    await ensurePagesLoaded(p.scope);
    var matches = findAllAcross(rootsForScope(p.scope), function (n) { return n.name === p.name; });
    return successResult(command.id, { data: { count: matches.length, nodes: matches.map(nodeSummary) } });
  } catch (err) {
    return errorResult(command.id, 'Failed to find by name: ' + String(err));
  }
}

// findByRegex {pattern, nodeType?}
export async function handleFindByRegex(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { pattern?: string; nodeType?: string; scope?: string };
  if (!p.pattern) return errorResult(command.id, 'pattern is required');
  try {
    var re = new RegExp(p.pattern);
    await ensurePagesLoaded(p.scope);
    var matches = findAllAcross(rootsForScope(p.scope || 'page'), function (n) {
      if (p.nodeType && n.type !== p.nodeType) return false;
      return re.test(n.name);
    });
    return successResult(command.id, { data: { count: matches.length, nodes: matches.map(nodeSummary) } });
  } catch (err) {
    return errorResult(command.id, 'Failed to find by regex: ' + String(err));
  }
}

// findWithCriteria {types?, hasAutoLayout?, minWidth?}
export async function handleFindWithCriteria(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { types?: string[]; hasAutoLayout?: boolean; minWidth?: number; minHeight?: number; scope?: string };
  try {
    await ensurePagesLoaded(p.scope);
    var matches = findAllAcross(rootsForScope(p.scope || 'page'), function (n) {
      var node: any = n;
      if (p.types && p.types.length && p.types.indexOf(node.type) === -1) return false;
      if (typeof p.hasAutoLayout === 'boolean') {
        var hasAL = 'layoutMode' in node && node.layoutMode && node.layoutMode !== 'NONE';
        if (p.hasAutoLayout !== !!hasAL) return false;
      }
      if (typeof p.minWidth === 'number' && (!('width' in node) || node.width < p.minWidth)) return false;
      if (typeof p.minHeight === 'number' && (!('height' in node) || node.height < p.minHeight)) return false;
      return true;
    });
    return successResult(command.id, { data: { count: matches.length, nodes: matches.map(nodeSummary) } });
  } catch (err) {
    return errorResult(command.id, 'Failed to find with criteria: ' + String(err));
  }
}

// getAbsoluteBounds {nodeId}
export async function handleGetAbsoluteBounds(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    return successResult(command.id, { data: { nodeId: node.id, absoluteBoundingBox: node.absoluteBoundingBox || null, absoluteRenderBounds: node.absoluteRenderBounds || null } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get absolute bounds: ' + String(err));
  }
}

// getRelativeBounds {nodeId}
export async function handleGetRelativeBounds(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    var parent = node.parent;
    return successResult(command.id, {
      data: {
        nodeId: node.id,
        x: node.x, y: node.y,
        width: node.width, height: node.height,
        parentId: parent ? parent.id : null,
        parentName: parent ? parent.name : null,
      },
    });
  } catch (err) {
    return errorResult(command.id, 'Failed to get relative bounds: ' + String(err));
  }
}

// getAutoLayoutProperties {nodeId}
export async function handleGetAutoLayoutProperties(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (!('layoutMode' in node)) return errorResult(command.id, 'Node does not support auto layout');
    return successResult(command.id, {
      data: {
        nodeId: node.id,
        layoutMode: node.layoutMode,
        layoutWrap: node.layoutWrap,
        primaryAxisSizingMode: node.primaryAxisSizingMode,
        counterAxisSizingMode: node.counterAxisSizingMode,
        primaryAxisAlignItems: node.primaryAxisAlignItems,
        counterAxisAlignItems: node.counterAxisAlignItems,
        paddingLeft: node.paddingLeft, paddingRight: node.paddingRight,
        paddingTop: node.paddingTop, paddingBottom: node.paddingBottom,
        itemSpacing: node.itemSpacing,
        counterAxisSpacing: node.counterAxisSpacing,
        layoutPositioning: node.layoutPositioning,
      },
    });
  } catch (err) {
    return errorResult(command.id, 'Failed to get auto layout properties: ' + String(err));
  }
}

// ===========================================================================
// COMPONENTS
// ===========================================================================

// swapComponent {instanceId, newComponentKey}
export async function handleSwapComponent(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { instanceId?: string; newComponentKey?: string };
  var id = p.instanceId || command.target;
  if (!id) return errorResult(command.id, 'instanceId is required');
  if (!p.newComponentKey) return errorResult(command.id, 'newComponentKey is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'INSTANCE') return errorResult(command.id, 'Node is not an INSTANCE');
    var comp: any = await figma.importComponentByKeyAsync(p.newComponentKey);
    if (!comp) return errorResult(command.id, 'Component not found for key: ' + p.newComponentKey);
    node.swapComponent(comp);
    return successResult(command.id, { data: { instanceId: node.id, newComponentKey: p.newComponentKey, mainComponentId: comp.id } });
  } catch (err) {
    return errorResult(command.id, 'Failed to swap component: ' + String(err));
  }
}

// addComponentProperty {nodeId, name, type, defaultValue}
export async function handleAddComponentProperty(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; name?: string; type?: string; defaultValue?: any };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (!p.name || !p.type) return errorResult(command.id, 'name and type are required (BOOLEAN|TEXT|INSTANCE_SWAP|VARIANT)');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return errorResult(command.id, 'Node must be a COMPONENT or COMPONENT_SET');
    var propId = node.addComponentProperty(p.name, p.type, p.defaultValue);
    return successResult(command.id, { data: { nodeId: node.id, propertyId: propId, definitions: node.componentPropertyDefinitions } });
  } catch (err) {
    return errorResult(command.id, 'Failed to add component property: ' + String(err));
  }
}

// deleteComponentProperty {nodeId, propertyName}
export async function handleDeleteComponentProperty(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; propertyName?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (!p.propertyName) return errorResult(command.id, 'propertyName is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return errorResult(command.id, 'Node must be a COMPONENT or COMPONENT_SET');
    node.deleteComponentProperty(p.propertyName);
    return successResult(command.id, { data: { nodeId: node.id, deleted: p.propertyName, definitions: node.componentPropertyDefinitions } });
  } catch (err) {
    return errorResult(command.id, 'Failed to delete component property: ' + String(err));
  }
}

// ===========================================================================
// PLUGIN DATA
// ===========================================================================

// getDocumentPluginData {key}
export async function handleGetDocumentPluginData(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { key?: string };
  if (!p.key) return errorResult(command.id, 'key is required');
  try {
    var value = figma.root.getPluginData(p.key);
    return successResult(command.id, { data: { key: p.key, value: value, keys: figma.root.getPluginDataKeys() } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get document plugin data: ' + String(err));
  }
}

// setDocumentPluginData {key, value}
export async function handleSetDocumentPluginData(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { key?: string; value?: string };
  if (!p.key) return errorResult(command.id, 'key is required');
  try {
    figma.root.setPluginData(p.key, p.value == null ? '' : String(p.value));
    return successResult(command.id, { data: { key: p.key, value: figma.root.getPluginData(p.key) } });
  } catch (err) {
    return errorResult(command.id, 'Failed to set document plugin data: ' + String(err));
  }
}

// deletePluginData {nodeId, key}
export async function handleDeletePluginData(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; key?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (!p.key) return errorResult(command.id, 'key is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    node.setPluginData(p.key, ''); // empty string removes the key in Figma
    return successResult(command.id, { data: { nodeId: node.id, key: p.key, remainingKeys: node.getPluginDataKeys() } });
  } catch (err) {
    return errorResult(command.id, 'Failed to delete plugin data: ' + String(err));
  }
}

// ===========================================================================
// IMAGES
// ===========================================================================

// createImageFromBytes {bytes (base64), x?, y?}
export async function handleCreateImageFromBytes(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { bytes?: string; base64?: string; x?: number; y?: number };
  var b64 = p.bytes || p.base64;
  if (!b64) return errorResult(command.id, 'bytes (base64) is required');
  try {
    var image = figma.createImage(figma.base64Decode(b64));
    var size = await image.getSizeAsync();
    var rect = figma.createRectangle();
    rect.x = typeof p.x === 'number' ? p.x : 0;
    rect.y = typeof p.y === 'number' ? p.y : 0;
    rect.resize(size.width, size.height);
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    figma.currentPage.appendChild(rect);
    return successResult(command.id, { data: { nodeId: rect.id, imageHash: image.hash, width: size.width, height: size.height } });
  } catch (err) {
    return errorResult(command.id, 'Failed to create image from bytes: ' + String(err));
  }
}

// getImageHash {nodeId, fillIndex?}
export async function handleGetImageHash(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; fillIndex?: number };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    var fills = node.fills;
    if (!fills || fills === figma.mixed || !fills.length) return errorResult(command.id, 'Node has no fills');
    var idx = typeof p.fillIndex === 'number' ? p.fillIndex : 0;
    var fill = fills[idx];
    if (!fill || fill.type !== 'IMAGE') return errorResult(command.id, 'Fill at index ' + idx + ' is not an IMAGE');
    return successResult(command.id, { data: { nodeId: node.id, fillIndex: idx, imageHash: fill.imageHash, scaleMode: fill.scaleMode } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get image hash: ' + String(err));
  }
}

// setImageHash {nodeId, hash, fillIndex?}
export async function handleSetImageHash(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string; hash?: string; fillIndex?: number; scaleMode?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  if (!p.hash) return errorResult(command.id, 'hash is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (!('fills' in node)) return errorResult(command.id, 'Node does not support fills');
    var fills = node.fills && node.fills !== figma.mixed ? node.fills.slice() : [];
    var imagePaint: any = { type: 'IMAGE', imageHash: p.hash, scaleMode: p.scaleMode || 'FILL' };
    var idx = typeof p.fillIndex === 'number' ? p.fillIndex : fills.length;
    fills[idx] = imagePaint;
    node.fills = fills;
    return successResult(command.id, { data: { nodeId: node.id, fillIndex: idx, imageHash: p.hash } });
  } catch (err) {
    return errorResult(command.id, 'Failed to set image hash: ' + String(err));
  }
}

// ===========================================================================
// EXPORT
// ===========================================================================

// exportSelection {format, scale?}
export async function handleExportSelection(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { format?: string; scale?: number };
  var format = (p.format || 'PNG').toUpperCase();
  try {
    var selection = figma.currentPage.selection;
    if (!selection.length) return errorResult(command.id, 'Nothing selected to export');
    var settings: any = { format: format };
    if (format === 'PNG' || format === 'JPG') {
      settings.constraint = { type: 'SCALE', value: typeof p.scale === 'number' ? p.scale : 1 };
    }
    var out: Array<{ nodeId: string; name: string; format: string; data: string }> = [];
    for (var i = 0; i < selection.length; i++) {
      var bytes = await (selection[i] as any).exportAsync(settings);
      out.push({ nodeId: selection[i].id, name: selection[i].name, format: format, data: figma.base64Encode(bytes) });
    }
    return successResult(command.id, { data: { format: format, count: out.length, exports: out } });
  } catch (err) {
    return errorResult(command.id, 'Failed to export selection: ' + String(err));
  }
}

// ===========================================================================
// ANNOTATIONS
// ===========================================================================

// getAnnotations {nodeId}
export async function handleGetAnnotations(command: FigmaCommand): Promise<CommandResult> {
  var p = (command.payload || {}) as { nodeId?: string };
  var id = p.nodeId || command.target;
  if (!id) return errorResult(command.id, 'nodeId is required');
  try {
    var node: any = await figma.getNodeByIdAsync(id);
    if (!node) return errorResult(command.id, 'Node not found: ' + id);
    if (!('annotations' in node)) return errorResult(command.id, 'Node does not support annotations');
    return successResult(command.id, { data: { nodeId: node.id, annotations: node.annotations || [] } });
  } catch (err) {
    return errorResult(command.id, 'Failed to get annotations: ' + String(err));
  }
}
