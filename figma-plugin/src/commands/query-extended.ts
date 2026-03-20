import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Get selection colors
export async function handleGetSelectionColors(command: FigmaCommand): Promise<CommandResult> {
  try {
    var result = figma.getSelectionColors();

    if (!result) {
      return successResult(command.id, {
        data: { colors: null, hasSelection: false },
      });
    }

    return successResult(command.id, {
      data: {
        hasSelection: true,
        paints: result.paints.map(paint => {
          if (paint.type === 'SOLID') {
            return {
              type: 'SOLID',
              color: paint.color,
              opacity: paint.opacity,
            };
          }
          return { type: paint.type };
        }),
        styles: result.styles.map(style => ({
          id: style.id,
          name: style.name,
          key: style.key,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get selection colors: ' + message);
  }
}

// Get CSS for a node
export async function handleGetCss(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('getCSSAsync' in node)) {
      return errorResult(command.id, 'Node does not support getCSSAsync');
    }

    var css = await (node as any).getCSSAsync();

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        css: css,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get CSS: ' + message);
  }
}

// Get publish status of a node
export async function handleGetPublishStatus(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('getPublishStatusAsync' in node)) {
      return errorResult(command.id, 'Node does not support getPublishStatusAsync');
    }

    var status = await (node as any).getPublishStatusAsync();

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        publishStatus: status,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get publish status: ' + message);
  }
}

// Get top level frame for a node
export async function handleGetTopLevelFrame(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('getTopLevelFrame' in node)) {
      return errorResult(command.id, 'Node does not support getTopLevelFrame');
    }

    var frame = (node as any).getTopLevelFrame();

    if (!frame) {
      return successResult(command.id, {
        data: { found: false, frame: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        frame: {
          id: frame.id,
          name: frame.name,
          type: frame.type,
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get top level frame: ' + message);
  }
}

// Get measurements from the document
export async function handleGetMeasurements(command: FigmaCommand): Promise<CommandResult> {
  try {
    var measurements = (figma as any).measurements.getMeasurements();

    return successResult(command.id, {
      data: {
        count: measurements.length,
        measurements: measurements.map((m: any) => ({
          id: m.id,
          start: m.start,
          end: m.end,
          offset: m.offset,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get measurements: ' + message);
  }
}

// Get measurements for a specific node
export async function handleGetMeasurementsForNode(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    var measurements = (figma as any).measurements.getMeasurementsForNode(node as SceneNode);

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        count: measurements.length,
        measurements: measurements.map((m: any) => ({
          id: m.id,
          start: m.start,
          end: m.end,
          offset: m.offset,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get measurements for node: ' + message);
  }
}

// Get annotation categories
export async function handleGetAnnotationCategories(command: FigmaCommand): Promise<CommandResult> {
  try {
    var categories = await (figma as any).getAnnotationCategoriesAsync();

    return successResult(command.id, {
      data: {
        count: categories.length,
        categories: categories.map((c: any) => ({
          id: c.id,
          label: c.label,
          color: c.color,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get annotation categories: ' + message);
  }
}

// Get annotation category by ID
export async function handleGetAnnotationCategoryById(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    categoryId: string;
  };

  if (!payload || !payload.categoryId) {
    return errorResult(command.id, 'Category ID is required');
  }

  try {
    var category = await (figma as any).getAnnotationCategoryByIdAsync(payload.categoryId);

    if (!category) {
      return successResult(command.id, {
        data: { found: false, category: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        category: {
          id: category.id,
          label: category.label,
          color: category.color,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get annotation category: ' + message);
  }
}

// Get instances of a component
export async function handleGetComponentInstances(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Component node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (node.type !== 'COMPONENT') {
      return errorResult(command.id, 'Node is not a component');
    }

    var component = node as ComponentNode;
    var instances = await component.getInstancesAsync();

    return successResult(command.id, {
      data: {
        componentId: component.id,
        componentName: component.name,
        instanceCount: instances.length,
        instances: instances.map(inst => ({
          id: inst.id,
          name: inst.name,
          x: inst.x,
          y: inst.y,
          width: inst.width,
          height: inst.height,
          pageId: inst.parent?.type === 'PAGE' ? inst.parent.id : null,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get component instances: ' + message);
  }
}

// Get main component of an instance
export async function handleGetMainComponent(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Instance node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (node.type !== 'INSTANCE') {
      return errorResult(command.id, 'Node is not an instance');
    }

    var instance = node as InstanceNode;
    var mainComponent = await instance.getMainComponentAsync();

    if (!mainComponent) {
      return successResult(command.id, {
        data: { found: false, component: null },
      });
    }

    return successResult(command.id, {
      data: {
        found: true,
        component: {
          id: mainComponent.id,
          name: mainComponent.name,
          key: mainComponent.key,
          description: mainComponent.description,
          remote: mainComponent.remote,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get main component: ' + message);
  }
}

// Get style consumers
export async function handleGetStyleConsumers(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    styleId: string;
  };

  if (!payload || !payload.styleId) {
    return errorResult(command.id, 'Style ID is required');
  }

  try {
    var style = await figma.getStyleByIdAsync(payload.styleId);

    if (!style) {
      return errorResult(command.id, 'Style not found: ' + payload.styleId);
    }

    var consumers = await style.getStyleConsumersAsync();

    return successResult(command.id, {
      data: {
        styleId: style.id,
        styleName: style.name,
        consumers: consumers.map(c => ({
          node: c.node ? {
            id: c.node.id,
            name: c.node.name,
            type: c.node.type,
          } : null,
          fields: c.fields,
        })),
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get style consumers: ' + message);
  }
}

// Get vector network data from a vector node
export async function handleGetVectorNetwork(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target vector node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (node.type !== 'VECTOR') {
      return errorResult(command.id, 'Node is not a vector node (type: ' + node.type + ')');
    }

    var vectorNode = node as VectorNode;
    var network = vectorNode.vectorNetwork;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        vectorNetwork: {
          vertices: network.vertices,
          segments: network.segments,
          regions: network.regions,
        },
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get vector network: ' + message);
  }
}

// Get vector paths (SVG path data) from a vector node
export async function handleGetVectorPaths(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;

  if (!targetId) {
    return errorResult(command.id, 'Target vector node ID is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (node.type !== 'VECTOR') {
      return errorResult(command.id, 'Node is not a vector node (type: ' + node.type + ')');
    }

    var vectorNode = node as VectorNode;
    var paths = vectorNode.vectorPaths;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        nodeName: node.name,
        vectorPaths: paths.map(function(p) {
          return {
            windingRule: p.windingRule,
            data: p.data,
          };
        }),
        count: paths.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get vector paths: ' + message);
  }
}
