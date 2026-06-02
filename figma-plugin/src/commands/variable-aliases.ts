import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { serializeVariable, serializeVariableCollection } from '../utils/variable-factory';

// Create a variable alias
export async function handleCreateVariableAlias(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    variableId: string;
  };

  if (!payload || !payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    var alias = figma.variables.createVariableAlias(variable);

    return successResult(command.id, {
      data: {
        type: alias.type,
        id: alias.id,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create variable alias: ' + message);
  }
}

// Create a variable alias by ID (async)
export async function handleCreateVariableAliasByIdAsync(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    variableId: string;
  };

  if (!payload || !payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    var alias = await figma.variables.createVariableAliasByIdAsync(payload.variableId);

    return successResult(command.id, {
      data: {
        type: alias.type,
        id: alias.id,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create variable alias by ID: ' + message);
  }
}

// Set bound variable for paint
export async function handleSetBoundVariableForPaint(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    paint: any; // SolidPaint
    field: 'color';
    variableId: string;
  };

  if (!payload || !payload.paint || !payload.field || !payload.variableId) {
    return errorResult(command.id, 'Paint, field, and variable ID are required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    var newPaint = figma.variables.setBoundVariableForPaint(
      payload.paint,
      payload.field,
      variable
    );

    return successResult(command.id, {
      data: {
        paint: {
          type: newPaint.type,
          boundVariables: newPaint.boundVariables,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set bound variable for paint: ' + message);
  }
}

// Set bound variable for effect
export async function handleSetBoundVariableForEffect(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    effect: any;
    field: string;
    variableId: string;
  };

  if (!payload || !payload.effect || !payload.field || !payload.variableId) {
    return errorResult(command.id, 'Effect, field, and variable ID are required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    var newEffect = figma.variables.setBoundVariableForEffect(
      payload.effect,
      payload.field as any,
      variable
    );

    return successResult(command.id, {
      data: {
        effect: {
          type: newEffect.type,
          boundVariables: newEffect.boundVariables,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set bound variable for effect: ' + message);
  }
}

// Set bound variable for layout grid
export async function handleSetBoundVariableForLayoutGrid(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    layoutGrid: any;
    field: string;
    variableId: string;
  };

  if (!payload || !payload.layoutGrid || !payload.field || !payload.variableId) {
    return errorResult(command.id, 'Layout grid, field, and variable ID are required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    var newGrid = figma.variables.setBoundVariableForLayoutGrid(
      payload.layoutGrid,
      payload.field as any,
      variable
    );

    return successResult(command.id, {
      data: {
        layoutGrid: {
          pattern: newGrid.pattern,
          boundVariables: newGrid.boundVariables,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set bound variable for layout grid: ' + message);
  }
}

// Set bound variable on a node
export async function handleSetNodeBoundVariable(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    field: string;
    variableId: string | null; // null to unbind
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || !payload.field) {
    return errorResult(command.id, 'Field is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('setBoundVariable' in node)) {
      return errorResult(command.id, 'Node does not support setBoundVariable');
    }

    if (payload.variableId) {
      var variable = await figma.variables.getVariableByIdAsync(payload.variableId);
      if (!variable) {
        return errorResult(command.id, 'Variable not found: ' + payload.variableId);
      }
      (node as any).setBoundVariable(payload.field, variable);
    } else {
      (node as any).setBoundVariable(payload.field, null);
    }

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        field: payload.field,
        variableId: payload.variableId,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set bound variable on node: ' + message);
  }
}

// Get all variables bound to a node
export async function handleGetBoundVariables(command: FigmaCommand): Promise<CommandResult> {
  var payload = (command.payload || {}) as { nodeId?: string };
  var nodeId = payload.nodeId || command.target;

  if (!nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + nodeId);
    }

    var bound = (node as any).boundVariables as Record<string, any> | undefined;
    var bindings: Array<{ field: string; variableId: string; variableName: string | null }> = [];

    // Cache resolved names so a variable used in multiple fields is only fetched once
    var nameCache: Record<string, string | null> = {};
    async function resolveName(id: string): Promise<string | null> {
      if (Object.prototype.hasOwnProperty.call(nameCache, id)) {
        return nameCache[id];
      }
      try {
        var variable = await figma.variables.getVariableByIdAsync(id);
        nameCache[id] = variable ? variable.name : null;
      } catch (e) {
        nameCache[id] = null;
      }
      return nameCache[id];
    }

    if (bound) {
      var fields = Object.keys(bound);
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var value = bound[field];
        if (!value) {
          continue;
        }
        if (Array.isArray(value)) {
          // Array-valued bindings (fills, strokes, effects, layoutGrids, ...)
          for (var j = 0; j < value.length; j++) {
            var entry = value[j];
            if (entry && entry.id) {
              bindings.push({
                field: field + '[' + j + ']',
                variableId: entry.id,
                variableName: await resolveName(entry.id),
              });
            }
          }
        } else if (value.id) {
          // Scalar bindings (cornerRadius, width, opacity, characters, ...)
          bindings.push({
            field: field,
            variableId: value.id,
            variableName: await resolveName(value.id),
          });
        }
      }
    }

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        bindings: bindings,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get bound variables: ' + message);
  }
}

// Get variable by ID
export async function handleGetVariableById(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    variableId: string;
    includeCollection?: boolean;
  };

  if (!payload || !payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return successResult(command.id, {
        data: { found: false, variable: null },
      });
    }

    // Use serializeVariable to include valuesByMode
    const serialized = serializeVariable(variable) as Record<string, any>;
    // Also include key and codeSyntax which serializeVariable doesn't add
    serialized.key = variable.key;
    serialized.codeSyntax = variable.codeSyntax;

    const result: Record<string, any> = {
      found: true,
      variable: serialized,
    };

    // Optionally include collection context (mode names mapped to mode IDs)
    if (payload.includeCollection) {
      const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
      if (collection) {
        result.collection = serializeVariableCollection(collection);
      }
    }

    return successResult(command.id, {
      data: result,
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get variable by ID: ' + message);
  }
}

// Get variable collection by ID
export async function handleGetVariableCollectionById(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    collectionId: string;
  };

  if (!payload || !payload.collectionId) {
    return errorResult(command.id, 'Collection ID is required');
  }

  try {
    var collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);

    if (!collection) {
      return successResult(command.id, {
        data: { found: false, collection: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        collection: {
          id: collection.id,
          name: collection.name,
          key: collection.key,
          modes: collection.modes,
          defaultModeId: collection.defaultModeId,
          variableIds: collection.variableIds,
          hiddenFromPublishing: collection.hiddenFromPublishing,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get variable collection by ID: ' + message);
  }
}

// Set variable code syntax
export async function handleSetVariableCodeSyntax(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    variableId: string;
    platform: 'WEB' | 'ANDROID' | 'iOS';
    value: string;
  };

  if (!payload || !payload.variableId || !payload.platform) {
    return errorResult(command.id, 'Variable ID and platform are required');
  }

  try {
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);

    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    variable.setVariableCodeSyntax(payload.platform, payload.value || '');

    return successResult(command.id, {
      data: {
        variableId: variable.id,
        platform: payload.platform,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set variable code syntax: ' + message);
  }
}

// Set explicit variable mode for collection on a frame
export async function handleSetExplicitVariableMode(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    collectionId: string;
    modeId: string;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target frame ID is required');
  }

  if (!payload || !payload.collectionId || !payload.modeId) {
    return errorResult(command.id, 'Collection ID and mode ID are required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('setExplicitVariableModeForCollection' in node)) {
      return errorResult(command.id, 'Node does not support setExplicitVariableModeForCollection');
    }

    // Get the actual VariableCollection object (required for incremental mode)
    // Handle both full ID format (VariableCollectionId:X:Y) and short format (X:Y)
    let collectionIdToUse = payload.collectionId;
    if (!collectionIdToUse.startsWith('VariableCollectionId:')) {
      collectionIdToUse = 'VariableCollectionId:' + collectionIdToUse;
    }

    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionIdToUse);
    if (!collection) {
      return errorResult(command.id, 'Variable collection not found: ' + payload.collectionId);
    }

    (node as FrameNode).setExplicitVariableModeForCollection(collection, payload.modeId);

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        collectionId: payload.collectionId,
        collectionName: collection.name,
        modeId: payload.modeId,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set explicit variable mode: ' + message);
  }
}
