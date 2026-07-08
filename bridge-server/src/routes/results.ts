import { Router, type Request, type Response, type Router as RouterType } from 'express';
import type { CommandResult } from '@bridge-to-fig/shared';
import { queue } from '../services/queue.js';
import fs from 'fs';
import path from 'path';

const router: RouterType = Router();

// Large results (page extracts, bulk inventories) are spilled to disk instead of living in the
// in-memory results map — holding multi-MB payloads in RAM is what OOM-crashed the server.
// The stored result carries { spilledToFile } and clients read the file (same machine).
const SPILL_DIR = path.join(process.cwd(), '.tmp', 'results');
const SPILL_THRESHOLD_BYTES = 1_000_000;

// POST /results - Submit command result (called by Figma plugin)
router.post('/', (req: Request, res: Response) => {
  try {
    const result = req.body as CommandResult;

    if (!result.commandId) {
      res.status(400).json({ error: 'Missing required field: commandId' });
      return;
    }

    // Ensure timestamp is set
    let fullResult: CommandResult = {
      ...result,
      timestamp: result.timestamp || Date.now(),
    };

    // Spill oversized payloads to disk
    if (fullResult.data !== undefined) {
      const size = Buffer.byteLength(JSON.stringify(fullResult.data));
      if (size > SPILL_THRESHOLD_BYTES) {
        try {
          fs.mkdirSync(SPILL_DIR, { recursive: true });
          const file = path.join(SPILL_DIR, `${fullResult.commandId}.json`);
          fs.writeFileSync(file, JSON.stringify(fullResult.data));
          fullResult = {
            ...fullResult,
            data: {
              spilledToFile: file,
              sizeBytes: size,
              note: 'Result too large for in-memory storage — read the JSON at spilledToFile.',
            },
          };
          console.log(`[Results] Spilled ${Math.round(size / 1024)}KB result to ${file}`);
        } catch (spillErr) {
          console.error('[Results] Spill failed, keeping in memory:', spillErr);
        }
      }
    }

    queue.addResult(fullResult);

    res.json({
      success: true,
      message: 'Result recorded',
    });
  } catch (error) {
    console.error('[Results] Error recording result:', error);
    res.status(500).json({ error: 'Failed to record result' });
  }
});

// GET /results/:id/status - Check command status without waiting
router.get('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = queue.getResult(id);
  const pending = queue.hasPendingCommand(id);

  res.json({
    commandId: id,
    status: result ? 'completed' : pending ? 'pending' : 'unknown',
    hasResult: !!result,
    success: result?.success
  });
});

// GET /results/:id - Get result for specific command (called by Claude Code)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wait = req.query.wait === 'true';
    const timeout = parseInt(req.query.timeout as string) || 30000;

    let result: CommandResult | undefined | null;

    if (wait) {
      // Long-polling: wait for result with timeout
      result = await queue.waitForResult(id, Math.min(timeout, 300000)); // 5 min max for long-running commands
      if (!result) {
        res.status(408).json({ error: 'Timeout waiting for result' });
        return;
      }
    } else {
      result = queue.getResult(id);
      if (!result) {
        res.status(404).json({ error: 'Result not found' });
        return;
      }
    }

    res.json(result);
  } catch (error) {
    console.error('[Results] Error getting result:', error);
    res.status(500).json({ error: 'Failed to get result' });
  }
});

export default router;
