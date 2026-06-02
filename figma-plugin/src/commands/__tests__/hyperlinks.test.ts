import { describe, it, expect, vi } from 'vitest';
import { executeCommand } from '../index';
import { handleSetTextHyperlink } from '../text-operations';
import { makeCommand, expectSuccess, expectError } from './helpers';
import { createMockNode, registerNode } from './figma-mock';

function makeTextNode(overrides: Record<string, any> = {}) {
  return createMockNode({
    id: 'text-1',
    type: 'TEXT',
    characters: 'Hello World',
    getRangeAllFontNames: vi.fn(() => [{ family: 'Inter', style: 'Regular' }]),
    setRangeHyperlink: vi.fn(),
    ...overrides,
  });
}

describe('setRangeHyperlink dispatch', () => {
  it('routes setRangeHyperlink to the hyperlink handler (not "Unknown command type")', async () => {
    const node = makeTextNode();
    registerNode(node);

    const result = await executeCommand(
      makeCommand('setRangeHyperlink', { start: 0, end: 5, url: 'https://example.com' }, 'text-1'),
    );

    expectSuccess(result);
    expect(node.setRangeHyperlink).toHaveBeenCalledWith(0, 5, {
      type: 'URL',
      value: 'https://example.com',
    });
  });

  it('still routes the original setTextHyperlink command', async () => {
    const node = makeTextNode();
    registerNode(node);

    const result = await executeCommand(
      makeCommand('setTextHyperlink', { start: 0, end: 5, url: 'https://example.com' }, 'text-1'),
    );

    expectSuccess(result);
    expect(node.setRangeHyperlink).toHaveBeenCalledOnce();
  });

  it('an unrelated unknown command still reports Unknown command type', async () => {
    const result = await executeCommand(makeCommand('totallyMadeUpCommand', {}, 'text-1'));
    expectError(result, 'Unknown command type');
  });
});

describe('handleSetTextHyperlink', () => {
  it('supports a nodeId destination (in-file navigation link)', async () => {
    const node = makeTextNode();
    registerNode(node);

    const result = await handleSetTextHyperlink(
      makeCommand('setTextHyperlink', { start: 0, end: 5, nodeId: '4409:25320' }, 'text-1'),
    );

    expectSuccess(result);
    expect(node.setRangeHyperlink).toHaveBeenCalledWith(0, 5, {
      type: 'NODE',
      value: '4409:25320',
    });
    expect((result.data as any).hyperlink).toEqual({ type: 'NODE', value: '4409:25320' });
  });

  it('loads fonts in the range before setting the hyperlink', async () => {
    const node = makeTextNode();
    registerNode(node);

    await handleSetTextHyperlink(
      makeCommand('setTextHyperlink', { start: 0, end: 5, url: 'https://x' }, 'text-1'),
    );

    expect(node.getRangeAllFontNames).toHaveBeenCalledWith(0, 5);
    expect((globalThis as any).figma.loadFontAsync).toHaveBeenCalledWith({
      family: 'Inter',
      style: 'Regular',
    });
  });

  it('requires a url or nodeId destination', async () => {
    const node = makeTextNode();
    registerNode(node);

    const result = await handleSetTextHyperlink(
      makeCommand('setTextHyperlink', { start: 0, end: 5 }, 'text-1'),
    );
    expectError(result, 'url or nodeId');
  });

  it('errors when the target is not a TEXT node', async () => {
    const node = createMockNode({ id: 'frame-2', type: 'FRAME' });
    registerNode(node);

    const result = await handleSetTextHyperlink(
      makeCommand('setTextHyperlink', { url: 'https://x' }, 'frame-2'),
    );
    expectError(result, 'must be a TEXT node');
  });
});
