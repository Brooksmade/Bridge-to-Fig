import type { FigmaCommand, CommandResult } from '@bridge-to-fig/shared';

// In-memory storage for commands and results
const pendingCommands: Map<string, FigmaCommand> = new Map();
const commandResults: Map<string, CommandResult> = new Map();

// Log storage
interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
}
const pluginLogs: LogEntry[] = [];
const errorLogs: LogEntry[] = [];  // Errors persist until server restart

// Running command tracking
interface RunningCommand {
  commandId: string;
  commandType: string;
  startTime: number;
}
let currentRunningCommand: RunningCommand | null = null;

// Plugin connection tracking (active long-poll connections)
let activePollCount: number = 0;

// Callbacks for real-time notifications
type ResultCallback = (result: CommandResult) => void;
type CommandCallback = (command: FigmaCommand) => void;
const resultCallbacks: Set<ResultCallback> = new Set();
const commandCallbacks: Set<CommandCallback> = new Set();

export const queue = {
  // Add a new command to the queue
  addCommand(command: FigmaCommand): void {
    pendingCommands.set(command.id, command);
    console.log(`[Queue] Command added: ${command.id} (${command.type})`);

    // Notify all command callbacks (for long polling)
    for (const callback of commandCallbacks) {
      try {
        callback(command);
      } catch (err) {
        console.error('[Queue] Error in command callback:', err);
      }
    }
  },

  // Get all pending commands and clear them
  getPendingCommands(): FigmaCommand[] {
    const commands = Array.from(pendingCommands.values());
    pendingCommands.clear();
    if (commands.length > 0) {
      console.log(`[Queue] Returning ${commands.length} pending command(s)`);
    }
    return commands;
  },

  // Get a specific command by ID
  getCommand(id: string): FigmaCommand | undefined {
    return pendingCommands.get(id);
  },

  // Cancel a pending command
  cancelCommand(id: string): boolean {
    const deleted = pendingCommands.delete(id);
    if (deleted) {
      console.log(`[Queue] Command cancelled: ${id}`);
    }
    return deleted;
  },

  // Check if a command is pending (waiting for result)
  hasPendingCommand(commandId: string): boolean {
    return pendingCommands.has(commandId);
  },

  // Store a command result
  addResult(result: CommandResult): void {
    commandResults.set(result.commandId, result);
    console.log(`[Queue] Result added for command: ${result.commandId} (success: ${result.success})`);

    // Notify all callbacks
    for (const callback of resultCallbacks) {
      try {
        callback(result);
      } catch (err) {
        console.error('[Queue] Error in result callback:', err);
      }
    }
  },

  // Get a result by command ID
  getResult(commandId: string): CommandResult | undefined {
    return commandResults.get(commandId);
  },

  // Wait for a result with timeout
  async waitForResult(commandId: string, timeoutMs: number = 30000): Promise<CommandResult | null> {
    // Check if result already exists
    const existing = commandResults.get(commandId);
    if (existing) {
      return existing;
    }

    // Wait for result
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resultCallbacks.delete(callback);
        resolve(null);
      }, timeoutMs);

      const callback: ResultCallback = (result) => {
        if (result.commandId === commandId) {
          clearTimeout(timeout);
          resultCallbacks.delete(callback);
          resolve(result);
        }
      };

      resultCallbacks.add(callback);
    });
  },

  // Register a callback for all results (used by WebSocket)
  onResult(callback: ResultCallback): () => void {
    resultCallbacks.add(callback);
    return () => resultCallbacks.delete(callback);
  },

  // Wait for commands with timeout (long polling)
  async waitForCommands(timeoutMs: number = 30000): Promise<FigmaCommand[]> {
    // Check if commands already exist
    if (pendingCommands.size > 0) {
      const commands = Array.from(pendingCommands.values());
      pendingCommands.clear();
      console.log(`[Queue] Long poll returning ${commands.length} existing command(s)`);
      return commands;
    }

    // Wait for new commands
    return new Promise((resolve) => {
      const collectedCommands: FigmaCommand[] = [];
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          commandCallbacks.delete(callback);
          // Return any commands collected during the wait
          const remaining = Array.from(pendingCommands.values());
          pendingCommands.clear();
          resolve([...collectedCommands, ...remaining]);
        }
      }, timeoutMs);

      const callback: CommandCallback = (command) => {
        if (!resolved) {
          // Remove from pending since we're delivering it
          pendingCommands.delete(command.id);
          collectedCommands.push(command);

          // Short delay to batch rapid commands, then resolve
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              commandCallbacks.delete(callback);
              // Also grab any other pending commands
              const remaining = Array.from(pendingCommands.values());
              pendingCommands.clear();
              console.log(`[Queue] Long poll returning ${collectedCommands.length + remaining.length} command(s)`);
              resolve([...collectedCommands, ...remaining]);
            }
          }, 50);
        }
      };

      commandCallbacks.add(callback);
    });
  },

  // Track active long-poll connections
  pollStarted(): void {
    activePollCount++;
  },

  pollEnded(): void {
    activePollCount = Math.max(0, activePollCount - 1);
  },

  // Plugin is connected if there's an active long-poll request
  isPluginConnected(): boolean {
    return activePollCount > 0;
  },

  // Get queue stats
  getStats(): { pendingCommands: number; storedResults: number; pluginConnected: boolean } {
    return {
      pendingCommands: pendingCommands.size,
      storedResults: commandResults.size,
      pluginConnected: this.isPluginConnected(),
    };
  },

  // Clear old results (cleanup)
  clearOldResults(maxAgeMs: number = 5 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;
    for (const [id, result] of commandResults) {
      if (now - result.timestamp > maxAgeMs) {
        commandResults.delete(id);
        cleared++;
      }
    }
    if (cleared > 0) {
      console.log(`[Queue] Cleared ${cleared} old result(s)`);
    }
    return cleared;
  },

  // Add a log entry from the plugin
  addLog(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      message,
      type,
    };
    pluginLogs.push(entry);
    // Errors are stored separately and never trimmed
    if (type === 'error') {
      errorLogs.push(entry);
    }

    // Track running commands based on log messages
    const execMatch = message.match(/^Executing: (\S+) \(([a-f0-9-]+)\.\.\.\)$/);
    if (execMatch) {
      currentRunningCommand = {
        commandId: execMatch[2],
        commandType: execMatch[1],
        startTime: Date.now(),
      };
    } else if (message.startsWith('Completed in ') || message.startsWith('Error:')) {
      currentRunningCommand = null;
    } else if (message === 'Bridge to Fig plugin started') {
      // A fresh plugin instance means nothing is executing — clear a tracker left stale by a
      // restart mid-command (otherwise /logs/running reports a phantom wedge forever).
      currentRunningCommand = null;
    }
  },

  // Get all logs (or last N if limit specified)
  getLogs(limit?: number): LogEntry[] {
    if (limit) {
      return pluginLogs.slice(-limit);
    }
    return pluginLogs.slice();
  },

  // Get all errors (persisted until cleared)
  getErrors(): LogEntry[] {
    return errorLogs.slice();
  },

  // Clear logs
  clearLogs(): void {
    pluginLogs.length = 0;
  },

  // Clear errors
  clearErrors(): void {
    errorLogs.length = 0;
  },

  // Set currently running command
  setRunningCommand(commandId: string, commandType: string): void {
    currentRunningCommand = {
      commandId,
      commandType,
      startTime: Date.now(),
    };
  },

  // Clear running command
  clearRunningCommand(): void {
    currentRunningCommand = null;
  },

  // Get running command status
  getRunningCommand(): { commandId: string; commandType: string; elapsedMs: number } | null {
    if (!currentRunningCommand) return null;
    return {
      commandId: currentRunningCommand.commandId,
      commandType: currentRunningCommand.commandType,
      elapsedMs: Date.now() - currentRunningCommand.startTime,
    };
  },
};
