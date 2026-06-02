// Variable and design token command handlers

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import {
  parseColor,
  colorToHex,
  serializeVariable,
  serializeVariableCollection,
  getModeIdByName,
  convertVariableValue,
  validateTokenName,
  exportToDesignTokens,
} from '../utils/variable-factory';
import {
  getBoilerplateCollections,
  typographyTokens,
  shadowTokens,
  borderTokens,
  opacityTokens,
  zIndexTokens,
  transitionTokens,
  spacingTokens,
  screenTokens,
} from '../data/boilerplate-tokens';

// Types for variable payloads
interface CreateVariableCollectionPayload {
  name: string;
  modes?: string[];
}

interface EditVariableCollectionPayload {
  collectionId: string;
  name?: string;
  addModes?: string[];
  removeModeIds?: string[];
  renameModes?: { modeId: string; name: string }[];
}

interface CreateVariablePayload {
  collectionId: string;
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  values: Record<string, any>; // { modeName: value }
  description?: string;
  scopes?: VariableScope[];
  hiddenFromPublishing?: boolean;
}

interface EditVariablePayload {
  variableId: string;
  name?: string;
  values?: Record<string, any>;
  description?: string;
  scopes?: VariableScope[];
  hiddenFromPublishing?: boolean;
}

interface BindVariablePayload {
  nodeId: string;
  variableId: string;
  field: string; // e.g., 'fills', 'strokes', 'cornerRadius', etc.
}

interface GetVariablesPayload {
  collectionId?: string;
  collectionName?: string;
  includeValues?: boolean;
}

// Create a new variable collection
export async function handleCreateVariableCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as CreateVariableCollectionPayload;

  if (!payload.name) {
    return errorResult(command.id, 'Collection name is required');
  }

  try {
    const collection = figma.variables.createVariableCollection(payload.name);

    // Add additional modes if specified (first mode is created automatically)
    if (payload.modes && payload.modes.length > 1) {
      // Rename the default mode to the first mode name
      const defaultMode = collection.modes[0];
      collection.renameMode(defaultMode.modeId, payload.modes[0]);

      // Add remaining modes
      for (let i = 1; i < payload.modes.length; i++) {
        collection.addMode(payload.modes[i]);
      }
    } else if (payload.modes && payload.modes.length === 1) {
      // Just rename the default mode
      const defaultMode = collection.modes[0];
      collection.renameMode(defaultMode.modeId, payload.modes[0]);
    }

    return successResult(command.id, {
      data: serializeVariableCollection(collection),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Edit a variable collection
export async function handleEditVariableCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as EditVariableCollectionPayload;

  if (!payload.collectionId) {
    return errorResult(command.id, 'Collection ID is required');
  }

  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);
    if (!collection) {
      return errorResult(command.id, 'Collection not found: ' + payload.collectionId);
    }

    // Rename collection
    if (payload.name) {
      collection.name = payload.name;
    }

    // Add new modes
    if (payload.addModes) {
      for (const modeName of payload.addModes) {
        collection.addMode(modeName);
      }
    }

    // Rename modes
    if (payload.renameModes) {
      for (const rename of payload.renameModes) {
        collection.renameMode(rename.modeId, rename.name);
      }
    }

    // Remove modes
    if (payload.removeModeIds) {
      for (const modeId of payload.removeModeIds) {
        collection.removeMode(modeId);
      }
    }

    return successResult(command.id, {
      data: serializeVariableCollection(collection),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Delete a variable collection
export async function handleDeleteVariableCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { collectionId: string };

  if (!payload.collectionId) {
    return errorResult(command.id, 'Collection ID is required');
  }

  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);
    if (!collection) {
      return errorResult(command.id, 'Collection not found: ' + payload.collectionId);
    }

    const name = collection.name;
    collection.remove();

    return successResult(command.id, {
      data: { deleted: true, name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create a new variable
export async function handleCreateVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as CreateVariablePayload;

  if (!payload.collectionId) {
    return errorResult(command.id, 'Collection ID is required');
  }
  if (!payload.name) {
    return errorResult(command.id, 'Variable name is required');
  }
  if (!payload.type) {
    return errorResult(command.id, 'Variable type is required');
  }

  const validation = validateTokenName(payload.name);
  if (!validation.valid) {
    return errorResult(command.id, validation.error || 'Invalid token name');
  }

  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);
    if (!collection) {
      return errorResult(command.id, 'Collection not found: ' + payload.collectionId);
    }

    // Pass collection object (not ID) to support incremental mode
    const variable = figma.variables.createVariable(payload.name, collection, payload.type);

    // Set values for each mode
    if (payload.values) {
      var modeNames = Object.keys(payload.values);
      for (var i = 0; i < modeNames.length; i++) {
        var modeName = modeNames[i];
        var value = payload.values[modeName];
        const modeId = getModeIdByName(collection, modeName);
        if (modeId) {
          const convertedValue = convertVariableValue(value, payload.type);
          variable.setValueForMode(modeId, convertedValue);
        }
      }
    }

    // Set description
    if (payload.description) {
      variable.description = payload.description;
    }

    // Set scopes
    if (payload.scopes) {
      variable.scopes = payload.scopes;
    }

    // Set publishing visibility
    if (payload.hiddenFromPublishing !== undefined) {
      variable.hiddenFromPublishing = payload.hiddenFromPublishing;
    }

    return successResult(command.id, {
      data: serializeVariable(variable),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Edit an existing variable
export async function handleEditVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as EditVariablePayload;

  if (!payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  // Detect common mistake: "value" (singular) instead of "values" (plural)
  if ((payload as any).value !== undefined && payload.values === undefined) {
    return errorResult(command.id, "editVariable requires 'values' (plural) keyed by mode name, not 'value' (singular). Example: {\"values\": {\"Mode 1\": \"#ff0000\"}}");
  }

  // Require at least one editable field
  if (payload.name === undefined && payload.values === undefined && payload.description === undefined && payload.scopes === undefined && payload.hiddenFromPublishing === undefined) {
    return errorResult(command.id, 'editVariable requires at least one field to update (name, values, description, scopes, or hiddenFromPublishing)');
  }

  try {
    const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
    if (!collection) {
      return errorResult(command.id, 'Collection not found for variable');
    }

    // Update name
    if (payload.name) {
      const validation = validateTokenName(payload.name);
      if (!validation.valid) {
        return errorResult(command.id, validation.error || 'Invalid token name');
      }
      variable.name = payload.name;
    }

    // Update values
    if (payload.values) {
      var updateModeNames = Object.keys(payload.values);
      for (var i = 0; i < updateModeNames.length; i++) {
        var modeName = updateModeNames[i];
        var value = payload.values[modeName];
        const modeId = getModeIdByName(collection, modeName);
        if (modeId) {
          const convertedValue = convertVariableValue(value, variable.resolvedType);
          variable.setValueForMode(modeId, convertedValue);
        }
      }
    }

    // Update description
    if (payload.description !== undefined) {
      variable.description = payload.description;
    }

    // Update scopes
    if (payload.scopes) {
      variable.scopes = payload.scopes;
    }

    // Update publishing visibility
    if (payload.hiddenFromPublishing !== undefined) {
      variable.hiddenFromPublishing = payload.hiddenFromPublishing;
    }

    return successResult(command.id, {
      data: serializeVariable(variable),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Batch edit multiple variables in one call
export async function handleBatchEditVariable(command: FigmaCommand): Promise<CommandResult> {
  const payloads = command.payload as EditVariablePayload[];

  if (!Array.isArray(payloads)) {
    return errorResult(command.id, 'batchEditVariable requires an array of EditVariablePayload objects');
  }

  if (payloads.length === 0) {
    return errorResult(command.id, 'batchEditVariable requires at least one payload');
  }

  // Pre-validate all payloads for common mistakes before processing
  for (let i = 0; i < payloads.length; i++) {
    const p = payloads[i] as any;
    if (!p.variableId) {
      return errorResult(command.id, `Payload[${i}]: variableId is required`);
    }
    if (p.value !== undefined && p.values === undefined) {
      return errorResult(command.id, `Payload[${i}] (${p.variableId}): use 'values' (plural) keyed by mode name, not 'value' (singular)`);
    }
  }

  // Cache collection lookups (variables in same collection share the collection)
  const collectionCache = new Map<string, VariableCollection>();
  const results: object[] = [];
  const errors: string[] = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    try {
      const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
      if (!variable) {
        errors.push(`Payload[${i}] (${payload.variableId}): variable not found`);
        continue;
      }

      // Get collection from cache or fetch
      let collection = collectionCache.get(variable.variableCollectionId);
      if (!collection) {
        const fetched = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        if (!fetched) {
          errors.push(`Payload[${i}] (${payload.variableId}): collection not found`);
          continue;
        }
        collection = fetched;
        collectionCache.set(collection.id, collection);
      }

      // Update name
      if (payload.name) {
        const validation = validateTokenName(payload.name);
        if (!validation.valid) {
          errors.push(`Payload[${i}] (${payload.variableId}): ${validation.error}`);
          continue;
        }
        variable.name = payload.name;
      }

      // Update values
      if (payload.values) {
        const modeNames = Object.keys(payload.values);
        for (const modeName of modeNames) {
          const value = payload.values[modeName];
          const modeId = getModeIdByName(collection, modeName);
          if (modeId) {
            const convertedValue = convertVariableValue(value, variable.resolvedType);
            variable.setValueForMode(modeId, convertedValue);
          }
        }
      }

      // Update description
      if (payload.description !== undefined) {
        variable.description = payload.description;
      }

      // Update scopes
      if (payload.scopes) {
        variable.scopes = payload.scopes;
      }

      // Update publishing visibility
      if (payload.hiddenFromPublishing !== undefined) {
        variable.hiddenFromPublishing = payload.hiddenFromPublishing;
      }

      results.push(serializeVariable(variable));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Payload[${i}] (${payload.variableId}): ${message}`);
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return errorResult(command.id, errors.join('; '));
  }

  return successResult(command.id, {
    data: {
      edited: results.length,
      total: payloads.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}

// Delete a variable
export async function handleDeleteVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { variableId: string };

  if (!payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    const name = variable.name;
    variable.remove();

    return successResult(command.id, {
      data: { deleted: true, name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Bind a variable to a node property
export async function handleBindVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as BindVariablePayload;

  if (!payload.nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }
  if (!payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }
  if (!payload.field) {
    return errorResult(command.id, 'Field is required');
  }

  try {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    // Check if node supports setBoundVariable
    if (!('setBoundVariable' in node)) {
      return errorResult(command.id, 'Node does not support variable binding');
    }

    const bindableNode = node as SceneNode & { setBoundVariable: (field: string, variable: Variable) => void };
    bindableNode.setBoundVariable(payload.field as VariableBindableNodeField, variable);

    return successResult(command.id, {
      nodeId: node.id,
      data: {
        bound: true,
        field: payload.field,
        variableName: variable.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Bind a color variable to a node's fill
export async function handleBindFillVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { nodeId: string; variableId: string; fillIndex?: number };

  if (!payload.nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }
  if (!payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    if (!('fills' in node)) {
      return errorResult(command.id, 'Node does not support fills');
    }

    const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    if (variable.resolvedType !== 'COLOR') {
      return errorResult(command.id, 'Variable must be a COLOR type');
    }

    const fillableNode = node as MinimalFillsMixin;
    const currentFills = fillableNode.fills;

    // Check if fills is mixed (shouldn't happen for rectangles but let's be safe)
    if (currentFills === figma.mixed) {
      return errorResult(command.id, 'Cannot bind variable to mixed fills');
    }

    const fills = [...currentFills] as Paint[];
    const fillIndex = payload.fillIndex ?? 0;

    if (fillIndex >= fills.length) {
      // If no fills exist, create a solid paint first
      if (fills.length === 0) {
        const solidPaint: SolidPaint = {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 },
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        };
        fills.push(solidPaint);
      } else {
        return errorResult(command.id, `Fill index ${fillIndex} out of bounds (${fills.length} fills)`);
      }
    }

    const targetFill = fills[fillIndex];

    // setBoundVariableForPaint only works with SolidPaint
    if (targetFill.type !== 'SOLID') {
      return errorResult(command.id, `Fill at index ${fillIndex} is not a solid paint (type: ${targetFill.type})`);
    }

    // Use setBoundVariableForPaint to bind the color variable
    const boundPaint = figma.variables.setBoundVariableForPaint(targetFill, 'color', variable);
    fills[fillIndex] = boundPaint;
    fillableNode.fills = fills;

    return successResult(command.id, {
      nodeId: node.id,
      data: {
        bound: true,
        fillIndex,
        variableName: variable.name,
        fillType: targetFill.type,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Failed to bind variable: ${message}`);
  }
}

// Bind a color variable to a node's stroke
export async function handleBindStrokeVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { nodeId: string; variableId: string; strokeIndex?: number };

  if (!payload.nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }
  if (!payload.variableId) {
    return errorResult(command.id, 'Variable ID is required');
  }

  try {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    if (!('strokes' in node)) {
      return errorResult(command.id, 'Node does not support strokes');
    }

    const variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    if (variable.resolvedType !== 'COLOR') {
      return errorResult(command.id, 'Variable must be a COLOR type');
    }

    const strokeableNode = node as MinimalStrokesMixin;
    const currentStrokes = strokeableNode.strokes;

    // Check if strokes is mixed
    if ((currentStrokes as any) === figma.mixed) {
      return errorResult(command.id, 'Cannot bind variable to mixed strokes');
    }

    const strokes = [...currentStrokes] as Paint[];
    const strokeIndex = payload.strokeIndex ?? 0;

    if (strokeIndex >= strokes.length) {
      // If no strokes exist, create a solid paint first
      if (strokes.length === 0) {
        const solidPaint: SolidPaint = {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 },
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        };
        strokes.push(solidPaint);
      } else {
        return errorResult(command.id, `Stroke index ${strokeIndex} out of bounds (${strokes.length} strokes)`);
      }
    }

    const targetStroke = strokes[strokeIndex];

    // setBoundVariableForPaint only works with SolidPaint
    if (targetStroke.type !== 'SOLID') {
      return errorResult(command.id, `Stroke at index ${strokeIndex} is not a solid paint (type: ${targetStroke.type})`);
    }

    // Use setBoundVariableForPaint to bind the color variable
    const boundPaint = figma.variables.setBoundVariableForPaint(targetStroke, 'color', variable);
    strokes[strokeIndex] = boundPaint;
    strokeableNode.strokes = strokes;

    return successResult(command.id, {
      nodeId: node.id,
      data: {
        bound: true,
        strokeIndex,
        variableName: variable.name,
        strokeType: targetStroke.type,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Failed to bind stroke variable: ${message}`);
  }
}

// Debug: Inspect fills and their variable bindings
export async function handleInspectFills(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { nodeId: string };

  if (!payload.nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }

  try {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    if (!('fills' in node)) {
      return errorResult(command.id, 'Node does not support fills');
    }

    const fillableNode = node as MinimalFillsMixin;
    const fills = fillableNode.fills;

    if (fills === figma.mixed) {
      return successResult(command.id, {
        nodeId: node.id,
        data: { fills: 'mixed' },
      });
    }

    const fillsInfo = fills.map((fill, index) => {
      const info: Record<string, unknown> = {
        index,
        type: fill.type,
        visible: fill.visible,
      };

      if (fill.type === 'SOLID') {
        const solidFill = fill as SolidPaint;
        info.color = {
          r: Math.round(solidFill.color.r * 255),
          g: Math.round(solidFill.color.g * 255),
          b: Math.round(solidFill.color.b * 255),
        };
        info.opacity = solidFill.opacity;

        // Check for bound variables
        if (solidFill.boundVariables && solidFill.boundVariables.color) {
          info.boundVariable = {
            id: solidFill.boundVariables.color.id,
          };
        }
      }

      return info;
    });

    return successResult(command.id, {
      nodeId: node.id,
      data: { fills: fillsInfo, nodeName: node.name },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Unbind a variable from a node property
export async function handleUnbindVariable(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { nodeId: string; field: string };

  if (!payload.nodeId) {
    return errorResult(command.id, 'Node ID is required');
  }
  if (!payload.field) {
    return errorResult(command.id, 'Field is required');
  }

  try {
    const node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    if (!('setBoundVariable' in node)) {
      return errorResult(command.id, 'Node does not support variable binding');
    }

    const bindableNode = node as SceneNode & { setBoundVariable: (field: string, variable: Variable | null) => void };
    bindableNode.setBoundVariable(payload.field as VariableBindableNodeField, null);

    return successResult(command.id, {
      nodeId: node.id,
      data: {
        unbound: true,
        field: payload.field,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Query variables and collections
export async function handleGetVariables(command: FigmaCommand): Promise<CommandResult> {
  const payload = (command.payload as GetVariablesPayload) || {};

  try {
    // Get local collections first
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();

    // Build a map of all collections we find
    const collectionsMap = new Map<string, VariableCollection>();
    for (const collection of localCollections) {
      collectionsMap.set(collection.id, collection);
    }

    // Also get all local variables and find their collections
    // This helps catch collections that might not be returned by getLocalVariableCollectionsAsync
    const localVariables = await figma.variables.getLocalVariablesAsync();
    for (const variable of localVariables) {
      if (!collectionsMap.has(variable.variableCollectionId)) {
        const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        if (collection) {
          collectionsMap.set(collection.id, collection);
        }
      }
    }

    const collections = Array.from(collectionsMap.values());

    // Find collection by name if specified
    if (payload.collectionName) {
      let matchedCollection: VariableCollection | null = null;
      for (const c of collections) {
        if (c.name === payload.collectionName) {
          matchedCollection = c;
          break;
        }
      }
      if (!matchedCollection) {
        return errorResult(command.id, 'Collection not found by name: ' + payload.collectionName);
      }

      const variables: object[] = [];
      for (const varId of matchedCollection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(varId);
        if (variable) {
          variables.push(serializeVariable(variable));
        }
      }

      return successResult(command.id, {
        data: {
          collection: serializeVariableCollection(matchedCollection),
          variables,
        },
      });
    }

    if (payload.collectionId) {
      // Get specific collection with its variables
      const collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);
      if (!collection) {
        return errorResult(command.id, 'Collection not found: ' + payload.collectionId);
      }

      const variables: object[] = [];
      for (const varId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(varId);
        if (variable) {
          variables.push(serializeVariable(variable));
        }
      }

      return successResult(command.id, {
        data: {
          collection: serializeVariableCollection(collection),
          variables,
        },
      });
    }

    // Get all collections with summary
    const result = [];
    for (const collection of collections) {
      const collectionData = serializeVariableCollection(collection);

      if (payload.includeValues) {
        const variables: object[] = [];
        for (const varId of collection.variableIds) {
          const variable = await figma.variables.getVariableByIdAsync(varId);
          if (variable) {
            variables.push(serializeVariable(variable));
          }
        }
        var merged = Object.assign({}, collectionData, { variables: variables });
        result.push(merged);
      } else {
        result.push(collectionData);
      }
    }

    return successResult(command.id, {
      data: { collections: result, totalCollections: collections.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Export variables as design tokens
export async function handleExportTokens(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as { collectionId: string; modeName?: string };

  if (!payload.collectionId) {
    return errorResult(command.id, 'Collection ID is required');
  }

  try {
    const collection = await figma.variables.getVariableCollectionByIdAsync(payload.collectionId);
    if (!collection) {
      return errorResult(command.id, 'Collection not found: ' + payload.collectionId);
    }

    const variables: Variable[] = [];
    for (const varId of collection.variableIds) {
      const variable = await figma.variables.getVariableByIdAsync(varId);
      if (variable) {
        variables.push(variable);
      }
    }

    const tokens = exportToDesignTokens(collection, variables, payload.modeName);

    var defaultMode = collection.modes.find(function(m) { return m.modeId === collection.defaultModeId; });
    var modeName = payload.modeName || (defaultMode ? defaultMode.name : undefined);

    return successResult(command.id, {
      data: {
        collectionName: collection.name,
        mode: modeName,
        tokens: tokens,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Import design tokens
export async function handleImportTokens(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    collectionName: string;
    tokens: Record<string, any>;
    modes?: string[];
  };

  if (!payload.collectionName) {
    return errorResult(command.id, 'Collection name is required');
  }
  if (!payload.tokens) {
    return errorResult(command.id, 'Tokens are required');
  }

  try {
    // Create collection
    const collection = figma.variables.createVariableCollection(payload.collectionName);

    // Set up modes
    if (payload.modes && payload.modes.length > 0) {
      collection.renameMode(collection.modes[0].modeId, payload.modes[0]);
      for (let i = 1; i < payload.modes.length; i++) {
        collection.addMode(payload.modes[i]);
      }
    }

    const createdVariables: string[] = [];

    // Recursively process tokens
    function processTokens(obj: Record<string, any>, path: string = '') {
      var objKeys = Object.keys(obj);
      for (var k = 0; k < objKeys.length; k++) {
        var key = objKeys[k];
        var value = obj[key];
        const currentPath = path ? path + '/' + key : key;

        if (value && typeof value === 'object' && '$value' in value) {
          // This is a token
          const token = value as { $value: any; $type?: string; $description?: string };
          let type: VariableResolvedDataType = 'STRING';

          if (token.$type) {
            const typeMap: Record<string, VariableResolvedDataType> = {
              color: 'COLOR',
              number: 'FLOAT',
              float: 'FLOAT',
              string: 'STRING',
              boolean: 'BOOLEAN',
            };
            type = typeMap[token.$type.toLowerCase()] || 'STRING';
          } else if (typeof token.$value === 'string' && token.$value.startsWith('#')) {
            type = 'COLOR';
          } else if (typeof token.$value === 'number') {
            type = 'FLOAT';
          } else if (typeof token.$value === 'boolean') {
            type = 'BOOLEAN';
          }

          const variable = figma.variables.createVariable(currentPath, collection.id, type);
          const convertedValue = convertVariableValue(token.$value, type);
          variable.setValueForMode(collection.defaultModeId, convertedValue);

          if (token.$description) {
            variable.description = token.$description;
          }

          createdVariables.push(currentPath);
        } else if (value && typeof value === 'object') {
          // This is a group, recurse
          processTokens(value, currentPath);
        }
      }
    }

    processTokens(payload.tokens);

    return successResult(command.id, {
      data: {
        collectionId: collection.id,
        collectionName: collection.name,
        variablesCreated: createdVariables.length,
        variables: createdVariables,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Payload for boilerplate creation
interface CreateBoilerplatePayload {
  categories?: (
    | 'typography'
    | 'shadows'
    | 'borders'
    | 'opacity'
    | 'zIndex'
    | 'transitions'
    | 'spacing'
    | 'screens'
    | 'all'
  )[];
  collectionPrefix?: string;
}

// Create boilerplate design system variables
export async function handleCreateBoilerplate(command: FigmaCommand): Promise<CommandResult> {
  const payload = (command.payload as CreateBoilerplatePayload) || {};
  const categories = payload.categories || ['all'];
  const prefix = payload.collectionPrefix || '';

  const includeAll = categories.includes('all');
  const createdCollections: { name: string; id: string; variableCount: number }[] = [];

  try {
    // Helper to process tokens and create variables
    async function createVariablesFromTokens(
      collection: VariableCollection,
      tokens: Record<string, any>,
      pathPrefix: string = ''
    ): Promise<number> {
      let count = 0;

      var tokenKeys = Object.keys(tokens);
      for (var m = 0; m < tokenKeys.length; m++) {
        var key = tokenKeys[m];
        var value = tokens[key];
        const path = pathPrefix ? `${pathPrefix}/${key}` : key;

        if (value && typeof value === 'object' && '$value' in value) {
          // This is a token
          const token = value as { $value: any; $type?: string; $description?: string };
          let type: VariableResolvedDataType = 'STRING';

          if (token.$type) {
            const typeMap: Record<string, VariableResolvedDataType> = {
              color: 'COLOR',
              number: 'FLOAT',
              float: 'FLOAT',
              string: 'STRING',
              boolean: 'BOOLEAN',
            };
            type = typeMap[token.$type.toLowerCase()] || 'STRING';
          } else if (typeof token.$value === 'number') {
            type = 'FLOAT';
          } else if (typeof token.$value === 'boolean') {
            type = 'BOOLEAN';
          }

          const variable = figma.variables.createVariable(path, collection, type);
          const convertedValue = convertVariableValue(token.$value, type);
          variable.setValueForMode(collection.defaultModeId, convertedValue);

          if (token.$description) {
            variable.description = token.$description;
          }

          count++;
        } else if (value && typeof value === 'object') {
          // Nested group
          count += await createVariablesFromTokens(collection, value, path);
        }
      }

      return count;
    }

    // Create Typography collection
    if (includeAll || categories.includes('typography')) {
      const collName = prefix ? `${prefix}/Typography` : 'Typography';
      const collection = figma.variables.createVariableCollection(collName);
      collection.renameMode(collection.modes[0].modeId, 'Default');

      let varCount = 0;
      varCount += await createVariablesFromTokens(collection, typographyTokens.fontFamily, 'Font Family');
      varCount += await createVariablesFromTokens(collection, typographyTokens.fontSize, 'Font Size');
      varCount += await createVariablesFromTokens(collection, typographyTokens.fontWeight, 'Font Weight');
      varCount += await createVariablesFromTokens(collection, typographyTokens.lineHeight, 'Line Height');
      varCount += await createVariablesFromTokens(collection, typographyTokens.letterSpacing, 'Letter Spacing');

      createdCollections.push({ name: collName, id: collection.id, variableCount: varCount });
    }

    // Create Shadows/Effects collection
    if (includeAll || categories.includes('shadows') || categories.includes('transitions')) {
      const collName = prefix ? `${prefix}/Effects` : 'Effects';
      const collection = figma.variables.createVariableCollection(collName);
      collection.renameMode(collection.modes[0].modeId, 'Default');

      let varCount = 0;
      if (includeAll || categories.includes('shadows')) {
        varCount += await createVariablesFromTokens(collection, shadowTokens.elevation, 'Shadow');
      }
      if (includeAll || categories.includes('transitions')) {
        varCount += await createVariablesFromTokens(collection, transitionTokens.duration, 'Transition/Duration');
        varCount += await createVariablesFromTokens(collection, transitionTokens.easing, 'Transition/Easing');
      }

      createdCollections.push({ name: collName, id: collection.id, variableCount: varCount });
    }

    // Create Layout collection (borders, opacity, z-index)
    if (
      includeAll ||
      categories.includes('borders') ||
      categories.includes('opacity') ||
      categories.includes('zIndex')
    ) {
      const collName = prefix ? `${prefix}/Layout` : 'Layout';
      const collection = figma.variables.createVariableCollection(collName);
      collection.renameMode(collection.modes[0].modeId, 'Default');

      let varCount = 0;
      if (includeAll || categories.includes('borders')) {
        varCount += await createVariablesFromTokens(collection, borderTokens.width, 'Border/Width');
        varCount += await createVariablesFromTokens(collection, borderTokens.radius, 'Border/Radius');
      }
      if (includeAll || categories.includes('opacity')) {
        varCount += await createVariablesFromTokens(collection, opacityTokens.values, 'Opacity');
      }
      if (includeAll || categories.includes('zIndex')) {
        varCount += await createVariablesFromTokens(collection, zIndexTokens.layers, 'Z-Index');
      }

      createdCollections.push({ name: collName, id: collection.id, variableCount: varCount });
    }

    // Create Spacing collection
    if (includeAll || categories.includes('spacing')) {
      const collName = prefix ? `${prefix}/Spacing` : 'Spacing';
      const collection = figma.variables.createVariableCollection(collName);
      collection.renameMode(collection.modes[0].modeId, 'Default');

      const varCount = await createVariablesFromTokens(collection, spacingTokens.scale, 'Space');
      createdCollections.push({ name: collName, id: collection.id, variableCount: varCount });
    }

    // Create Screens collection (breakpoints and device widths)
    if (includeAll || categories.includes('screens')) {
      const collName = prefix ? `${prefix}/Screens` : 'Screens';
      const collection = figma.variables.createVariableCollection(collName);
      collection.renameMode(collection.modes[0].modeId, 'Default');

      let varCount = 0;
      varCount += await createVariablesFromTokens(collection, screenTokens.breakpoints, 'Breakpoint');
      varCount += await createVariablesFromTokens(collection, screenTokens.devices, 'Device');

      createdCollections.push({ name: collName, id: collection.id, variableCount: varCount });
    }

    const totalVariables = createdCollections.reduce((sum, c) => sum + c.variableCount, 0);

    return successResult(command.id, {
      data: {
        message: `Created ${createdCollections.length} collections with ${totalVariables} variables`,
        collections: createdCollections,
        totalVariables,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Helper: Convert RGB color to hex string
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

// Performance: Pre-computed hex lookup table for fast RGB->hex conversion
const HEX_TABLE = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

// Fast RGB to hex using lookup table - avoids repeated string operations
function rgbToHexFast(r: number, g: number, b: number): string {
  return `#${HEX_TABLE[Math.round(r * 255)]}${HEX_TABLE[Math.round(g * 255)]}${HEX_TABLE[Math.round(b * 255)]}`;
}

// Helper: Check if two colors are close enough (within tolerance)
function colorsMatch(hex1: string, hex2: string, tolerance: number = 0): boolean {
  if (tolerance === 0) {
    return hex1.toLowerCase() === hex2.toLowerCase();
  }

  // Parse hex colors
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);

  // Check if within tolerance
  return Math.abs(r1 - r2) <= tolerance &&
         Math.abs(g1 - g2) <= tolerance &&
         Math.abs(b1 - b2) <= tolerance;
}

// Bind matching colors to variables across nodes
export async function handleBindMatchingColors(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    scope?: 'selection' | 'page' | 'file';
    tolerance?: number; // Color matching tolerance (0-255), default 0 for exact match
    includeStrokes?: boolean; // Also bind strokes, default true
    maxNodes?: number; // Max nodes to process, default 10000
    dryRun?: boolean; // Just report what would be bound, don't actually bind
    validCollectionIds?: string[]; // Only keep bindings from these collections - rebind if from other collections
    forceRebind?: boolean; // Force rebind ALL nodes, ignoring existing bindings entirely
  };

  const scope = payload.scope || 'file';
  const tolerance = payload.tolerance || 0;
  const includeStrokes = payload.includeStrokes !== false;
  const maxNodes = payload.maxNodes || 10000;
  const dryRun = payload.dryRun || false;
  const validCollectionIds = payload.validCollectionIds ? new Set(payload.validCollectionIds) : null;
  const forceRebind = payload.forceRebind || false;

  try {
    // Performance optimization: skip invisible instance children
    figma.skipInvisibleInstanceChildren = true;

    // Step 1: Get all color variables and build a map
    // Resolve alias chains so Semantic/Token/Theme variables are indexed by their resolved hex
    const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    const colorMap = new Map<string, Variable[]>(); // hex -> variables

    // Cache collection lookups and compute collection priority
    // Higher priority = preferred for binding (Token > Semantic > Theme > Primitive)
    const collectionCache = new Map<string, VariableCollection>();
    const collectionPriority = new Map<string, number>();

    const getCollectionPriority = (collectionName: string): number => {
      const lower = collectionName.toLowerCase();
      if (lower.includes('token')) return 4;   // Tokens [ Level 3 ] — UI-specific, dark mode aware
      if (lower.includes('semantic')) return 3; // Semantic [ Level 2 ] — brand meanings
      if (lower.includes('theme')) return 2;    // Theme — app-level
      if (lower.includes('system')) return 2;   // M3 System tokens
      if (lower.includes('component')) return 1; // M3 Component tokens
      return 0;                                  // Primitive / Reference / raw
    };

    for (const variable of colorVariables) {
      let collection = collectionCache.get(variable.variableCollectionId);
      if (!collection) {
        const fetched = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
        if (!fetched) continue;
        collection = fetched;
        collectionCache.set(variable.variableCollectionId, collection);
        collectionPriority.set(variable.variableCollectionId, getCollectionPriority(collection.name));
      }

      // Resolve value — follow alias chains to get the actual RGB
      let value = variable.valuesByMode[collection.defaultModeId];
      let resolveDepth = 0;
      while (value && typeof value === 'object' && 'type' in value && (value as any).type === 'VARIABLE_ALIAS' && resolveDepth < 10) {
        const aliasedVar = await figma.variables.getVariableByIdAsync((value as any).id);
        if (!aliasedVar) { value = undefined as unknown as VariableValue; break; }
        const aliasedModeId = Object.keys(aliasedVar.valuesByMode)[0];
        if (!aliasedModeId) { value = undefined as unknown as VariableValue; break; }
        value = aliasedVar.valuesByMode[aliasedModeId];
        resolveDepth++;
      }

      if (!value || typeof value !== 'object' || !('r' in value)) continue;

      const rgb = value as RGB;
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

      if (!colorMap.has(hex)) {
        colorMap.set(hex, []);
      }
      colorMap.get(hex)!.push(variable);
    }

    // Sort each hex bucket by collection priority (highest first)
    // So Token-level variables are preferred over Primitives
    for (const [hex, variables] of colorMap.entries()) {
      variables.sort((a, b) => {
        const prioA = collectionPriority.get(a.variableCollectionId) || 0;
        const prioB = collectionPriority.get(b.variableCollectionId) || 0;
        return prioB - prioA; // Higher priority first
      });
    }

    if (colorMap.size === 0) {
      return successResult(command.id, {
        data: {
          message: 'No color variables found',
          bound: 0,
          skipped: 0,
        },
      });
    }

    // Step 2: Get nodes to process
    let nodesToProcess: SceneNode[] = [];

    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else {
      // file scope - load all pages in PARALLEL for performance
      await Promise.all(figma.root.children.map(page => page.loadAsync()));
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children);
      }
    }

    // Step 3: Recursively collect all nodes with fills (with depth limit)
    const allNodes: SceneNode[] = [];
    const MAX_DEPTH = 20; // Prevent stack overflow on deeply nested files
    let instanceChildrenSkipped = 0;

    function collectNodes(nodes: readonly SceneNode[], depth = 0, insideInstance = false) {
      if (depth > MAX_DEPTH || allNodes.length >= maxNodes) return;

      for (const node of nodes) {
        if (allNodes.length >= maxNodes) return;

        // Track if we're entering an instance (children of instances can't be modified)
        const nodeIsInstance = node.type === 'INSTANCE';

        // Check if node has fills or strokes
        if ('fills' in node || (includeStrokes && 'strokes' in node)) {
          // Skip children of instances - they can't have their fills modified
          if (insideInstance && !nodeIsInstance) {
            instanceChildrenSkipped++;
          } else {
            allNodes.push(node);
          }
        }

        // Recurse into children with depth tracking
        if ('children' in node) {
          const childrenInsideInstance = nodeIsInstance || insideInstance;
          collectNodes((node as FrameNode | GroupNode).children, depth + 1, childrenInsideInstance);
        }
      }
    }

    collectNodes(nodesToProcess, 0, false);

    // Sort nodes: COMPONENT first, then INSTANCE, then others
    // This ensures main components are updated before their instances
    allNodes.sort((a, b) => {
      const typeOrder = (type: string) => {
        if (type === 'COMPONENT') return 0;
        if (type === 'COMPONENT_SET') return 1;
        if (type === 'INSTANCE') return 3;
        return 2;
      };
      return typeOrder(a.type) - typeOrder(b.type);
    });

    // Step 4: Process nodes and bind variables
    const bindings: Array<{
      nodeId: string;
      nodeName: string;
      variableId: string;
      variableName: string;
      field: 'fill' | 'stroke';
      color: string;
    }> = [];
    let skipped = 0;
    let alreadyBound = 0;

    for (const node of allNodes) {
      // Process fills
      if ('fills' in node && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (let i = 0; i < fills.length; i++) {
          const fill = fills[i];
          if (fill.type !== 'SOLID') continue;

          // Check if already bound to a variable that actually exists AND is from a valid collection
          // Skip this check entirely if forceRebind is true
          if (!forceRebind && fill.boundVariables && fill.boundVariables.color) {
            try {
              const existingVar = await figma.variables.getVariableByIdAsync(fill.boundVariables.color.id);
              if (existingVar) {
                // If validCollectionIds is specified, check if variable is from a valid collection
                if (validCollectionIds && !validCollectionIds.has(existingVar.variableCollectionId)) {
                  // Variable is from an old/invalid collection - fall through to rebind
                } else {
                  alreadyBound++;
                  continue;
                }
              }
              // Variable doesn't exist - fall through to bind a new one
            } catch {
              // Error getting variable - fall through to bind a new one
            }
          }

          const fillHex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);

          // Find matching variable
          let matchedVariable: Variable | null = null;

          if (tolerance === 0) {
            const exactMatch = colorMap.get(fillHex);
            if (exactMatch && exactMatch.length > 0) {
              matchedVariable = exactMatch[0];
            }
          } else {
            // Check with tolerance
            for (const [hex, variables] of colorMap.entries()) {
              if (colorsMatch(fillHex, hex, tolerance)) {
                matchedVariable = variables[0];
                break;
              }
            }
          }

          if (matchedVariable) {
            if (!dryRun) {
              // Actually bind the variable
              try {
                const fillsCopy = [...fills];
                fillsCopy[i] = figma.variables.setBoundVariableForPaint(
                  fill,
                  'color',
                  matchedVariable
                );
                (node as GeometryMixin).fills = fillsCopy;
              } catch (e) {
                skipped++;
                continue;
              }
            }

            bindings.push({
              nodeId: node.id,
              nodeName: node.name,
              variableId: matchedVariable.id,
              variableName: matchedVariable.name,
              field: 'fill',
              color: fillHex,
            });
          } else {
            skipped++;
          }
        }
      }

      // Process strokes
      if (includeStrokes && 'strokes' in node && Array.isArray(node.strokes)) {
        const strokes = node.strokes as Paint[];
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (stroke.type !== 'SOLID') continue;

          // Check if already bound to a variable that actually exists AND is from a valid collection
          // Skip this check entirely if forceRebind is true
          if (!forceRebind && stroke.boundVariables && stroke.boundVariables.color) {
            try {
              const existingVar = await figma.variables.getVariableByIdAsync(stroke.boundVariables.color.id);
              if (existingVar) {
                // If validCollectionIds is specified, check if variable is from a valid collection
                if (validCollectionIds && !validCollectionIds.has(existingVar.variableCollectionId)) {
                  // Variable is from an old/invalid collection - fall through to rebind
                } else {
                  alreadyBound++;
                  continue;
                }
              }
              // Variable doesn't exist - fall through to bind a new one
            } catch {
              // Error getting variable - fall through to bind a new one
            }
          }

          const strokeHex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);

          // Find matching variable
          let matchedVariable: Variable | null = null;

          if (tolerance === 0) {
            const exactMatch = colorMap.get(strokeHex);
            if (exactMatch && exactMatch.length > 0) {
              matchedVariable = exactMatch[0];
            }
          } else {
            for (const [hex, variables] of colorMap.entries()) {
              if (colorsMatch(strokeHex, hex, tolerance)) {
                matchedVariable = variables[0];
                break;
              }
            }
          }

          if (matchedVariable) {
            if (!dryRun) {
              try {
                const strokesCopy = [...strokes];
                strokesCopy[i] = figma.variables.setBoundVariableForPaint(
                  stroke,
                  'color',
                  matchedVariable
                );
                (node as GeometryMixin).strokes = strokesCopy;
              } catch (e) {
                skipped++;
                continue;
              }
            }

            bindings.push({
              nodeId: node.id,
              nodeName: node.name,
              variableId: matchedVariable.id,
              variableName: matchedVariable.name,
              field: 'stroke',
              color: strokeHex,
            });
          } else {
            skipped++;
          }
        }
      }
    }

    // Group bindings by variable for summary
    const bindingsByVariable = new Map<string, number>();
    for (const binding of bindings) {
      const count = bindingsByVariable.get(binding.variableName) || 0;
      bindingsByVariable.set(binding.variableName, count + 1);
    }

    const summary = Array.from(bindingsByVariable.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ variable: name, count }));

    return successResult(command.id, {
      data: {
        message: dryRun
          ? `Would bind ${bindings.length} colors (dry run)`
          : `Bound ${bindings.length} colors to variables (${instanceChildrenSkipped} instance children skipped)`,
        scope,
        tolerance,
        nodesScanned: allNodes.length,
        instanceChildrenSkipped,
        bound: bindings.length,
        alreadyBound,
        skipped,
        colorVariablesAvailable: colorVariables.length,
        uniqueColorsInVariables: colorMap.size,
        summary,
        bindings: bindings.slice(0, 100), // Return first 100 for reference
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Replace colors by intent mapping - maps old hex colors to new variables regardless of RGB match
export async function handleReplaceColorsByMapping(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    mappings: Array<{
      fromHex: string; // Old color to find (e.g., "#6366F1")
      toVariableId: string; // New variable to bind (e.g., "VariableID:123:456" or "Brand-500")
      includeStrokes?: boolean; // Also replace strokes, default true
    }>;
    scope?: 'selection' | 'page' | 'file';
    maxNodes?: number;
    tolerance?: number; // Color matching tolerance for finding old colors (0-255), default 5
  };

  const mappings = payload.mappings || [];
  const scope = payload.scope || 'file';
  const maxNodes = payload.maxNodes || 5000; // Lower default for safety
  const tolerance = payload.tolerance ?? 5; // Small tolerance by default for intent matching

  if (mappings.length === 0) {
    return errorResult(command.id, 'No mappings provided');
  }

  try {
    figma.skipInvisibleInstanceChildren = true;

    // Build mapping from hex to variable
    const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    const variableMap = new Map<string, Variable>();

    // Index variables by ID and name for lookup
    for (const v of colorVariables) {
      variableMap.set(v.id, v);
      variableMap.set(v.name, v);
      // Also index by short name (e.g., "Brand-500" from "Color/Brand Scale/Brand-500")
      const shortName = v.name.split('/').pop() || v.name;
      variableMap.set(shortName, v);
    }

    // Process mappings - resolve variable references
    const resolvedMappings: Array<{
      fromR: number;
      fromG: number;
      fromB: number;
      fromHex: string;
      toVariable: Variable;
      includeStrokes: boolean;
    }> = [];

    for (const mapping of mappings) {
      const hex = mapping.fromHex.toUpperCase().replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      // Find the target variable
      let targetVar = variableMap.get(mapping.toVariableId);
      if (!targetVar) {
        // Try with VariableID: prefix
        targetVar = variableMap.get(`VariableID:${mapping.toVariableId}`);
      }
      if (!targetVar) {
        return errorResult(command.id, `Variable not found: ${mapping.toVariableId}`);
      }

      resolvedMappings.push({
        fromR: r,
        fromG: g,
        fromB: b,
        fromHex: `#${hex}`,
        toVariable: targetVar,
        includeStrokes: mapping.includeStrokes !== false,
      });
    }

    // Get nodes to process
    let nodes: SceneNode[] = [];
    let instanceChildrenSkipped = 0;

    // Filter function to exclude children of instances
    const isModifiableNode = (node: SceneNode): boolean => {
      let current: BaseNode | null = node.parent;
      while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
        if (current.type === 'INSTANCE') {
          instanceChildrenSkipped++;
          return false;
        }
        if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') {
          return true;
        }
        current = current.parent;
      }
      return true;
    };

    if (scope === 'selection') {
      nodes = [...figma.currentPage.selection].filter(isModifiableNode);
    } else if (scope === 'page') {
      nodes = figma.currentPage.findAll(isModifiableNode).slice(0, maxNodes);
    } else {
      // File scope - load all pages at once (more efficient than one-by-one)
      await figma.loadAllPagesAsync();
      for (const page of figma.root.children) {
        if (nodes.length >= maxNodes) break;
        const pageNodes = page.findAll(isModifiableNode);
        nodes.push(...pageNodes.slice(0, maxNodes - nodes.length));
      }
    }

    // Sort: COMPONENT before INSTANCE
    nodes.sort((a, b) => {
      const aIsComponent = a.type === 'COMPONENT' || a.type === 'COMPONENT_SET' ? 0 : 1;
      const bIsComponent = b.type === 'COMPONENT' || b.type === 'COMPONENT_SET' ? 0 : 1;
      return aIsComponent - bIsComponent;
    });

    // Helper to check color match with tolerance
    const colorsMatch = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): boolean => {
      const r1i = Math.round(r1 * 255);
      const g1i = Math.round(g1 * 255);
      const b1i = Math.round(b1 * 255);
      const r2i = Math.round(r2 * 255);
      const g2i = Math.round(g2 * 255);
      const b2i = Math.round(b2 * 255);
      return Math.abs(r1i - r2i) <= tolerance &&
             Math.abs(g1i - g2i) <= tolerance &&
             Math.abs(b1i - b2i) <= tolerance;
    };

    const results: Array<{
      nodeId: string;
      nodeName: string;
      fromHex: string;
      toVariable: string;
      field: 'fill' | 'stroke';
    }> = [];
    let replaced = 0;
    let skipped = 0;

    // Process in batches to avoid blocking the UI thread
    const BATCH_SIZE = 100;
    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      // Yield control every BATCH_SIZE nodes to keep plugin responsive
      if (nodeIndex > 0 && nodeIndex % BATCH_SIZE === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const node = nodes[nodeIndex];
      // Process fills
      if ('fills' in node && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (let i = 0; i < fills.length; i++) {
          const fill = fills[i];
          if (fill.type !== 'SOLID') continue;

          // Check against each mapping
          for (const mapping of resolvedMappings) {
            if (colorsMatch(fill.color.r, fill.color.g, fill.color.b, mapping.fromR, mapping.fromG, mapping.fromB)) {
              try {
                const fillsCopy = JSON.parse(JSON.stringify(fills));
                const newFill = { ...fillsCopy[i] };
                delete newFill.boundVariables;
                fillsCopy[i] = figma.variables.setBoundVariableForPaint(newFill, 'color', mapping.toVariable);
                (node as GeometryMixin).fills = fillsCopy;

                results.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromHex: mapping.fromHex,
                  toVariable: mapping.toVariable.name,
                  field: 'fill',
                });
                replaced++;
              } catch {
                skipped++;
              }
              break; // Only match first mapping
            }
          }
        }
      }

      // Process strokes
      if ('strokes' in node && Array.isArray(node.strokes)) {
        const strokes = node.strokes as Paint[];
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (stroke.type !== 'SOLID') continue;

          for (const mapping of resolvedMappings) {
            if (!mapping.includeStrokes) continue;

            if (colorsMatch(stroke.color.r, stroke.color.g, stroke.color.b, mapping.fromR, mapping.fromG, mapping.fromB)) {
              try {
                const strokesCopy = JSON.parse(JSON.stringify(strokes));
                const newStroke = { ...strokesCopy[i] };
                delete newStroke.boundVariables;
                strokesCopy[i] = figma.variables.setBoundVariableForPaint(newStroke, 'color', mapping.toVariable);
                (node as GeometryMixin).strokes = strokesCopy;

                results.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromHex: mapping.fromHex,
                  toVariable: mapping.toVariable.name,
                  field: 'stroke',
                });
                replaced++;
              } catch {
                skipped++;
              }
              break;
            }
          }
        }
      }
    }

    // Summarize by mapping
    const summary = resolvedMappings.map(m => ({
      fromHex: m.fromHex,
      toVariable: m.toVariable.name,
      count: results.filter(r => r.fromHex === m.fromHex).length,
    }));

    return successResult(command.id, {
      data: {
        message: `Replaced ${replaced} colors by intent mapping (${instanceChildrenSkipped} instance children skipped)`,
        scope,
        tolerance,
        nodesScanned: nodes.length,
        instanceChildrenSkipped,
        replaced,
        skipped,
        mappingsProvided: mappings.length,
        summary,
        replacements: results.slice(0, 100),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Rebind variables - find nodes bound to one variable and rebind to another
// This enables intent-based replacement for already-bound colors
export async function handleRebindVariables(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    mappings: Array<{
      fromVariableId: string; // Variable ID or name to find (e.g., "Purple-500" or "VariableID:123:456")
      toVariableId: string;   // Variable ID or name to rebind to (e.g., "Brand-500")
      includeStrokes?: boolean; // Also rebind strokes, default true
    }>;
    scope?: 'selection' | 'page' | 'file';
    maxNodes?: number;
  };

  const mappings = payload.mappings || [];
  const scope = payload.scope || 'file';
  const maxNodes = payload.maxNodes || 10000;

  if (mappings.length === 0) {
    return errorResult(command.id, 'No mappings provided');
  }

  try {
    figma.skipInvisibleInstanceChildren = true;

    // Get all color variables and index them
    const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    const variableMap = new Map<string, Variable>();

    for (const v of colorVariables) {
      variableMap.set(v.id, v);
      variableMap.set(v.name, v);
      // Also index by short name (e.g., "Brand-500" from "Color/Brand Scale/Brand-500")
      const shortName = v.name.split('/').pop() || v.name;
      variableMap.set(shortName, v);
    }

    // Resolve mappings
    const resolvedMappings: Array<{
      fromVariable: Variable;
      toVariable: Variable;
      includeStrokes: boolean;
    }> = [];

    for (const mapping of mappings) {
      // Find source variable
      let fromVar = variableMap.get(mapping.fromVariableId);
      if (!fromVar) {
        fromVar = variableMap.get(`VariableID:${mapping.fromVariableId}`);
      }
      if (!fromVar) {
        return errorResult(command.id, `Source variable not found: ${mapping.fromVariableId}`);
      }

      // Find target variable
      let toVar = variableMap.get(mapping.toVariableId);
      if (!toVar) {
        toVar = variableMap.get(`VariableID:${mapping.toVariableId}`);
      }
      if (!toVar) {
        return errorResult(command.id, `Target variable not found: ${mapping.toVariableId}`);
      }

      resolvedMappings.push({
        fromVariable: fromVar,
        toVariable: toVar,
        includeStrokes: mapping.includeStrokes !== false,
      });
    }

    const results: Array<{
      nodeId: string;
      nodeName: string;
      fromVariable: string;
      toVariable: string;
      field: 'fill' | 'stroke';
    }> = [];
    let rebound = 0;
    let skipped = 0;
    let nodesScanned = 0;

    // Helper to process a single node
    const processNode = (node: SceneNode) => {
      // Process fills
      if ('fills' in node && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (let i = 0; i < fills.length; i++) {
          const fill = fills[i];
          if (fill.type !== 'SOLID') continue;

          const boundVars = fill.boundVariables;
          if (!boundVars || !boundVars.color) continue;

          const boundVarId = (boundVars.color as VariableAlias).id;

          for (const mapping of resolvedMappings) {
            if (boundVarId === mapping.fromVariable.id) {
              try {
                const fillsCopy = JSON.parse(JSON.stringify(fills));
                const newFill = { ...fillsCopy[i] };
                delete newFill.boundVariables;
                fillsCopy[i] = figma.variables.setBoundVariableForPaint(newFill, 'color', mapping.toVariable);
                (node as GeometryMixin).fills = fillsCopy;

                results.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromVariable: mapping.fromVariable.name,
                  toVariable: mapping.toVariable.name,
                  field: 'fill',
                });
                rebound++;
              } catch {
                skipped++;
              }
              break;
            }
          }
        }
      }

      // Process strokes
      if ('strokes' in node && Array.isArray(node.strokes)) {
        const strokes = node.strokes as Paint[];
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (stroke.type !== 'SOLID') continue;

          const boundVars = stroke.boundVariables;
          if (!boundVars || !boundVars.color) continue;

          const boundVarId = (boundVars.color as VariableAlias).id;

          for (const mapping of resolvedMappings) {
            if (!mapping.includeStrokes) continue;

            if (boundVarId === mapping.fromVariable.id) {
              try {
                const strokesCopy = JSON.parse(JSON.stringify(strokes));
                const newStroke = { ...strokesCopy[i] };
                delete newStroke.boundVariables;
                strokesCopy[i] = figma.variables.setBoundVariableForPaint(newStroke, 'color', mapping.toVariable);
                (node as GeometryMixin).strokes = strokesCopy;

                results.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromVariable: mapping.fromVariable.name,
                  toVariable: mapping.toVariable.name,
                  field: 'stroke',
                });
                rebound++;
              } catch {
                skipped++;
              }
              break;
            }
          }
        }
      }
    };

    // Process based on scope
    const BATCH_SIZE = 50;
    let instanceChildrenSkipped = 0;

    // Filter function to exclude children of instances
    const isModifiableNode = (node: SceneNode): boolean => {
      let current: BaseNode | null = node.parent;
      while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
        if (current.type === 'INSTANCE') {
          instanceChildrenSkipped++;
          return false;
        }
        if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') {
          return true;
        }
        current = current.parent;
      }
      return true;
    };

    if (scope === 'selection') {
      const nodes = [...figma.currentPage.selection].filter(isModifiableNode);
      for (const node of nodes) {
        processNode(node);
        nodesScanned++;
      }
    } else if (scope === 'page') {
      const nodes = figma.currentPage.findAll(isModifiableNode).slice(0, maxNodes);
      // Sort: COMPONENT before INSTANCE
      nodes.sort((a, b) => {
        const aIsComponent = a.type === 'COMPONENT' || a.type === 'COMPONENT_SET' ? 0 : 1;
        const bIsComponent = b.type === 'COMPONENT' || b.type === 'COMPONENT_SET' ? 0 : 1;
        return aIsComponent - bIsComponent;
      });
      for (let i = 0; i < nodes.length; i++) {
        if (i > 0 && i % BATCH_SIZE === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        processNode(nodes[i]);
        nodesScanned++;
      }
    } else {
      // File scope - process page by page to avoid memory issues
      for (const page of figma.root.children) {
        if (nodesScanned >= maxNodes) break;

        // Load this page
        await page.loadAsync();

        // Yield after loading
        await new Promise(resolve => setTimeout(resolve, 0));

        const nodes = page.findAll(isModifiableNode);
        // Sort: COMPONENT before INSTANCE
        nodes.sort((a, b) => {
          const aIsComponent = a.type === 'COMPONENT' || a.type === 'COMPONENT_SET' ? 0 : 1;
          const bIsComponent = b.type === 'COMPONENT' || b.type === 'COMPONENT_SET' ? 0 : 1;
          return aIsComponent - bIsComponent;
        });

        for (let i = 0; i < nodes.length && nodesScanned < maxNodes; i++) {
          if (i > 0 && i % BATCH_SIZE === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          processNode(nodes[i]);
          nodesScanned++;
        }

        // Yield between pages
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Summarize by mapping
    const summary = resolvedMappings.map(m => ({
      fromVariable: m.fromVariable.name,
      toVariable: m.toVariable.name,
      count: results.filter(r => r.fromVariable === m.fromVariable.name).length,
    }));

    return successResult(command.id, {
      data: {
        message: `Rebound ${rebound} variable bindings (${instanceChildrenSkipped} instance children skipped)`,
        scope,
        nodesScanned,
        instanceChildrenSkipped,
        rebound,
        skipped,
        mappingsProvided: mappings.length,
        summary,
        rebindings: results.slice(0, 100),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Helper: Calculate color saturation (0-1)
function getColorSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

// Helper: Calculate color luminance (0-1)
function getColorLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Helper: Map luminance to Gray scale variable name
function luminanceToGrayVariable(luminance: number): string {
  // Map luminance (0-1) to Gray scale (950 = darkest, 50 = lightest)
  if (luminance >= 0.98) return 'Color/Gray Scale/Gray-50';
  if (luminance >= 0.96) return 'Color/Gray Scale/Gray-100';
  if (luminance >= 0.90) return 'Color/Gray Scale/Gray-200';
  if (luminance >= 0.83) return 'Color/Gray Scale/Gray-300';
  if (luminance >= 0.64) return 'Color/Gray Scale/Gray-400';
  if (luminance >= 0.45) return 'Color/Gray Scale/Gray-500';
  if (luminance >= 0.32) return 'Color/Gray Scale/Gray-600';
  if (luminance >= 0.25) return 'Color/Gray Scale/Gray-700';
  if (luminance >= 0.15) return 'Color/Gray Scale/Gray-800';
  if (luminance >= 0.10) return 'Color/Gray Scale/Gray-900';
  return 'Color/Gray Scale/Gray-950';
}

// Helper: Check if a node is a child of an instance (non-modifiable)
// Returns true if the node is inside an instance (but not the instance itself)
function isChildOfInstance(node: SceneNode): boolean {
  let current: BaseNode | null = node.parent;
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if (current.type === 'INSTANCE') {
      return true;
    }
    // Stop at COMPONENT boundary - children inside components ARE modifiable
    if (current.type === 'COMPONENT' || current.type === 'COMPONENT_SET') {
      return false;
    }
    current = current.parent;
  }
  return false;
}

// === AUTO-BIND BY SEMANTIC ROLE ===
// Binds colors based on their TRUE semantic role (background, text, accent, card, etc.)
// by analyzing color properties (lightness, saturation) AND node context (type, size, parent)

interface SemanticRole {
  role: 'background' | 'surface' | 'card' | 'text-on-dark' | 'text-on-light' | 'accent' | 'border' | 'neutral';
  confidence: number;
  reason: string;
}

interface RoleBinding {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  originalColor: string;
  role: SemanticRole;
  variableName: string;
  success: boolean;
  error?: string;
}

// Convert RGB (0-1 range) to HSL
function rgbToHslSemantic(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s, l };
}

// === WCAG CONTRAST CALCULATION ===
// WCAG 2.0 AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt bold)

// Calculate relative luminance per WCAG 2.0 formula
function getRelativeLuminance(rgb: RGB): number {
  const sRGB = [rgb.r, rgb.g, rgb.b].map(val => {
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

// Calculate contrast ratio between two colors (returns value between 1 and 21)
function getContrastRatio(color1: RGB, color2: RGB): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
function meetsWCAGAA(foreground: RGB, background: RGB, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// Get the effective background color by traversing up the node tree
// This finds the first solid fill that would be visible behind the node
async function getEffectiveBackgroundColor(node: BaseNode, maxDepth: number = 20): Promise<RGB | null> {
  let current: BaseNode | null = node.parent;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') {
      // Default page background - assume white for light mode designs, dark gray for dark mode
      // We'll detect based on what we've seen so far
      return { r: 1, g: 1, b: 1 }; // Default white
    }

    if ('fills' in current) {
      const fills = (current as MinimalFillsMixin).fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        // Find the first visible solid fill (going from top to bottom of fill stack)
        for (let i = fills.length - 1; i >= 0; i--) {
          const fill = fills[i];
          if (fill.type === 'SOLID' && fill.visible !== false && (fill.opacity ?? 1) > 0.5) {
            return fill.color;
          }
        }
      }
    }

    current = current.parent;
    depth++;
  }

  return null;
}

// Resolve a variable to its actual RGB color value
async function resolveVariableColor(variable: Variable): Promise<RGB | null> {
  try {
    const modeId = Object.keys(variable.valuesByMode)[0];
    if (!modeId) return null;

    let value = variable.valuesByMode[modeId];

    // If it's an alias, resolve it
    let resolveDepth = 0;
    while (value && typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS' && resolveDepth < 10) {
      const aliasedVar = await figma.variables.getVariableByIdAsync(value.id);
      if (!aliasedVar) return null;
      const aliasedModeId = Object.keys(aliasedVar.valuesByMode)[0];
      if (!aliasedModeId) return null;
      value = aliasedVar.valuesByMode[aliasedModeId];
      resolveDepth++;
    }

    if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
      return value as RGB;
    }
  } catch (e) {
    console.error(`Failed to resolve variable ${variable.name}:`, e);
  }
  return null;
}

// Determine semantic role based on color properties and node context
function determineSemanticRole(
  color: RGB,
  nodeType: string,
  nodeWidth: number,
  nodeHeight: number,
  isStroke: boolean,
  parentLightness?: number
): SemanticRole {
  const hsl = rgbToHslSemantic(color.r, color.g, color.b);
  const area = nodeWidth * nodeHeight;
  const isLargeArea = area > 10000; // > 100x100 pixels
  const isVeryLargeArea = area > 100000; // > ~316x316 pixels
  const isTextNode = nodeType === 'TEXT';

  // Very dark colors (lightness < 15%)
  if (hsl.l < 0.15) {
    if (isTextNode) {
      return { role: 'text-on-light', confidence: 0.9, reason: 'Dark text on light background' };
    }
    if (isStroke) {
      return { role: 'border', confidence: 0.7, reason: 'Dark stroke/border' };
    }
    if (isVeryLargeArea) {
      return { role: 'background', confidence: 0.95, reason: 'Very dark, large area = page background' };
    }
    if (isLargeArea) {
      return { role: 'surface', confidence: 0.85, reason: 'Dark, medium area = surface' };
    }
    return { role: 'surface', confidence: 0.7, reason: 'Dark fill' };
  }

  // Very light colors (lightness > 90%)
  if (hsl.l > 0.90) {
    if (isTextNode) {
      // Check if parent is dark (if we know)
      if (parentLightness !== undefined && parentLightness < 0.3) {
        return { role: 'text-on-dark', confidence: 0.95, reason: 'Light text on dark parent' };
      }
      return { role: 'text-on-dark', confidence: 0.85, reason: 'Very light text (likely on dark bg)' };
    }
    if (isStroke) {
      return { role: 'border', confidence: 0.6, reason: 'Light stroke/border' };
    }
    if (isLargeArea) {
      return { role: 'card', confidence: 0.8, reason: 'Light, large area = card/panel' };
    }
    return { role: 'neutral', confidence: 0.6, reason: 'Light fill' };
  }

  // High saturation colors (saturation > 50%) = likely accent/brand
  if (hsl.s > 0.5) {
    if (isTextNode) {
      return { role: 'accent', confidence: 0.7, reason: 'Saturated text = accent/link' };
    }
    return { role: 'accent', confidence: 0.85, reason: 'High saturation = brand/accent color' };
  }

  // Mid-range lightness with low saturation = neutral/gray
  if (hsl.s < 0.15) {
    if (isTextNode) {
      if (hsl.l < 0.5) {
        return { role: 'text-on-light', confidence: 0.75, reason: 'Gray text (likely on light)' };
      } else {
        return { role: 'text-on-dark', confidence: 0.75, reason: 'Light gray text (likely on dark)' };
      }
    }
    if (hsl.l > 0.7) {
      return { role: 'card', confidence: 0.7, reason: 'Light gray = card/elevated surface' };
    }
    if (hsl.l > 0.4) {
      return { role: 'border', confidence: 0.6, reason: 'Mid gray = border/divider' };
    }
    return { role: 'surface', confidence: 0.65, reason: 'Dark gray = surface' };
  }

  // Default: moderate saturation, moderate lightness
  if (isTextNode) {
    return { role: hsl.l > 0.5 ? 'text-on-dark' : 'text-on-light', confidence: 0.5, reason: 'Mid-tone text' };
  }

  return { role: 'neutral', confidence: 0.4, reason: 'Could not determine clear role' };
}

// Find the best matching variable for a semantic role
// IMPORTANT: Prioritizes Theme/Tokens level variables that support dark mode
async function findVariableForRole(
  role: SemanticRole,
  variables: Variable[],
  hsl: { h: number; s: number; l: number }
): Promise<Variable | null> {
  // Build lookup patterns for each role - prioritized order
  // Theme/Tokens level patterns first (support dark mode), then Primitive fallbacks
  const rolePatterns: Record<string, string[]> = {
    // For backgrounds/surfaces: prefer Theme-level tokens that support dark mode
    'background': [
      'surface/page',                    // Token level - dark mode aware
      'surface/background/primary',      // Token level - dark mode aware
      'surface/background',              // Partial match
      // Primitive fallbacks (no dark mode)
      'gray scale/950', 'gray scale/900'
    ],
    'surface': [
      'surface/elevated',                // Token level - dark mode aware
      'surface/background/secondary',    // Token level - dark mode aware
      'surface/background/tertiary',     // Token level - dark mode aware
      // Primitive fallbacks
      'gray scale/900', 'gray scale/850'
    ],
    'card': [
      'surface/card',                    // Token level - dark mode aware (light: white, dark: gray-900)
      'surface/elevated',                // Token level - dark mode aware
      'surface/background/secondary',    // Token level fallback
      // Primitive fallbacks (no dark mode)
      'system/white', 'gray scale/50'
    ],
    // For text: prefer theme-level text tokens
    'text-on-dark': [
      'text/inverse',                    // Token level - dark mode aware (light: white, dark: gray-900)
      'text/on-dark',
      // Primitive fallbacks
      'gray scale/50', 'system/white'
    ],
    'text-on-light': [
      'text/primary',                    // Token level - dark mode aware (light: gray-900, dark: gray-50)
      'text/default',
      // Primitive fallbacks
      'gray scale/900', 'system/black'
    ],
    'accent': [
      'brand/primary',                   // Theme level
      'brand/500', 'brand scale/500',
      'accent/primary', 'primary/500'
    ],
    'border': [
      'border/default',                  // Token level - dark mode aware
      'border/primary',
      // Primitive fallbacks
      'gray scale/300', 'gray scale/700'
    ],
    'neutral': ['gray scale/', 'neutral/'],
  };

  const patterns = rolePatterns[role.role] || [];

  // First pass: look for EXACT Theme/Tokens level matches (collections with dark mode)
  // These are typically in collections like "Theme", "Tokens [ Level 3 ]", "Semantic [ Level 2 ]"
  for (const pattern of patterns) {
    // Check for variables that look like they're from theme/token collections
    // by looking for slashes (hierarchical names) or specific naming conventions
    const themeMatch = variables.find(v => {
      const name = v.name.toLowerCase();
      const patternLower = pattern.toLowerCase();
      // Check if name contains the pattern AND looks like a theme-level variable
      // Theme variables typically have structure like "Surface/Background/Primary" or "Text/Primary"
      if (!name.includes(patternLower)) return false;
      // Prefer variables with multiple path segments (theme-level)
      const segments = v.name.split('/');
      return segments.length >= 2;
    });
    if (themeMatch) return themeMatch;
  }

  // Second pass: try each pattern without the theme-level requirement
  for (const pattern of patterns) {
    const match = variables.find(v => v.name.toLowerCase().includes(pattern.toLowerCase()));
    if (match) return match;
  }

  // Fallback: for accent role, find any brand color
  if (role.role === 'accent') {
    const brandVar = variables.find(v =>
      v.name.toLowerCase().includes('brand') &&
      (v.name.includes('500') || v.name.includes('400') || v.name.toLowerCase().includes('primary'))
    );
    if (brandVar) return brandVar;
  }

  // Fallback: for neutrals, try to match by lightness to gray scale
  if (role.role === 'neutral' || !patterns.length) {
    const grayVars = variables.filter(v =>
      v.name.toLowerCase().includes('gray') || v.name.toLowerCase().includes('neutral')
    );

    if (grayVars.length > 0) {
      // Map lightness to gray scale number (0 = 950, 1 = 50)
      const targetGrayNumber = Math.round((1 - hsl.l) * 900 + 50);
      let closest: Variable | null = null;
      let closestDiff = Infinity;

      for (const v of grayVars) {
        const match = v.name.match(/(\d+)$/);
        if (match) {
          const grayNum = parseInt(match[1]);
          const diff = Math.abs(grayNum - targetGrayNumber);
          if (diff < closestDiff) {
            closestDiff = diff;
            closest = v;
          }
        }
      }
      if (closest) return closest;
    }
  }

  return null;
}

// Get background color of parent node for context
async function getParentBackgroundLightness(node: BaseNode): Promise<number | undefined> {
  if (!node.parent || node.parent.type === 'PAGE' || node.parent.type === 'DOCUMENT') {
    return undefined;
  }

  const parent = node.parent;
  if ('fills' in parent) {
    const fills = (parent as MinimalFillsMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills) && fills.length > 0) {
      const fill = fills[0];
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const hsl = rgbToHslSemantic(fill.color.r, fill.color.g, fill.color.b);
        return hsl.l;
      }
    }
  }

  // Recurse up
  return getParentBackgroundLightness(parent);
}

// === WCAG-COMPLIANT TEXT VARIABLE SELECTION ===
// Find the best text variable that provides WCAG AA contrast with the actual background

interface TextVariableResult {
  variable: Variable;
  contrast: number;
  meetsWCAG: boolean;
  role: 'text-on-dark' | 'text-on-light';
  reason: string;
}

// Cache for resolved variable colors to avoid repeated lookups
const variableColorCache = new Map<string, RGB | null>();

async function findBestTextVariable(
  backgroundColor: RGB,
  variables: Variable[],
  isLargeText: boolean = false
): Promise<TextVariableResult | null> {
  // Find candidate text variables
  const textOnDarkPatterns = ['text/inverse', 'text/on-dark', 'gray scale/50', 'gray-50', 'system/white', 'white'];
  const textOnLightPatterns = ['text/primary', 'text/on-light', 'gray scale/900', 'gray-900', 'system/black', 'black'];

  // Find candidates for each role
  let textOnDarkVar: Variable | null = null;
  let textOnLightVar: Variable | null = null;

  for (const pattern of textOnDarkPatterns) {
    const match = variables.find(v => v.name.toLowerCase().includes(pattern.toLowerCase()));
    if (match) {
      textOnDarkVar = match;
      break;
    }
  }

  for (const pattern of textOnLightPatterns) {
    const match = variables.find(v => v.name.toLowerCase().includes(pattern.toLowerCase()));
    if (match) {
      textOnLightVar = match;
      break;
    }
  }

  // Resolve colors and calculate contrast
  const candidates: TextVariableResult[] = [];
  const minContrast = isLargeText ? 3 : 4.5;

  if (textOnDarkVar) {
    let color = variableColorCache.get(textOnDarkVar.id);
    if (color === undefined) {
      color = await resolveVariableColor(textOnDarkVar);
      variableColorCache.set(textOnDarkVar.id, color);
    }
    if (color) {
      const contrast = getContrastRatio(color, backgroundColor);
      candidates.push({
        variable: textOnDarkVar,
        contrast,
        meetsWCAG: contrast >= minContrast,
        role: 'text-on-dark',
        reason: `Light text (contrast ${contrast.toFixed(1)}:1)`
      });
    }
  }

  if (textOnLightVar) {
    let color = variableColorCache.get(textOnLightVar.id);
    if (color === undefined) {
      color = await resolveVariableColor(textOnLightVar);
      variableColorCache.set(textOnLightVar.id, color);
    }
    if (color) {
      const contrast = getContrastRatio(color, backgroundColor);
      candidates.push({
        variable: textOnLightVar,
        contrast,
        meetsWCAG: contrast >= minContrast,
        role: 'text-on-light',
        reason: `Dark text (contrast ${contrast.toFixed(1)}:1)`
      });
    }
  }

  if (candidates.length === 0) return null;

  // First, prefer the candidate that meets WCAG
  const wcagCompliant = candidates.filter(c => c.meetsWCAG);
  if (wcagCompliant.length > 0) {
    // If both meet WCAG, pick the one with higher contrast
    wcagCompliant.sort((a, b) => b.contrast - a.contrast);
    return wcagCompliant[0];
  }

  // If neither meets WCAG, pick the one with higher contrast (better than nothing)
  candidates.sort((a, b) => b.contrast - a.contrast);
  return candidates[0];
}

export async function handleAutoBindByRole(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    scope?: 'selection' | 'page' | 'file';
    minConfidence?: number; // Only bind if confidence >= this (default 0.6)
    dryRun?: boolean; // If true, analyze but don't bind
    bindFills?: boolean;
    bindStrokes?: boolean;
    forceRebind?: boolean; // If true, rebind even if already bound to a variable
    includeInstanceChildren?: boolean; // If true, also process children of instances
  };

  try {
    const scope = payload.scope || 'selection';
    const minConfidence = payload.minConfidence ?? 0.6;
    const dryRun = payload.dryRun ?? false;
    const bindFills = payload.bindFills ?? true;
    const bindStrokes = payload.bindStrokes ?? true;
    const forceRebind = payload.forceRebind ?? false; // Default: skip already-bound nodes
    const includeInstanceChildren = payload.includeInstanceChildren ?? false; // Default: skip instance children

    // Get all COLOR variables
    const allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    if (allVariables.length === 0) {
      return errorResult(command.id, 'No COLOR variables found. Create a design system first.');
    }

    console.log(`[AutoBindByRole] Found ${allVariables.length} COLOR variables`);

    // Get nodes to process
    let nodesToProcess: SceneNode[] = [];

    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
      if (nodesToProcess.length === 0) {
        return errorResult(command.id, 'No nodes selected');
      }
    } else if (scope === 'page') {
      nodesToProcess = figma.currentPage.children.filter(n => n.type !== 'SLICE') as SceneNode[];
    } else if (scope === 'file') {
      await figma.loadAllPagesAsync();
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children.filter(n => n.type !== 'SLICE') as SceneNode[]);
      }
    }

    // Collect all nodes recursively
    const allNodes: SceneNode[] = [];
    const MAX_DEPTH = 50;
    const collectNodes = (nodes: readonly SceneNode[], depth = 0) => {
      if (depth > MAX_DEPTH) return;
      for (const node of nodes) {
        allNodes.push(node);
        if ('children' in node) {
          collectNodes(node.children as SceneNode[], depth + 1);
        }
      }
    };
    collectNodes(nodesToProcess);

    console.log(`[AutoBindByRole] Processing ${allNodes.length} nodes in scope: ${scope}`);

    const bindings: RoleBinding[] = [];
    let fillsBound = 0;
    let strokesBound = 0;
    let skippedLowConfidence = 0;
    let skippedAlreadyBound = 0;
    let skippedInstanceChildren = 0;
    let skippedNoVariable = 0;
    let skippedMixedFills = 0;
    let skippedDecorativeText = 0;

    // Track role distribution for reporting
    const roleDistribution: Record<string, number> = {};

    let _yieldCounter = 0;
    for (const node of allNodes) {
      // Yield to the event loop every 200 nodes to keep the plugin thread cooperative
      // (avoids Figma's "plugin not responding" watchdog on large files)
      if ((++_yieldCounter % 200) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Skip instance children unless explicitly included
      if (!includeInstanceChildren && node.parent && node.parent.type === 'INSTANCE') {
        skippedInstanceChildren++;
        continue;
      }

      const nodeWidth = 'width' in node ? node.width : 0;
      const nodeHeight = 'height' in node ? node.height : 0;

      // Process fills
      if (bindFills && 'fills' in node) {
        const fillableNode = node as MinimalFillsMixin;
        const fills = fillableNode.fills;

        // Handle mixed fills (e.g., text with different colors per character range)
        if (fills === figma.mixed && node.type === 'TEXT') {
          const textNode = node as TextNode;
          const textLength = textNode.characters.length;

          if (textLength > 0) {
            // Analyze character ranges to find fills
            const colorRanges: Array<{start: number, end: number, fill: SolidPaint}> = [];
            let currentStart = 0;
            let currentFill: SolidPaint | null = null;

            // Sample characters to find color ranges (check every character for accuracy)
            for (let i = 0; i <= textLength; i++) {
              let charFill: SolidPaint | null = null;

              if (i < textLength) {
                const rangeFills = textNode.getRangeFills(i, i + 1);
                if (rangeFills !== figma.mixed && Array.isArray(rangeFills) && rangeFills.length > 0) {
                  const fill = rangeFills[0];
                  if (fill.type === 'SOLID') {
                    charFill = fill;
                  }
                }
              }

              // Check if color changed or we're at the end
              const colorChanged = !currentFill && charFill ||
                currentFill && !charFill ||
                (currentFill && charFill && (
                  Math.abs(currentFill.color.r - charFill.color.r) > 0.01 ||
                  Math.abs(currentFill.color.g - charFill.color.g) > 0.01 ||
                  Math.abs(currentFill.color.b - charFill.color.b) > 0.01
                ));

              if (colorChanged || i === textLength) {
                if (currentFill && currentStart < i) {
                  colorRanges.push({ start: currentStart, end: i, fill: currentFill });
                }
                currentStart = i;
                currentFill = charFill;
              }
            }

            // Process each color range
            let rangesBound = 0;
            const backgroundColor = await getEffectiveBackgroundColor(node);
            const fontSize = textNode.fontSize !== figma.mixed ? textNode.fontSize : 16;
            const fontWeight = textNode.fontWeight !== figma.mixed ? textNode.fontWeight : 400;
            const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

            for (const range of colorRanges) {
              const color = range.fill.color;
              const rangeHsl = rgbToHslSemantic(color.r, color.g, color.b);

              // Note: We don't skip decorative colors for mixed fills text because:
              // 1. getRangeFills() doesn't return boundVariables, so we can't detect broken bindings
              // 2. A "decorative" color might have a broken variable binding that needs fixing
              // 3. It's better to rebind everything than miss broken bindings on saturated colors

              // Determine background for contrast calculation
              let bgColor = backgroundColor;
              if (!bgColor) {
                if (rangeHsl.l > 0.7) {
                  bgColor = { r: 0.1, g: 0.1, b: 0.1 };
                } else if (rangeHsl.l < 0.3) {
                  bgColor = { r: 0.96, g: 0.96, b: 0.96 };
                } else {
                  bgColor = rangeHsl.s < 0.15
                    ? { r: 0.96, g: 0.96, b: 0.96 }
                    : { r: 0.1, g: 0.1, b: 0.1 };
                }
              }

              const textResult = await findBestTextVariable(bgColor, allVariables, isLargeText);

              if (textResult) {
                try {
                  const newFill = figma.variables.setBoundVariableForPaint(range.fill, 'color', textResult.variable);
                  textNode.setRangeFills(range.start, range.end, [newFill]);
                  rangesBound++;

                  const role: SemanticRole = {
                    role: textResult.role,
                    confidence: textResult.meetsWCAG ? 0.95 : 0.7,
                    reason: `Mixed text range [${range.start}-${range.end}]: ${textResult.reason}`
                  };
                  roleDistribution[role.role] = (roleDistribution[role.role] || 0) + 1;
                } catch (err) {
                  // Range binding failed, continue with next range
                }
              }
            }

            if (rangesBound > 0) {
              fillsBound += rangesBound;
              bindings.push({
                nodeId: node.id,
                nodeName: node.name,
                nodeType: node.type,
                originalColor: `mixed (${colorRanges.length} ranges)`,
                role: { role: 'neutral' as const, confidence: 0.9, reason: `mixed-text: Bound ${rangesBound}/${colorRanges.length} character ranges` },
                variableName: 'multiple',
                success: true,
              });
            } else {
              skippedMixedFills++;
            }
            continue;
          }

          skippedMixedFills++;
          continue;
        } else if (fills === figma.mixed) {
          // Non-text mixed fills - skip
          skippedMixedFills++;
          continue;
        }

        if (Array.isArray(fills) && fills.length > 0) {
          const fill = fills[0];

          if (fill.type === 'SOLID' && fill.visible !== false) {
            // Check if already bound to a VALID variable (skip unless forceRebind is true)
            if (fill.boundVariables?.color && !forceRebind) {
              // Verify the bound variable actually exists (wasn't deleted)
              try {
                const existingVar = await figma.variables.getVariableByIdAsync(fill.boundVariables.color.id);
                if (existingVar) {
                  // Variable exists and is valid - skip this node
                  skippedAlreadyBound++;
                  continue;
                }
                // Variable doesn't exist (was deleted) - fall through to rebind
              } catch {
                // Error getting variable - fall through to rebind
              }
            }

            const color = fill.color;
            const hsl = rgbToHslSemantic(color.r, color.g, color.b);

            // === SPECIAL HANDLING FOR TEXT NODES ===
            // Use WCAG-compliant contrast checking against actual background
            if (node.type === 'TEXT') {
              // Skip highly saturated text colors (decorative/highlight text)
              // These are intentional color choices that shouldn't be bound to neutral text variables
              if (hsl.s > 0.5 && hsl.l > 0.3 && hsl.l < 0.85) {
                // Record as skipped decorative text
                roleDistribution['decorative-text'] = (roleDistribution['decorative-text'] || 0) + 1;
                skippedDecorativeText++;
                continue;
              }

              const textNode = node as TextNode;
              const fontSize = textNode.fontSize !== figma.mixed ? textNode.fontSize : 16;
              const fontWeight = textNode.fontWeight !== figma.mixed ? textNode.fontWeight : 400;
              const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

              let backgroundColor = await getEffectiveBackgroundColor(node);

              // If no background found, infer from text color lightness
              // Light text (L > 0.7) is likely on dark background, dark text (L < 0.3) on light
              if (!backgroundColor) {
                if (hsl.l > 0.7) {
                  // Light text - assume dark background
                  backgroundColor = { r: 0.1, g: 0.1, b: 0.1 };
                } else if (hsl.l < 0.3) {
                  // Dark text - assume light background
                  backgroundColor = { r: 0.96, g: 0.96, b: 0.96 };
                } else {
                  // Mid-tone text - try to determine from saturation
                  // Low saturation mid-tones are probably on light backgrounds
                  backgroundColor = hsl.s < 0.15
                    ? { r: 0.96, g: 0.96, b: 0.96 }  // Light bg for gray text
                    : { r: 0.1, g: 0.1, b: 0.1 };    // Dark bg for colored text
                }
              }

              const textResult = await findBestTextVariable(backgroundColor, allVariables, isLargeText);

              if (textResult) {
                const role: SemanticRole = {
                  role: textResult.role,
                  confidence: textResult.meetsWCAG ? 0.95 : 0.7,
                  reason: textResult.reason + (textResult.meetsWCAG ? ' [WCAG AA]' : ' [below WCAG]')
                };

                roleDistribution[role.role] = (roleDistribution[role.role] || 0) + 1;

                const originalHex = colorToHex(color);
                const binding: RoleBinding = {
                  nodeId: node.id,
                  nodeName: node.name,
                  nodeType: node.type,
                  originalColor: originalHex,
                  role,
                  variableName: textResult.variable.name,
                  success: false,
                };

                if (!dryRun) {
                  try {
                    const newFill = figma.variables.setBoundVariableForPaint(fill, 'color', textResult.variable);
                    const newFills = [...fills];
                    newFills[0] = newFill;
                    fillableNode.fills = newFills;
                    binding.success = true;
                    fillsBound++;
                  } catch (err) {
                    binding.error = err instanceof Error ? err.message : String(err);
                  }
                } else {
                  binding.success = true;
                }

                bindings.push(binding);
                continue; // Move to next node
              }
              // Fall through to default logic only if text variable search fails
            }

            // === DEFAULT LOGIC FOR NON-TEXT NODES ===
            const parentLightness = await getParentBackgroundLightness(node);

            const role = determineSemanticRole(
              color,
              node.type,
              nodeWidth,
              nodeHeight,
              false,
              parentLightness
            );

            roleDistribution[role.role] = (roleDistribution[role.role] || 0) + 1;

            if (role.confidence < minConfidence) {
              skippedLowConfidence++;
              continue;
            }

            const variable = await findVariableForRole(role, allVariables, hsl);
            if (!variable) {
              skippedNoVariable++;
              continue;
            }

            const originalHex = colorToHex(color);
            const binding: RoleBinding = {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              originalColor: originalHex,
              role,
              variableName: variable.name,
              success: false,
            };

            if (!dryRun) {
              try {
                const newFill = figma.variables.setBoundVariableForPaint(fill, 'color', variable);
                const newFills = [...fills];
                newFills[0] = newFill;
                fillableNode.fills = newFills;
                binding.success = true;
                fillsBound++;
              } catch (err) {
                binding.error = err instanceof Error ? err.message : String(err);
              }
            } else {
              binding.success = true; // Would succeed in non-dry-run
            }

            bindings.push(binding);
          }
        }
      }

      // Process strokes
      if (bindStrokes && 'strokes' in node) {
        const strokeableNode = node as MinimalStrokesMixin;
        const strokes = strokeableNode.strokes;

        if (Array.isArray(strokes) && strokes.length > 0) {
          const stroke = strokes[0];

          if (stroke.type === 'SOLID' && stroke.visible !== false) {
            // Check if already bound to a VALID variable (skip unless forceRebind is true)
            if (stroke.boundVariables?.color && !forceRebind) {
              // Verify the bound variable actually exists (wasn't deleted)
              try {
                const existingVar = await figma.variables.getVariableByIdAsync(stroke.boundVariables.color.id);
                if (existingVar) {
                  // Variable exists and is valid - skip this node
                  skippedAlreadyBound++;
                  continue;
                }
                // Variable doesn't exist (was deleted) - fall through to rebind
              } catch {
                // Error getting variable - fall through to rebind
              }
            }

            const color = stroke.color;
            const hsl = rgbToHslSemantic(color.r, color.g, color.b);
            const parentLightness = await getParentBackgroundLightness(node);

            const role = determineSemanticRole(
              color,
              node.type,
              nodeWidth,
              nodeHeight,
              true,
              parentLightness
            );

            roleDistribution[role.role] = (roleDistribution[role.role] || 0) + 1;

            if (role.confidence < minConfidence) {
              skippedLowConfidence++;
              continue;
            }

            const variable = await findVariableForRole(role, allVariables, hsl);
            if (!variable) {
              skippedNoVariable++;
              continue;
            }

            const originalHex = colorToHex(color);
            const binding: RoleBinding = {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              originalColor: originalHex,
              role,
              variableName: variable.name,
              success: false,
            };

            if (!dryRun) {
              try {
                const newStroke = figma.variables.setBoundVariableForPaint(stroke, 'color', variable);
                const newStrokes = [...strokes];
                newStrokes[0] = newStroke;
                strokeableNode.strokes = newStrokes;
                binding.success = true;
                strokesBound++;
              } catch (err) {
                binding.error = err instanceof Error ? err.message : String(err);
              }
            } else {
              binding.success = true;
            }

            bindings.push(binding);
          }
        }
      }
    }

    // Build summary by variable
    const variableCounts = new Map<string, number>();
    for (const b of bindings) {
      if (b.success) {
        variableCounts.set(b.variableName, (variableCounts.get(b.variableName) || 0) + 1);
      }
    }
    const variableSummary = Array.from(variableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ variable: name, count }));

    // Build summary by role
    const roleSummary = Object.entries(roleDistribution)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ role, count }));

    const totalBound = fillsBound + strokesBound;

    return successResult(command.id, {
      data: {
        message: dryRun
          ? `[DRY RUN] Would bind ${totalBound} colors (${fillsBound} fills, ${strokesBound} strokes)`
          : `Bound ${totalBound} colors by semantic role (${fillsBound} fills, ${strokesBound} strokes)`,
        dryRun,
        scope,
        nodesScanned: allNodes.length,
        totalBound,
        fillsBound,
        strokesBound,
        skipped: {
          lowConfidence: skippedLowConfidence,
          alreadyBound: skippedAlreadyBound,
          instanceChildren: skippedInstanceChildren,
          noMatchingVariable: skippedNoVariable,
          mixedFills: skippedMixedFills,
          decorativeText: skippedDecorativeText,
        },
        minConfidence,
        roleDistribution: roleSummary,
        variableSummary,
        bindings: bindings.slice(0, 100), // Limit output
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Bind colors using extracted usage metadata from website/frame extraction
// This preserves semantic intent: background colors stay backgrounds, text colors stay text
export async function handleBindByExtractedUsage(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    // Extracted colors with usage metadata from extractWebsiteCSS or extractDesignTokens
    extractedColors: Array<{
      hex: string;
      usage: 'background' | 'text' | 'border' | 'accent' | 'fill' | 'stroke';
      count?: number;
    }>;
    // Map usage types to variable name patterns
    usageMapping?: {
      background?: string; // Variable name for background colors (e.g., "Brand-500")
      text?: string; // Variable name for text colors (e.g., "Tertiary-500")
      border?: string; // Variable name for border colors (e.g., "Secondary-500")
      accent?: string; // Variable name for accent colors
    };
    scope?: 'selection' | 'page' | 'file';
    maxNodes?: number;
    tolerance?: number; // Color matching tolerance (0-255), default 5
  };

  const extractedColors = payload.extractedColors || [];
  const usageMapping = payload.usageMapping || {};
  const scope = payload.scope || 'file';
  const maxNodes = payload.maxNodes || 50000;
  const tolerance = payload.tolerance ?? 5;

  if (extractedColors.length === 0) {
    return errorResult(command.id, 'extractedColors array is required');
  }

  try {
    figma.skipInvisibleInstanceChildren = true;

    // Get all color variables
    const colorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
    const variableByName = new Map<string, Variable>();

    for (const v of colorVariables) {
      variableByName.set(v.name, v);
      // Also index by short name
      const shortName = v.name.split('/').pop() || v.name;
      if (!variableByName.has(shortName)) {
        variableByName.set(shortName, v);
      }
    }

    // Build color -> variable mapping based on usage
    const colorToVariable = new Map<string, { variable: Variable; usage: string }>();

    for (const extracted of extractedColors) {
      const hex = extracted.hex.toUpperCase().replace('#', '');
      const usage = extracted.usage;

      // Find the variable name for this usage type
      let variableName: string | undefined;
      if (usage === 'background' && usageMapping.background) {
        variableName = usageMapping.background;
      } else if (usage === 'text' && usageMapping.text) {
        variableName = usageMapping.text;
      } else if ((usage === 'border' || usage === 'stroke') && usageMapping.border) {
        variableName = usageMapping.border;
      } else if ((usage === 'accent' || usage === 'fill') && usageMapping.accent) {
        variableName = usageMapping.accent;
      }

      if (variableName) {
        const variable = variableByName.get(variableName);
        if (variable) {
          colorToVariable.set(`#${hex}`, { variable, usage });
        }
      }
    }

    if (colorToVariable.size === 0) {
      return successResult(command.id, {
        data: {
          message: 'No color-to-variable mappings created. Check usageMapping and variable names.',
          bound: 0,
          mappingsCreated: 0,
        },
      });
    }

    // Get nodes to process
    let nodesToProcess: SceneNode[] = [];
    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else {
      await Promise.all(figma.root.children.map(page => page.loadAsync()));
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children);
      }
    }

    // Collect nodes (skip instance children)
    const allNodes: SceneNode[] = [];
    const MAX_DEPTH = 20;
    let instanceChildrenSkipped = 0;

    function collectNodes(nodes: readonly SceneNode[], depth = 0, insideInstance = false) {
      if (depth > MAX_DEPTH || allNodes.length >= maxNodes) return;
      for (const node of nodes) {
        if (allNodes.length >= maxNodes) return;
        const nodeIsInstance = node.type === 'INSTANCE';
        if ('fills' in node || 'strokes' in node) {
          if (insideInstance && !nodeIsInstance) {
            instanceChildrenSkipped++;
          } else {
            allNodes.push(node);
          }
        }
        if ('children' in node) {
          const childrenInsideInstance = nodeIsInstance || insideInstance;
          collectNodes((node as FrameNode | GroupNode).children, depth + 1, childrenInsideInstance);
        }
      }
    }
    collectNodes(nodesToProcess, 0, false);

    // Helper to check color match
    const colorsMatch = (hex1: string, hex2: string): boolean => {
      const h1 = hex1.toUpperCase().replace('#', '');
      const h2 = hex2.toUpperCase().replace('#', '');
      const r1 = parseInt(h1.substring(0, 2), 16);
      const g1 = parseInt(h1.substring(2, 4), 16);
      const b1 = parseInt(h1.substring(4, 6), 16);
      const r2 = parseInt(h2.substring(0, 2), 16);
      const g2 = parseInt(h2.substring(2, 4), 16);
      const b2 = parseInt(h2.substring(4, 6), 16);
      return Math.abs(r1 - r2) <= tolerance &&
             Math.abs(g1 - g2) <= tolerance &&
             Math.abs(b1 - b2) <= tolerance;
    };

    // Process nodes and bind
    const bindings: Array<{
      nodeId: string;
      nodeName: string;
      fromColor: string;
      toVariable: string;
      usage: string;
      field: 'fill' | 'stroke';
    }> = [];
    let skipped = 0;

    for (const node of allNodes) {
      // Process fills
      if ('fills' in node && Array.isArray(node.fills)) {
        const fills = node.fills as Paint[];
        for (let i = 0; i < fills.length; i++) {
          const fill = fills[i];
          if (fill.type !== 'SOLID') continue;

          const nodeHex = rgbToHexFast(fill.color.r, fill.color.g, fill.color.b);

          // Find matching extracted color
          for (const [extractedHex, mapping] of colorToVariable) {
            if (colorsMatch(nodeHex, extractedHex)) {
              try {
                const fillsCopy = [...fills];
                fillsCopy[i] = figma.variables.setBoundVariableForPaint(fill, 'color', mapping.variable);
                (node as GeometryMixin).fills = fillsCopy;
                bindings.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromColor: nodeHex,
                  toVariable: mapping.variable.name,
                  usage: mapping.usage,
                  field: 'fill',
                });
              } catch {
                skipped++;
              }
              break;
            }
          }
        }
      }

      // Process strokes
      if ('strokes' in node && Array.isArray(node.strokes)) {
        const strokes = node.strokes as Paint[];
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (stroke.type !== 'SOLID') continue;

          const nodeHex = rgbToHexFast(stroke.color.r, stroke.color.g, stroke.color.b);

          // Find matching extracted color
          for (const [extractedHex, mapping] of colorToVariable) {
            if (colorsMatch(nodeHex, extractedHex)) {
              try {
                const strokesCopy = [...strokes];
                strokesCopy[i] = figma.variables.setBoundVariableForPaint(stroke, 'color', mapping.variable);
                (node as GeometryMixin).strokes = strokesCopy;
                bindings.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  fromColor: nodeHex,
                  toVariable: mapping.variable.name,
                  usage: mapping.usage,
                  field: 'stroke',
                });
              } catch {
                skipped++;
              }
              break;
            }
          }
        }
      }
    }

    // Build summary by usage
    const bindingsByUsage = new Map<string, number>();
    for (const b of bindings) {
      bindingsByUsage.set(b.usage, (bindingsByUsage.get(b.usage) || 0) + 1);
    }

    return successResult(command.id, {
      data: {
        message: `Bound ${bindings.length} colors by extracted usage`,
        scope,
        nodesScanned: allNodes.length,
        instanceChildrenSkipped,
        bound: bindings.length,
        skipped,
        mappingsUsed: colorToVariable.size,
        bindingsByUsage: Object.fromEntries(bindingsByUsage),
        bindings: bindings.slice(0, 100),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Auto-bind spacing variables (padding, gap, cornerRadius) to nodes
export async function handleAutoBindSpacing(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    scope?: 'selection' | 'page' | 'file';
    bindPadding?: boolean;
    bindGap?: boolean;
    bindCornerRadius?: boolean;
    tolerance?: number; // Allow fuzzy matching within tolerance (default 0)
  };

  const scope = payload.scope || 'file';
  const bindPadding = payload.bindPadding ?? true;
  const bindGap = payload.bindGap ?? true;
  const bindCornerRadius = payload.bindCornerRadius ?? true;
  const tolerance = payload.tolerance ?? 0;

  try {
    figma.skipInvisibleInstanceChildren = true;

    // Step 1: Get all FLOAT variables and index by value
    const floatVariables = await figma.variables.getLocalVariablesAsync('FLOAT');

    // Build maps: value -> variable for spacing and radius
    const spacingVariables = new Map<number, Variable>();
    const radiusVariables = new Map<number, Variable>();

    for (const v of floatVariables) {
      const nameLower = v.name.toLowerCase();
      // Get the value from the first mode
      const collection = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      if (!collection) continue;
      const modeId = collection.modes[0]?.modeId;
      if (!modeId) continue;

      let value = v.valuesByMode[modeId];
      // Resolve alias if needed
      if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
        const aliasedVar = await figma.variables.getVariableByIdAsync(value.id);
        if (aliasedVar) {
          const aliasCollection = await figma.variables.getVariableCollectionByIdAsync(aliasedVar.variableCollectionId);
          if (aliasCollection) {
            value = aliasedVar.valuesByMode[aliasCollection.modes[0]?.modeId];
          }
        }
      }

      if (typeof value !== 'number') continue;

      // Categorize by name pattern - check for spacing-related names
      // Match patterns like: Numbers/Spacing/Space-16, spacing/md, Space-8, etc.
      const isSpacing = nameLower.includes('spacing') || nameLower.includes('space-') ||
                        nameLower.includes('padding') || nameLower.includes('gap') ||
                        nameLower.includes('numbers/spacing');
      // Match patterns like: Numbers/Radius/Radius-8, radius/block, corner-radius, etc.
      const isRadius = nameLower.includes('radius') || nameLower.includes('corner') ||
                       nameLower.includes('round') || nameLower.includes('numbers/radius');

      if (isSpacing && !isRadius) {
        if (!spacingVariables.has(value)) {
          spacingVariables.set(value, v);
        }
      } else if (isRadius) {
        if (!radiusVariables.has(value)) {
          radiusVariables.set(value, v);
        }
      }
    }

    // Step 2: Collect nodes
    let nodesToProcess: SceneNode[] = [];
    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else {
      await Promise.all(figma.root.children.map(page => page.loadAsync()));
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children);
      }
    }

    const allNodes: SceneNode[] = [];
    const MAX_DEPTH = 20;
    let instanceChildrenSkipped = 0;

    function collectNodes(nodes: readonly SceneNode[], depth = 0, insideInstance = false) {
      if (depth > MAX_DEPTH) return;
      for (const node of nodes) {
        const nodeIsInstance = node.type === 'INSTANCE';

        if (insideInstance && !nodeIsInstance) {
          instanceChildrenSkipped++;
        } else {
          allNodes.push(node);
        }

        if ('children' in node) {
          const childrenInsideInstance = nodeIsInstance || insideInstance;
          collectNodes((node as FrameNode | GroupNode).children, depth + 1, childrenInsideInstance);
        }
      }
    }
    collectNodes(nodesToProcess, 0, false);

    // Step 3: Find matching variable for a value
    function findMatchingVariable(value: number, varMap: Map<number, Variable>): Variable | null {
      if (varMap.has(value)) return varMap.get(value)!;
      if (tolerance > 0) {
        for (const [v, variable] of varMap) {
          if (Math.abs(v - value) <= tolerance) return variable;
        }
      }
      return null;
    }

    // Step 4: Bind spacing and radius
    const bindings: Array<{
      nodeId: string;
      nodeName: string;
      field: string;
      value: number;
      variableName: string;
    }> = [];
    let paddingBound = 0;
    let gapBound = 0;
    let radiusBound = 0;
    let skipped = 0;

    let _yieldCounter = 0;
    for (const node of allNodes) {
      // Yield every 200 nodes so the plugin thread stays cooperative on large files
      if ((++_yieldCounter % 200) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Bind padding (paddingTop, paddingRight, paddingBottom, paddingLeft)
      if (bindPadding && 'paddingTop' in node) {
        const frameNode = node as FrameNode;
        const paddingFields = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;

        for (const field of paddingFields) {
          const value = frameNode[field];
          if (typeof value === 'number' && value > 0) {
            const variable = findMatchingVariable(value, spacingVariables);
            if (variable) {
              try {
                frameNode.setBoundVariable(field, variable);
                bindings.push({
                  nodeId: node.id,
                  nodeName: node.name,
                  field,
                  value,
                  variableName: variable.name,
                });
                paddingBound++;
              } catch {
                skipped++;
              }
            }
          }
        }
      }

      // Bind gap (itemSpacing for auto-layout)
      if (bindGap && 'itemSpacing' in node) {
        const frameNode = node as FrameNode;
        const value = frameNode.itemSpacing;
        if (typeof value === 'number' && value > 0) {
          const variable = findMatchingVariable(value, spacingVariables);
          if (variable) {
            try {
              frameNode.setBoundVariable('itemSpacing', variable);
              bindings.push({
                nodeId: node.id,
                nodeName: node.name,
                field: 'itemSpacing',
                value,
                variableName: variable.name,
              });
              gapBound++;
            } catch {
              skipped++;
            }
          }
        }
      }

      // Bind corner radius
      if (bindCornerRadius && 'cornerRadius' in node) {
        const rectNode = node as RectangleNode | FrameNode;

        // Check if it has uniform corner radius
        if (typeof rectNode.cornerRadius === 'number' && rectNode.cornerRadius > 0) {
          const variable = findMatchingVariable(rectNode.cornerRadius, radiusVariables);
          if (variable) {
            try {
              (rectNode as any).setBoundVariable('cornerRadius', variable);
              bindings.push({
                nodeId: node.id,
                nodeName: node.name,
                field: 'cornerRadius',
                value: rectNode.cornerRadius,
                variableName: variable.name,
              });
              radiusBound++;
            } catch {
              skipped++;
            }
          }
        } else if (rectNode.cornerRadius === figma.mixed) {
          // Handle individual corners
          const cornerFields = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
          for (const field of cornerFields) {
            if (field in rectNode) {
              const value = (rectNode as any)[field];
              if (typeof value === 'number' && value > 0) {
                const variable = findMatchingVariable(value, radiusVariables);
                if (variable) {
                  try {
                    rectNode.setBoundVariable(field, variable);
                    bindings.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      field,
                      value,
                      variableName: variable.name,
                    });
                    radiusBound++;
                  } catch {
                    skipped++;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Build summary
    const variableCounts = new Map<string, number>();
    for (const b of bindings) {
      variableCounts.set(b.variableName, (variableCounts.get(b.variableName) || 0) + 1);
    }
    const summary = Array.from(variableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ variable: name, count }));

    return successResult(command.id, {
      data: {
        message: `Auto-bound ${bindings.length} spacing/radius values (${paddingBound} padding, ${gapBound} gap, ${radiusBound} radius)`,
        scope,
        nodesScanned: allNodes.length,
        instanceChildrenSkipped,
        totalBound: bindings.length,
        paddingBound,
        gapBound,
        radiusBound,
        skipped,
        spacingVariablesAvailable: spacingVariables.size,
        radiusVariablesAvailable: radiusVariables.size,
        summary,
        bindings: bindings.slice(0, 100),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}
