// Dev Mode focused-node commands (Figma plugin API v1.124, Mar 2026).
// figma.currentPage.focusedNode is the node currently focused in Dev Mode (read/write).
//
// Note: we access the property directly rather than testing `'focusedNode' in page` — Figma's
// node objects are proxies whose native getters are not reliably detectable via the `in` operator,
// so `in` produced false negatives. A missing property reads as `undefined`; "nothing focused"
// reads as `null`.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

function nodeSummary(n: any) {
  return { id: n.id, name: n.name, type: n.type };
}

// Get the "focused" node. In Dev Mode this is figma.currentPage.focusedNode; in the Design/FigJam
// editors that property doesn't exist, so we fall back to the current selection — the practical
// equivalent of "the node the user is working on" — so the command is useful in every editor.
export async function handleGetFocusedNode(command: FigmaCommand): Promise<CommandResult> {
  var page = figma.currentPage as any;
  var editorType = (figma as any).editorType;

  var focused;
  try {
    focused = page.focusedNode;
  } catch (e) {
    focused = undefined;
  }

  // True Dev Mode focus.
  if (focused) {
    return successResult(command.id, {
      data: { source: 'dev-mode-focus', editorType: editorType, focusedNode: nodeSummary(focused) },
    });
  }

  // Fall back to selection (Design/FigJam have no focusedNode).
  var selection = page.selection as any[];
  if (selection && selection.length > 0) {
    return successResult(command.id, {
      data: {
        source: 'selection',
        editorType: editorType,
        focusedNode: nodeSummary(selection[0]),
        selectionCount: selection.length,
        note:
          focused === undefined
            ? 'Dev Mode focusedNode is unavailable in this editor; returning the current selection instead.'
            : 'Nothing focused in Dev Mode; returning the current selection.',
      },
    });
  }

  // Nothing focused and nothing selected.
  return successResult(command.id, {
    data: {
      source: 'none',
      editorType: editorType,
      focusedNode: null,
      note: 'No Dev Mode focus and no selection. Select a layer (or focus one in Dev Mode) and retry.',
    },
  });
}

// Set (or clear) the focused node. In Dev Mode this writes figma.currentPage.focusedNode; in the
// Design/FigJam editors (where that property doesn't exist) it falls back to setting the selection,
// the practical equivalent, so "focus this node" works in every editor.
export async function handleSetFocusedNode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { nodeId?: string | null };
  var page = figma.currentPage as any;
  var editorType = (figma as any).editorType;

  // Is the Dev Mode focusedNode property present?
  var hasFocusedNode = false;
  try {
    hasFocusedNode = page.focusedNode !== undefined;
  } catch (e) {
    hasFocusedNode = false;
  }

  var nodeId = payload.nodeId !== undefined ? payload.nodeId : command.target;

  // Clear focus / selection.
  if (!nodeId) {
    if (hasFocusedNode) page.focusedNode = null;
    else page.selection = [];
    return successResult(command.id, {
      data: { source: hasFocusedNode ? 'dev-mode-focus' : 'selection', editorType: editorType, focusedNode: null },
    });
  }

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');

  if (hasFocusedNode) {
    page.focusedNode = node;
    return successResult(command.id, {
      data: { source: 'dev-mode-focus', editorType: editorType, focusedNode: nodeSummary(node) },
    });
  }

  // Fallback: select the node (must be a scene node).
  try {
    page.selection = [node];
  } catch (e) {
    var m = e instanceof Error ? e.message : String(e);
    return errorResult(command.id, 'Cannot focus/select this node in the ' + editorType + ' editor: ' + m);
  }
  return successResult(command.id, {
    data: {
      source: 'selection',
      editorType: editorType,
      focusedNode: nodeSummary(node),
      note: 'Dev Mode focusedNode is unavailable in this editor; set the selection instead.',
    },
  });
}
