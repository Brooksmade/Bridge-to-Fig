import type { FigmaCommand, CommandResult, ModifyPayload } from './types';
import { successResult, errorResult } from './types';
import { applyProperties, applyChildLayoutProperties, serializeNode } from '../utils/node-factory';

export async function handleModify(command: FigmaCommand): Promise<CommandResult> {
  // Accept nodeId in payload as fallback for target (common convenience pattern)
  const rawPayload = command.payload as Record<string, any> | undefined;
  const targetId = command.target || rawPayload?.nodeId;

  if (!targetId) {
    return errorResult(command.id, 'No target node specified (use "target" field or "payload.nodeId")');
  }

  const node = await figma.getNodeByIdAsync(targetId);

  if (!node) {
    return errorResult(command.id, `Node not found: ${targetId}`);
  }

  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, 'Cannot modify document or page nodes');
  }

  const payload = command.payload as ModifyPayload;
  const properties = (payload && payload.properties) || {};

  try {
    await applyProperties(node as SceneNode, properties);
    applyChildLayoutProperties(node as SceneNode, properties);

    return successResult(command.id, {
      nodeId: node.id,
      data: serializeNode(node as SceneNode),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Modify multiple nodes with the same properties
export async function handleBatchModify(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    targets: string[];
    properties: ModifyPayload['properties'];
  };

  if (!payload.targets || !Array.isArray(payload.targets)) {
    return errorResult(command.id, 'Batch modify requires targets array');
  }

  const modifiedIds: string[] = [];
  const errors: string[] = [];

  for (const targetId of payload.targets) {
    const node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      errors.push(`Node not found: ${targetId}`);
      continue;
    }

    if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
      errors.push(`Cannot modify: ${targetId} (${node.type})`);
      continue;
    }

    try {
      await applyProperties(node as SceneNode, payload.properties || {});
      applyChildLayoutProperties(node as SceneNode, payload.properties || {});
      modifiedIds.push(node.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${targetId}: ${message}`);
    }
  }

  if (errors.length > 0 && modifiedIds.length === 0) {
    return errorResult(command.id, errors.join('; '));
  }

  return successResult(command.id, {
    nodeIds: modifiedIds,
    data: {
      modified: modifiedIds.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

// Move a node to a new position
export async function handleMove(command: FigmaCommand): Promise<CommandResult> {
  const targetId = command.target;
  const payload = command.payload as {
    x?: number;
    y?: number;
    deltaX?: number;
    deltaY?: number;
  };

  if (!targetId) {
    return errorResult(command.id, 'No target node specified');
  }

  const node = await figma.getNodeByIdAsync(targetId);

  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, `Invalid node: ${targetId}`);
  }

  const sceneNode = node as SceneNode;

  // Absolute positioning
  if (payload.x !== undefined) sceneNode.x = payload.x;
  if (payload.y !== undefined) sceneNode.y = payload.y;

  // Relative positioning
  if (payload.deltaX !== undefined) sceneNode.x += payload.deltaX;
  if (payload.deltaY !== undefined) sceneNode.y += payload.deltaY;

  return successResult(command.id, {
    nodeId: node.id,
    data: { x: sceneNode.x, y: sceneNode.y },
  });
}

// Resize a node
export async function handleResize(command: FigmaCommand): Promise<CommandResult> {
  const targetId = command.target;
  const payload = command.payload as {
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
  };

  if (!targetId) {
    return errorResult(command.id, 'No target node specified');
  }

  const node = await figma.getNodeByIdAsync(targetId);

  if (!node || !('resize' in node)) {
    return errorResult(command.id, `Cannot resize node: ${targetId}`);
  }

  const resizable = node as FrameNode | RectangleNode;

  let newWidth = resizable.width;
  let newHeight = resizable.height;

  if (payload.width !== undefined) newWidth = payload.width;
  if (payload.height !== undefined) newHeight = payload.height;
  if (payload.scaleX !== undefined) newWidth = resizable.width * payload.scaleX;
  if (payload.scaleY !== undefined) newHeight = resizable.height * payload.scaleY;

  resizable.resize(newWidth, newHeight);

  return successResult(command.id, {
    nodeId: node.id,
    data: { width: newWidth, height: newHeight },
  });
}

// Reparent a node (move to different parent)
export async function handleReparent(command: FigmaCommand): Promise<CommandResult> {
  const targetId = command.target;
  const payload = command.payload as {
    newParent: string;
    index?: number;
  };

  if (!targetId) {
    return errorResult(command.id, 'No target node specified');
  }

  if (!payload.newParent) {
    return errorResult(command.id, 'No new parent specified');
  }

  const node = await figma.getNodeByIdAsync(targetId);
  const newParent = await figma.getNodeByIdAsync(payload.newParent);

  if (!node || node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, `Invalid node: ${targetId}`);
  }

  if (!newParent || !('children' in newParent)) {
    return errorResult(command.id, `Invalid parent: ${payload.newParent}`);
  }

  const parent = newParent as FrameNode;
  const sceneNode = node as SceneNode;

  if (payload.index !== undefined) {
    parent.insertChild(payload.index, sceneNode);
  } else {
    parent.appendChild(sceneNode);
  }

  return successResult(command.id, {
    nodeId: node.id,
    data: { parent: parent.id, index: parent.children.indexOf(sceneNode) },
  });
}
