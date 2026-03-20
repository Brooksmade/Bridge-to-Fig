// Instance command handlers for editing component instances

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { serializeNode } from '../utils/node-factory';
import { parseColor } from '../utils/variable-factory';

// Payload interfaces
interface EditInstanceTextPayload {
  instanceId: string;
  textNodeName?: string; // Name of text node to edit (or uses first text node)
  textNodeId?: string; // Or direct ID of text node
  characters: string;
}

interface OverrideInstanceFillsPayload {
  instanceId: string;
  nodeNameOrId: string; // Name or ID of node within instance
  fills: Array<{
    type?: 'SOLID' | 'GRADIENT_LINEAR';
    color: string;
    opacity?: number;
  }>;
}

interface OverrideInstanceStrokesPayload {
  instanceId: string;
  nodeNameOrId: string;
  strokes: Array<{
    color: string;
    opacity?: number;
  }>;
  strokeWeight?: number;
}

interface OverrideInstanceEffectsPayload {
  instanceId: string;
  nodeNameOrId: string;
  effects: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    color?: string;
    offsetX?: number;
    offsetY?: number;
    radius: number;
    spread?: number;
  }>;
}

interface ResetOverridesPayload {
  instanceId: string;
  nodeNameOrId?: string; // Specific node, or all if not specified
}

interface SwapInstancePayload {
  instanceId: string;
  newComponentId: string;
}

interface DetachInstancePayload {
  instanceId: string;
}

// Helper to find a node within an instance by name or ID
async function findNodeInInstance(
  instance: InstanceNode,
  nameOrId: string
): Promise<SceneNode | null> {
  // Try by ID first
  if (nameOrId.includes(':')) {
    var nodeById = await figma.getNodeByIdAsync(nameOrId);
    if (nodeById && nodeById.type !== 'DOCUMENT' && nodeById.type !== 'PAGE') {
      return nodeById as SceneNode;
    }
  }

  // Search by name
  var found: SceneNode | null = null;

  function searchChildren(parent: BaseNode & ChildrenMixin): void {
    for (var i = 0; i < parent.children.length; i++) {
      var child = parent.children[i];
      if (child.name === nameOrId) {
        found = child;
        return;
      }
      if ('children' in child) {
        searchChildren(child as BaseNode & ChildrenMixin);
        if (found) return;
      }
    }
  }

  searchChildren(instance);
  return found;
}

// Helper to find text node in instance
async function findTextNodeInInstance(
  instance: InstanceNode,
  nameOrId?: string
): Promise<TextNode | null> {
  if (nameOrId) {
    var node = await findNodeInInstance(instance, nameOrId);
    if (node && node.type === 'TEXT') {
      return node as TextNode;
    }
    return null;
  }

  // Find first text node
  var found: TextNode | null = null;

  function searchForText(parent: BaseNode & ChildrenMixin): void {
    for (var i = 0; i < parent.children.length; i++) {
      var child = parent.children[i];
      if (child.type === 'TEXT') {
        found = child as TextNode;
        return;
      }
      if ('children' in child) {
        searchForText(child as BaseNode & ChildrenMixin);
        if (found) return;
      }
    }
  }

  searchForText(instance);
  return found;
}

// Edit text content in an instance
export async function handleEditInstanceText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as EditInstanceTextPayload;

  if (!payload.instanceId) {
    return errorResult(command.id, 'Missing instanceId');
  }

  if (payload.characters === undefined) {
    return errorResult(command.id, 'Missing characters');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.instanceId);

    if (!node) {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    if (node.type !== 'INSTANCE') {
      return errorResult(command.id, 'Node is not an instance');
    }

    var instance = node as InstanceNode;
    var textNode = await findTextNodeInInstance(
      instance,
      payload.textNodeId ? payload.textNodeId : payload.textNodeName
    );

    if (!textNode) {
      return errorResult(command.id, 'Text node not found in instance');
    }

    // Load font before editing
    await figma.loadFontAsync(textNode.fontName as FontName);
    textNode.characters = payload.characters;

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        textNodeId: textNode.id,
        textNodeName: textNode.name,
        characters: textNode.characters,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Override fills on a node within an instance
export async function handleOverrideInstanceFills(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as OverrideInstanceFillsPayload;

  if (!payload.instanceId || !payload.nodeNameOrId || !payload.fills) {
    return errorResult(command.id, 'Missing instanceId, nodeNameOrId, or fills');
  }

  try {
    var instanceNode = await figma.getNodeByIdAsync(payload.instanceId);

    if (!instanceNode || instanceNode.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = instanceNode as InstanceNode;
    var targetNode = await findNodeInInstance(instance, payload.nodeNameOrId);

    if (!targetNode) {
      return errorResult(command.id, 'Node not found in instance: ' + payload.nodeNameOrId);
    }

    if (!('fills' in targetNode)) {
      return errorResult(command.id, 'Node does not support fills');
    }

    var fillsTarget = targetNode as GeometryMixin;
    var newFills: Paint[] = [];

    for (var i = 0; i < payload.fills.length; i++) {
      var fill = payload.fills[i];
      var parsedColor = parseColor(fill.color);
      var paint: SolidPaint = {
        type: 'SOLID',
        color: { r: parsedColor.r, g: parsedColor.g, b: parsedColor.b },
        opacity: fill.opacity !== undefined ? fill.opacity : parsedColor.a,
      };
      newFills.push(paint);
    }

    fillsTarget.fills = newFills;

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        nodeId: targetNode.id,
        fills: newFills.length,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Override strokes on a node within an instance
export async function handleOverrideInstanceStrokes(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as OverrideInstanceStrokesPayload;

  if (!payload.instanceId || !payload.nodeNameOrId || !payload.strokes) {
    return errorResult(command.id, 'Missing instanceId, nodeNameOrId, or strokes');
  }

  try {
    var instanceNode = await figma.getNodeByIdAsync(payload.instanceId);

    if (!instanceNode || instanceNode.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = instanceNode as InstanceNode;
    var targetNode = await findNodeInInstance(instance, payload.nodeNameOrId);

    if (!targetNode) {
      return errorResult(command.id, 'Node not found in instance: ' + payload.nodeNameOrId);
    }

    if (!('strokes' in targetNode)) {
      return errorResult(command.id, 'Node does not support strokes');
    }

    var strokesTarget = targetNode as GeometryMixin;
    var newStrokes: Paint[] = [];

    for (var i = 0; i < payload.strokes.length; i++) {
      var stroke = payload.strokes[i];
      var parsedColor = parseColor(stroke.color);
      var paint: SolidPaint = {
        type: 'SOLID',
        color: { r: parsedColor.r, g: parsedColor.g, b: parsedColor.b },
        opacity: stroke.opacity !== undefined ? stroke.opacity : parsedColor.a,
      };
      newStrokes.push(paint);
    }

    strokesTarget.strokes = newStrokes;

    if (payload.strokeWeight !== undefined && 'strokeWeight' in targetNode) {
      (targetNode as GeometryMixin).strokeWeight = payload.strokeWeight;
    }

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        nodeId: targetNode.id,
        strokes: newStrokes.length,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Override effects on a node within an instance
export async function handleOverrideInstanceEffects(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as OverrideInstanceEffectsPayload;

  if (!payload.instanceId || !payload.nodeNameOrId || !payload.effects) {
    return errorResult(command.id, 'Missing instanceId, nodeNameOrId, or effects');
  }

  try {
    var instanceNode = await figma.getNodeByIdAsync(payload.instanceId);

    if (!instanceNode || instanceNode.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = instanceNode as InstanceNode;
    var targetNode = await findNodeInInstance(instance, payload.nodeNameOrId);

    if (!targetNode) {
      return errorResult(command.id, 'Node not found in instance: ' + payload.nodeNameOrId);
    }

    if (!('effects' in targetNode)) {
      return errorResult(command.id, 'Node does not support effects');
    }

    var effectsTarget = targetNode as BlendMixin;
    var newEffects: Effect[] = [];

    for (var i = 0; i < payload.effects.length; i++) {
      var eff = payload.effects[i];

      if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
        var shadowColor = eff.color ? parseColor(eff.color) : { r: 0, g: 0, b: 0, a: 0.25 };
        var shadow: DropShadowEffect | InnerShadowEffect = {
          type: eff.type,
          color: { r: shadowColor.r, g: shadowColor.g, b: shadowColor.b, a: shadowColor.a },
          offset: {
            x: eff.offsetX !== undefined ? eff.offsetX : 0,
            y: eff.offsetY !== undefined ? eff.offsetY : 4,
          },
          radius: eff.radius,
          spread: eff.spread !== undefined ? eff.spread : 0,
          visible: true,
          blendMode: 'NORMAL',
        };
        newEffects.push(shadow);
      } else if (eff.type === 'LAYER_BLUR' || eff.type === 'BACKGROUND_BLUR') {
        var blur: BlurEffect = {
          type: eff.type,
          radius: eff.radius,
          visible: true,
          blurType: 'NORMAL' as const,
        };
        newEffects.push(blur);
      }
    }

    effectsTarget.effects = newEffects;

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        nodeId: targetNode.id,
        effects: newEffects.length,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Reset overrides on an instance
export async function handleResetOverrides(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as ResetOverridesPayload;

  if (!payload.instanceId) {
    return errorResult(command.id, 'Missing instanceId');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.instanceId);

    if (!node || node.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = node as InstanceNode;

    // Reset all overrides
    instance.resetOverrides();

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        reset: true,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Swap an instance to a different component
export async function handleSwapInstance(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as SwapInstancePayload;

  if (!payload.instanceId || !payload.newComponentId) {
    return errorResult(command.id, 'Missing instanceId or newComponentId');
  }

  try {
    var instanceNode = await figma.getNodeByIdAsync(payload.instanceId);

    if (!instanceNode || instanceNode.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = instanceNode as InstanceNode;
    var componentNode = await figma.getNodeByIdAsync(payload.newComponentId);

    if (!componentNode) {
      return errorResult(command.id, 'Component not found: ' + payload.newComponentId);
    }

    if (componentNode.type !== 'COMPONENT') {
      return errorResult(command.id, 'Node is not a component: ' + payload.newComponentId);
    }

    var component = componentNode as ComponentNode;
    instance.swapComponent(component);

    return successResult(command.id, {
      data: {
        instanceId: instance.id,
        newComponentId: component.id,
        newComponentName: component.name,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Detach an instance from its component
export async function handleDetachInstance(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as DetachInstancePayload;

  if (!payload.instanceId) {
    return errorResult(command.id, 'Missing instanceId');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.instanceId);

    if (!node || node.type !== 'INSTANCE') {
      return errorResult(command.id, 'Instance not found: ' + payload.instanceId);
    }

    var instance = node as InstanceNode;
    var detached = instance.detachInstance();

    return successResult(command.id, {
      nodeId: detached.id,
      data: {
        detached: true,
        newNodeId: detached.id,
        newNodeType: detached.type,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}
