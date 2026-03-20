// Component command handlers for creating and managing components and variants

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { serializeNode } from '../utils/node-factory';

// Payload interfaces
interface CreateComponentPayload {
  nodeId?: string; // Convert existing node to component
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: Array<{
    name: string;
    type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
    defaultValue?: any;
  }>;
}

interface CreateComponentSetPayload {
  componentIds: string[];
  name?: string;
}

interface AddVariantPayload {
  componentSetId: string;
  name: string;
  sourceVariantId?: string; // Clone from existing variant
  properties?: Record<string, string>;
}

interface EditComponentPropertiesPayload {
  componentId: string;
  add?: Array<{
    name: string;
    type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';
    defaultValue?: any;
  }>;
  remove?: string[];
  edit?: Array<{
    name: string;
    newName?: string;
    defaultValue?: any;
  }>;
}

interface GetComponentsPayload {
  type?: 'all' | 'components' | 'componentSets';
  includeRemote?: boolean;
}

// Helper to serialize a component
function serializeComponent(component: ComponentNode | ComponentSetNode): object {
  var result: Record<string, any> = {
    id: component.id,
    name: component.name,
    type: component.type,
    x: component.x,
    y: component.y,
    width: component.width,
    height: component.height,
  };

  if (component.type === 'COMPONENT') {
    var comp = component as ComponentNode;
    result.key = comp.key;

    // Get component properties
    var propDefs = comp.componentPropertyDefinitions;
    if (propDefs) {
      var props: Record<string, any> = {};
      var propNames = Object.keys(propDefs);
      for (var i = 0; i < propNames.length; i++) {
        var propName = propNames[i];
        props[propName] = {
          type: propDefs[propName].type,
          defaultValue: propDefs[propName].defaultValue,
        };
      }
      result.properties = props;
    }
  }

  if (component.type === 'COMPONENT_SET') {
    var compSet = component as ComponentSetNode;
    result.variantCount = compSet.children.length;
    result.variants = compSet.children.map(function (child) {
      return {
        id: child.id,
        name: child.name,
      };
    });

    // Get component property definitions (BOOLEAN, INSTANCE_SWAP, TEXT, VARIANT)
    var setPropDefs = compSet.componentPropertyDefinitions;
    if (setPropDefs) {
      var setProps: Record<string, any> = {};
      var setPropNames = Object.keys(setPropDefs);
      for (var si = 0; si < setPropNames.length; si++) {
        var spn = setPropNames[si];
        setProps[spn] = {
          type: setPropDefs[spn].type,
          defaultValue: setPropDefs[spn].defaultValue,
        };
      }
      result.properties = setProps;
    }
  }

  return result;
}

// Create a component from scratch or from existing node
export async function handleCreateComponent(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as CreateComponentPayload;

  try {
    var component: ComponentNode;

    if (payload.nodeId) {
      // Convert existing node to component
      var node = await figma.getNodeByIdAsync(payload.nodeId);

      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }

      if (node.type === 'COMPONENT') {
        return errorResult(command.id, 'Node is already a component');
      }

      if (!('createComponent' in (figma as unknown as Record<string, unknown>))) {
        // For older API, use component creation from frame
        if (node.type !== 'FRAME' && node.type !== 'GROUP') {
          return errorResult(command.id, 'Can only convert FRAME or GROUP to component');
        }

        component = figma.createComponent();
        var frame = node as FrameNode;

        // Copy properties
        component.x = frame.x;
        component.y = frame.y;
        component.resize(frame.width, frame.height);
        component.name = payload.name ? payload.name : frame.name;

        // Move children
        var children = frame.children.slice();
        for (var i = 0; i < children.length; i++) {
          component.appendChild(children[i]);
        }

        // Copy visual properties
        if ('fills' in frame) {
          component.fills = frame.fills;
        }
        if ('strokes' in frame) {
          component.strokes = frame.strokes;
        }
        if ('effects' in frame) {
          component.effects = frame.effects;
        }
        if ('cornerRadius' in frame) {
          component.cornerRadius = frame.cornerRadius;
        }

        // Remove original
        frame.remove();
      } else {
        // Use createComponentFromNode if available (Figma API v2+)
        if (node.type === 'FRAME') {
          component = figma.createComponentFromNode(node as FrameNode);
        } else {
          return errorResult(command.id, 'Can only convert FRAME to component');
        }
      }
    } else {
      // Create new empty component
      component = figma.createComponent();

      if (payload.name) {
        component.name = payload.name;
      }

      if (payload.x !== undefined) {
        component.x = payload.x;
      }

      if (payload.y !== undefined) {
        component.y = payload.y;
      }

      if (payload.width !== undefined && payload.height !== undefined) {
        component.resize(payload.width, payload.height);
      }
    }

    // Add component properties if specified
    if (payload.properties && payload.properties.length > 0) {
      for (var j = 0; j < payload.properties.length; j++) {
        var prop = payload.properties[j];
        var defaultVal = prop.defaultValue;

        if (prop.type === 'BOOLEAN') {
          defaultVal = defaultVal !== undefined ? Boolean(defaultVal) : true;
        } else if (prop.type === 'TEXT') {
          defaultVal = defaultVal !== undefined ? String(defaultVal) : '';
        }

        if (prop.type !== 'VARIANT') {
          component.addComponentProperty(prop.name, prop.type, defaultVal);
        }
      }
    }

    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);

    return successResult(command.id, {
      nodeId: component.id,
      data: serializeComponent(component),
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create a component set from multiple components
export async function handleCreateComponentSet(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as CreateComponentSetPayload;

  if (!payload.componentIds || payload.componentIds.length < 2) {
    return errorResult(command.id, 'At least 2 component IDs required for component set');
  }

  try {
    var components: ComponentNode[] = [];

    for (var i = 0; i < payload.componentIds.length; i++) {
      var node = await figma.getNodeByIdAsync(payload.componentIds[i]);

      if (!node) {
        return errorResult(command.id, 'Component not found: ' + payload.componentIds[i]);
      }

      if (node.type !== 'COMPONENT') {
        return errorResult(command.id, 'Node is not a component: ' + payload.componentIds[i]);
      }

      components.push(node as ComponentNode);
    }

    // Get parent for the component set
    var parent = components[0].parent;
    if (!parent || !('appendChild' in parent)) {
      parent = figma.currentPage;
    }

    // Combine as variants
    var componentSet = figma.combineAsVariants(components, parent as FrameNode | PageNode);

    if (payload.name) {
      componentSet.name = payload.name;
    }

    figma.currentPage.selection = [componentSet];
    figma.viewport.scrollAndZoomIntoView([componentSet]);

    return successResult(command.id, {
      nodeId: componentSet.id,
      data: serializeComponent(componentSet),
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Add a variant to a component set
export async function handleAddVariant(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as AddVariantPayload;

  if (!payload.componentSetId) {
    return errorResult(command.id, 'Missing componentSetId');
  }

  try {
    var setNode = await figma.getNodeByIdAsync(payload.componentSetId);

    if (!setNode) {
      return errorResult(command.id, 'Component set not found: ' + payload.componentSetId);
    }

    if (setNode.type !== 'COMPONENT_SET') {
      return errorResult(command.id, 'Node is not a component set');
    }

    var componentSet = setNode as ComponentSetNode;
    var newVariant: ComponentNode;

    if (payload.sourceVariantId) {
      // Clone from existing variant
      var sourceNode = await figma.getNodeByIdAsync(payload.sourceVariantId);

      if (!sourceNode || sourceNode.type !== 'COMPONENT') {
        return errorResult(command.id, 'Source variant not found');
      }

      var source = sourceNode as ComponentNode;
      newVariant = source.clone() as ComponentNode;
    } else {
      // Create new empty component
      newVariant = figma.createComponent();
      var firstVariant = componentSet.children[0] as ComponentNode;
      newVariant.resize(firstVariant.width, firstVariant.height);
    }

    newVariant.name = payload.name;

    // Add to component set
    componentSet.appendChild(newVariant);

    return successResult(command.id, {
      nodeId: newVariant.id,
      data: {
        id: newVariant.id,
        name: newVariant.name,
        componentSetId: componentSet.id,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Edit component properties
export async function handleEditComponentProperties(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as EditComponentPropertiesPayload;

  if (!payload.componentId) {
    return errorResult(command.id, 'Missing componentId');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.componentId);

    if (!node) {
      return errorResult(command.id, 'Component not found: ' + payload.componentId);
    }

    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
      return errorResult(command.id, 'Node is not a component or component set');
    }

    var component = node as ComponentNode | ComponentSetNode;

    // Add new properties (capture returned keys)
    var addedKeys: Record<string, string> = {};
    if (payload.add && payload.add.length > 0) {
      for (var i = 0; i < payload.add.length; i++) {
        var prop = payload.add[i];
        var defaultVal = prop.defaultValue;

        if (prop.type === 'BOOLEAN') {
          defaultVal = defaultVal !== undefined ? Boolean(defaultVal) : true;
        } else if (prop.type === 'TEXT') {
          defaultVal = defaultVal !== undefined ? String(defaultVal) : '';
        }

        if (prop.type !== 'VARIANT') {
          var key: string;
          if (component.type === 'COMPONENT') {
            key = (component as ComponentNode).addComponentProperty(prop.name, prop.type, defaultVal);
          } else {
            key = (component as ComponentSetNode).addComponentProperty(prop.name, prop.type, defaultVal);
          }
          addedKeys[prop.name] = key;
        }
      }
    }

    // Remove properties
    if (payload.remove && payload.remove.length > 0) {
      for (var j = 0; j < payload.remove.length; j++) {
        try {
          if (component.type === 'COMPONENT') {
            (component as ComponentNode).deleteComponentProperty(payload.remove[j]);
          } else {
            (component as ComponentSetNode).deleteComponentProperty(payload.remove[j]);
          }
        } catch (_e) {
          // Property may not exist
        }
      }
    }

    // Edit existing properties
    if (payload.edit && payload.edit.length > 0 && component.type === 'COMPONENT') {
      var comp = component as ComponentNode;
      for (var k = 0; k < payload.edit.length; k++) {
        var edit = payload.edit[k];
        try {
          if (edit.newName) {
            comp.editComponentProperty(edit.name, { preferredValues: undefined });
          }
        } catch (_e) {
          // Property may not exist
        }
      }
    }

    var resultData = serializeComponent(component) as Record<string, any>;
    resultData.addedKeys = addedKeys;
    return successResult(command.id, {
      nodeId: component.id,
      data: resultData,
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Set componentPropertyReferences on a child node
export async function handleSetComponentPropertyReferences(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId: string;
    references: Record<string, string>;
  };

  if (!payload.nodeId) {
    return errorResult(command.id, 'Missing nodeId');
  }
  if (!payload.references) {
    return errorResult(command.id, 'Missing references map');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    if (!('componentPropertyReferences' in node)) {
      return errorResult(command.id, 'Node does not support componentPropertyReferences: ' + node.type);
    }

    var sceneNode = node as SceneNode & { componentPropertyReferences: Record<string, string> | null };
    // Merge with existing references
    var existing = sceneNode.componentPropertyReferences || {};
    var merged: Record<string, string> = {};
    for (var key in existing) {
      merged[key] = existing[key];
    }
    for (var key in payload.references) {
      merged[key] = payload.references[key];
    }
    sceneNode.componentPropertyReferences = merged;

    return successResult(command.id, {
      nodeId: node.id,
      data: { references: sceneNode.componentPropertyReferences },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Get component property definitions (works for both COMPONENT and COMPONENT_SET)
export async function handleGetComponentPropertyDefinitions(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { componentId: string };

  if (!payload.componentId) {
    return errorResult(command.id, 'Missing componentId');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.componentId);
    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.componentId);
    }

    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
      return errorResult(command.id, 'Node is not a component or component set');
    }

    var comp = node as ComponentNode | ComponentSetNode;
    var defs = comp.componentPropertyDefinitions;
    var result: Record<string, any> = {};

    var keys = Object.keys(defs);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      result[k] = {
        type: defs[k].type,
        defaultValue: defs[k].defaultValue,
      };
    }

    return successResult(command.id, {
      nodeId: comp.id,
      data: result,
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Get all components
export async function handleGetComponents(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as GetComponentsPayload;
  var type = (payload && payload.type) ? payload.type : 'all';

  try {
    var result: Record<string, any> = {};

    // Find all components on current page
    function findComponents(parent: BaseNode & ChildrenMixin): void {
      for (var i = 0; i < parent.children.length; i++) {
        var child = parent.children[i];

        if (child.type === 'COMPONENT' && (type === 'all' || type === 'components')) {
          if (!result.components) {
            result.components = [];
          }
          result.components.push(serializeComponent(child as ComponentNode));
        }

        if (child.type === 'COMPONENT_SET' && (type === 'all' || type === 'componentSets')) {
          if (!result.componentSets) {
            result.componentSets = [];
          }
          result.componentSets.push(serializeComponent(child as ComponentSetNode));
        }

        if ('children' in child) {
          findComponents(child as BaseNode & ChildrenMixin);
        }
      }
    }

    findComponents(figma.currentPage);

    return successResult(command.id, {
      data: result,
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}
