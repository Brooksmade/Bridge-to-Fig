// Motion / animation commands (Figma plugin API v1.127, June 2026).
// Read and update Motion data: available animation styles, applied styles, timelines, and
// manual keyframe tracks. Motion members live on MotionNodeMixin (per-node) plus figma.motion.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

function motionSupported(): boolean {
  return typeof (figma as any).motion !== 'undefined' && !!(figma as any).motion;
}

function nodeMotionSupported(node: any): boolean {
  return node && typeof node.applyAnimationStyle === 'function';
}

// List the animation styles available in the file (templates that can be applied to nodes).
export async function handleListAnimationStyles(command: FigmaCommand): Promise<CommandResult> {
  if (!motionSupported() || typeof (figma as any).motion.figmaAnimationStyles !== 'function') {
    return errorResult(command.id, 'Motion API is not available in this Figma client version (requires the June 2026 update).');
  }
  var styles = (figma as any).motion.figmaAnimationStyles();
  return successResult(command.id, { data: { count: styles.length, styles: styles } });
}

// Read a node's motion data: applied styles, containing timelines, manual keyframe tracks.
export async function handleGetMotionData(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (!('animationStyles' in node)) {
    return errorResult(command.id, 'Node does not carry motion data (or this Figma client lacks Motion support).');
  }

  return successResult(command.id, {
    data: {
      nodeId: node.id,
      animationStyles: node.animationStyles,
      timelines: node.timelines,
      manualKeyframeTracks: node.manualKeyframeTracks,
      animations: node.animations,
    },
  });
}

// Apply an animation style to a node. Returns the applied-style instance id.
export async function handleApplyAnimationStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; styleId?: string; config?: any };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.styleId) return errorResult(command.id, 'styleId is required');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (!nodeMotionSupported(node)) {
    return errorResult(command.id, 'This node/Figma client does not support applying animation styles.');
  }

  var appliedId = node.applyAnimationStyle(payload.styleId, payload.config);
  return successResult(command.id, {
    data: { nodeId: node.id, styleId: payload.styleId, appliedStyleId: appliedId },
  });
}

// Remove a previously applied animation style by its instance id.
export async function handleRemoveAnimationStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; appliedStyleId?: string };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.appliedStyleId) return errorResult(command.id, 'appliedStyleId is required');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (typeof node.removeAnimationStyle !== 'function') {
    return errorResult(command.id, 'removeAnimationStyle is not available in this Figma client version.');
  }
  node.removeAnimationStyle(payload.appliedStyleId);
  return successResult(command.id, { data: { nodeId: node.id, removed: payload.appliedStyleId } });
}

// Set the duration (seconds) of a timeline that contains this node.
export async function handleSetTimelineDuration(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; timelineId?: string; duration?: number };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.timelineId) return errorResult(command.id, 'timelineId is required');
  if (payload.duration === undefined) return errorResult(command.id, 'duration (seconds) is required');

  var node = (await figma.getNodeByIdAsync(nodeId)) as any;
  if (!node) return errorResult(command.id, 'Node not found');
  if (typeof node.setTimelineDuration !== 'function') {
    return errorResult(command.id, 'setTimelineDuration is not available in this Figma client version.');
  }
  node.setTimelineDuration(payload.timelineId, payload.duration);
  return successResult(command.id, {
    data: { nodeId: node.id, timelineId: payload.timelineId, duration: payload.duration },
  });
}
