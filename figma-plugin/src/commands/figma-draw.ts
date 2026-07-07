// Figma Draw commands (Figma plugin API v1.123, Jan 2026).
// Text on a path, transform groups (linear/radial repeat), brush loading, variable-width strokes,
// and the async fill/stroke setters that support pattern and brush application.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Create text that follows a vector path.
export async function handleCreateTextPath(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string; // the VECTOR node to lay text along
    startSegment?: number;
    startPosition?: number;
    characters?: string;
    fontSize?: number;
  };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target vector node ID is required');
  if (typeof (figma as any).createTextPath !== 'function') {
    return errorResult(command.id, 'createTextPath is not available in this Figma client version (requires the Jan 2026 update).');
  }

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (node.type !== 'VECTOR') {
    return errorResult(command.id, 'createTextPath requires a VECTOR node to follow');
  }

  var textPath = (figma as any).createTextPath(
    node,
    payload.startSegment !== undefined ? payload.startSegment : 0,
    payload.startPosition !== undefined ? payload.startPosition : 0
  );

  if (payload.characters !== undefined) {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    textPath.characters = payload.characters;
  }
  if (payload.fontSize !== undefined) textPath.fontSize = payload.fontSize;

  return successResult(command.id, {
    data: { nodeId: textPath.id, type: textPath.type },
  });
}

// Create a transform group applying repeat modifiers (linear/radial) to nodes.
export async function handleTransformGroup(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeIds?: string[];
    parentId?: string;
    index?: number;
    modifiers?: any[]; // LinearRepeatModifier | RadialRepeatModifier
  };
  if (!payload.nodeIds || payload.nodeIds.length === 0) {
    return errorResult(command.id, 'nodeIds is required');
  }
  if (!payload.modifiers || payload.modifiers.length === 0) {
    return errorResult(command.id, 'modifiers is required (e.g. a LINEAR or RADIAL repeat modifier)');
  }
  if (typeof (figma as any).transformGroup !== 'function') {
    return errorResult(command.id, 'transformGroup is not available in this Figma client version.');
  }

  var nodes: SceneNode[] = [];
  for (var i = 0; i < payload.nodeIds.length; i++) {
    var n = await figma.getNodeByIdAsync(payload.nodeIds[i]);
    if (n) nodes.push(n as SceneNode);
  }
  if (nodes.length === 0) return errorResult(command.id, 'None of the given nodes were found');

  var parent: any = figma.currentPage;
  if (payload.parentId) {
    var p = await figma.getNodeByIdAsync(payload.parentId);
    if (p && 'children' in p) parent = p;
  } else {
    parent = nodes[0].parent || figma.currentPage;
  }

  var group = (figma as any).transformGroup(
    nodes,
    parent,
    payload.index !== undefined ? payload.index : parent.children.length,
    payload.modifiers
  );

  return successResult(command.id, { data: { nodeId: group.id, type: group.type } });
}

// Load brushes so they can be applied to strokes.
export async function handleLoadBrushes(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { brushType?: 'STRETCH' | 'SCATTER' };
  var brushType = payload.brushType || 'STRETCH';
  if (typeof (figma as any).loadBrushesAsync !== 'function') {
    return errorResult(command.id, 'loadBrushesAsync is not available in this Figma client version.');
  }
  await (figma as any).loadBrushesAsync(brushType);
  return successResult(command.id, { data: { brushType: brushType, loaded: true } });
}

// Async fill setter — supports paints that require loading (patterns, brushes). Pass raw Figma paints.
export async function handleSetFillsAsync(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; fills?: any[] };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!Array.isArray(payload.fills)) return errorResult(command.id, 'fills array is required (raw Paint objects)');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (typeof node.setFillsAsync !== 'function') {
    return errorResult(command.id, 'setFillsAsync is not available in this Figma client version.');
  }
  await node.setFillsAsync(payload.fills);
  return successResult(command.id, { data: { nodeId: node.id, fillCount: payload.fills.length } });
}

// Async stroke setter — supports brushes/patterns. Pass raw Figma paints.
export async function handleSetStrokesAsync(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; strokes?: any[] };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!Array.isArray(payload.strokes)) return errorResult(command.id, 'strokes array is required (raw Paint objects)');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (typeof node.setStrokesAsync !== 'function') {
    return errorResult(command.id, 'setStrokesAsync is not available in this Figma client version.');
  }
  await node.setStrokesAsync(payload.strokes);
  return successResult(command.id, { data: { nodeId: node.id, strokeCount: payload.strokes.length } });
}

// Set variable-width stroke profile on a node (Figma Draw). Pass-through properties object.
export async function handleSetVariableWidthStroke(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; properties?: any };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.properties) return errorResult(command.id, 'properties (variableWidthStrokeProperties) is required');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (!('variableWidthStrokeProperties' in node)) {
    return errorResult(command.id, 'Node does not support variable-width strokes (or this Figma client lacks Draw support).');
  }
  node.variableWidthStrokeProperties = payload.properties;
  return successResult(command.id, { data: { nodeId: node.id } });
}
