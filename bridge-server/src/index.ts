
// Crash guards: log instead of dying (tsx watch restarts lose in-flight state; a logged error keeps
// long jobs alive). Genuine fatal states will still surface via the logs.
process.on('uncaughtException', (err) => {
  console.error('[FATAL-caught] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL-caught] unhandledRejection:', reason);
});
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import commandsRouter from './routes/commands.js';
import resultsRouter from './routes/results.js';
import logsRouter from './routes/logs.js';
import proxyRouter from './routes/proxy.js';
import { setupWebSocket, getConnectedClients } from './services/websocket.js';
import { queue } from './services/queue.js';
import { startUpdateChecker, getLatestRelease, stopUpdateChecker } from './services/updateChecker.js';
import { PROTOCOL_VERSION, MIN_PROTOCOL_VERSION, APP_VERSION } from '@bridge-to-fig/shared';

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  if (req.path !== '/commands' || req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Routes
app.use('/commands', commandsRouter);
app.use('/results', resultsRouter);
app.use('/logs', logsRouter);
app.use('/proxy', proxyRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  const stats = queue.getStats();
  const latestRelease = getLatestRelease();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    wsClients: getConnectedClients(),
    pluginConnected: stats.pluginConnected,
    pendingCommands: stats.pendingCommands,
    storedResults: stats.storedResults,
    serverVersion: APP_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    minPluginProtocolVersion: MIN_PROTOCOL_VERSION,
    ...(latestRelease ? { latestRelease } : {}),
  });
});

// Create HTTP server and attach WebSocket
const server = createServer(app);
setupWebSocket(server);

// Cleanup old results every minute
setInterval(() => {
  queue.clearOldResults();
}, 60 * 1000);

// Track active connections for graceful shutdown
const activeConnections = new Set<import('http').ServerResponse>();

app.use((req, res, next) => {
  activeConnections.add(res);
  res.on('close', () => activeConnections.delete(res));
  next();
});

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down gracefully...');

  stopUpdateChecker();

  // Close all active connections
  for (const res of activeConnections) {
    res.end();
  }

  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Force exit after 3 seconds if connections don't close
  setTimeout(() => {
    console.log('Forcing exit...');
    process.exit(0);
  }, 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start update checker before listening
startUpdateChecker((release) => {
  if (release) {
    console.log('');
    console.log(`  Update available: v${release.version} (current: v${APP_VERSION})`);
    console.log(`    ${release.url}`);
  }
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('  Bridge to Fig Server');
  console.log('='.repeat(50));
  console.log(`  HTTP:      http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  Health:    http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
  console.log('');
  console.log('Endpoints:');
  console.log('  POST /commands      - Queue a new command');
  console.log('  GET  /commands      - Poll for pending commands');
  console.log('  POST /results       - Submit command result');
  console.log('  GET  /results/:id   - Get result for command');
  console.log('  GET  /logs          - Get plugin logs');
  console.log('  POST /logs          - Submit plugin log');
  console.log('');
  console.log('Waiting for connections... (Ctrl+C to stop)');
  console.log('');
});
