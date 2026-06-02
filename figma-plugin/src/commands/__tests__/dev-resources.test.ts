import { describe, it, expect, vi } from 'vitest';
import { handleSetDevResources } from '../dev-resources';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

function makeDevNode(overrides: Record<string, any> = {}) {
  return createMockNode({
    id: 'frame-1',
    type: 'FRAME',
    addDevResourceAsync: vi.fn(async () => undefined),
    getDevResourcesAsync: vi.fn(async () => []),
    editDevResourceAsync: vi.fn(async () => undefined),
    deleteDevResourceAsync: vi.fn(async () => undefined),
    ...overrides,
  });
}

describe('handleSetDevResources', () => {
  it('returns error when target is missing', async () => {
    const result = await handleSetDevResources(
      makeCommand('setDevResources', { resources: [{ name: 'US-7', url: 'https://x' }] }),
    );
    expectError(result, 'Target node ID is required');
  });

  it('returns error when resources array is missing or empty', async () => {
    const node = makeDevNode();
    registerNode(node);
    const result = await handleSetDevResources(makeCommand('setDevResources', { resources: [] }, 'frame-1'));
    expectError(result, 'resources array is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleSetDevResources(
      makeCommand('setDevResources', { resources: [{ url: 'https://x' }] }, 'nope'),
    );
    expectError(result, 'not found');
  });

  it('returns error when node does not support dev resources', async () => {
    const node = createMockNode({ id: 'plain-1', type: 'FRAME' });
    registerNode(node);
    const result = await handleSetDevResources(
      makeCommand('setDevResources', { resources: [{ url: 'https://x' }] }, 'plain-1'),
    );
    expectError(result, 'does not support dev resources');
  });

  it('adds dev resource links via command.target', async () => {
    const node = makeDevNode();
    registerNode(node);

    const result = await handleSetDevResources(
      makeCommand(
        'setDevResources',
        { resources: [{ name: 'US-NEW-7', url: 'https://figma.com/design/abc?node-id=4409-25320' }] },
        'frame-1',
      ),
    );

    expectSuccess(result);
    const data = result.data as any;
    expect(data.added).toBe(1);
    expect(data.resources[0]).toMatchObject({ name: 'US-NEW-7' });
    expect(node.addDevResourceAsync).toHaveBeenCalledWith(
      'https://figma.com/design/abc?node-id=4409-25320',
      'US-NEW-7',
    );
  });

  it('resolves the node from payload.nodeId when target is absent', async () => {
    const node = makeDevNode({ id: '1727:115646' });
    registerNode(node);

    const result = await handleSetDevResources(
      makeCommand('setDevResources', {
        nodeId: '1727:115646',
        resources: [{ name: 'US-NEW-7', url: 'https://x' }],
      }),
    );

    expectSuccess(result);
    expect((result.data as any).nodeId).toBe('1727:115646');
    expect(node.addDevResourceAsync).toHaveBeenCalledOnce();
  });

  it('is idempotent — edits the resource when add fails because url exists', async () => {
    const node = makeDevNode({
      addDevResourceAsync: vi.fn(async () => {
        throw new Error('A dev resource with this url already exists');
      }),
    });
    registerNode(node);

    const result = await handleSetDevResources(
      makeCommand('setDevResources', { resources: [{ name: 'Renamed', url: 'https://x' }] }, 'frame-1'),
    );

    expectSuccess(result);
    const data = result.data as any;
    expect(data.added).toBe(1);
    expect(data.resources[0].updated).toBe(true);
    expect(node.editDevResourceAsync).toHaveBeenCalledWith('https://x', { name: 'Renamed' });
  });

  it('replace=true deletes existing resources first', async () => {
    const node = makeDevNode({
      getDevResourcesAsync: vi.fn(async () => [{ url: 'https://old', name: 'Old' }]),
    });
    registerNode(node);

    const result = await handleSetDevResources(
      makeCommand(
        'setDevResources',
        { replace: true, resources: [{ name: 'New', url: 'https://new' }] },
        'frame-1',
      ),
    );

    expectSuccess(result);
    expect(node.deleteDevResourceAsync).toHaveBeenCalledWith('https://old');
    expect(node.addDevResourceAsync).toHaveBeenCalledWith('https://new', 'New');
  });

  it('reports per-resource errors without failing the whole call', async () => {
    const node = makeDevNode({
      addDevResourceAsync: vi.fn(async () => {
        throw new Error('boom');
      }),
      editDevResourceAsync: vi.fn(async () => {
        throw new Error('still boom');
      }),
    });
    registerNode(node);

    const result = await handleSetDevResources(
      makeCommand('setDevResources', { resources: [{ name: 'X', url: 'https://x' }] }, 'frame-1'),
    );

    expectSuccess(result);
    const data = result.data as any;
    expect(data.added).toBe(0);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].url).toBe('https://x');
  });
});
