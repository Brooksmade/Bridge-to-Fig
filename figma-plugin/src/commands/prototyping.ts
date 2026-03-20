import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Get reactions (prototype interactions) from a node
export async function handleGetReactions(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('reactions' in node)) {
      return errorResult(command.id, 'Node does not support reactions');
    }

    var reactions = (node as SceneNode & ReactionMixin).reactions;

    var serialized = reactions.map(function(reaction: any, index: number) {
      var result: any = { index: index };

      if (reaction.trigger) {
        result.trigger = {
          type: reaction.trigger.type,
        };
        if (reaction.trigger.delay !== undefined) {
          result.trigger.delay = reaction.trigger.delay;
        }
      }

      if (reaction.actions) {
        result.actions = reaction.actions.map(function(action: any) {
          var actionData: any = {
            type: action.type,
          };
          if (action.destinationId) {
            actionData.destinationId = action.destinationId;
          }
          if (action.navigation) {
            actionData.navigation = action.navigation;
          }
          if (action.transition) {
            actionData.transition = {
              type: action.transition.type,
              duration: action.transition.duration,
            };
            if (action.transition.easing) {
              actionData.transition.easing = action.transition.easing;
            }
            if (action.transition.direction) {
              actionData.transition.direction = action.transition.direction;
            }
          }
          if (action.overlayRelativePosition) {
            actionData.overlayRelativePosition = action.overlayRelativePosition;
          }
          return actionData;
        });
      }

      return result;
    });

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        reactions: serialized,
        count: reactions.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get reactions: ' + message);
  }
}

// Create an overlay frame (a frame configured for use as a prototype overlay)
export async function handleCreateOverlay(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    overlayPositionType?: 'CENTER' | 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT' | 'MANUAL';
    overlayBackground?: { type: 'NONE' } | { type: 'SOLID_COLOR'; color: { r: number; g: number; b: number; a?: number } };
    overlayBackgroundInteraction?: 'NONE' | 'CLOSE_ON_CLICK_OUTSIDE';
    parent?: string;
  };

  try {
    var frame = figma.createFrame();

    if (payload) {
      if (payload.name) frame.name = payload.name;
      if (payload.x !== undefined) frame.x = payload.x;
      if (payload.y !== undefined) frame.y = payload.y;
      if (payload.width !== undefined) frame.resize(payload.width, frame.height);
      if (payload.height !== undefined) frame.resize(frame.width, payload.height);

      if (payload.overlayPositionType) {
        (frame as any).overlayPositionType = payload.overlayPositionType;
      }
      if (payload.overlayBackground) {
        (frame as any).overlayBackground = payload.overlayBackground;
      }
      if (payload.overlayBackgroundInteraction) {
        (frame as any).overlayBackgroundInteraction = payload.overlayBackgroundInteraction;
      }

      if (payload.parent) {
        var parentNode = await figma.getNodeByIdAsync(payload.parent);
        if (parentNode && 'appendChild' in parentNode) {
          (parentNode as FrameNode).appendChild(frame);
        }
      }
    }

    return successResult(command.id, {
      data: {
        id: frame.id,
        name: frame.name,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        overlayPositionType: (frame as any).overlayPositionType,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create overlay: ' + message);
  }
}

// Set overlay settings on an existing frame
export async function handleSetOverlaySettings(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    overlayPositionType?: 'CENTER' | 'TOP_LEFT' | 'TOP_CENTER' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT' | 'MANUAL';
    overlayBackground?: { type: 'NONE' } | { type: 'SOLID_COLOR'; color: { r: number; g: number; b: number; a?: number } };
    overlayBackgroundInteraction?: 'NONE' | 'CLOSE_ON_CLICK_OUTSIDE';
  };

  if (!targetId) {
    return errorResult(command.id, 'Target frame ID is required');
  }

  if (!payload) {
    return errorResult(command.id, 'At least one overlay setting is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (node.type !== 'FRAME' && node.type !== 'COMPONENT') {
      return errorResult(command.id, 'Node must be a FRAME or COMPONENT');
    }

    if (payload.overlayPositionType) {
      (node as any).overlayPositionType = payload.overlayPositionType;
    }
    if (payload.overlayBackground) {
      (node as any).overlayBackground = payload.overlayBackground;
    }
    if (payload.overlayBackgroundInteraction) {
      (node as any).overlayBackgroundInteraction = payload.overlayBackgroundInteraction;
    }

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        overlayPositionType: (node as any).overlayPositionType,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set overlay settings: ' + message);
  }
}

// Set transition properties on a reaction
export async function handleSetTransition(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    reactionIndex: number;
    actionIndex?: number;
    transitionType?: string;
    duration?: number;
    easing?: { type: string; easingFunctionCubicBezier?: { x1: number; y1: number; x2: number; y2: number } };
    direction?: string;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || payload.reactionIndex === undefined) {
    return errorResult(command.id, 'reactionIndex is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('reactions' in node)) {
      return errorResult(command.id, 'Node does not support reactions');
    }

    var reactionsNode = node as SceneNode & ReactionMixin;
    var reactions = JSON.parse(JSON.stringify(reactionsNode.reactions));

    if (payload.reactionIndex < 0 || payload.reactionIndex >= reactions.length) {
      return errorResult(command.id, 'reactionIndex out of range (0-' + (reactions.length - 1) + ')');
    }

    var reaction = reactions[payload.reactionIndex];
    var actionIndex = payload.actionIndex || 0;

    if (!reaction.actions || actionIndex >= reaction.actions.length) {
      return errorResult(command.id, 'actionIndex out of range');
    }

    var action = reaction.actions[actionIndex];

    if (!action.transition) {
      action.transition = {};
    }

    if (payload.transitionType) {
      action.transition.type = payload.transitionType;
    }
    if (payload.duration !== undefined) {
      action.transition.duration = payload.duration;
    }
    if (payload.easing) {
      action.transition.easing = payload.easing;
    }
    if (payload.direction) {
      action.transition.direction = payload.direction;
    }

    if (!('setReactionsAsync' in node)) {
      return errorResult(command.id, 'Node does not support setReactionsAsync');
    }

    await (node as any).setReactionsAsync(reactions);

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        reactionIndex: payload.reactionIndex,
        actionIndex: actionIndex,
        transition: action.transition,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set transition: ' + message);
  }
}
