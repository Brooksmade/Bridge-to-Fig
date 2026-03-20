import { beforeEach, afterEach, vi } from 'vitest';
import { createMockFigma, resetNodeCounter } from './figma-mock';
import { resetCommandCounter } from './helpers';

beforeEach(() => {
  resetNodeCounter();
  resetCommandCounter();
  (globalThis as any).figma = createMockFigma();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as any).figma;
});
