// Bridge to Fig Desktop — Status UI + Setup Wizard

const HEALTH_URL = 'http://localhost:4001/health';
const LOGS_URL = 'http://localhost:4001/logs';
const POLL_INTERVAL = 2000;
const LOG_POLL_INTERVAL = 1000;
const MAX_LOG_DISPLAY = 50;

// State
let lastHealthData = null;
let lastLogTimestamp = 0;

// ── Bridge Server Error Modal state ──────────────────────────────────────
// Show the modal when EITHER the Rust side reports a spawn failure (event)
// OR health polling fails N times in a row (server crashed or never bound).
const HEALTH_FAIL_THRESHOLD = 3; // ~6s at POLL_INTERVAL=2s
let healthFailCount = 0;
let lastSpawnError = null; // { message, hint } from Rust, or null
let errorModalDismissed = false; // user clicked Dismiss on current failure

// ── Setup Wizard ──────────────────────────────────────────────────────────

const wizard = {
  scope: 'global',
  projectPath: null,
  isReinstall: false,
};

function showWizard() {
  document.getElementById('setup-wizard').style.display = '';
  document.getElementById('dashboard').style.display = 'none';
  goToScreen(wizard.isReinstall ? 'wizard-scope' : 'wizard-welcome');
}

function showDashboard() {
  document.getElementById('setup-wizard').style.display = 'none';
  document.getElementById('dashboard').style.display = '';
  refreshClaudeStatus();
}

function goToScreen(id) {
  document.querySelectorAll('.wizard-screen').forEach(el => {
    el.style.display = 'none';
  });
  const screen = document.getElementById(id);
  if (screen) {
    screen.style.display = '';
    screen.classList.remove('fade-in');
    // Trigger reflow for animation
    void screen.offsetWidth;
    screen.classList.add('fade-in');
  }
}

// Scope card selection
function selectScope(scope) {
  wizard.scope = scope;
  const globalCard = document.getElementById('scope-global');
  const projectCard = document.getElementById('scope-project');

  if (scope === 'global') {
    globalCard.classList.add('selected');
    globalCard.setAttribute('aria-checked', 'true');
    projectCard.classList.remove('selected');
    projectCard.setAttribute('aria-checked', 'false');
  } else {
    projectCard.classList.add('selected');
    projectCard.setAttribute('aria-checked', 'true');
    globalCard.classList.remove('selected');
    globalCard.setAttribute('aria-checked', 'false');
  }
}

// Folder picker
async function pickFolder() {
  if (!window.__TAURI__) return;
  try {
    const folder = await window.__TAURI__.core.invoke('pick_folder');
    if (folder) {
      wizard.projectPath = folder;
      document.getElementById('folder-path').value = folder;
      document.getElementById('btn-folder-next').disabled = false;

      // Show install path hint
      const name = folder.split(/[/\\]/).pop();
      document.getElementById('folder-hint').innerHTML =
        `Agents, commands, and prompts will be installed to:<br><code>${name}/.claude/</code>`;
    }
  } catch (err) {
    console.error('Folder picker error:', err);
  }
}

// Install flow with animated checklist
async function runInstall() {
  goToScreen('wizard-installing');

  const items = ['install-agents', 'install-commands', 'install-prompts', 'install-claudemd'];

  // Reset all items to pending
  items.forEach(id => {
    const icon = document.querySelector(`#${id} .install-icon`);
    const label = document.querySelector(`#${id} .install-label`);
    icon.className = 'install-icon pending';
    label.textContent = label.textContent.replace(/\s*\(.*\)$/, '');
  });

  try {
    const result = await window.__TAURI__.core.invoke('install_claude_files', {
      scope: wizard.scope,
      projectPath: wizard.projectPath,
    });

    if (result.success) {
      // Animate checklist items with stagger
      const delay = (ms) => new Promise(r => setTimeout(r, ms));

      // Agents
      setInstallItem('install-agents', 'done', `${result.agentsInstalled} agents`);
      await delay(200);

      // Commands
      setInstallItem('install-commands', 'done', `${result.commandsInstalled} commands`);
      await delay(200);

      // Prompts
      setInstallItem('install-prompts', 'done', `${result.promptsInstalled} prompt files`);
      await delay(200);

      // CLAUDE.md
      const mdLabel = result.claudeMd === 'migrated'
        ? 'CLAUDE.md reference (migrated from legacy)'
        : 'CLAUDE.md reference';
      setInstallItem('install-claudemd', 'done', mdLabel);
      await delay(400);

      // Transition to success
      showSuccess(result);
    }
  } catch (err) {
    // Show error on the last pending item
    const pendingItem = items.find(id => {
      return document.querySelector(`#${id} .install-icon`).classList.contains('pending');
    }) || items[items.length - 1];

    setInstallItem(pendingItem, 'error', 'Install failed: ' + String(err));
  }
}

function setInstallItem(id, state, label) {
  const icon = document.querySelector(`#${id} .install-icon`);
  const labelEl = document.querySelector(`#${id} .install-label`);
  icon.className = 'install-icon ' + state;
  labelEl.textContent = label;
}

function showSuccess(result) {
  const summary = `${result.agentsInstalled} agents, ${result.commandsInstalled} commands installed`;
  const location = wizard.scope === 'global'
    ? 'Installed to: ~/.claude/ (global)'
    : `Installed to: ${wizard.projectPath} (project)`;

  document.getElementById('success-summary').textContent = summary;
  document.getElementById('success-location').textContent = location;
  goToScreen('wizard-success');
}

// ── Wire up wizard buttons ──

document.getElementById('btn-wizard-start').addEventListener('click', () => {
  goToScreen('wizard-scope');
});

document.getElementById('scope-global').addEventListener('click', () => selectScope('global'));
document.getElementById('scope-project').addEventListener('click', () => selectScope('project'));

// Keyboard support for scope cards
document.getElementById('scope-global').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScope('global'); }
});
document.getElementById('scope-project').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScope('project'); }
});

document.getElementById('btn-scope-back').addEventListener('click', () => {
  if (wizard.isReinstall) {
    showDashboard();
  } else {
    goToScreen('wizard-welcome');
  }
});

document.getElementById('btn-scope-next').addEventListener('click', () => {
  if (wizard.scope === 'project') {
    goToScreen('wizard-folder');
  } else {
    wizard.projectPath = null;
    runInstall();
  }
});

document.getElementById('btn-folder-back').addEventListener('click', () => {
  goToScreen('wizard-scope');
});

document.getElementById('btn-browse').addEventListener('click', pickFolder);

document.getElementById('btn-folder-next').addEventListener('click', () => {
  if (wizard.projectPath) {
    runInstall();
  }
});

document.getElementById('btn-open-dashboard').addEventListener('click', () => {
  showDashboard();
});

// ── Dashboard ─────────────────────────────────────────────────────────────

// DOM elements (dashboard)
const serverDot = document.getElementById('server-dot');
const serverText = document.getElementById('server-text');
const pluginDot = document.getElementById('plugin-dot');
const pluginText = document.getElementById('plugin-text');
const portValue = document.getElementById('port-value');
const serverVersion = document.getElementById('server-version');
const protocolVersion = document.getElementById('protocol-version');
const logEntriesEl = document.getElementById('log-entries');
const btnClearLog = document.getElementById('btn-clear-log');
const btnCheckUpdate = document.getElementById('btn-check-update');
const btnDocs = document.getElementById('btn-docs');
const updateStatus = document.getElementById('update-status');
const claudeDot = document.getElementById('claude-dot');
const claudeText = document.getElementById('claude-text');
const claudeDetail = document.getElementById('claude-detail');
const btnReinstall = document.getElementById('btn-reinstall-claude');

// Update server status indicators
function setServerStatus(status) {
  serverDot.className = 'status-dot ' + status;
  if (status === 'running') {
    serverText.textContent = 'Running';
  } else if (status === 'stopped') {
    serverText.textContent = 'Stopped';
  } else {
    serverText.textContent = 'Checking...';
  }
}

// Update plugin status indicators
function setPluginStatus(status) {
  pluginDot.className = 'status-dot ' + status;
  if (status === 'connected') {
    pluginText.textContent = 'Connected';
  } else if (status === 'waiting') {
    pluginText.textContent = 'Waiting';
  } else {
    pluginText.textContent = '--';
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render log entries from server data
function renderLog(logs) {
  if (!logs || logs.length === 0) {
    logEntriesEl.innerHTML = '<div class="log-empty">No activity yet</div>';
    return;
  }

  const display = logs.slice(-MAX_LOG_DISPLAY);

  logEntriesEl.innerHTML = display
    .map((entry) => {
      const typeClass = entry.type === 'success' ? 'success' : entry.type === 'error' ? 'error' : '';
      return `<div class="log-entry">
        <span class="log-time">${escapeHtml(entry.time || '')}</span>
        <span class="log-message ${typeClass}">${escapeHtml(entry.message)}</span>
      </div>`;
    })
    .join('');

  logEntriesEl.scrollTop = logEntriesEl.scrollHeight;
}

// Poll health endpoint
async function pollHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    lastHealthData = data;

    setServerStatus('running');

    if (data.pluginConnected) {
      setPluginStatus('connected');
    } else {
      setPluginStatus('waiting');
    }

    serverVersion.textContent = data.serverVersion || '--';
    protocolVersion.textContent = data.protocolVersion != null ? `v${data.protocolVersion}` : '--';
    portValue.textContent = '4001';

    if (data.latestRelease) {
      updateStatus.textContent = `Update available: v${data.latestRelease.version}`;
      updateStatus.className = 'update-text available';
      btnCheckUpdate.style.display = '';
    }

    // Server is healthy — clear any stale error state.
    healthFailCount = 0;
    lastSpawnError = null;
    errorModalDismissed = false;
    hideServerErrorModal();
  } catch (err) {
    setServerStatus('stopped');
    setPluginStatus('');
    serverVersion.textContent = '--';
    protocolVersion.textContent = '--';
    lastHealthData = null;

    healthFailCount += 1;
    if (healthFailCount >= HEALTH_FAIL_THRESHOLD && !errorModalDismissed) {
      showServerErrorModal();
    }
  }
}

// Poll logs endpoint
async function pollLogs() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${LOGS_URL}?limit=${MAX_LOG_DISPLAY}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = await response.json();
    if (data.logs && data.logs.length > 0) {
      const newestTimestamp = data.logs[data.logs.length - 1].timestamp;
      if (newestTimestamp !== lastLogTimestamp) {
        lastLogTimestamp = newestTimestamp;
        renderLog(data.logs);
      }
    }
  } catch (err) {
    // Server not reachable
  }
}

// Clear log button
btnClearLog.addEventListener('click', async () => {
  try {
    await fetch(LOGS_URL, { method: 'DELETE' });
  } catch (err) {
    // ignore
  }
  lastLogTimestamp = 0;
  logEntriesEl.innerHTML = '<div class="log-empty">No activity yet</div>';
});

// Documentation button
btnDocs.addEventListener('click', () => {
  const url = 'https://github.com/Brooksmade/Bridge-to-Fig#readme';
  if (window.__TAURI__ && window.__TAURI__.core) {
    window.__TAURI__.core.invoke('plugin:shell|open', { path: url });
  } else {
    window.open(url, '_blank');
  }
});

// Update button
btnCheckUpdate.addEventListener('click', async () => {
  updateStatus.textContent = 'Checking...';
  updateStatus.className = 'update-text';

  try {
    if (window.__TAURI__) {
      const { check } = window.__TAURI__.updater;
      const update = await check();
      if (update) {
        updateStatus.textContent = `Update available: v${update.version}`;
        updateStatus.className = 'update-text available';
        btnCheckUpdate.style.display = '';
      } else {
        updateStatus.textContent = 'You are on the latest version';
        btnCheckUpdate.style.display = 'none';
        setTimeout(() => { updateStatus.textContent = ''; }, 5000);
      }
    } else {
      if (lastHealthData && lastHealthData.latestRelease) {
        updateStatus.textContent = `Update available: v${lastHealthData.latestRelease.version}`;
        updateStatus.className = 'update-text available';
      } else {
        updateStatus.textContent = 'You are on the latest version';
        btnCheckUpdate.style.display = 'none';
        setTimeout(() => { updateStatus.textContent = ''; }, 5000);
      }
    }
  } catch (err) {
    updateStatus.textContent = 'Failed to check for updates';
    setTimeout(() => { updateStatus.textContent = ''; }, 5000);
  }
});

// Reinstall button — opens wizard at scope selection
btnReinstall.addEventListener('click', () => {
  wizard.isReinstall = true;
  wizard.scope = 'global';
  wizard.projectPath = null;
  selectScope('global');
  document.getElementById('folder-path').value = '';
  document.getElementById('btn-folder-next').disabled = true;
  showWizard();
});

// ── Claude Code Status (dashboard card) ──

async function refreshClaudeStatus() {
  if (!window.__TAURI__) return;
  try {
    const status = await window.__TAURI__.core.invoke('check_claude_setup');
    if (status.installed) {
      claudeDot.className = 'status-dot connected';
      claudeText.textContent = 'Installed';
      claudeDetail.textContent = `${status.agentsCount} agents, ${status.commandsCount} commands`;
      btnReinstall.textContent = 'Reinstall';
    } else {
      claudeDot.className = 'status-dot waiting';
      claudeText.textContent = 'Not Installed';
      claudeDetail.textContent = 'Agents, commands, and prompts for Claude Code';
      btnReinstall.textContent = 'Install';
    }
  } catch (err) {
    claudeDot.className = 'status-dot';
    claudeText.textContent = 'Error';
    claudeDetail.textContent = String(err);
  }
}

// ── Global function for tray menu ──

function showSetupWizard() {
  wizard.isReinstall = true;
  wizard.scope = 'global';
  wizard.projectPath = null;
  selectScope('global');
  document.getElementById('folder-path').value = '';
  document.getElementById('btn-folder-next').disabled = true;
  showWizard();
}

// Called from tray menu "Setup Claude Code"
function scrollToClaudeSetup() {
  // Legacy compat — redirect to wizard
  showSetupWizard();
}

// ── Bridge Server Error Modal ────────────────────────────────────────────

const errorOverlay = document.getElementById('server-error-overlay');
const errorTitle = document.getElementById('server-error-title');
const errorMessage = document.getElementById('server-error-message');
const errorHint = document.getElementById('server-error-hint');
const btnErrorRetry = document.getElementById('btn-server-error-retry');
const btnErrorDismiss = document.getElementById('btn-server-error-dismiss');

function showServerErrorModal() {
  if (!errorOverlay) return;
  if (lastSpawnError) {
    errorTitle.textContent = 'Bridge Server Failed to Start';
    errorMessage.textContent = lastSpawnError.message || 'The bridge server could not start.';
    errorHint.textContent = lastSpawnError.hint || '';
  } else {
    errorTitle.textContent = 'Bridge Server Stopped';
    errorMessage.textContent = `The bridge server is not responding on port 4001 after ${HEALTH_FAIL_THRESHOLD * (POLL_INTERVAL / 1000)}s.`;
    errorHint.textContent = 'It may have crashed or another process may be holding the port.';
  }
  errorOverlay.style.display = '';
}

function hideServerErrorModal() {
  if (errorOverlay) errorOverlay.style.display = 'none';
}

if (btnErrorRetry) {
  btnErrorRetry.addEventListener('click', async () => {
    btnErrorRetry.disabled = true;
    btnErrorRetry.textContent = 'Retrying...';
    try {
      if (window.__TAURI__) {
        await window.__TAURI__.core.invoke('respawn_bridge_server');
      }
      // Modal stays up; pollHealth will hide it once /health succeeds.
    } catch (err) {
      // Surface the new error from the respawn attempt.
      lastSpawnError = { message: String(err), hint: 'The respawn attempt also failed.' };
      showServerErrorModal();
    } finally {
      btnErrorRetry.disabled = false;
      btnErrorRetry.textContent = 'Retry';
    }
  });
}

if (btnErrorDismiss) {
  btnErrorDismiss.addEventListener('click', () => {
    errorModalDismissed = true;
    hideServerErrorModal();
  });
}

// ── App Init ──────────────────────────────────────────────────────────────

async function initApp() {
  // Start polling immediately
  pollHealth();
  pollLogs();
  setInterval(pollHealth, POLL_INTERVAL);
  setInterval(pollLogs, LOG_POLL_INTERVAL);

  // Listen for bridge-server lifecycle events from Rust.
  if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen('bridge-server-error', (event) => {
      lastSpawnError = event.payload || null;
      errorModalDismissed = false; // a new failure overrides a prior dismiss
      showServerErrorModal();
    });
    window.__TAURI__.event.listen('bridge-server-spawned', () => {
      // Spawn succeeded; final clearing happens on next successful health poll.
      lastSpawnError = null;
    });
  }

  if (!window.__TAURI__) {
    showDashboard();
    return;
  }

  try {
    const status = await window.__TAURI__.core.invoke('check_claude_setup');
    if (status.installed) {
      // Already set up — go straight to dashboard
      showDashboard();
    } else {
      // First launch — show wizard
      wizard.isReinstall = false;
      showWizard();
    }
  } catch (err) {
    console.error('Setup check failed:', err);
    showDashboard();
  }
}

initApp();
