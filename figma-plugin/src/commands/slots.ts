// Slot commands (Figma plugin API v1.126, June 2026).
// A slot is a child frame of a component with freeform content editing. Created via
// component.createSlot(); reset via slotNode.resetSlot().

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Create a slot inside a component.
export async function handleCreateSlot(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string; name?: string };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target component node ID is required');

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (node.type !== 'COMPONENT') {
    return errorResult(command.id, 'Slots can only be created inside a COMPONENT node');
  }
  if (typeof (node as any).createSlot !== 'function') {
    return errorResult(command.id, 'Slots are not supported by this Figma client version (requires the June 2026 update).');
  }

  var slot = (node as any).createSlot();
  if (payload.name) slot.name = payload.name;

  return successResult(command.id, {
    data: { slotId: slot.id, name: slot.name, type: slot.type, parentId: node.id },
  });
}

// Reset a slot back to its default state.
export async function handleResetSlot(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target slot node ID is required');

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (node.type !== ('SLOT' as any) || typeof (node as any).resetSlot !== 'function') {
    return errorResult(command.id, 'Node is not a slot (or this Figma client lacks slot support).');
  }

  (node as any).resetSlot();
  return successResult(command.id, {
    data: { slotId: node.id, reset: true, limitViolations: (node as any).limitViolations },
  });
}
