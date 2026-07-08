import { longPollCommands, submitResult, checkHealth, submitLog } from './utils/api-client';
import type { HealthCheckResult } from './utils/api-client';
import { executeCommand } from './commands';
import { preloadFonts } from './utils/node-factory';
import type { FigmaCommand, CommandResult } from './commands/types';
import { APP_VERSION } from './version';

// Plugin state
let isConnected = false;
let isPolling = false;
let shouldStop = false;
let pendingClose = false;
let commandsExecuted = 0;
let errorsCount = 0;

const LONG_POLL_TIMEOUT_MS = 30000;

// Show the UI
figma.showUI(__html__, { width: 280, height: 330, themeColors: true });

// Send message to UI
function sendToUI(message: object): void {
  figma.ui.postMessage(message);
}

// Log to console, UI, and bridge server
function log(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
  console.log(`[Bridge to Fig] ${message}`);
  sendToUI({ type: 'log', message, logType: type });
  submitLog(message, type);
}

// Update connection status
function setConnected(connected: boolean, message?: string): void {
  isConnected = connected;
  sendToUI({ type: 'status', connected, message });
}

// Helper to yield to UI thread for rendering
// 5ms is enough to let the UI render the "running" state; the previous 50ms added half a second
// of pure sleep to every 10-command batch.
function yieldToUI(ms: number = 5): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Format duration in human-readable format (e.g., "1m 23s 456ms")
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const remainingMs = ms % 1000;
  if (seconds < 60) {
    return remainingMs > 0 ? `${seconds}s ${remainingMs}ms` : `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${minutes}m`;
}

// Process a single command. quiet=true suppresses per-command logs/UI messages — a 3,000-command
// burst otherwise floods the plugin UI iframe with ~12k HTTP posts and can crash the plugin.
async function processCommand(command: FigmaCommand, quiet: boolean = false): Promise<void> {
  // TTL: if the sender's wait already gave up (queued behind a long-running command / reconnect
  // backlog), don't execute a stale command — report it expired instead.
  if (command.expiresAt && Date.now() > command.expiresAt) {
    log(`Skipped expired: ${command.type} (${command.id.slice(0, 8)}...)`, 'error');
    try {
      await submitResult({
        commandId: command.id,
        success: false,
        error:
          'Command expired before execution — it was queued behind a long-running command. ' +
          'Resend it if still wanted (check /logs/running first).',
        timestamp: Date.now(),
      });
    } catch (e) {
      // best effort
    }
    return;
  }

  const startTime = Date.now();
  if (!quiet) {
    log(`Executing: ${command.type} (${command.id.slice(0, 8)}...)`);
    sendToUI({ type: 'command', commandType: command.type, commandId: command.id });
  }

  // Yield to allow UI to render the "running" state
  await yieldToUI();

  try {
    const result = await executeCommand(command);
    const duration = Date.now() - startTime;

    if (result.success) {
      commandsExecuted++;
      if (!quiet) log(`Completed in ${formatDuration(duration)}`, 'success');
    } else {
      errorsCount++;
      log(`Error: ${result.error}`, 'error'); // errors always logged
    }

    if (!quiet) {
      sendToUI({
        type: 'result',
        success: result.success,
        commandId: command.id,
        error: result.error,
      });
    }

    // Submit result to bridge server
    try {
      await submitResult(result);
    } catch (submitError) {
      log(`Failed to submit result: ${submitError}`, 'error');
    }
  } catch (error) {
    errorsCount++;
    const message = error instanceof Error ? error.message : String(error);
    log(`Execution error: ${message}`, 'error');

    const errorResult: CommandResult = {
      commandId: command.id,
      success: false,
      error: message,
      timestamp: Date.now(),
    };

    sendToUI({
      type: 'result',
      success: false,
      commandId: command.id,
      error: message,
    });

    try {
      await submitResult(errorResult);
    } catch (submitError) {
      log(`Failed to submit error result: ${submitError}`, 'error');
    }
  }

  // Check if close was requested during command execution
  if (pendingClose) {
    log('Closing plugin (deferred)');
    figma.closePlugin();
  }
}

// Main long polling loop - uses HTTP long polling instead of setInterval
// This works even when Figma is in the background because the request is already in-flight
async function longPollLoop(): Promise<void> {
  if (isPolling || shouldStop) return;
  isPolling = true;

  while (!shouldStop) {
    try {
      // Long poll - server holds connection until command arrives or timeout
      const commands = await longPollCommands(LONG_POLL_TIMEOUT_MS);

      if (!isConnected) {
        setConnected(true, 'Connected to bridge server');
      }

      // Execute each command sequentially. Large deliveries run in quiet mode (every 100th
      // command still logs, all errors log) so the UI/log flood can't crash the plugin.
      const quietBatch = commands.length > 20;
      if (quietBatch) log(`Batch: executing ${commands.length} commands (quiet mode)`);
      for (let ci = 0; ci < commands.length; ci++) {
        if (shouldStop) break;
        await processCommand(commands[ci], quietBatch && ci % 100 !== 0);
      }
      if (quietBatch) log(`Batch done: ${commands.length} commands`, 'success');
    } catch (error) {
      if (isConnected) {
        setConnected(false, 'Connection lost - retrying...');
      }
      // Wait a bit before retrying on error
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Re-check version on reconnect attempt. MUST be guarded: if the server is still down,
      // checkHealth() throws inside this catch block, escapes the while loop, and the poll loop
      // dies silently — the plugin then never reconnects until manually reopened.
      try {
        const health = await checkHealth();
        if (health.ok && !health.compatible) {
          sendVersionBanner(health);
          setConnected(false, 'Incompatible server version');
          log('Protocol mismatch after reconnect — stopping', 'error');
          shouldStop = true;
        }
      } catch (healthError) {
        // Server still down — keep looping; the next longPollCommands attempt will retry.
      }
    }
  }

  isPolling = false;
}

// Send version banner to UI
function sendVersionBanner(health: HealthCheckResult): void {
  if (!health.ok) return;

  if (!health.compatible) {
    sendToUI({
      type: 'versionBanner',
      level: 'error',
      message: `Incompatible server (protocol v${health.serverProtocolVersion ?? '?'}). Please update ${health.serverProtocolVersion !== undefined && health.serverProtocolVersion < 1 ? 'the server' : 'the plugin'}.`,
      dismissible: false,
    });
    return;
  }

  // Update available from GitHub Releases
  if (health.latestRelease) {
    sendToUI({
      type: 'versionBanner',
      level: 'warning',
      message: `Update available: v${health.latestRelease.version}. See release notes.`,
      dismissible: true,
      url: health.latestRelease.url,
    });
    return;
  }

  // Compatible but different app version → soft warning
  if (health.serverVersion && health.serverVersion !== APP_VERSION) {
    sendToUI({
      type: 'versionBanner',
      level: 'warning',
      message: `Server v${health.serverVersion} / Plugin v${APP_VERSION} — consider updating.`,
      dismissible: true,
    });
  }
}

// Start polling
async function startPolling(): Promise<void> {
  log('Initializing with long polling...');

  // Preload common fonts
  try {
    await preloadFonts();
    log('Fonts preloaded');
  } catch (e) {
    log('Some fonts could not be preloaded', 'error');
  }

  // Initial health check with version negotiation
  const health = await checkHealth();
  if (health.ok) {
    sendVersionBanner(health);
    if (!health.compatible) {
      setConnected(false, 'Incompatible server version');
      log('Protocol mismatch — polling disabled', 'error');
      return;
    }
    setConnected(true, 'Connected to bridge server');
  } else {
    setConnected(false, 'Bridge server not running - waiting...');
  }

  // Start long polling loop
  shouldStop = false;
  longPollLoop();
  log('Long polling started');
}

// Stop polling
function stopPolling(): void {
  shouldStop = true;
}

// Handle messages from UI
figma.ui.onmessage = (message: any) => {
  if (message.type === 'getStats') {
    sendToUI({
      type: 'stats',
      commandsExecuted,
      errorsCount,
      isConnected,
    });
  } else if (message.type === 'openExternal' && typeof message.url === 'string') {
    figma.openExternal(message.url);
  }
};

// Handle plugin close
figma.on('close', () => {
  stopPolling();
  pendingClose = true;
  sendToUI({ type: 'pendingClose' });
  log('Plugin close requested');
});

// Start the plugin
startPolling();
log('Bridge to Fig plugin started');
