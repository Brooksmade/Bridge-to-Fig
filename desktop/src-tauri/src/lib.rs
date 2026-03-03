use include_dir::{include_dir, Dir};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use sysinfo::System;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder},
    Manager, RunEvent, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

const HEALTH_URL: &str = "http://localhost:4001/health";
const HEALTH_POLL_INTERVAL: Duration = Duration::from_secs(3);

// ── Embedded Claude files (compiled into binary) ──────────────────────────

static AGENTS: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../.claude/agents");
static COMMANDS: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../.claude/commands");
static CLAUDE_PROMPTS: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../.claude/prompts");
static ROOT_PROMPTS: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../prompts");
static CLAUDE_MD: &str = include_str!("../../../CLAUDE.md");

// ── Health check types ────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct HealthResponse {
    status: String,
    #[serde(default)]
    plugin_connected: bool,
    #[serde(default)]
    pending_commands: u32,
    #[serde(default)]
    server_version: Option<String>,
    #[serde(default)]
    protocol_version: Option<u32>,
}

#[derive(Debug, Clone, PartialEq)]
enum ServerState {
    Running,
    Waiting,
    Stopped,
}

// ── Helper functions ──────────────────────────────────────────────────────

fn check_health() -> Option<HealthResponse> {
    let agent = ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(2))
        .build();
    let resp = agent.get(HEALTH_URL).call().ok()?;
    resp.into_json::<HealthResponse>().ok()
}

fn get_tray_icon(state: &ServerState) -> Image<'static> {
    let icon_data = match state {
        ServerState::Running => include_bytes!("../icons/tray-connected-32x32.png").to_vec(),
        ServerState::Waiting => include_bytes!("../icons/tray-waiting-32x32.png").to_vec(),
        ServerState::Stopped => include_bytes!("../icons/tray-stopped-32x32.png").to_vec(),
    };
    Image::from_bytes(&icon_data).expect("Failed to load tray icon")
}

fn kill_process_tree(child: &mut Option<CommandChild>) {
    if let Some(child_process) = child.take() {
        let pid = child_process.pid();
        let _ = child_process.kill();

        let mut sys = System::new();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let parent_pid = sysinfo::Pid::from_u32(pid);
        let child_pids: Vec<sysinfo::Pid> = sys
            .processes()
            .iter()
            .filter(|(_, process)| process.parent() == Some(parent_pid))
            .map(|(pid, _)| *pid)
            .collect();

        for child_pid in child_pids {
            if let Some(process) = sys.process(child_pid) {
                process.kill();
            }
        }
    }
}

fn get_home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Cannot determine home directory".to_string())
}

/// Recursively extract an embedded directory to a filesystem path
fn extract_dir_to(dir: &Dir, base: &Path) -> Result<(), String> {
    for file in dir.files() {
        let target = base.join(file.path());
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Create dir {}: {}", parent.display(), e))?;
        }
        std::fs::write(&target, file.contents())
            .map_err(|e| format!("Write {}: {}", target.display(), e))?;
    }
    for subdir in dir.dirs() {
        extract_dir_to(subdir, base)?;
    }
    Ok(())
}

/// Rewrite prompt paths in agent/command files to use the installed location.
/// Converts relative paths like `prompts/figma-bridge.md` and
/// `.claude/prompts/charts/flowchart.md` to absolute installed paths.
fn rewrite_prompt_paths(content: &str, prompts_dir: &str) -> String {
    const PLACEHOLDER: &str = "\x00BTF_PROMPTS\x00";
    // Replace .claude/prompts/ first (more specific pattern)
    let result = content.replace(".claude/prompts/", PLACEHOLDER);
    // Replace remaining standalone prompts/ references
    let result = result.replace("prompts/", PLACEHOLDER);
    // Swap placeholder with actual installed path
    result.replace(PLACEHOLDER, &format!("{}/", prompts_dir))
}

// ── Tauri commands for Claude Code setup ──────────────────────────────────

#[tauri::command]
fn check_claude_setup() -> Result<serde_json::Value, String> {
    let home = get_home_dir()?;
    let btf_dir = home.join(".bridge-to-fig");
    let claude_dir = home.join(".claude");

    let installed = btf_dir.join(".installed").exists();
    let claude_md_exists = claude_dir.join("CLAUDE.md").exists();

    // Count installed agents
    let agents_count = claude_dir
        .join("agents")
        .read_dir()
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "md")
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0);

    // Count installed commands
    let commands_count = claude_dir
        .join("commands")
        .read_dir()
        .ok()
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.path()
                        .extension()
                        .map(|ext| ext == "md")
                        .unwrap_or(false)
                })
                .count()
        })
        .unwrap_or(0);

    Ok(serde_json::json!({
        "installed": installed,
        "claudeMdExists": claude_md_exists,
        "agentsCount": agents_count,
        "commandsCount": commands_count,
        "promptsDir": btf_dir.join("prompts").to_string_lossy(),
        "claudeDir": claude_dir.to_string_lossy(),
    }))
}

#[tauri::command]
fn install_claude_files(append_claude_md: bool) -> Result<serde_json::Value, String> {
    let home = get_home_dir()?;
    let btf_dir = home.join(".bridge-to-fig");
    let claude_dir = home.join(".claude");
    let prompts_dir = btf_dir.join("prompts");
    let prompts_path = prompts_dir.to_string_lossy().to_string();

    // Create directories
    std::fs::create_dir_all(&prompts_dir)
        .map_err(|e| format!("Create prompts dir: {}", e))?;
    std::fs::create_dir_all(claude_dir.join("agents"))
        .map_err(|e| format!("Create agents dir: {}", e))?;
    std::fs::create_dir_all(claude_dir.join("commands"))
        .map_err(|e| format!("Create commands dir: {}", e))?;
    std::fs::create_dir_all(claude_dir.join("prompts"))
        .map_err(|e| format!("Create claude prompts dir: {}", e))?;

    // ── Install prompts to ~/.bridge-to-fig/prompts/ ──
    extract_dir_to(&ROOT_PROMPTS, &prompts_dir)?;
    extract_dir_to(&CLAUDE_PROMPTS, &prompts_dir)?;

    // ── Install agents with path rewriting ──
    let mut agents_installed = 0u32;
    for file in AGENTS.files() {
        if let Ok(content) = std::str::from_utf8(file.contents()) {
            let rewritten = rewrite_prompt_paths(content, &prompts_path);
            let target = claude_dir.join("agents").join(
                file.path()
                    .file_name()
                    .unwrap_or(file.path().as_os_str()),
            );
            std::fs::write(&target, rewritten)
                .map_err(|e| format!("Write agent {}: {}", target.display(), e))?;
            agents_installed += 1;
        }
    }

    // ── Install commands with path rewriting ──
    let mut commands_installed = 0u32;
    for file in COMMANDS.files() {
        if let Ok(content) = std::str::from_utf8(file.contents()) {
            let rewritten = rewrite_prompt_paths(content, &prompts_path);
            let target = claude_dir.join("commands").join(
                file.path()
                    .file_name()
                    .unwrap_or(file.path().as_os_str()),
            );
            std::fs::write(&target, rewritten)
                .map_err(|e| format!("Write command {}: {}", target.display(), e))?;
            commands_installed += 1;
        }
    }

    // ── Create symlink: ~/.claude/prompts/bridge-to-fig → ~/.bridge-to-fig/prompts/ ──
    let symlink_path = claude_dir.join("prompts").join("bridge-to-fig");
    // Remove existing symlink/dir if present
    if symlink_path.symlink_metadata().is_ok() {
        let _ = std::fs::remove_file(&symlink_path);
        let _ = std::fs::remove_dir_all(&symlink_path);
    }

    let symlink_created;
    #[cfg(unix)]
    {
        match std::os::unix::fs::symlink(&prompts_dir, &symlink_path) {
            Ok(_) => symlink_created = true,
            Err(e) => {
                eprintln!("[Setup] Symlink failed, copying instead: {}", e);
                extract_dir_to(&ROOT_PROMPTS, &symlink_path)
                    .and_then(|_| extract_dir_to(&CLAUDE_PROMPTS, &symlink_path))?;
                symlink_created = false;
            }
        }
    }
    #[cfg(windows)]
    {
        match std::os::windows::fs::symlink_dir(&prompts_dir, &symlink_path) {
            Ok(_) => symlink_created = true,
            Err(_) => {
                // Windows symlinks require dev mode or admin — fall back to copy
                std::fs::create_dir_all(&symlink_path)
                    .map_err(|e| format!("Create fallback dir: {}", e))?;
                extract_dir_to(&ROOT_PROMPTS, &symlink_path)
                    .and_then(|_| extract_dir_to(&CLAUDE_PROMPTS, &symlink_path))?;
                symlink_created = false;
            }
        }
    }
    #[cfg(not(any(unix, windows)))]
    {
        std::fs::create_dir_all(&symlink_path)
            .map_err(|e| format!("Create fallback dir: {}", e))?;
        extract_dir_to(&ROOT_PROMPTS, &symlink_path)
            .and_then(|_| extract_dir_to(&CLAUDE_PROMPTS, &symlink_path))?;
        symlink_created = false;
    }

    // ── Handle CLAUDE.md ──
    let claude_md_path = claude_dir.join("CLAUDE.md");
    let claude_md_action;
    if claude_md_path.exists() {
        if append_claude_md {
            let existing = std::fs::read_to_string(&claude_md_path)
                .map_err(|e| format!("Read CLAUDE.md: {}", e))?;
            if existing.contains("# Bridge to Fig") {
                // Already has Bridge to Fig content — replace it
                if let Some(idx) = existing.find("\n---\n\n# Bridge to Fig") {
                    let trimmed = &existing[..idx];
                    let combined = format!("{}\n\n---\n\n{}", trimmed.trim_end(), CLAUDE_MD);
                    std::fs::write(&claude_md_path, combined)
                        .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
                    claude_md_action = "updated";
                } else {
                    claude_md_action = "already_present";
                }
            } else {
                let combined = format!("{}\n\n---\n\n{}", existing.trim_end(), CLAUDE_MD);
                std::fs::write(&claude_md_path, combined)
                    .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
                claude_md_action = "appended";
            }
        } else {
            claude_md_action = "skipped";
        }
    } else {
        std::fs::write(&claude_md_path, CLAUDE_MD)
            .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
        claude_md_action = "created";
    }

    // ── Write marker file ──
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs().to_string())
        .unwrap_or_default();
    std::fs::write(btf_dir.join(".installed"), &timestamp)
        .map_err(|e| format!("Write marker: {}", e))?;

    println!(
        "[Setup] Installed {} agents, {} commands, CLAUDE.md: {}",
        agents_installed, commands_installed, claude_md_action
    );

    Ok(serde_json::json!({
        "success": true,
        "agentsInstalled": agents_installed,
        "commandsInstalled": commands_installed,
        "promptsDir": prompts_path,
        "claudeMd": claude_md_action,
        "symlink": symlink_created,
    }))
}

// ── Main application ──────────────────────────────────────────────────────

pub fn run() {
    let sidecar_child: Arc<Mutex<Option<CommandChild>>> = Arc::new(Mutex::new(None));
    let should_quit = Arc::new(AtomicBool::new(false));

    let sidecar_child_clone = sidecar_child.clone();
    let should_quit_clone = should_quit.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::AppleScript,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            check_claude_setup,
            install_claude_files,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            // === Auto-start: enable by default on first run ===
            let autolaunch = app.autolaunch();
            let autostart_enabled = autolaunch.is_enabled().unwrap_or(false);
            if !autostart_enabled {
                let _ = autolaunch.enable();
                println!("[Tauri] Auto-start enabled (first run)");
            }
            let autostart_checked = autolaunch.is_enabled().unwrap_or(false);

            // === Build tray menu ===
            let show_status = MenuItemBuilder::with_id("show_status", "Show Status")
                .build(app)?;
            let setup_claude = MenuItemBuilder::with_id("setup_claude", "Setup Claude Code")
                .build(app)?;
            let launch_at_login =
                CheckMenuItemBuilder::with_id("launch_at_login", "Launch at Login")
                    .checked(autostart_checked)
                    .build(app)?;
            let check_updates = MenuItemBuilder::with_id("check_updates", "Check for Updates")
                .build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit Bridge to Fig")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show_status)
                .item(&setup_claude)
                .separator()
                .item(&launch_at_login)
                .separator()
                .item(&check_updates)
                .separator()
                .item(&quit)
                .build()?;

            // === Create tray icon ===
            let initial_icon = get_tray_icon(&ServerState::Stopped);
            let tray = TrayIconBuilder::new()
                .icon(initial_icon)
                .tooltip("Bridge to Fig")
                .menu(&menu)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "show_status" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "setup_claude" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("scrollToClaudeSetup()");
                        }
                    }
                    "launch_at_login" => {
                        let autolaunch = app.autolaunch();
                        let currently_enabled = autolaunch.is_enabled().unwrap_or(false);
                        if currently_enabled {
                            let _ = autolaunch.disable();
                            println!("[Tauri] Auto-start disabled by user");
                        } else {
                            let _ = autolaunch.enable();
                            println!("[Tauri] Auto-start enabled by user");
                        }
                    }
                    "check_updates" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval(
                                "document.getElementById('btn-check-update')?.click()",
                            );
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // === Spawn sidecar ===
            let sidecar_for_spawn = sidecar_child_clone.clone();
            let shell_handle = handle.clone();

            match shell_handle.shell().sidecar("bridge-server") {
                Ok(command) => match command.spawn() {
                    Ok((_, child)) => {
                        if let Ok(mut guard) = sidecar_for_spawn.lock() {
                            *guard = Some(child);
                        }
                        println!("[Tauri] Bridge server sidecar started");
                    }
                    Err(e) => {
                        eprintln!("[Tauri] Failed to spawn sidecar: {}", e);
                    }
                },
                Err(e) => {
                    eprintln!("[Tauri] Failed to create sidecar command: {}", e);
                }
            }

            // === Health polling thread ===
            let tray_handle = tray.clone();
            let should_quit_health = should_quit_clone.clone();

            thread::spawn(move || {
                let mut last_state = ServerState::Stopped;

                while !should_quit_health.load(Ordering::Relaxed) {
                    let new_state = match check_health() {
                        Some(health) => {
                            if health.status == "ok" {
                                if health.plugin_connected {
                                    ServerState::Running
                                } else {
                                    ServerState::Waiting
                                }
                            } else {
                                ServerState::Stopped
                            }
                        }
                        None => ServerState::Stopped,
                    };

                    if new_state != last_state {
                        let icon = get_tray_icon(&new_state);
                        let tooltip = match &new_state {
                            ServerState::Running => "Bridge to Fig - Connected",
                            ServerState::Waiting => "Bridge to Fig - Waiting for Plugin",
                            ServerState::Stopped => "Bridge to Fig - Server Stopped",
                        };
                        let _ = tray_handle.set_icon(Some(icon));
                        let _ = tray_handle.set_tooltip(Some(tooltip));
                        last_state = new_state;
                    }

                    thread::sleep(HEALTH_POLL_INTERVAL);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(move |_app_handle, event| {
            if let RunEvent::ExitRequested { .. } = &event {
                should_quit.store(true, Ordering::Relaxed);

                if let Ok(mut guard) = sidecar_child.lock() {
                    kill_process_tree(&mut guard);
                    println!("[Tauri] Sidecar process tree terminated");
                }
            }
        });
}
