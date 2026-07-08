import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Import a component from a team library by key
export async function handleImportComponentByKey(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
  };

  if (!payload || !payload.key) {
    return errorResult(command.id, 'Component key is required');
  }

  try {
    var component = await figma.importComponentByKeyAsync(payload.key);

    return successResult(command.id, {
      data: {
        id: component.id,
        name: component.name,
        key: component.key,
        type: component.type,
        description: component.description,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to import component: ' + message);
  }
}

// Import a component set from a team library by key
export async function handleImportComponentSetByKey(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
  };

  if (!payload || !payload.key) {
    return errorResult(command.id, 'Component set key is required');
  }

  try {
    var componentSet = await figma.importComponentSetByKeyAsync(payload.key);

    return successResult(command.id, {
      data: {
        id: componentSet.id,
        name: componentSet.name,
        key: componentSet.key,
        type: componentSet.type,
        description: componentSet.description,
        children: componentSet.children.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to import component set: ' + message);
  }
}

// Import a style from a team library by key
export async function handleImportStyleByKey(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
  };

  if (!payload || !payload.key) {
    return errorResult(command.id, 'Style key is required');
  }

  try {
    var style = await figma.importStyleByKeyAsync(payload.key);

    return successResult(command.id, {
      data: {
        id: style.id,
        name: style.name,
        key: style.key,
        type: style.type,
        description: style.description,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to import style: ' + message);
  }
}

// Import a variable from a team library by key
export async function handleImportVariableByKey(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
  };

  if (!payload || !payload.key) {
    return errorResult(command.id, 'Variable key is required');
  }

  try {
    var variable = await figma.variables.importVariableByKeyAsync(payload.key);

    return successResult(command.id, {
      data: {
        id: variable.id,
        name: variable.name,
        key: variable.key,
        resolvedType: variable.resolvedType,
        description: variable.description,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to import variable: ' + message);
  }
}

// Get available library variable collections
export async function handleGetLibraryVariableCollections(command: FigmaCommand): Promise<CommandResult> {
  // getAvailableLibraryVariableCollectionsAsync can hang for minutes on large enterprise library
  // indexes (observed wedging the plugin thread on this team). Require explicit opt-in and prefer
  // the Figma MCP search_design_system index for variable keys instead.
  var p = (command.payload || {}) as { allowSlow?: boolean };
  if (!p.allowSlow) {
    return errorResult(
      command.id,
      'getLibraryVariableCollections can hang for minutes on large team libraries. ' +
        'Prefer the Figma MCP search_design_system (includeVariables:true) to find variable keys, ' +
        'then importVariableByKey. To force this call anyway, retry with allowSlow:true.'
    );
  }
  try {
    var collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

    return successResult(command.id, {
      data: {
        collections: collections.map(c => ({
          key: c.key,
          name: c.name,
          libraryName: c.libraryName,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get library variable collections: ' + message);
  }
}

// Get variables in a library collection
export async function handleGetVariablesInLibraryCollection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    libraryCollectionKey: string;
  };

  if (!payload || !payload.libraryCollectionKey) {
    return errorResult(command.id, 'Library collection key is required');
  }

  try {
    var variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(payload.libraryCollectionKey);

    return successResult(command.id, {
      data: {
        variables: variables.map(v => ({
          key: v.key,
          name: v.name,
          resolvedType: v.resolvedType,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get variables in library collection: ' + message);
  }
}
