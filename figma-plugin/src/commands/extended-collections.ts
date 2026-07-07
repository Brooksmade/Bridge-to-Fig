// Extended Variable Collections (Figma plugin API v1.121 / v1.122, Enterprise theming).
// An extended collection inherits every mode and variable from its parent, and lets you override
// individual variable values per mode to create theme variations from a single source of truth.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

/** Coerce a friendly payload value into a Figma VariableValue. Supports hex colors, aliases,
 *  and raw number/string/boolean/RGBA values. */
function coerceVariableValue(payload: {
  value?: any;
  colorHex?: string;
  aliasId?: string;
}): VariableValue {
  if (payload.aliasId) {
    return { type: 'VARIABLE_ALIAS', id: payload.aliasId } as VariableAlias;
  }
  if (payload.colorHex) {
    var h = payload.colorHex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) / 255,
      g: parseInt(h.substring(2, 4), 16) / 255,
      b: parseInt(h.substring(4, 6), 16) / 255,
      a: h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1,
    } as RGBA;
  }
  return payload.value as VariableValue;
}

function extendedCollectionSupported(): boolean {
  return (
    typeof figma !== 'undefined' &&
    !!figma.variables &&
    typeof (figma.variables as any).getVariableCollectionByIdAsync === 'function'
  );
}

// Extend a LOCAL variable collection, creating a themed extension of it.
export async function handleExtendVariableCollection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { collectionId?: string; name?: string };
  var collectionId = payload.collectionId || command.target;
  if (!collectionId) return errorResult(command.id, 'collectionId is required');
  if (!payload.name) return errorResult(command.id, 'name is required for the extended collection');
  if (!extendedCollectionSupported()) {
    return errorResult(command.id, 'Variables API unavailable in this Figma client');
  }

  var collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) return errorResult(command.id, 'Variable collection not found');
  if (typeof (collection as any).extend !== 'function') {
    return errorResult(
      command.id,
      'Extended collections are not supported by this Figma client version (Enterprise feature; update Figma).'
    );
  }

  var extended = (collection as any).extend(payload.name);
  return successResult(command.id, {
    data: {
      extendedCollectionId: extended.id,
      name: extended.name,
      isExtension: extended.isExtension,
      parentVariableCollectionId: extended.parentVariableCollectionId,
      rootVariableCollectionId: extended.rootVariableCollectionId,
      modes: extended.modes,
      variableIds: extended.variableIds,
    },
  });
}

// Extend a LIBRARY (published team-library) collection by key.
export async function handleExtendLibraryCollection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { collectionKey?: string; name?: string };
  if (!payload.collectionKey) return errorResult(command.id, 'collectionKey is required');
  if (!payload.name) return errorResult(command.id, 'name is required');
  if (!extendedCollectionSupported() || typeof (figma.variables as any).extendLibraryCollectionByKeyAsync !== 'function') {
    return errorResult(
      command.id,
      'extendLibraryCollectionByKeyAsync is not available in this Figma client version.'
    );
  }

  var extended = await (figma.variables as any).extendLibraryCollectionByKeyAsync(
    payload.collectionKey,
    payload.name
  );
  return successResult(command.id, {
    data: {
      extendedCollectionId: extended.id,
      name: extended.name,
      isExtension: extended.isExtension,
      parentVariableCollectionId: extended.parentVariableCollectionId,
      rootVariableCollectionId: extended.rootVariableCollectionId,
      modes: extended.modes,
    },
  });
}

// Override a variable's value for one mode of an extended collection.
export async function handleSetVariableOverride(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    variableId?: string;
    extendedModeId?: string;
    value?: any;
    colorHex?: string;
    aliasId?: string;
  };
  var variableId = payload.variableId || command.target;
  if (!variableId) return errorResult(command.id, 'variableId is required');
  if (!payload.extendedModeId) return errorResult(command.id, 'extendedModeId is required');
  if (payload.value === undefined && payload.colorHex === undefined && payload.aliasId === undefined) {
    return errorResult(command.id, 'One of value, colorHex, or aliasId is required');
  }
  if (!extendedCollectionSupported()) {
    return errorResult(command.id, 'Variables API unavailable in this Figma client');
  }

  var variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return errorResult(command.id, 'Variable not found');

  // Overriding an extended-collection value uses the standard per-mode setter with the extended mode ID.
  variable.setValueForMode(payload.extendedModeId, coerceVariableValue(payload));

  return successResult(command.id, {
    data: {
      variableId: variable.id,
      name: variable.name,
      extendedModeId: payload.extendedModeId,
      overridden: true,
    },
  });
}

// Remove a variable's override for one extended mode (reverts to inherited value).
export async function handleRemoveVariableOverride(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { variableId?: string; extendedModeId?: string };
  var variableId = payload.variableId || command.target;
  if (!variableId) return errorResult(command.id, 'variableId is required');
  if (!payload.extendedModeId) return errorResult(command.id, 'extendedModeId is required');
  if (!extendedCollectionSupported()) {
    return errorResult(command.id, 'Variables API unavailable in this Figma client');
  }

  var variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return errorResult(command.id, 'Variable not found');
  if (typeof (variable as any).removeOverrideForMode !== 'function') {
    return errorResult(command.id, 'removeOverrideForMode is not available in this Figma client version.');
  }
  (variable as any).removeOverrideForMode(payload.extendedModeId);

  return successResult(command.id, {
    data: { variableId: variable.id, extendedModeId: payload.extendedModeId, removed: true },
  });
}

// Read an extended collection: inherited modes (with parentModeId), overrides, and root id.
export async function handleGetExtendedCollection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { collectionId?: string };
  var collectionId = payload.collectionId || command.target;
  if (!collectionId) return errorResult(command.id, 'collectionId is required');
  if (!extendedCollectionSupported()) {
    return errorResult(command.id, 'Variables API unavailable in this Figma client');
  }

  var collection: any = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) return errorResult(command.id, 'Variable collection not found');

  return successResult(command.id, {
    data: {
      id: collection.id,
      name: collection.name,
      isExtension: !!collection.isExtension,
      parentVariableCollectionId: collection.parentVariableCollectionId,
      rootVariableCollectionId: collection.rootVariableCollectionId,
      modes: collection.modes, // includes parentModeId on extensions
      variableIds: collection.variableIds,
      variableOverrides: collection.variableOverrides,
    },
  });
}
