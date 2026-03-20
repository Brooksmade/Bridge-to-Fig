import type { FigmaCommand, CommandResult } from '../types';
import { expect } from 'vitest';

let commandCounter = 0;

export function makeCommand(
  type: string,
  payload?: any,
  target?: string,
): FigmaCommand {
  commandCounter++;
  return {
    id: `test-cmd-${commandCounter}`,
    type,
    target,
    payload: payload ?? {},
    timestamp: Date.now(),
  };
}

export function expectSuccess(result: CommandResult): void {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();
}

export function expectError(result: CommandResult, messageContains?: string): void {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  if (messageContains) {
    expect(result.error).toContain(messageContains);
  }
}

export function resetCommandCounter(): void {
  commandCounter = 0;
}
