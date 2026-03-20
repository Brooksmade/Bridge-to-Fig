import { describe, it, expect } from 'vitest';
import { handleGetVectorNetwork, handleGetVectorPaths } from '../query-extended';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

describe('handleGetVectorNetwork', () => {
  it('returns error when target is missing', async () => {
    const result = await handleGetVectorNetwork(makeCommand('getVectorNetwork'));
    expectError(result, 'Target vector node ID is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleGetVectorNetwork(makeCommand('getVectorNetwork', {}, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('returns error when node is not a vector', async () => {
    const frame = createMockNode({ id: 'frame-1', type: 'FRAME' });
    registerNode(frame);

    const result = await handleGetVectorNetwork(makeCommand('getVectorNetwork', {}, 'frame-1'));
    expectError(result, 'not a vector node');
  });

  it('returns vector network data', async () => {
    const vectorNode = createMockNode({
      id: 'vec-1',
      type: 'VECTOR',
      vectorNetwork: {
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        segments: [
          { start: 0, end: 1 },
        ],
        regions: [],
      },
    });
    registerNode(vectorNode);

    const result = await handleGetVectorNetwork(makeCommand('getVectorNetwork', {}, 'vec-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.nodeId).toBe('vec-1');
    expect(data.vectorNetwork.vertices).toHaveLength(2);
    expect(data.vectorNetwork.segments).toHaveLength(1);
    expect(data.vectorNetwork.regions).toEqual([]);
  });
});

describe('handleGetVectorPaths', () => {
  it('returns error when target is missing', async () => {
    const result = await handleGetVectorPaths(makeCommand('getVectorPaths'));
    expectError(result, 'Target vector node ID is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleGetVectorPaths(makeCommand('getVectorPaths', {}, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('returns error when node is not a vector', async () => {
    const rect = createMockNode({ id: 'rect-1', type: 'RECTANGLE' });
    registerNode(rect);

    const result = await handleGetVectorPaths(makeCommand('getVectorPaths', {}, 'rect-1'));
    expectError(result, 'not a vector node');
  });

  it('returns vector paths with SVG data', async () => {
    const vectorNode = createMockNode({
      id: 'vec-1',
      type: 'VECTOR',
      vectorPaths: [
        { windingRule: 'NONZERO', data: 'M 0 0 L 100 100 Z' },
        { windingRule: 'EVENODD', data: 'M 50 50 L 150 150 Z' },
      ],
    });
    registerNode(vectorNode);

    const result = await handleGetVectorPaths(makeCommand('getVectorPaths', {}, 'vec-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.nodeId).toBe('vec-1');
    expect(data.vectorPaths).toHaveLength(2);
    expect(data.vectorPaths[0].windingRule).toBe('NONZERO');
    expect(data.vectorPaths[0].data).toBe('M 0 0 L 100 100 Z');
    expect(data.count).toBe(2);
  });

  it('returns empty paths for vector with no paths', async () => {
    const vectorNode = createMockNode({
      id: 'vec-1',
      type: 'VECTOR',
      vectorPaths: [],
    });
    registerNode(vectorNode);

    const result = await handleGetVectorPaths(makeCommand('getVectorPaths', {}, 'vec-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.vectorPaths).toEqual([]);
    expect(data.count).toBe(0);
  });
});
