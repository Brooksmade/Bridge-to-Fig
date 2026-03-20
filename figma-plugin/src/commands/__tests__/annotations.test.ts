import { describe, it, expect } from 'vitest';
import { handleAddAnnotation, handleEditAnnotation, handleDeleteAnnotation } from '../annotations';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

describe('handleAddAnnotation', () => {
  it('returns error when target is missing', async () => {
    const result = await handleAddAnnotation(makeCommand('addAnnotation', { label: 'Test' }));
    expectError(result, 'Target node ID is required');
  });

  it('returns error when label is missing', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', {}, 'node-1'));
    expectError(result, 'label is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleAddAnnotation(makeCommand('addAnnotation', { label: 'Test' }, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('adds annotation with label only', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', { label: 'Spacing' }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.annotationIndex).toBe(0);
    expect(data.label).toBe('Spacing');
    expect(data.totalAnnotations).toBe(1);
  });

  it('adds annotation with description and categoryId', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', {
      label: 'Color',
      description: 'Use brand primary',
      categoryId: 'cat-1',
    }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.label).toBe('Color');
    expect(data.totalAnnotations).toBe(1);
  });

  it('appends to existing annotations', async () => {
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'Existing' }],
    });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', { label: 'New' }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.annotationIndex).toBe(1);
    expect(data.totalAnnotations).toBe(2);
  });
});

describe('handleEditAnnotation', () => {
  it('returns error when target is missing', async () => {
    const result = await handleEditAnnotation(makeCommand('editAnnotation', { annotationIndex: 0 }));
    expectError(result, 'Target node ID is required');
  });

  it('returns error when annotationIndex is missing', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [{ label: 'Test' }] });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', {}, 'node-1'));
    expectError(result, 'annotationIndex is required');
  });

  it('returns error when index out of range', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [{ label: 'Test' }] });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', { annotationIndex: 5 }, 'node-1'));
    expectError(result, 'out of range');
  });

  it('updates label', async () => {
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'Old Label' }],
    });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', {
      annotationIndex: 0,
      label: 'New Label',
    }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.label).toBe('New Label');
  });

  it('updates description only (partial update)', async () => {
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'Keep This', description: 'Old' }],
    });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', {
      annotationIndex: 0,
      description: 'New Description',
    }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.label).toBe('Keep This');
  });
});

describe('handleDeleteAnnotation', () => {
  it('returns error when target is missing', async () => {
    const result = await handleDeleteAnnotation(makeCommand('deleteAnnotation', { annotationIndex: 0 }));
    expectError(result, 'Target node ID is required');
  });

  it('returns error when index out of range', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [{ label: 'Test' }] });
    registerNode(node);

    const result = await handleDeleteAnnotation(makeCommand('deleteAnnotation', { annotationIndex: 5 }, 'node-1'));
    expectError(result, 'out of range');
  });

  it('removes annotation at index', async () => {
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'First' }, { label: 'Second' }],
    });
    registerNode(node);

    const result = await handleDeleteAnnotation(makeCommand('deleteAnnotation', { annotationIndex: 0 }, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.removedLabel).toBe('First');
    expect(data.remainingAnnotations).toBe(1);
  });
});
