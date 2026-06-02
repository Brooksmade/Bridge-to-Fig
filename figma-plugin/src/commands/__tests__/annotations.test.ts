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
    expectError(result, 'label or labelMarkdown is required');
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

  it('forwards labelMarkdown to the stored annotation', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(
      makeCommand('addAnnotation', { labelMarkdown: '[US-NEW-7](https://figma.com/?node-id=4409-25320)' }, 'node-1'),
    );
    expectSuccess(result);
    expect(node.annotations[0].labelMarkdown).toBe('[US-NEW-7](https://figma.com/?node-id=4409-25320)');
    expect((result.data as any).labelMarkdown).toBe('[US-NEW-7](https://figma.com/?node-id=4409-25320)');
  });

  it('accepts labelMarkdown without a plain label', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', { labelMarkdown: '**bold**' }, 'node-1'));
    expectSuccess(result);
  });

  it('never forwards an unsupported description key to Figma', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(
      makeCommand('addAnnotation', { label: 'Spacing', description: 'should be dropped' } as any, 'node-1'),
    );
    expectSuccess(result);
    expect('description' in node.annotations[0]).toBe(false);
  });

  it('normalizes existing markdown annotations so re-assignment does not fail', async () => {
    // Figma returns BOTH label and labelMarkdown for a markdown annotation.
    // Appending must not leave the existing annotation with both fields, or
    // Figma rejects the whole array ("Only one of label or labelMarkdown").
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'US-NEW-7', labelMarkdown: '[US-NEW-7](https://x)' }],
    });
    registerNode(node);

    const result = await handleAddAnnotation(makeCommand('addAnnotation', { label: 'New plain' }, 'node-1'));
    expectSuccess(result);
    // Existing markdown annotation keeps labelMarkdown only.
    expect(node.annotations[0].labelMarkdown).toBe('[US-NEW-7](https://x)');
    expect('label' in node.annotations[0]).toBe(false);
    // New annotation appended.
    expect(node.annotations[1].label).toBe('New plain');
  });

  it('maps categoryId to the categoryId annotation field (not annotationCategoryId)', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [] });
    registerNode(node);

    const result = await handleAddAnnotation(
      makeCommand('addAnnotation', { label: 'Color', categoryId: 'cat-1' }, 'node-1'),
    );
    expectSuccess(result);
    expect(node.annotations[0].categoryId).toBe('cat-1');
    expect('annotationCategoryId' in node.annotations[0]).toBe(false);
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

  it('updates labelMarkdown and clears the plain label', async () => {
    const node = createMockNode({
      id: 'node-1',
      annotations: [{ label: 'Old Label' }],
    });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', {
      annotationIndex: 0,
      labelMarkdown: '[link](https://x)',
    }, 'node-1'));
    expectSuccess(result);
    expect(node.annotations[0].labelMarkdown).toBe('[link](https://x)');
    expect('label' in node.annotations[0]).toBe(false);
  });

  it('always returns a result for an out-of-range index (never hangs)', async () => {
    const node = createMockNode({ id: 'node-1', annotations: [{ label: 'Only' }] });
    registerNode(node);

    const result = await handleEditAnnotation(makeCommand('editAnnotation', {
      annotationIndex: 99,
      label: 'X',
    }, 'node-1'));
    expectError(result, 'out of range');
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
