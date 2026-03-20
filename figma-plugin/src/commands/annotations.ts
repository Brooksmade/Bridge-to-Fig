import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Add an annotation to a node
export async function handleAddAnnotation(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    label: string;
    description?: string;
    categoryId?: string;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || !payload.label) {
    return errorResult(command.id, 'label is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('annotations' in node)) {
      return errorResult(command.id, 'This Figma version does not support annotations on this node type');
    }

    var annotatedNode = node as SceneNode & AnnotationMixin;
    var existing = annotatedNode.annotations ? [...annotatedNode.annotations] : [];

    var newAnnotation: any = {
      label: payload.label,
    };

    if (payload.description) {
      newAnnotation.description = payload.description;
    }

    if (payload.categoryId) {
      newAnnotation.annotationCategoryId = payload.categoryId;
    }

    existing.push(newAnnotation);
    annotatedNode.annotations = existing;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        annotationIndex: existing.length - 1,
        label: payload.label,
        totalAnnotations: existing.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to add annotation: ' + message);
  }
}

// Edit an existing annotation on a node
export async function handleEditAnnotation(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    annotationIndex: number;
    label?: string;
    description?: string;
    categoryId?: string;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || payload.annotationIndex === undefined) {
    return errorResult(command.id, 'annotationIndex is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('annotations' in node)) {
      return errorResult(command.id, 'This Figma version does not support annotations on this node type');
    }

    var annotatedNode = node as SceneNode & AnnotationMixin;
    var annotations = annotatedNode.annotations ? [...annotatedNode.annotations] : [];

    if (payload.annotationIndex < 0 || payload.annotationIndex >= annotations.length) {
      return errorResult(command.id, 'annotationIndex out of range (0-' + (annotations.length - 1) + ')');
    }

    var annotation = { ...annotations[payload.annotationIndex] } as any;

    if (payload.label !== undefined) {
      annotation.label = payload.label;
    }
    if (payload.description !== undefined) {
      annotation.description = payload.description;
    }
    if (payload.categoryId !== undefined) {
      annotation.annotationCategoryId = payload.categoryId;
    }

    annotations[payload.annotationIndex] = annotation;
    annotatedNode.annotations = annotations;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        annotationIndex: payload.annotationIndex,
        label: annotation.label,
        success: true,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to edit annotation: ' + message);
  }
}

// Delete an annotation from a node
export async function handleDeleteAnnotation(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    annotationIndex: number;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || payload.annotationIndex === undefined) {
    return errorResult(command.id, 'annotationIndex is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('annotations' in node)) {
      return errorResult(command.id, 'This Figma version does not support annotations on this node type');
    }

    var annotatedNode = node as SceneNode & AnnotationMixin;
    var annotations = annotatedNode.annotations ? [...annotatedNode.annotations] : [];

    if (payload.annotationIndex < 0 || payload.annotationIndex >= annotations.length) {
      return errorResult(command.id, 'annotationIndex out of range (0-' + (annotations.length - 1) + ')');
    }

    var removed = annotations.splice(payload.annotationIndex, 1)[0];
    annotatedNode.annotations = annotations;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        removedLabel: (removed as any).label,
        remainingAnnotations: annotations.length,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to delete annotation: ' + message);
  }
}
