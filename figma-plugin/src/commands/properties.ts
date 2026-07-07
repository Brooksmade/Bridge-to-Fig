// Advanced node properties commands

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { buildAdvancedPaint, buildAdvancedEffect } from './advanced-paints';

// Set blend mode
export async function handleSetBlendMode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    blendMode: BlendMode;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('blendMode' in node)) {
    return errorResult(command.id, 'Node does not support blend mode');
  }

  var sceneNode = node as SceneNode & BlendMixin;
  sceneNode.blendMode = payload.blendMode || 'NORMAL';

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      blendMode: sceneNode.blendMode,
    },
  });
}

// Set opacity
export async function handleSetOpacity(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    opacity: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (payload.opacity === undefined) {
    return errorResult(command.id, 'opacity is required (0-1)');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('opacity' in node)) {
    return errorResult(command.id, 'Node does not support opacity');
  }

  var sceneNode = node as SceneNode & BlendMixin;
  sceneNode.opacity = Math.max(0, Math.min(1, payload.opacity));

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      opacity: sceneNode.opacity,
    },
  });
}

// Set visibility
export async function handleSetVisible(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    visible: boolean;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, 'Cannot set visibility on document or page');
  }

  var sceneNode = node as SceneNode;
  sceneNode.visible = payload.visible !== false;

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      visible: sceneNode.visible,
    },
  });
}

// Set locked state
export async function handleSetLocked(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    locked: boolean;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, 'Cannot lock document or page');
  }

  var sceneNode = node as SceneNode;
  sceneNode.locked = payload.locked !== false;

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      locked: sceneNode.locked,
    },
  });
}

// Set clips content (for frames)
export async function handleSetClipsContent(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    clipsContent: boolean;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    return errorResult(command.id, 'Node must be a frame, component, or instance');
  }

  var frame = node as FrameNode;
  frame.clipsContent = payload.clipsContent !== false;

  return successResult(command.id, {
    data: {
      nodeId: frame.id,
      clipsContent: frame.clipsContent,
    },
  });
}

// Set corner radius
export async function handleSetCornerRadius(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    radius?: number;
    topLeft?: number;
    topRight?: number;
    bottomRight?: number;
    bottomLeft?: number;
    cornerSmoothing?: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('cornerRadius' in node)) {
    return errorResult(command.id, 'Node does not support corner radius');
  }

  var rectNode = node as RectangleNode | FrameNode;

  if (payload.radius !== undefined) {
    rectNode.cornerRadius = payload.radius;
  } else {
    if (payload.topLeft !== undefined) rectNode.topLeftRadius = payload.topLeft;
    if (payload.topRight !== undefined) rectNode.topRightRadius = payload.topRight;
    if (payload.bottomRight !== undefined) rectNode.bottomRightRadius = payload.bottomRight;
    if (payload.bottomLeft !== undefined) rectNode.bottomLeftRadius = payload.bottomLeft;
  }

  if (payload.cornerSmoothing !== undefined) {
    rectNode.cornerSmoothing = payload.cornerSmoothing;
  }

  return successResult(command.id, {
    data: {
      nodeId: rectNode.id,
      cornerRadius: rectNode.cornerRadius,
      topLeftRadius: rectNode.topLeftRadius,
      topRightRadius: rectNode.topRightRadius,
      bottomRightRadius: rectNode.bottomRightRadius,
      bottomLeftRadius: rectNode.bottomLeftRadius,
      cornerSmoothing: rectNode.cornerSmoothing,
    },
  });
}

// Set as mask
export async function handleSetMask(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    isMask: boolean;
    maskType?: 'ALPHA' | 'VECTOR' | 'LUMINANCE';
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('isMask' in node)) {
    return errorResult(command.id, 'Node does not support mask');
  }

  var sceneNode = node as SceneNode & { isMask: boolean; maskType: 'ALPHA' | 'VECTOR' | 'LUMINANCE' };
  sceneNode.isMask = payload.isMask !== false;

  if (payload.maskType && sceneNode.isMask) {
    sceneNode.maskType = payload.maskType;
  }

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      isMask: sceneNode.isMask,
      maskType: sceneNode.maskType,
    },
  });
}

// Set effects (shadows, blurs)
export async function handleSetEffects(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    // `type` is widened so the newer effect types (NOISE, TEXTURE, GLASS) and PROGRESSIVE blur
    // fall through to buildAdvancedEffect. Legacy shadows/normal blur are handled inline below.
    effects: Array<any>;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('effects' in node)) {
    return errorResult(command.id, 'Node does not support effects');
  }

  var sceneNode = node as SceneNode & { effects: readonly Effect[] };
  var newEffects: Effect[] = [];

  for (var i = 0; i < payload.effects.length; i++) {
    var eff = payload.effects[i];

    if (eff.type === 'DROP_SHADOW' || eff.type === 'INNER_SHADOW') {
      // Parse color
      var color = { r: 0, g: 0, b: 0, a: 0.25 };
      if (eff.color) {
        var hex = eff.color.replace('#', '');
        color.r = parseInt(hex.substring(0, 2), 16) / 255;
        color.g = parseInt(hex.substring(2, 4), 16) / 255;
        color.b = parseInt(hex.substring(4, 6), 16) / 255;
        if (hex.length >= 8) {
          color.a = parseInt(hex.substring(6, 8), 16) / 255;
        }
      }

      var shadow: DropShadowEffect | InnerShadowEffect = {
        type: eff.type,
        color: color,
        offset: { x: eff.offsetX || 0, y: eff.offsetY || 4 },
        radius: eff.radius || 4,
        spread: eff.spread || 0,
        visible: eff.visible !== false,
        blendMode: 'NORMAL',
      };
      newEffects.push(shadow);
    } else if (
      (eff.type === 'LAYER_BLUR' || eff.type === 'BACKGROUND_BLUR') &&
      eff.blurType !== 'PROGRESSIVE'
    ) {
      var blur: BlurEffect = {
        type: eff.type,
        radius: eff.radius || 10,
        visible: eff.visible !== false,
        blurType: 'NORMAL' as const,
      };
      newEffects.push(blur);
    } else {
      // Newer effect types: NOISE, TEXTURE, GLASS, and PROGRESSIVE blur
      var advEffect = buildAdvancedEffect(eff);
      if (advEffect) newEffects.push(advEffect);
    }
  }

  try {
    sceneNode.effects = newEffects;
  } catch (e) {
    var em = e instanceof Error ? e.message : String(e);
    return errorResult(
      command.id,
      'Failed to apply effects — a newer effect type (e.g. NOISE/TEXTURE/GLASS) may not be fully supported by this Figma client version. Update the Figma desktop app. Underlying error: ' + em
    );
  }

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      effectCount: newEffects.length,
    },
  });
}

// Set rotation
export async function handleSetRotation(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    rotation: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (payload.rotation === undefined) {
    return errorResult(command.id, 'rotation is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('rotation' in node)) {
    return errorResult(command.id, 'Node does not support rotation');
  }

  var sceneNode = node as SceneNode & { rotation: number };
  sceneNode.rotation = payload.rotation;

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      rotation: sceneNode.rotation,
    },
  });
}

// Set fills
export async function handleSetFills(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    // `type` is widened to string so the newer fill types (IMAGE, VIDEO, PATTERN) fall through
    // to buildAdvancedPaint. SOLID/GRADIENT are still handled inline below.
    fills: Array<any>;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('fills' in node)) {
    return errorResult(command.id, 'Node does not support fills');
  }

  var sceneNode = node as SceneNode & GeometryMixin;
  var newFills: Paint[] = [];

  for (var i = 0; i < payload.fills.length; i++) {
    var f = payload.fills[i];

    if (f.type === 'SOLID') {
      var hex = (f.color || '#000000').replace('#', '');
      var solidFill: SolidPaint = {
        type: 'SOLID',
        color: {
          r: parseInt(hex.substring(0, 2), 16) / 255,
          g: parseInt(hex.substring(2, 4), 16) / 255,
          b: parseInt(hex.substring(4, 6), 16) / 255,
        },
        opacity: f.opacity !== undefined ? f.opacity : 1,
        visible: f.visible !== false,
      };
      newFills.push(solidFill);
    } else if (f.type.startsWith('GRADIENT_') && f.gradientStops) {
      var stops: ColorStop[] = [];
      for (var j = 0; j < f.gradientStops.length; j++) {
        var stop = f.gradientStops[j];
        var stopHex = stop.color.replace('#', '');
        stops.push({
          position: stop.position,
          color: {
            r: parseInt(stopHex.substring(0, 2), 16) / 255,
            g: parseInt(stopHex.substring(2, 4), 16) / 255,
            b: parseInt(stopHex.substring(4, 6), 16) / 255,
            a: stopHex.length >= 8 ? parseInt(stopHex.substring(6, 8), 16) / 255 : 1,
          },
        });
      }

      var gradientFill: GradientPaint = {
        type: f.type as 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND',
        gradientStops: stops,
        gradientTransform: [[1, 0, 0], [0, 1, 0]],
        opacity: f.opacity !== undefined ? f.opacity : 1,
        visible: f.visible !== false,
      };
      newFills.push(gradientFill);
    } else {
      // Newer fill types: IMAGE, VIDEO, PATTERN
      var advFill = buildAdvancedPaint(f);
      if (advFill) newFills.push(advFill);
    }
  }

  // Some fill types — notably PATTERN, which references a source node — are rejected by the
  // synchronous `fills` setter and must go through setFillsAsync. Try sync first (Figma validates
  // before mutating, so a throw leaves no partial state), then fall back to async.
  var usedAsync = false;
  try {
    sceneNode.fills = newFills;
  } catch (syncErr) {
    if (typeof (sceneNode as any).setFillsAsync === 'function') {
      try {
        await (sceneNode as any).setFillsAsync(newFills);
        usedAsync = true;
      } catch (asyncErr) {
        var am = asyncErr instanceof Error ? asyncErr.message : String(asyncErr);
        return errorResult(
          command.id,
          'Failed to apply fills — a fill type may be unsupported by this Figma client version. Update the Figma desktop app. Underlying error: ' + am
        );
      }
    } else {
      var sm = syncErr instanceof Error ? syncErr.message : String(syncErr);
      return errorResult(command.id, 'Failed to apply fills: ' + sm);
    }
  }

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      fillCount: newFills.length,
      async: usedAsync,
    },
  });
}

// Set strokes
export async function handleSetStrokes(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    strokes: Array<{
      type: 'SOLID';
      color: string;
      opacity?: number;
    }>;
    strokeWeight?: number;
    strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
    strokeCap?: 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL';
    strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
    dashPattern?: number[];
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('strokes' in node)) {
    return errorResult(command.id, 'Node does not support strokes');
  }

  var sceneNode = node as SceneNode & GeometryMixin;
  var newStrokes: Paint[] = [];

  if (payload.strokes) {
    for (var i = 0; i < payload.strokes.length; i++) {
      var s = payload.strokes[i];
      var hex = s.color.replace('#', '');
      var stroke: SolidPaint = {
        type: 'SOLID',
        color: {
          r: parseInt(hex.substring(0, 2), 16) / 255,
          g: parseInt(hex.substring(2, 4), 16) / 255,
          b: parseInt(hex.substring(4, 6), 16) / 255,
        },
        opacity: s.opacity !== undefined ? s.opacity : 1,
      };
      newStrokes.push(stroke);
    }
    sceneNode.strokes = newStrokes;
  }

  if (payload.strokeWeight !== undefined) {
    sceneNode.strokeWeight = payload.strokeWeight;
  }

  if (payload.strokeAlign) {
    sceneNode.strokeAlign = payload.strokeAlign;
  }

  if (payload.strokeCap && 'strokeCap' in sceneNode) {
    (sceneNode as VectorNode).strokeCap = payload.strokeCap;
  }

  if (payload.strokeJoin && 'strokeJoin' in sceneNode) {
    (sceneNode as VectorNode).strokeJoin = payload.strokeJoin;
  }

  if (payload.dashPattern && 'dashPattern' in sceneNode) {
    (sceneNode as VectorNode).dashPattern = payload.dashPattern;
  }

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      strokeCount: newStrokes.length,
      strokeWeight: sceneNode.strokeWeight,
    },
  });
}

// Set plugin data
export async function handleSetPluginData(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
    value: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.key) {
    return errorResult(command.id, 'key is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  node.setPluginData(payload.key, payload.value || '');

  return successResult(command.id, {
    data: {
      nodeId: node.id,
      key: payload.key,
      value: payload.value,
    },
  });
}

// Get plugin data
export async function handleGetPluginData(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key?: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (payload.key) {
    var value = node.getPluginData(payload.key);
    return successResult(command.id, {
      data: {
        nodeId: node.id,
        key: payload.key,
        value: value,
      },
    });
  } else {
    var keys = node.getPluginDataKeys();
    var allData: { [key: string]: string } = {};
    for (var i = 0; i < keys.length; i++) {
      allData[keys[i]] = node.getPluginData(keys[i]);
    }
    return successResult(command.id, {
      data: {
        nodeId: node.id,
        keys: keys,
        data: allData,
      },
    });
  }
}

// Rename node
export async function handleRenameNode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.name) {
    return errorResult(command.id, 'name is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  var oldName = node.name;
  node.name = payload.name;

  return successResult(command.id, {
    data: {
      nodeId: node.id,
      oldName: oldName,
      newName: node.name,
    },
  });
}
