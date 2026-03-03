// Bridge to Fig Desktop — Status UI

const HEALTH_URL = 'http://localhost:4001/health';
const LOGS_URL = 'http://localhost:4001/logs';
const POLL_INTERVAL = 2000;
const LOG_POLL_INTERVAL = 1000;
const MAX_LOG_DISPLAY = 50;

// State
let lastHealthData = null;
let lastLogTimestamp = 0;
let claudeSetupChecked = false;

// DOM elements
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
const btnInstallClaude = document.getElementById('btn-install-claude');

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

  // Show oldest first, newest at bottom (matches plugin scroll direction)
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

  // Auto-scroll to bottom (newest entries) — matches plugin behavior
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

    // Update server status
    setServerStatus('running');

    // Update plugin status
    if (data.pluginConnected) {
      setPluginStatus('connected');
    } else {
      setPluginStatus('waiting');
    }

    // Update info
    serverVersion.textContent = data.serverVersion || '--';
    protocolVersion.textContent = data.protocolVersion != null ? `v${data.protocolVersion}` : '--';
    portValue.textContent = '4001';

    // Check for update info from server
    if (data.latestRelease) {
      updateStatus.textContent = `Update available: v${data.latestRelease.version}`;
      updateStatus.className = 'update-text available';
      btnCheckUpdate.style.display = '';
    }
  } catch (err) {
    setServerStatus('stopped');
    setPluginStatus('');
    serverVersion.textContent = '--';
    protocolVersion.textContent = '--';

    lastHealthData = null;
  }
}

// Poll logs endpoint (mirrors plugin activity)
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
      // Only re-render if new entries arrived
      if (newestTimestamp !== lastLogTimestamp) {
        lastLogTimestamp = newestTimestamp;
        renderLog(data.logs);
      }
    }
  } catch (err) {
    // Server not reachable — health poll handles status display
  }
}

// Clear log button
btnClearLog.addEventListener('click', async () => {
  // Clear server-side logs and reset local state
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

// Check for updates / update button
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

// ── Claude Code Setup ──

async function checkClaudeSetup() {
  if (!window.__TAURI__) return;
  try {
    const status = await window.__TAURI__.core.invoke('check_claude_setup');
    if (status.installed) {
      claudeDot.className = 'status-dot connected';
      claudeText.textContent = 'Installed';
      claudeDetail.textContent = `${status.agentsCount} agents, ${status.commandsCount} commands`;
      btnInstallClaude.textContent = 'Reinstall';
    } else {
      claudeDot.className = 'status-dot waiting';
      claudeText.textContent = 'Not Installed';
      claudeDetail.textContent = 'Agents, commands, and prompts for Claude Code';
      btnInstallClaude.textContent = 'Install';
    }
    claudeSetupChecked = true;
  } catch (err) {
    claudeDot.className = 'status-dot';
    claudeText.textContent = 'Error';
    claudeDetail.textContent = String(err);
  }
}

async function installClaudeFiles() {
  if (!window.__TAURI__) return;

  btnInstallClaude.disabled = true;
  btnInstallClaude.textContent = 'Installing...';

  try {
    // Check if CLAUDE.md exists and ask user
    const status = await window.__TAURI__.core.invoke('check_claude_setup');
    let appendClaudeMd = true;
    if (status.claudeMdExists) {
      appendClaudeMd = confirm(
        'Found existing ~/.claude/CLAUDE.md.\n\nAppend Bridge to Fig instructions to it?'
      );
    }

    const result = await window.__TAURI__.core.invoke('install_claude_files', {
      appendClaudeMd,
    });

    if (result.success) {
      claudeDot.className = 'status-dot connected';
      claudeText.textContent = 'Installed';
      claudeDetail.textContent = `${result.agentsInstalled} agents, ${result.commandsInstalled} commands`;
      btnInstallClaude.textContent = 'Done';
      btnInstallClaude.classList.add('success');
      setTimeout(() => {
        btnInstallClaude.textContent = 'Reinstall';
        btnInstallClaude.classList.remove('success');
        btnInstallClaude.disabled = false;
      }, 2000);
    }
  } catch (err) {
    claudeDetail.textContent = 'Install failed: ' + String(err);
    btnInstallClaude.textContent = 'Retry';
    btnInstallClaude.disabled = false;
  }
}

btnInstallClaude.addEventListener('click', installClaudeFiles);

// Called from tray menu "Setup Claude Code"
function scrollToClaudeSetup() {
  const section = document.getElementById('claude-setup-section');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Start polling
checkClaudeSetup();
pollHealth();
pollLogs();
setInterval(pollHealth, POLL_INTERVAL);
setInterval(pollLogs, LOG_POLL_INTERVAL);
