import { describe, it, expect } from 'vitest';
import { handleAddGuide, handleGetGuides, handleRemoveGuide } from '../guides';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

describe('handleAddGuide', () => {
  it('returns error when axis is missing', async () => {
    const result = await handleAddGuide(makeCommand('addGuide', { offset: 100 }));
    expectError(result, 'axis');
  });

  it('returns error when offset is missing', async () => {
    const result = await handleAddGuide(makeCommand('addGuide', { axis: 'X' }));
    expectError(result, 'offset');
  });

  it('adds guide to current page when no target', async () => {
    const result = await handleAddGuide(makeCommand('addGuide', { axis: 'X', offset: 100 }));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.guide.axis).toBe('X');
    expect(data.guide.offset).toBe(100);
    expect(data.totalGuides).toBe(1);
  });

  it('adds guide to targeted frame', async () => {
    const frame = createMockNode({ id: 'frame-1', type: 'FRAME', guides: [] });
    registerNode(frame);

    const result = await handleAddGuide(makeCommand('addGuide', { axis: 'Y', offset: 200 }, 'frame-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.guide.axis).toBe('Y');
    expect(data.guide.offset).toBe(200);
  });

  it('returns error when target node not found', async () => {
    const result = await handleAddGuide(makeCommand('addGuide', { axis: 'X', offset: 50 }, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('returns error when node does not support guides', async () => {
    const rect = createMockNode({ id: 'rect-1', type: 'RECTANGLE' });
    delete rect.guides;
    registerNode(rect);

    const result = await handleAddGuide(makeCommand('addGuide', { axis: 'X', offset: 50 }, 'rect-1'));
    expectError(result, 'does not support guides');
  });
});

describe('handleGetGuides', () => {
  it('returns empty array when no guides', async () => {
    const result = await handleGetGuides(makeCommand('getGuides'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.guides).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('returns existing guides from current page', async () => {
    (globalThis as any).figma.currentPage.guides = [
      { axis: 'X', offset: 100 },
      { axis: 'Y', offset: 200 },
    ];

    const result = await handleGetGuides(makeCommand('getGuides'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.guides).toHaveLength(2);
    expect(data.guides[0]).toEqual({ axis: 'X', offset: 100 });
    expect(data.count).toBe(2);
  });

  it('returns guides from targeted frame', async () => {
    const frame = createMockNode({
      id: 'frame-1',
      type: 'FRAME',
      guides: [{ axis: 'X', offset: 50 }],
    });
    registerNode(frame);

    const result = await handleGetGuides(makeCommand('getGuides', {}, 'frame-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.guides).toHaveLength(1);
  });

  it('returns error when target not found', async () => {
    const result = await handleGetGuides(makeCommand('getGuides', {}, 'nonexistent'));
    expectError(result, 'not found');
  });
});

describe('handleRemoveGuide', () => {
  it('removes guide by index', async () => {
    (globalThis as any).figma.currentPage.guides = [
      { axis: 'X', offset: 100 },
      { axis: 'Y', offset: 200 },
    ];

    const result = await handleRemoveGuide(makeCommand('removeGuide', { guideIndex: 0 }));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.removed.axis).toBe('X');
    expect(data.removed.offset).toBe(100);
    expect(data.remainingGuides).toBe(1);
  });

  it('removes guide by axis+offset match', async () => {
    (globalThis as any).figma.currentPage.guides = [
      { axis: 'X', offset: 100 },
      { axis: 'Y', offset: 200 },
    ];

    const result = await handleRemoveGuide(makeCommand('removeGuide', { axis: 'Y', offset: 200 }));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.removed.axis).toBe('Y');
    expect(data.remainingGuides).toBe(1);
  });

  it('returns error when guide index out of range', async () => {
    (globalThis as any).figma.currentPage.guides = [{ axis: 'X', offset: 100 }];

    const result = await handleRemoveGuide(makeCommand('removeGuide', { guideIndex: 5 }));
    expectError(result, 'not found');
  });

  it('returns error when axis+offset match not found', async () => {
    (globalThis as any).figma.currentPage.guides = [{ axis: 'X', offset: 100 }];

    const result = await handleRemoveGuide(makeCommand('removeGuide', { axis: 'Y', offset: 999 }));
    expectError(result, 'not found');
  });

  it('returns error when no payload', async () => {
    const result = await handleRemoveGuide(makeCommand('removeGuide', null));
    expectError(result);
  });
});
