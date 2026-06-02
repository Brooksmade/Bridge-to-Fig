import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Reduce an annotation to only the keys Figma accepts on assignment.
// Figma returns BOTH `label` and `labelMarkdown` when reading a markdown
// annotation, but re-assigning an annotation that has both fails validation
// ("Only one of label or labelMarkdown should be given"). It also drops any
// unrecognized keys (e.g. a legacy `description`) that would otherwise make the
// whole `annotations = [...]` assignment throw. labelMarkdown wins over label.
function sanitizeAnnotation(annotation: any): any {
  var clean: any = {};

  if (annotation.labelMarkdown) {
    clean.labelMarkdown = annotation.labelMarkdown;
  } else if (annotation.label) {
    clean.label = annotation.label;
  }

  if (annotation.categoryId) {
    clean.categoryId = annotation.categoryId;
  }

  if (annotation.properties) {
    clean.properties = annotation.properties;
  }

  return clean;
}

// Add an annotation to a node
export async function handleAddAnnotation(command: FigmaCommand): Promise<CommandResult> {
  var targetId = command.target;
  var payload = command.payload as {
    label?: string;
    labelMarkdown?: string;
    categoryId?: string;
  };

  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload || (!payload.label && !payload.labelMarkdown)) {
    return errorResult(command.id, 'label or labelMarkdown is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(targetId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + targetId);
    }

    if (!('annotations' in node)) {
      return errorResult(command.id, 'This Figma version does not support annotations on this node type');
    }

    var annotatedNode = node as SceneNode & AnnotationsMixin;
    var existing = annotatedNode.annotations ? annotatedNode.annotations.map(sanitizeAnnotation) : [];

    // Only the keys Figma recognizes (label, labelMarkdown, categoryId,
    // properties) may be set — any unknown key (e.g. `description`) makes Figma
    // reject the whole assignment. labelMarkdown supersedes a plain label.
    // NOTE: annotation markdown links render as plain, non-clickable text; for
    // a clickable link use setDevResources (Dev Mode links) instead.
    var newAnnotation: any = {};

    if (payload.labelMarkdown) {
      newAnnotation.labelMarkdown = payload.labelMarkdown;
    } else if (payload.label) {
      newAnnotation.label = payload.label;
    }

    if (payload.categoryId) {
      newAnnotation.categoryId = payload.categoryId;
    }

    existing.push(newAnnotation);
    annotatedNode.annotations = existing;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        annotationIndex: existing.length - 1,
        label: payload.label,
        labelMarkdown: payload.labelMarkdown,
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
    labelMarkdown?: string;
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

    var annotatedNode = node as SceneNode & AnnotationsMixin;
    var annotations = annotatedNode.annotations ? annotatedNode.annotations.map(sanitizeAnnotation) : [];

    if (payload.annotationIndex < 0 || payload.annotationIndex >= annotations.length) {
      return errorResult(command.id, 'annotationIndex out of range (0-' + (annotations.length - 1) + ')');
    }

    var annotation = { ...annotations[payload.annotationIndex] } as any;

    // labelMarkdown and label are mutually exclusive — setting one clears the
    // other so Figma never receives both. `description` is not a valid key.
    if (payload.labelMarkdown !== undefined) {
      annotation.labelMarkdown = payload.labelMarkdown;
      delete annotation.label;
    } else if (payload.label !== undefined) {
      annotation.label = payload.label;
      delete annotation.labelMarkdown;
    }
    if (payload.categoryId !== undefined) {
      annotation.categoryId = payload.categoryId;
    }

    annotations[payload.annotationIndex] = sanitizeAnnotation(annotation);
    annotatedNode.annotations = annotations;

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        annotationIndex: payload.annotationIndex,
        label: annotation.label,
        labelMarkdown: annotation.labelMarkdown,
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

    var annotatedNode = node as SceneNode & AnnotationsMixin;
    var annotations = annotatedNode.annotations ? annotatedNode.annotations.map(sanitizeAnnotation) : [];

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
