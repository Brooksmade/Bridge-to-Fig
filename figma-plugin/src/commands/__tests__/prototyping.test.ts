import { describe, it, expect, vi } from 'vitest';
import { handleGetReactions, handleCreateOverlay, handleSetOverlaySettings, handleSetTransition } from '../prototyping';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

describe('handleGetReactions', () => {
  it('returns error when target is missing', async () => {
    const result = await handleGetReactions(makeCommand('getReactions'));
    expectError(result, 'Target node ID is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleGetReactions(makeCommand('getReactions', {}, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('returns error when node does not support reactions', async () => {
    const node = createMockNode({ id: 'node-1', type: 'FRAME' });
    registerNode(node);

    const result = await handleGetReactions(makeCommand('getReactions', {}, 'node-1'));
    expectError(result, 'does not support reactions');
  });

  it('returns empty reactions array', async () => {
    const node = createMockNode({ id: 'node-1', type: 'FRAME', reactions: [] });
    registerNode(node);

    const result = await handleGetReactions(makeCommand('getReactions', {}, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.reactions).toEqual([]);
    expect(data.count).toBe(0);
  });

  it('serializes reactions with triggers and actions', async () => {
    const node = createMockNode({
      id: 'node-1',
      type: 'FRAME',
      reactions: [{
        trigger: { type: 'ON_CLICK' },
        actions: [{
          type: 'NAVIGATE',
          destinationId: 'dest-1',
          navigation: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 300, easing: { type: 'EASE_IN' } },
        }],
      }],
    });
    registerNode(node);

    const result = await handleGetReactions(makeCommand('getReactions', {}, 'node-1'));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.reactions).toHaveLength(1);
    expect(data.reactions[0].trigger.type).toBe('ON_CLICK');
    expect(data.reactions[0].actions[0].destinationId).toBe('dest-1');
    expect(data.reactions[0].actions[0].transition.type).toBe('DISSOLVE');
    expect(data.reactions[0].actions[0].transition.duration).toBe(300);
  });
});

describe('handleCreateOverlay', () => {
  it('creates a frame with default properties', async () => {
    const result = await handleCreateOverlay(makeCommand('createOverlay', {}));
    expectSuccess(result);
    const data = result.data as any;
    expect(data.id).toBeDefined();
    expect((globalThis as any).figma.createFrame).toHaveBeenCalled();
  });

  it('sets name and overlay position type', async () => {
    const result = await handleCreateOverlay(makeCommand('createOverlay', {
      name: 'My Modal',
      overlayPositionType: 'CENTER',
    }));
    expectSuccess(result);
  });

  it('sets position and size', async () => {
    const result = await handleCreateOverlay(makeCommand('createOverlay', {
      x: 100,
      y: 200,
      width: 400,
      height: 300,
    }));
    expectSuccess(result);
  });

  it('reparents to parent when specified', async () => {
    const parent = createMockNode({ id: 'parent-1', type: 'FRAME' });
    registerNode(parent);

    const result = await handleCreateOverlay(makeCommand('createOverlay', {
      parent: 'parent-1',
    }));
    expectSuccess(result);
    expect(parent.appendChild).toHaveBeenCalled();
  });
});

describe('handleSetOverlaySettings', () => {
  it('returns error when target is missing', async () => {
    const result = await handleSetOverlaySettings(makeCommand('setOverlaySettings', { overlayPositionType: 'CENTER' }));
    expectError(result, 'Target frame ID is required');
  });

  it('returns error when node not found', async () => {
    const result = await handleSetOverlaySettings(makeCommand('setOverlaySettings', { overlayPositionType: 'CENTER' }, 'nonexistent'));
    expectError(result, 'not found');
  });

  it('returns error when node is not a frame', async () => {
    const rect = createMockNode({ id: 'rect-1', type: 'RECTANGLE' });
    registerNode(rect);

    const result = await handleSetOverlaySettings(makeCommand('setOverlaySettings', { overlayPositionType: 'CENTER' }, 'rect-1'));
    expectError(result, 'FRAME or COMPONENT');
  });

  it('sets overlay position type on frame', async () => {
    const frame = createMockNode({ id: 'frame-1', type: 'FRAME' });
    registerNode(frame);

    const result = await handleSetOverlaySettings(makeCommand('setOverlaySettings', {
      overlayPositionType: 'TOP_LEFT',
    }, 'frame-1'));
    expectSuccess(result);
    expect(frame.overlayPositionType).toBe('TOP_LEFT');
  });

  it('sets overlay background interaction', async () => {
    const frame = createMockNode({ id: 'frame-1', type: 'FRAME' });
    registerNode(frame);

    const result = await handleSetOverlaySettings(makeCommand('setOverlaySettings', {
      overlayBackgroundInteraction: 'CLOSE_ON_CLICK_OUTSIDE',
    }, 'frame-1'));
    expectSuccess(result);
    expect(frame.overlayBackgroundInteraction).toBe('CLOSE_ON_CLICK_OUTSIDE');
  });
});

describe('handleSetTransition', () => {
  it('returns error when target is missing', async () => {
    const result = await handleSetTransition(makeCommand('setTransition', { reactionIndex: 0 }));
    expectError(result, 'Target node ID is required');
  });

  it('returns error when reactionIndex is missing', async () => {
    const node = createMockNode({ id: 'node-1', reactions: [] });
    registerNode(node);

    const result = await handleSetTransition(makeCommand('setTransition', {}, 'node-1'));
    expectError(result, 'reactionIndex is required');
  });

  it('returns error when reactionIndex out of range', async () => {
    const node = createMockNode({ id: 'node-1', reactions: [] });
    registerNode(node);

    const result = await handleSetTransition(makeCommand('setTransition', { reactionIndex: 5 }, 'node-1'));
    expectError(result, 'out of range');
  });

  it('modifies transition type and duration', async () => {
    const node = createMockNode({
      id: 'node-1',
      reactions: [{
        trigger: { type: 'ON_CLICK' },
        actions: [{
          type: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 200 },
        }],
      }],
    });
    registerNode(node);

    const result = await handleSetTransition(makeCommand('setTransition', {
      reactionIndex: 0,
      transitionType: 'SMART_ANIMATE',
      duration: 500,
    }, 'node-1'));
    expectSuccess(result);
    expect(node.setReactionsAsync).toHaveBeenCalled();

    const calledReactions = node.setReactionsAsync.mock.calls[0][0];
    expect(calledReactions[0].actions[0].transition.type).toBe('SMART_ANIMATE');
    expect(calledReactions[0].actions[0].transition.duration).toBe(500);
  });

  it('sets easing on transition', async () => {
    const node = createMockNode({
      id: 'node-1',
      reactions: [{
        trigger: { type: 'ON_CLICK' },
        actions: [{
          type: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 200 },
        }],
      }],
    });
    registerNode(node);

    const result = await handleSetTransition(makeCommand('setTransition', {
      reactionIndex: 0,
      easing: { type: 'EASE_IN_AND_OUT' },
    }, 'node-1'));
    expectSuccess(result);
    const calledReactions = node.setReactionsAsync.mock.calls[0][0];
    expect(calledReactions[0].actions[0].transition.easing.type).toBe('EASE_IN_AND_OUT');
  });
});
