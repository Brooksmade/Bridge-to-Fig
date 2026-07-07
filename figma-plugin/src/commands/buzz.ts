// Figma Buzz asset commands (Figma plugin API v1.119, Oct 2025) + canvas coordinate moves.
// figma.buzz is only present in the Buzz editor. moveNodesToCoord works in canvas-grid editors
// (Buzz / Slides). All handlers guard for capability and return a clean error otherwise.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

function buzzApi(): any | null {
  return (figma as any).buzz || null;
}

async function requireNode(command: FigmaCommand): Promise<{ node: any } | { error: string }> {
  var payload = command.payload as { nodeId?: string };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return { error: 'Target node ID is required' };
  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return { error: 'Node not found' };
  return { node: node };
}

// Read the Buzz asset type for a node.
export async function handleGetBuzzAssetType(command: FigmaCommand): Promise<CommandResult> {
  var buzz = buzzApi();
  if (!buzz) return errorResult(command.id, 'figma.buzz is only available in the Figma Buzz editor.');
  var r = await requireNode(command);
  if ('error' in r) return errorResult(command.id, r.error);
  var assetType = buzz.getBuzzAssetTypeForNode(r.node);
  return successResult(command.id, { data: { nodeId: r.node.id, assetType: assetType } });
}

// Set the Buzz asset type for a node.
export async function handleSetBuzzAssetType(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { assetType?: string };
  var buzz = buzzApi();
  if (!buzz) return errorResult(command.id, 'figma.buzz is only available in the Figma Buzz editor.');
  if (!payload.assetType) return errorResult(command.id, 'assetType is required');
  var r = await requireNode(command);
  if ('error' in r) return errorResult(command.id, r.error);
  buzz.setBuzzAssetTypeForNode(r.node, payload.assetType);
  return successResult(command.id, { data: { nodeId: r.node.id, assetType: payload.assetType } });
}

// Smart-resize a Buzz node (re-lays-out content for the new dimensions).
export async function handleBuzzSmartResize(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { width?: number; height?: number };
  var buzz = buzzApi();
  if (!buzz) return errorResult(command.id, 'figma.buzz is only available in the Figma Buzz editor.');
  if (payload.width === undefined || payload.height === undefined) {
    return errorResult(command.id, 'width and height are required');
  }
  var r = await requireNode(command);
  if ('error' in r) return errorResult(command.id, r.error);
  buzz.smartResize(r.node, payload.width, payload.height);
  return successResult(command.id, {
    data: { nodeId: r.node.id, width: payload.width, height: payload.height },
  });
}

// Create a Buzz frame at an optional canvas grid coordinate.
export async function handleCreateBuzzFrame(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { rowIndex?: number; columnIndex?: number };
  var buzz = buzzApi();
  if (!buzz) return errorResult(command.id, 'figma.buzz is only available in the Figma Buzz editor.');
  var frame = buzz.createFrame(payload.rowIndex, payload.columnIndex);
  return successResult(command.id, { data: { nodeId: frame.id, type: frame.type } });
}

// Read the text and media content fields of a Buzz node.
export async function handleGetBuzzContent(command: FigmaCommand): Promise<CommandResult> {
  var buzz = buzzApi();
  if (!buzz) return errorResult(command.id, 'figma.buzz is only available in the Figma Buzz editor.');
  var r = await requireNode(command);
  if ('error' in r) return errorResult(command.id, r.error);
  return successResult(command.id, {
    data: {
      nodeId: r.node.id,
      textContent: buzz.getTextContent(r.node),
      mediaContent: buzz.getMediaContent(r.node),
    },
  });
}

// Move nodes to a canvas grid coordinate (Buzz / Slides canvas editors).
export async function handleMoveNodesToCoord(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeIds?: string[]; rowIndex?: number; columnIndex?: number };
  if (!payload.nodeIds || payload.nodeIds.length === 0) {
    return errorResult(command.id, 'nodeIds is required');
  }
  if (typeof (figma as any).moveNodesToCoord !== 'function') {
    return errorResult(command.id, 'moveNodesToCoord is only available in canvas-grid editors (Buzz / Slides).');
  }
  (figma as any).moveNodesToCoord(payload.nodeIds, payload.rowIndex, payload.columnIndex);
  return successResult(command.id, {
    data: { nodeIds: payload.nodeIds, rowIndex: payload.rowIndex, columnIndex: payload.columnIndex },
  });
}
