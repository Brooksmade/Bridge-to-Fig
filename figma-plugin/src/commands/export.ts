import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Export node to PNG/JPG/SVG/PDF
export async function handleExportNode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    format?: 'PNG' | 'JPG' | 'SVG' | 'PDF';
    scale?: number;
    contentsOnly?: boolean;
    useAbsoluteBounds?: boolean;
  };

  if (!command.target) {
    // Use selection if no target specified
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      return errorResult(command.id, 'No target node or selection');
    }
    if (selection.length > 1) {
      return errorResult(command.id, 'Multiple nodes selected - specify a single target');
    }
    command.target = selection[0].id;
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, 'Cannot export document or page nodes directly');
  }

  var sceneNode = node as SceneNode;
  var format = (payload && payload.format) || 'PNG';
  var scale = (payload && payload.scale) || 1;

  try {
    var settings: ExportSettings;

    if (format === 'SVG') {
      settings = {
        format: 'SVG',
        svgIdAttribute: true,
        svgOutlineText: true,
      };
    } else if (format === 'PDF') {
      settings = {
        format: 'PDF',
      };
    } else if (format === 'JPG') {
      settings = {
        format: 'JPG',
        contentsOnly: payload && payload.contentsOnly,
        useAbsoluteBounds: payload && payload.useAbsoluteBounds,
      } as ExportSettingsImage;
    } else {
      settings = {
        format: 'PNG',
        constraint: { type: 'SCALE', value: scale },
        contentsOnly: payload && payload.contentsOnly,
        useAbsoluteBounds: payload && payload.useAbsoluteBounds,
      };
    }

    var bytes = await sceneNode.exportAsync(settings);
    var base64 = figma.base64Encode(bytes);

    return successResult(command.id, {
      data: {
        nodeId: sceneNode.id,
        nodeName: sceneNode.name,
        format: format,
        scale: scale,
        size: bytes.length,
        base64: base64,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Export failed: ' + message);
  }
}

// Export multiple nodes
export async function handleBatchExport(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeIds: string[];
    format?: 'PNG' | 'JPG' | 'SVG' | 'PDF';
    scale?: number;
  };

  if (!payload.nodeIds || payload.nodeIds.length === 0) {
    return errorResult(command.id, 'nodeIds array is required');
  }

  var format = payload.format || 'PNG';
  var scale = payload.scale || 1;
  var results: object[] = [];
  var errors: object[] = [];

  for (var i = 0; i < payload.nodeIds.length; i++) {
    var nodeId = payload.nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);

    if (!node) {
      errors.push({ nodeId: nodeId, error: 'Node not found' });
      continue;
    }

    if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
      errors.push({ nodeId: nodeId, error: 'Cannot export document or page' });
      continue;
    }

    try {
      var sceneNode = node as SceneNode;
      var settings: ExportSettings;

      if (format === 'SVG') {
        settings = { format: 'SVG', svgIdAttribute: true };
      } else if (format === 'PDF') {
        settings = { format: 'PDF' };
      } else if (format === 'JPG') {
        settings = { format: 'JPG' } as ExportSettingsImage;
      } else {
        settings = { format: 'PNG', constraint: { type: 'SCALE', value: scale } };
      }

      var bytes = await sceneNode.exportAsync(settings);
      var base64 = figma.base64Encode(bytes);

      results.push({
        nodeId: sceneNode.id,
        nodeName: sceneNode.name,
        format: format,
        size: bytes.length,
        base64: base64,
      });
    } catch (err) {
      var message = err instanceof Error ? err.message : String(err);
      errors.push({ nodeId: nodeId, error: message });
    }
  }

  return successResult(command.id, {
    data: {
      exported: results.length,
      failed: errors.length,
      results: results,
      errors: errors,
    },
  });
}

// Get export settings from a node
export async function handleGetExportSettings(command: FigmaCommand): Promise<CommandResult> {
  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('exportSettings' in node)) {
    return errorResult(command.id, 'Node does not support export settings');
  }

  var sceneNode = node as SceneNode;
  var settings = sceneNode.exportSettings;

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      nodeName: sceneNode.name,
      exportSettings: settings,
    },
  });
}

// Set export settings on a node
export async function handleSetExportSettings(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    settings: ExportSettings[];
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.settings) {
    return errorResult(command.id, 'settings array is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('exportSettings' in node)) {
    return errorResult(command.id, 'Node does not support export settings');
  }

  var sceneNode = node as SceneNode;
  sceneNode.exportSettings = payload.settings;

  return successResult(command.id, {
    data: {
      nodeId: sceneNode.id,
      nodeName: sceneNode.name,
      exportSettings: sceneNode.exportSettings,
    },
  });
}
