import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { FigmaCommand, CommandPayload, CommandType } from '@bridge-to-fig/shared';
import { queue } from '../services/queue.js';
import { broadcast } from '../services/websocket.js';
import { extractWebsiteCSS } from '../services/websiteExtractor.js';
import { extractWebsiteLayout } from '../services/websiteLayoutExtractor.js';
import { autoBindByRoleV2, type AutoBindByRoleOptions } from '../services/autoBindByRoleService.js';
import { PROTOCOL_VERSION } from '@bridge-to-fig/shared';

const router: RouterType = Router();

// POST /commands - Queue a new command (called by Claude Code)
//
// Also supports:
//   - BATCH: POST an ARRAY of {type, target?, payload?} — all are queued at once (the plugin
//     receives them in one long-poll delivery and executes sequentially). Returns {commandIds:[…]}.
//   - INLINE WAIT: ?wait=true — the response includes the result(s) directly, collapsing the
//     POST + GET /results round-trip pair into a single HTTP call.
//     Optional ?timeout=ms (default 30000 single / 120000 batch, capped at 300000).
router.post('/', async (req: Request, res: Response) => {
  try {
    // --- Batch form: array of commands ---
    if (Array.isArray(req.body)) {
      const items = req.body as Array<{ type?: string; target?: string; payload?: CommandPayload }>;
      if (items.length === 0) {
        res.status(400).json({ error: 'Batch array is empty' });
        return;
      }
      const invalid = items.findIndex(c => !c || !c.type);
      if (invalid >= 0) {
        res.status(400).json({ error: `Batch item ${invalid} is missing "type"` });
        return;
      }
      const serverSide = items.findIndex(c =>
        ['extractWebsiteCSS', 'extractWebsiteLayout', 'autoBindByRoleV2'].includes(c.type as string)
      );
      if (serverSide >= 0) {
        res.status(400).json({
          error: `Batch item ${serverSide} (${items[serverSide].type}) is a server-side command — send it individually`,
        });
        return;
      }

      const batchWait = Math.min(parseInt(req.query.timeout as string) || 120000, 300000);
      const commands: FigmaCommand[] = items.map(c => ({
        id: uuidv4(),
        type: c.type as CommandType,
        target: c.target,
        payload: c.payload || ({} as CommandPayload),
        timestamp: Date.now(),
        // Expire once the sender's wait (plus grace) has passed — prevents stale bursts.
        expiresAt: Date.now() + batchWait + 30000,
      }));
      for (const cmd of commands) queue.addCommand(cmd);
      console.log(`[Commands] Batch queued: ${commands.length} command(s)`);

      if (req.query.wait === 'true') {
        const timeout = Math.min(parseInt(req.query.timeout as string) || 120000, 300000);
        const results = await Promise.all(commands.map(c => queue.waitForResult(c.id, timeout)));
        const anyTimeout = results.some(r => !r);
        res.status(200).json({
          success: results.every(r => r?.success === true),
          count: commands.length,
          // When something timed out, say what the plugin is busy with so callers stop stacking.
          ...(anyTimeout ? { busy: queue.getRunningCommand() } : {}),
          results: results.map((r, i) =>
            r ?? { commandId: commands[i].id, success: false, error: 'Timeout waiting for result', timestamp: Date.now() }
          ),
        });
        return;
      }

      res.status(201).json({
        success: true,
        commandIds: commands.map(c => c.id),
        message: `${commands.length} commands queued`,
      });
      return;
    }

    const { type, target, payload } = req.body as {
      type?: CommandType | 'extractWebsiteCSS' | 'extractWebsiteLayout' | 'autoBindByRoleV2';
      target?: string;
      payload?: CommandPayload & { url?: string };
    };

    if (!type) {
      res.status(400).json({ error: 'Missing required field: type' });
      return;
    }

    // Handle server-side commands (not sent to Figma plugin)
    if (type === 'extractWebsiteCSS') {
      const commandId = uuidv4();
      console.log(`[Commands] Processing server-side command: ${type} (${commandId})`);

      if (!payload?.url) {
        res.status(400).json({ error: 'Missing required field: payload.url' });
        return;
      }

      // Extract screenshot options from payload
      const extractionOptions = {
        captureScreenshot: (payload as any).captureScreenshot ?? false,
        screenshotFullPage: (payload as any).screenshotFullPage ?? false,
        viewport: (payload as any).viewport,
      };

      // Run extraction asynchronously but return immediately with commandId
      res.status(202).json({
        success: true,
        commandId,
        message: 'Extraction started. Poll /results/{commandId}?wait=true for results.',
      });

      // Run extraction and store result
      try {
        const result = await extractWebsiteCSS(payload.url, extractionOptions);
        queue.addResult({
          commandId,
          success: result.success,
          timestamp: Date.now(),
          data: result,
        });
      } catch (error) {
        queue.addResult({
          commandId,
          success: false,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    // Handle extractWebsiteLayout (server-side, not sent to Figma plugin)
    if (type === 'extractWebsiteLayout') {
      const commandId = uuidv4();
      console.log(`[Commands] Processing server-side command: ${type} (${commandId})`);

      if (!payload?.url) {
        res.status(400).json({ error: 'Missing required field: payload.url' });
        return;
      }

      const layoutOptions = {
        viewport: (payload as any).viewport,
        maxElements: (payload as any).maxElements,
        maxDepth: (payload as any).maxDepth,
        captureScreenshot: (payload as any).captureScreenshot ?? true,
        screenshotFullPage: (payload as any).screenshotFullPage ?? false,
        dismissOverlays: (payload as any).dismissOverlays ?? true,
        minElementSize: (payload as any).minElementSize,
        screenshotSections: (payload as any).screenshotSections ?? false,
      };

      // Return immediately with commandId
      res.status(202).json({
        success: true,
        commandId,
        message: 'Layout extraction started. Poll /results/{commandId}?wait=true for results.',
      });

      // Run extraction and store result
      try {
        const result = await extractWebsiteLayout(payload.url, layoutOptions);
        queue.addResult({
          commandId,
          success: result.success,
          timestamp: Date.now(),
          data: result,
        });
      } catch (error) {
        queue.addResult({
          commandId,
          success: false,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    // Server-side orchestrated command: autoBindByRoleV2
    // Drives multiple plugin calls (extractColorData → analyze in Node → applyColorBindings, chunked)
    // so the plugin thread never has to do the heavy CPU work that crashes it on large files.
    if (type === 'autoBindByRoleV2') {
      const commandId = uuidv4();
      console.log(`[Commands] Starting orchestrated command: autoBindByRoleV2 (${commandId})`);
      res.status(202).json({
        success: true,
        commandId,
        message: 'autoBindByRoleV2 started. Poll /results/{commandId}?wait=true for results.',
      });

      try {
        const result = await autoBindByRoleV2((payload || {}) as AutoBindByRoleOptions);
        queue.addResult({
          commandId,
          success: true,
          timestamp: Date.now(),
          data: result,
        });
      } catch (error) {
        queue.addResult({
          commandId,
          success: false,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    // Create command with generated ID
    const singleWait = Math.min(parseInt(req.query.timeout as string) || 120000, 300000);
    const command: FigmaCommand = {
      id: uuidv4(),
      type,
      target,
      payload: payload || ({} as CommandPayload),
      timestamp: Date.now(),
      // Expire once the sender's wait (plus grace) has passed — prevents stale bursts.
      expiresAt: Date.now() + singleWait + 30000,
    };

    queue.addCommand(command);

    // Broadcast command received event
    broadcast({
      type: 'command_received',
      commandId: command.id,
      message: `Command queued: ${type}`,
      timestamp: Date.now(),
    });

    // Inline wait: return the result in this same response (?wait=true)
    if (req.query.wait === 'true') {
      const timeout = Math.min(parseInt(req.query.timeout as string) || 30000, 300000);
      const result = await queue.waitForResult(command.id, timeout);
      if (result) {
        res.status(200).json(result);
      } else {
        // Include what the plugin is busy with so callers stop stacking commands behind a wedge.
        res.status(408).json({
          commandId: command.id,
          success: false,
          error: 'Timeout waiting for result',
          busy: queue.getRunningCommand(),
          pendingCommands: queue.getStats().pendingCommands,
          timestamp: Date.now(),
        });
      }
      return;
    }

    const runningNow = queue.getRunningCommand();
    res.status(201).json({
      success: true,
      commandId: command.id,
      message: 'Command queued successfully',
      // Warn when queuing behind something that's already been running a while.
      ...(runningNow && runningNow.elapsedMs > 3000 ? { busy: runningNow } : {}),
    });
  } catch (error) {
    console.error('[Commands] Error queuing command:', error);
    res.status(500).json({ error: 'Failed to queue command' });
  }
});

// GET /commands - Poll for pending commands (called by Figma plugin)
router.get('/', (_req: Request, res: Response) => {
  try {
    const commands = queue.getPendingCommands();
    res.json({ commands });
  } catch (error) {
    console.error('[Commands] Error getting commands:', error);
    res.status(500).json({ error: 'Failed to get commands' });
  }
});

// GET /commands/poll - Long polling for commands (called by Figma plugin)
// This holds the connection open until a command arrives or timeout
router.get('/poll', async (req: Request, res: Response) => {
  queue.pollStarted();

  // Detect client disconnect (plugin closed)
  req.on('close', () => {
    queue.pollEnded();
  });

  try {
    const pluginProtocol = req.headers['x-plugin-protocol'] as string | undefined;
    if (pluginProtocol && parseInt(pluginProtocol, 10) < PROTOCOL_VERSION) {
      console.log(`[Commands] Plugin protocol v${pluginProtocol} < server v${PROTOCOL_VERSION}`);
    }

    const timeout = parseInt(req.query.timeout as string) || 30000;
    const commands = await queue.waitForCommands(Math.min(timeout, 55000));
    res.json({ commands });
  } catch (error) {
    console.error('[Commands] Error in long poll:', error);
    res.status(500).json({ error: 'Failed to poll commands' });
  }
});

// DELETE /commands/:id - Cancel a pending command
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cancelled = queue.cancelCommand(id);

    if (cancelled) {
      res.json({ success: true, message: 'Command cancelled' });
    } else {
      res.status(404).json({ error: 'Command not found or already executed' });
    }
  } catch (error) {
    console.error('[Commands] Error cancelling command:', error);
    res.status(500).json({ error: 'Failed to cancel command' });
  }
});

export default router;
