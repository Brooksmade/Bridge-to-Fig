import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Add a guide to a page or frame
export async function handleAddGuide(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    axis: 'X' | 'Y';
    offset: number;
  };

  if (!payload || !payload.axis) {
    return errorResult(command.id, 'axis is required ("X" or "Y")');
  }

  if (payload.offset === undefined) {
    return errorResult(command.id, 'offset is required (number)');
  }

  try {
    var node: BaseNode;

    if (command.target) {
      var found = await figma.getNodeByIdAsync(command.target);
      if (!found) {
        return errorResult(command.id, 'Node not found: ' + command.target);
      }
      node = found;
    } else {
      node = figma.currentPage;
    }

    if (!('guides' in node)) {
      return errorResult(command.id, 'Node does not support guides (must be a page or frame)');
    }

    var guidesNode = node as PageNode | FrameNode;
    var newGuides = [...guidesNode.guides, { axis: payload.axis, offset: payload.offset }];
    guidesNode.guides = newGuides;

    return successResult(command.id, {
      data: {
        nodeId: guidesNode.id,
        guide: { axis: payload.axis, offset: payload.offset },
        totalGuides: newGuides.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to add guide: ' + message);
  }
}

// Get guides from a page or frame
export async function handleGetGuides(command: FigmaCommand): Promise<CommandResult> {
  try {
    var node: BaseNode;

    if (command.target) {
      var found = await figma.getNodeByIdAsync(command.target);
      if (!found) {
        return errorResult(command.id, 'Node not found: ' + command.target);
      }
      node = found;
    } else {
      node = figma.currentPage;
    }

    if (!('guides' in node)) {
      return errorResult(command.id, 'Node does not support guides (must be a page or frame)');
    }

    var guidesNode = node as PageNode | FrameNode;

    return successResult(command.id, {
      data: {
        nodeId: guidesNode.id,
        guides: guidesNode.guides.map(g => ({ axis: g.axis, offset: g.offset })),
        count: guidesNode.guides.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get guides: ' + message);
  }
}

// Remove a guide from a page or frame
export async function handleRemoveGuide(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    guideIndex?: number;
    axis?: 'X' | 'Y';
    offset?: number;
  };

  if (!payload) {
    return errorResult(command.id, 'Payload is required (guideIndex or axis+offset)');
  }

  try {
    var node: BaseNode;

    if (command.target) {
      var found = await figma.getNodeByIdAsync(command.target);
      if (!found) {
        return errorResult(command.id, 'Node not found: ' + command.target);
      }
      node = found;
    } else {
      node = figma.currentPage;
    }

    if (!('guides' in node)) {
      return errorResult(command.id, 'Node does not support guides (must be a page or frame)');
    }

    var guidesNode = node as PageNode | FrameNode;
    var guides = [...guidesNode.guides];

    var removeIndex = -1;

    if (payload.guideIndex !== undefined) {
      removeIndex = payload.guideIndex;
    } else if (payload.axis && payload.offset !== undefined) {
      removeIndex = guides.findIndex(g => g.axis === payload.axis && g.offset === payload.offset);
    }

    if (removeIndex < 0 || removeIndex >= guides.length) {
      return errorResult(command.id, 'Guide not found at specified index or position');
    }

    var removed = guides.splice(removeIndex, 1)[0];
    guidesNode.guides = guides;

    return successResult(command.id, {
      data: {
        nodeId: guidesNode.id,
        removed: { axis: removed.axis, offset: removed.offset },
        remainingGuides: guides.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to remove guide: ' + message);
  }
}
