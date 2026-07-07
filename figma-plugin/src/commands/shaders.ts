// Shader commands (Figma plugin API v1.127, June 2026).
// Shaders are discovered with figma.listAvailableShaders(), materialized into the file with
// figma.importShaderById(), then applied as a ShaderPaint (fill/stroke) or ShaderEffect.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

function shadersSupported(): boolean {
  return typeof (figma as any).listAvailableShaders === 'function';
}

function serializeShader(s: any) {
  return {
    id: s.id,
    name: s.name,
    type: s.type, // 'effect' | 'fill'
    imported: s.imported,
    propertyDefinitions: s.propertyDefinitions,
  };
}

// List all shaders available to the current file.
export async function handleListShaders(command: FigmaCommand): Promise<CommandResult> {
  if (!shadersSupported()) {
    return errorResult(command.id, 'Shaders are not available in this Figma client version (requires the June 2026 update).');
  }
  var shaders = await (figma as any).listAvailableShaders();
  return successResult(command.id, {
    data: { count: shaders.length, shaders: shaders.map(serializeShader) },
  });
}

// Import (materialize) a shader by id so it can be applied.
export async function handleImportShader(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { id?: string };
  var id = payload.id || command.target;
  if (!id) return errorResult(command.id, 'Shader id is required');
  if (!shadersSupported()) {
    return errorResult(command.id, 'Shaders are not available in this Figma client version.');
  }
  var shader = await (figma as any).importShaderById(id);
  return successResult(command.id, { data: serializeShader(shader) });
}

// Apply a shader as a fill (or stroke). Imports the shader first (idempotent).
export async function handleApplyShaderFill(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    shaderId?: string;
    properties?: { [defId: string]: any };
    target?: 'fills' | 'strokes';
    append?: boolean;
  };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.shaderId) return errorResult(command.id, 'shaderId is required');
  if (!shadersSupported()) {
    return errorResult(command.id, 'Shaders are not available in this Figma client version.');
  }

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');

  var prop = payload.target === 'strokes' ? 'strokes' : 'fills';
  if (!(prop in node)) {
    return errorResult(command.id, 'Node does not support ' + prop);
  }

  // Must import before applying.
  await (figma as any).importShaderById(payload.shaderId);

  var shaderPaint: any = { type: 'SHADER', id: payload.shaderId };
  if (payload.properties) shaderPaint.properties = payload.properties;

  var geo = node as any;
  var existing = payload.append && Array.isArray(geo[prop]) ? geo[prop].slice() : [];
  existing.push(shaderPaint);
  geo[prop] = existing;

  return successResult(command.id, {
    data: { nodeId: node.id, appliedTo: prop, shaderId: payload.shaderId },
  });
}

// Apply a shader as an effect.
export async function handleApplyShaderEffect(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    shaderId?: string;
    properties?: { [defId: string]: any };
    visible?: boolean;
    append?: boolean;
  };
  var nodeId = command.target || payload.nodeId;
  if (!nodeId) return errorResult(command.id, 'Target node ID is required');
  if (!payload.shaderId) return errorResult(command.id, 'shaderId is required');
  if (!shadersSupported()) {
    return errorResult(command.id, 'Shaders are not available in this Figma client version.');
  }

  var node = await figma.getNodeByIdAsync(nodeId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (!('effects' in node)) return errorResult(command.id, 'Node does not support effects');

  await (figma as any).importShaderById(payload.shaderId);

  var shaderEffect: any = { type: 'SHADER', id: payload.shaderId, visible: payload.visible !== false };
  if (payload.properties) shaderEffect.properties = payload.properties;

  var n = node as any;
  var existing = payload.append && Array.isArray(n.effects) ? n.effects.slice() : [];
  existing.push(shaderEffect);
  n.effects = existing;

  return successResult(command.id, {
    data: { nodeId: node.id, shaderId: payload.shaderId },
  });
}
