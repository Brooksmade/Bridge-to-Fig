import { describe, it, expect, vi } from 'vitest';
import { handleCreateHighlight, handleCreateStamp, handleCreateWashiTape, handleCreateEmbed } from '../advanced-nodes';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

describe('handleCreateHighlight', () => {
  it('returns error when API is not available', async () => {
    delete (globalThis as any).figma.createHighlight;

    const result = await handleCreateHighlight(makeCommand('createHighlight', {}));
    expectError(result, 'not available');
  });

  it('creates highlight with default position', async () => {
    const result = await handleCreateHighlight(makeCommand('createHighlight', {}));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Highlight');
    expect((globalThis as any).figma.createHighlight).toHaveBeenCalled();
  });

  it('creates highlight with specified position', async () => {
    const result = await handleCreateHighlight(makeCommand('createHighlight', { x: 100, y: 200 }));
    expectSuccess(result);
  });

  it('reparents to parent when specified', async () => {
    const parent = createMockNode({ id: 'parent-1', type: 'FRAME' });
    registerNode(parent);

    const result = await handleCreateHighlight(makeCommand('createHighlight', { parent: 'parent-1' }));
    expectSuccess(result);
    expect(parent.appendChild).toHaveBeenCalled();
  });
});

describe('handleCreateStamp', () => {
  it('returns error when API is not available', async () => {
    delete (globalThis as any).figma.createStamp;

    const result = await handleCreateStamp(makeCommand('createStamp', {}));
    expectError(result, 'not available');
  });

  it('creates stamp with default properties', async () => {
    const result = await handleCreateStamp(makeCommand('createStamp', {}));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.id).toBeDefined();
    expect(data.name).toBe('Stamp');
    expect((globalThis as any).figma.createStamp).toHaveBeenCalled();
  });

  it('creates stamp with position', async () => {
    const result = await handleCreateStamp(makeCommand('createStamp', { x: 50, y: 75 }));
    expectSuccess(result);
  });

  it('reparents to parent when specified', async () => {
    const parent = createMockNode({ id: 'parent-1', type: 'FRAME' });
    registerNode(parent);

    const result = await handleCreateStamp(makeCommand('createStamp', { parent: 'parent-1' }));
    expectSuccess(result);
    expect(parent.appendChild).toHaveBeenCalled();
  });
});

describe('handleCreateWashiTape', () => {
  it('returns error when API is not available', async () => {
    delete (globalThis as any).figma.createWashiTape;

    const result = await handleCreateWashiTape(makeCommand('createWashiTape', {}));
    expectError(result, 'not available');
  });

  it('creates washi tape with default properties', async () => {
    const result = await handleCreateWashiTape(makeCommand('createWashiTape', {}));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.id).toBeDefined();
    expect((globalThis as any).figma.createWashiTape).toHaveBeenCalled();
  });

  it('connects start and end nodes', async () => {
    const startNode = createMockNode({ id: 'start-1', type: 'STICKY' });
    const endNode = createMockNode({ id: 'end-1', type: 'STICKY' });
    registerNode(startNode);
    registerNode(endNode);

    const result = await handleCreateWashiTape(makeCommand('createWashiTape', {
      connectorStartNodeId: 'start-1',
      connectorEndNodeId: 'end-1',
    }));
    expectSuccess(result);
  });

  it('sets magnet positions', async () => {
    const startNode = createMockNode({ id: 'start-1', type: 'STICKY' });
    const endNode = createMockNode({ id: 'end-1', type: 'STICKY' });
    registerNode(startNode);
    registerNode(endNode);

    const result = await handleCreateWashiTape(makeCommand('createWashiTape', {
      connectorStartNodeId: 'start-1',
      connectorEndNodeId: 'end-1',
      startMagnet: 'RIGHT',
      endMagnet: 'LEFT',
    }));
    expectSuccess(result);
  });
});

describe('handleCreateEmbed', () => {
  it('returns error when url is missing', async () => {
    const result = await handleCreateEmbed(makeCommand('createEmbed', {}));
    expectError(result, 'url is required');
  });

  it('returns error when API is not available', async () => {
    delete (globalThis as any).figma.createEmbedAsync;

    const result = await handleCreateEmbed(makeCommand('createEmbed', { url: 'https://example.com' }));
    expectError(result, 'not available');
  });

  it('creates embed with URL', async () => {
    const result = await handleCreateEmbed(makeCommand('createEmbed', { url: 'https://example.com' }));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.id).toBeDefined();
    expect(data.url).toBe('https://example.com');
    expect((globalThis as any).figma.createEmbedAsync).toHaveBeenCalledWith('https://example.com');
  });

  it('creates embed with position', async () => {
    const result = await handleCreateEmbed(makeCommand('createEmbed', {
      url: 'https://example.com',
      x: 300,
      y: 400,
    }));
    expectSuccess(result);
  });

  it('reparents to parent when specified', async () => {
    const parent = createMockNode({ id: 'parent-1', type: 'FRAME' });
    registerNode(parent);

    const result = await handleCreateEmbed(makeCommand('createEmbed', {
      url: 'https://example.com',
      parent: 'parent-1',
    }));
    expectSuccess(result);
    expect(parent.appendChild).toHaveBeenCalled();
  });
});
