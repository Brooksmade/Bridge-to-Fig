import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Helper to serialize node info
function serializeNode(node: SceneNode | PageNode): any {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ('x' in node) {
    base.x = node.x;
    base.y = node.y;
  }

  if ('width' in node) {
    base.width = node.width;
    base.height = node.height;
  }

  return base;
}

// Find all children matching a criteria
export async function handleFindChildren(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string; // If not provided, uses current page
    types?: string[]; // Filter by node types
    namePattern?: string; // Regex pattern to match names
  };

  try {
    let parent: ChildrenMixin;

    if (payload && payload.nodeId) {
      var node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (!('children' in node)) {
        return errorResult(command.id, 'Node does not have children');
      }
      parent = node as ChildrenMixin;
    } else {
      parent = figma.currentPage;
    }

    var results = parent.findChildren((node: SceneNode) => {
      // Type filter
      if (payload && payload.types && payload.types.length > 0) {
        if (!payload.types.includes(node.type)) {
          return false;
        }
      }

      // Name pattern filter
      if (payload && payload.namePattern) {
        var regex = new RegExp(payload.namePattern, 'i');
        if (!regex.test(node.name)) {
          return false;
        }
      }

      return true;
    });

    return successResult(command.id, {
      data: {
        count: results.length,
        nodes: results.map(serializeNode),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find children: ' + message);
  }
}

// Find first child matching a criteria
export async function handleFindChild(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    types?: string[];
    namePattern?: string;
    name?: string; // Exact name match
  };

  try {
    let parent: ChildrenMixin;

    if (payload && payload.nodeId) {
      var node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (!('children' in node)) {
        return errorResult(command.id, 'Node does not have children');
      }
      parent = node as ChildrenMixin;
    } else {
      parent = figma.currentPage;
    }

    var result = parent.findChild((node: SceneNode) => {
      // Exact name match
      if (payload && payload.name) {
        return node.name === payload.name;
      }

      // Type filter
      if (payload && payload.types && payload.types.length > 0) {
        if (!payload.types.includes(node.type)) {
          return false;
        }
      }

      // Name pattern filter
      if (payload && payload.namePattern) {
        var regex = new RegExp(payload.namePattern, 'i');
        if (!regex.test(node.name)) {
          return false;
        }
      }

      return true;
    });

    if (!result) {
      return successResult(command.id, {
        data: { found: false, node: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        node: serializeNode(result),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find child: ' + message);
  }
}

// Deep search core: skipInvisibleInstanceChildren=true during the walk (documented 10-100x
// speedup), and Figma's native findAllWithCriteria when a type filter is present — the JS
// predicate then only runs on that much smaller candidate set.
function fastDeepFind(
  parent: ChildrenMixin,
  types: string[] | undefined,
  predicate: (node: SceneNode) => boolean
): SceneNode[] {
  var prevSkip = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;
  try {
    if (types && types.length > 0 && typeof (parent as any).findAllWithCriteria === 'function') {
      var candidates = (parent as any).findAllWithCriteria({ types: types }) as SceneNode[];
      return candidates.filter(predicate);
    }
    return parent.findAll(predicate);
  } finally {
    figma.skipInvisibleInstanceChildren = prevSkip;
  }
}

// Find all descendants matching a criteria (deep search)
export async function handleFindAll(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    types?: string[];
    namePattern?: string;
    limit?: number; // Max results to return
  };

  try {
    let parent: ChildrenMixin;

    if (payload && payload.nodeId) {
      var node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (!('findAll' in node)) {
        return errorResult(command.id, 'Node does not support findAll');
      }
      parent = node as ChildrenMixin;
    } else {
      parent = figma.currentPage;
    }

    var results = fastDeepFind(parent, payload && payload.types, (node: SceneNode) => {
      // Type filter (no-op on the criteria path; kept for the predicate path)
      if (payload && payload.types && payload.types.length > 0) {
        if (!payload.types.includes(node.type)) {
          return false;
        }
      }

      // Name pattern filter
      if (payload && payload.namePattern) {
        var regex = new RegExp(payload.namePattern, 'i');
        if (!regex.test(node.name)) {
          return false;
        }
      }

      return true;
    });

    // Apply limit if specified
    var limit = (payload && payload.limit) || 1000;
    var limitedResults = results.slice(0, limit);

    return successResult(command.id, {
      data: {
        count: results.length,
        returned: limitedResults.length,
        truncated: results.length > limit,
        nodes: limitedResults.map(serializeNode),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find all: ' + message);
  }
}

// Find first descendant matching a criteria (deep search)
export async function handleFindOne(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    types?: string[];
    namePattern?: string;
    name?: string;
  };

  try {
    let parent: ChildrenMixin;

    if (payload && payload.nodeId) {
      var node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (!('findOne' in node)) {
        return errorResult(command.id, 'Node does not support findOne');
      }
      parent = node as ChildrenMixin;
    } else {
      parent = figma.currentPage;
    }

    var predicate = (node: SceneNode) => {
      // Exact name match
      if (payload && payload.name) {
        return node.name === payload.name;
      }

      // Type filter (no-op on the criteria path; kept for the predicate path)
      if (payload && payload.types && payload.types.length > 0) {
        if (!payload.types.includes(node.type)) {
          return false;
        }
      }

      // Name pattern filter
      if (payload && payload.namePattern) {
        var regex = new RegExp(payload.namePattern, 'i');
        if (!regex.test(node.name)) {
          return false;
        }
      }

      return true;
    };

    var result: SceneNode | null;
    if (payload && payload.types && payload.types.length > 0) {
      // Native criteria path, then first match
      var matches = fastDeepFind(parent, payload.types, predicate);
      result = matches.length > 0 ? matches[0] : null;
    } else {
      // Early-exit walk with the skip-invisible speedup
      var prevSkip = figma.skipInvisibleInstanceChildren;
      figma.skipInvisibleInstanceChildren = true;
      try {
        result = parent.findOne(predicate);
      } finally {
        figma.skipInvisibleInstanceChildren = prevSkip;
      }
    }

    if (!result) {
      return successResult(command.id, {
        data: { found: false, node: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        node: serializeNode(result),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find one: ' + message);
  }
}

// Find all nodes by type (convenience wrapper)
export async function handleFindAllByType(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    type: string;
    limit?: number;
  };

  if (!payload || !payload.type) {
    return errorResult(command.id, 'Node type is required');
  }

  // Delegate to findAll with type filter
  return handleFindAll({
    ...command,
    payload: {
      nodeId: payload.nodeId,
      types: [payload.type],
      limit: payload.limit,
    },
  });
}

// Find all text nodes containing specific text
export async function handleFindText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    text: string;
    caseSensitive?: boolean;
    limit?: number;
  };

  if (!payload || !payload.text) {
    return errorResult(command.id, 'Search text is required');
  }

  try {
    let parent: ChildrenMixin;

    if (payload.nodeId) {
      var node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (!('findAll' in node)) {
        return errorResult(command.id, 'Node does not support findAll');
      }
      parent = node as ChildrenMixin;
    } else {
      parent = figma.currentPage;
    }

    var searchText = payload.caseSensitive ? payload.text : payload.text.toLowerCase();

    // TEXT-only search rides the native findAllWithCriteria fast path.
    var results = fastDeepFind(parent, ['TEXT'], (node: SceneNode) => {
      if (node.type !== 'TEXT') {
        return false;
      }

      var textNode = node as TextNode;
      var nodeText = payload.caseSensitive ? textNode.characters : textNode.characters.toLowerCase();

      return nodeText.includes(searchText);
    });

    var limit = payload.limit || 100;
    var limitedResults = results.slice(0, limit);

    return successResult(command.id, {
      data: {
        count: results.length,
        returned: limitedResults.length,
        truncated: results.length > limit,
        nodes: limitedResults.map(node => ({
          ...serializeNode(node),
          characters: (node as TextNode).characters,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find text: ' + message);
  }
}

// Find widget nodes by widget ID
export async function handleFindWidgetNodesByWidgetId(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    widgetId: string;
  };

  if (!payload || !payload.widgetId) {
    return errorResult(command.id, 'Widget ID is required');
  }

  try {
    var results = figma.currentPage.findWidgetNodesByWidgetId(payload.widgetId);

    return successResult(command.id, {
      data: {
        count: results.length,
        nodes: results.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          widgetId: node.widgetId,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to find widget nodes: ' + message);
  }
}
