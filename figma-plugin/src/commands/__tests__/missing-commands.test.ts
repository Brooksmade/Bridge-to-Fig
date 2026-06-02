import { describe, it, expect, vi } from 'vitest';
import { executeCommand } from '../index';
import { makeCommand } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

const NEW_COMMANDS = [
  'getBoundVariables',
  'resolveVariableValue',
  'addCollectionMode',
  'removeCollectionMode',
  'cloneVariableCollection',
  'getVariableConsumers',
  'getTextSegments',
  'setTextCase',
  'insertCharacters',
  'deleteCharacters',
  'findByName',
  'findByRegex',
  'findWithCriteria',
  'getAbsoluteBounds',
  'getRelativeBounds',
  'getAutoLayoutProperties',
  'swapComponent',
  'addComponentProperty',
  'deleteComponentProperty',
  'getDocumentPluginData',
  'setDocumentPluginData',
  'deletePluginData',
  'createImageFromBytes',
  'getImageHash',
  'setImageHash',
  'exportSelection',
  'getAnnotations',
  'addTableRow',
  'addTableColumn',
  'removeTableRow',
  'removeTableColumn',
  'styleTableColumn',
];

describe('previously-missing commands route through the dispatcher', () => {
  it.each(NEW_COMMANDS)('routes "%s" (never "Unknown command type")', async (type) => {
    const result = await executeCommand(makeCommand(type, {}));
    // Routing proven: the dispatcher reached a real handler, not the default branch.
    expect(result.error || '').not.toContain('Unknown command type');
  });
});

describe('getBoundVariables', () => {
  it('flattens array + scalar bindings and resolves variable names', async () => {
    (globalThis as any).figma.variables = {
      getVariableByIdAsync: vi.fn(async (id: string) => {
        const names: Record<string, { name: string }> = {
          'VariableID:1': { name: 'Color/Primary' },
          'VariableID:2': { name: 'Radius/MD' },
        };
        return names[id] || null;
      }),
    };

    const node = createMockNode({
      id: 'bv-node',
      type: 'RECTANGLE',
      boundVariables: {
        fills: [{ type: 'VARIABLE_ALIAS', id: 'VariableID:1' }],
        cornerRadius: { type: 'VARIABLE_ALIAS', id: 'VariableID:2' },
      },
    });
    registerNode(node);

    const result = await executeCommand(makeCommand('getBoundVariables', { nodeId: 'bv-node' }));

    expect(result.success).toBe(true);
    const bindings = (result.data as any).bindings;
    expect(bindings).toContainEqual({ field: 'fills[0]', variableId: 'VariableID:1', variableName: 'Color/Primary' });
    expect(bindings).toContainEqual({ field: 'cornerRadius', variableId: 'VariableID:2', variableName: 'Radius/MD' });
  });

  it('returns an empty list when the node has no bindings', async () => {
    const node = createMockNode({ id: 'bv-empty', type: 'RECTANGLE', boundVariables: {} });
    registerNode(node);
    const result = await executeCommand(makeCommand('getBoundVariables', { nodeId: 'bv-empty' }));
    expect(result.success).toBe(true);
    expect((result.data as any).bindings).toEqual([]);
  });

  it('errors without a node id', async () => {
    const result = await executeCommand(makeCommand('getBoundVariables', {}));
    expect(result.success).toBe(false);
    expect(result.error).toContain('Node ID is required');
  });
});
