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
    AppHandle, Emitter, Manager, RunEvent, WindowEvent,
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

// ── Embedded Figma plugin ─────────────────────────────────────────────────

// The built plugin ships inside the installer so users never have to clone the repo or run a
// build to get it. It is extracted to ~/.bridge-to-fig/figma-plugin on launch, and the user
// points Figma's "Import plugin from manifest" at the manifest.json in there.
//
// build.rs creates this directory if it is missing, so a `cargo build` that runs before
// `pnpm build:plugin` still compiles. A RELEASE build must run `pnpm build:plugin:release`
// first or the app ships with no plugin. See .github/workflows/release.yml.
static FIGMA_PLUGIN: Dir<'static> = include_dir!("$CARGO_MANIFEST_DIR/../../figma-plugin/dist");

// ── Short CLAUDE.md template (replaces full 357-line embed) ───────────────

const CLAUDE_MD_SHORT_TEMPLATE: &str = r#"# Bridge to Fig

AI-to-Figma bridge for design systems, variable binding, website extraction, and component libraries.

**Server**: http://localhost:4001 | **Quick Ref**: `{PROMPTS_DIR}/quick-ref.md` | **Full API**: `{PROMPTS_DIR}/figma-bridge.md`

**When using Bridge to Fig, read `quick-ref.md` FIRST** (~200 lines, all commands). Only read `figma-bridge.md` (2870 lines) for detailed examples or edge cases.

## Quick Reference
- Send commands: `POST http://localhost:4001/commands` → poll `GET /results/{id}?wait=true`
- {AGENTS_COUNT} agents at `{AGENTS_DIR}/` | {COMMANDS_COUNT} commands at `{COMMANDS_DIR}/`
- Full workflow docs: `{PROMPTS_DIR}/workflows.md`
- Layout guide: `{PROMPTS_DIR}/figma-layout.md`

## Rules
- Always query first → modify by node ID
- Use `describe` over `children` for large nodes
- 3-step layout: create → setAutoLayout → modify
- Temp files in `.tmp/` only — never project root
- Long commands: timeout=300000
- FigJam: always use bridge server commands, never MCP generate_diagram
"#;

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

// Newtype wrapper so we can store the sidecar handle in Tauri's managed state
// and access it from the `respawn_bridge_server` command.
struct SidecarHandle(Arc<Mutex<Option<CommandChild>>>);

fn spawn_bridge_server(
    app: &AppHandle,
    sidecar_state: Arc<Mutex<Option<CommandChild>>>,
) -> Result<(), String> {
    // If a previous child is alive (respawn case), terminate it first.
    if let Ok(mut guard) = sidecar_state.lock() {
        if let Some(existing) = guard.take() {
            let _ = existing.kill();
        }
    }

    let result: Result<(), String> = match app.shell().sidecar("bridge-server") {
        Ok(command) => match command.spawn() {
            Ok((_, child)) => {
                if let Ok(mut guard) = sidecar_state.lock() {
                    *guard = Some(child);
                }
                println!("[Tauri] Bridge server sidecar started");
                Ok(())
            }
            Err(e) => Err(format!("Failed to spawn sidecar process: {}", e)),
        },
        Err(e) => Err(format!("Failed to create sidecar command: {}", e)),
    };

    match &result {
        Ok(_) => {
            // Tell the UI to clear any stale error modal.
            let _ = app.emit("bridge-server-spawned", ());
        }
        Err(msg) => {
            eprintln!("[Tauri] Bridge server spawn failed: {}", msg);
            let _ = app.emit(
                "bridge-server-error",
                serde_json::json!({
                    "message": msg,
                    "hint": classify_spawn_hint(msg),
                }),
            );
        }
    }

    result
}

fn classify_spawn_hint(err: &str) -> &'static str {
    let lower = err.to_lowercase();
    if lower.contains("address already in use") || lower.contains("eaddrinuse") {
        "Port 4001 is already in use. Quit any other process bound to port 4001, then click Retry."
    } else if lower.contains("permission denied") || lower.contains("eacces") {
        "Permission denied. The bundled bridge-server binary may have lost execute permission — reinstalling the app should fix this."
    } else if lower.contains("no such file") || lower.contains("not found") || lower.contains("enoent") {
        "The bundled bridge-server binary appears to be missing. Reinstalling the app should fix this."
    } else {
        "The bridge server failed to start. Click Retry, or restart the app if it keeps failing."
    }
}

#[tauri::command]
fn respawn_bridge_server(
    app: AppHandle,
    state: tauri::State<'_, SidecarHandle>,
) -> Result<(), String> {
    spawn_bridge_server(&app, state.0.clone())
}

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

// ── Figma plugin extraction ───────────────────────────────────────────────

/// Where the bundled Figma plugin is written on disk.
fn figma_plugin_dir() -> Result<PathBuf, String> {
    Ok(get_home_dir()?.join(".bridge-to-fig").join("figma-plugin"))
}

/// Write the bundled plugin to disk, overwriting whatever is there.
///
/// Overwriting is deliberate: Figma imports a plugin by path and re-reads those files every time
/// it runs, so refreshing them in place is how a user gets the new plugin after an app update
/// without re-importing anything.
fn extract_figma_plugin() -> Result<PathBuf, String> {
    if count_embedded_files(&FIGMA_PLUGIN) == 0 {
        return Err(
            "This build shipped without the Figma plugin files. Build the plugin with `pnpm build:plugin` and rebuild the app."
                .to_string(),
        );
    }

    let dir = figma_plugin_dir()?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("Create {}: {}", dir.display(), e))?;
    extract_dir_to(&FIGMA_PLUGIN, &dir)?;

    let manifest = dir.join("manifest.json");
    if !manifest.exists() {
        return Err(format!(
            "Extracted the plugin to {} but manifest.json is missing",
            dir.display()
        ));
    }

    Ok(dir)
}

/// Report where the plugin is and whether it is ready to import.
#[tauri::command]
fn get_figma_plugin_info() -> Result<serde_json::Value, String> {
    let dir = figma_plugin_dir()?;
    let manifest = dir.join("manifest.json");

    Ok(serde_json::json!({
        "dir": dir.to_string_lossy(),
        "manifestPath": manifest.to_string_lossy(),
        "installed": manifest.exists(),
        "bundled": count_embedded_files(&FIGMA_PLUGIN) > 0,
    }))
}

/// Re-extract the plugin on demand, for the dashboard's Reinstall button.
#[tauri::command]
fn install_figma_plugin() -> Result<serde_json::Value, String> {
    let dir = extract_figma_plugin()?;
    Ok(serde_json::json!({
        "dir": dir.to_string_lossy(),
        "manifestPath": dir.join("manifest.json").to_string_lossy(),
        "installed": true,
    }))
}

/// Open the plugin folder in Finder / Explorer so the user can point Figma's file picker at it.
#[tauri::command]
fn reveal_figma_plugin(app: tauri::AppHandle) -> Result<String, String> {
    let dir = figma_plugin_dir()?;
    if !dir.exists() {
        extract_figma_plugin()?;
    }

    let path = dir.to_string_lossy().to_string();
    app.shell()
        .open(path.as_str(), None)
        .map_err(|e| format!("Could not open {}: {}", path, e))?;
    Ok(path)
}

/// Count files recursively in an embedded directory
fn count_embedded_files(dir: &Dir) -> u32 {
    let mut count = dir.files().count() as u32;
    for subdir in dir.dirs() {
        count += count_embedded_files(subdir);
    }
    count
}

/// Rewrite prompt paths in agent/command files to use the installed location.
/// Converts relative paths like `prompts/figma-bridge.md` and
/// `.claude/prompts/charts/flowchart.md` to the installed prompts path.
fn rewrite_prompt_paths(content: &str, prompts_dir: &str) -> String {
    const PLACEHOLDER: &str = "\x00BTF_PROMPTS\x00";
    // Replace .claude/prompts/ first (more specific pattern)
    let result = content.replace(".claude/prompts/", PLACEHOLDER);
    // Replace remaining standalone prompts/ references
    let result = result.replace("prompts/", PLACEHOLDER);
    // Swap placeholder with actual installed path
    result.replace(PLACEHOLDER, &format!("{}/", prompts_dir))
}

/// Render the short CLAUDE.md reference with resolved placeholders
fn render_claude_md_short(
    prompts_dir: &str,
    agents_dir: &str,
    commands_dir: &str,
    agents_count: u32,
    commands_count: u32,
) -> String {
    CLAUDE_MD_SHORT_TEMPLATE
        .replace("{PROMPTS_DIR}", prompts_dir)
        .replace("{AGENTS_DIR}", agents_dir)
        .replace("{COMMANDS_DIR}", commands_dir)
        .replace("{AGENTS_COUNT}", &agents_count.to_string())
        .replace("{COMMANDS_COUNT}", &commands_count.to_string())
}

/// Detect legacy full CLAUDE.md block (357 lines) vs short reference
fn has_legacy_claude_md(content: &str) -> bool {
    content.contains("## Common Workflows")
        && content.contains("### Create Design System from Figma Frame")
}

/// Write or update the Bridge to Fig section in a CLAUDE.md file.
/// Returns action taken: "created", "appended", "updated", "migrated".
fn write_claude_md_section(claude_md_path: &Path, short_ref: &str) -> Result<&'static str, String> {
    if claude_md_path.exists() {
        let existing = std::fs::read_to_string(claude_md_path)
            .map_err(|e| format!("Read CLAUDE.md: {}", e))?;

        if existing.contains("# Bridge to Fig") {
            let is_legacy = has_legacy_claude_md(&existing);

            // Find the section separator and replace everything after it
            if let Some(idx) = existing.find("\n---\n\n# Bridge to Fig") {
                let trimmed = &existing[..idx];
                let combined = format!("{}\n\n---\n\n{}", trimmed.trim_end(), short_ref);
                std::fs::write(claude_md_path, combined)
                    .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
                return Ok(if is_legacy { "migrated" } else { "updated" });
            }

            // Bridge to Fig at start of file (no separator before it)
            if existing.starts_with("# Bridge to Fig") {
                std::fs::write(claude_md_path, short_ref)
                    .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
                return Ok(if is_legacy { "migrated" } else { "updated" });
            }

            // Has Bridge to Fig but can't find section boundary — append fresh
            let combined = format!("{}\n\n---\n\n{}", existing.trim_end(), short_ref);
            std::fs::write(claude_md_path, combined)
                .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
            return Ok(if is_legacy { "migrated" } else { "updated" });
        }

        // No Bridge to Fig content — append
        let combined = format!("{}\n\n---\n\n{}", existing.trim_end(), short_ref);
        std::fs::write(claude_md_path, combined)
            .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
        Ok("appended")
    } else {
        std::fs::write(claude_md_path, short_ref)
            .map_err(|e| format!("Write CLAUDE.md: {}", e))?;
        Ok("created")
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────

#[tauri::command]
fn check_claude_setup() -> Result<serde_json::Value, String> {
    let home = get_home_dir()?;
    let btf_dir = home.join(".bridge-to-fig");
    let claude_dir = home.join(".claude");

    // Read marker file (now JSON)
    let marker_path = btf_dir.join(".installed");
    let marker_data: Option<serde_json::Value> = if marker_path.exists() {
        std::fs::read_to_string(&marker_path)
            .ok()
            .and_then(|s| {
                // Try JSON first, fall back to legacy plain timestamp
                serde_json::from_str(&s).ok().or_else(|| {
                    Some(serde_json::json!({
                        "timestamp": s.trim(),
                        "scope": "global",
                        "version": ""
                    }))
                })
            })
    } else {
        None
    };

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

    // Only consider "installed" if marker exists AND files are actually present
    let installed = marker_data.is_some() && (agents_count > 0 || commands_count > 0);
    let claude_md_path = claude_dir.join("CLAUDE.md");
    let claude_md_exists = claude_md_path.exists();

    // Detect legacy full CLAUDE.md block
    let has_legacy = if claude_md_exists {
        std::fs::read_to_string(&claude_md_path)
            .map(|content| has_legacy_claude_md(&content))
            .unwrap_or(false)
    } else {
        false
    };

    // Extract version and scope from marker
    let version = marker_data
        .as_ref()
        .and_then(|m| m.get("version"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let scope = marker_data
        .as_ref()
        .and_then(|m| m.get("scope"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    Ok(serde_json::json!({
        "installed": installed,
        "claudeMdExists": claude_md_exists,
        "hasLegacyClaudeMd": has_legacy,
        "agentsCount": agents_count,
        "commandsCount": commands_count,
        "promptsDir": claude_dir.join("prompts").join("bridge-to-fig").to_string_lossy(),
        "claudeDir": claude_dir.to_string_lossy(),
        "version": version,
        "scope": scope,
    }))
}

#[tauri::command]
fn install_claude_files(
    app: tauri::AppHandle,
    scope: String,
    project_path: Option<String>,
) -> Result<serde_json::Value, String> {
    let home = get_home_dir()?;
    let is_project = scope == "project";
    let app_version = app.config().version.clone().unwrap_or_default();

    // ── Determine directories based on scope ──

    let (claude_dir, prompts_install_dir, prompts_rewrite_path, agents_display, commands_display) =
        if is_project {
            let project = project_path
                .as_ref()
                .ok_or_else(|| "Project path required for project scope".to_string())?;
            let project_root = PathBuf::from(project);
            let claude = project_root.join(".claude");
            let prompts = claude.join("prompts").join("bridge-to-fig");
            (
                claude,
                prompts,
                ".claude/prompts/bridge-to-fig".to_string(),
                ".claude/agents".to_string(),
                ".claude/commands".to_string(),
            )
        } else {
            let claude = home.join(".claude");
            let prompts = claude.join("prompts").join("bridge-to-fig");
            let prompts_abs = prompts.to_string_lossy().to_string();
            let agents_abs = claude.join("agents").to_string_lossy().to_string();
            let commands_abs = claude.join("commands").to_string_lossy().to_string();
            (claude, prompts, prompts_abs, agents_abs, commands_abs)
        };

    // ── Create directories ──

    std::fs::create_dir_all(&prompts_install_dir)
        .map_err(|e| format!("Create prompts dir: {}", e))?;
    std::fs::create_dir_all(claude_dir.join("agents"))
        .map_err(|e| format!("Create agents dir: {}", e))?;
    std::fs::create_dir_all(claude_dir.join("commands"))
        .map_err(|e| format!("Create commands dir: {}", e))?;

    // ── Install prompts ──

    extract_dir_to(&ROOT_PROMPTS, &prompts_install_dir)?;
    extract_dir_to(&CLAUDE_PROMPTS, &prompts_install_dir)?;
    let prompts_installed = count_embedded_files(&ROOT_PROMPTS) + count_embedded_files(&CLAUDE_PROMPTS);

    // ── Install agents with path rewriting ──

    let mut agents_installed = 0u32;
    for file in AGENTS.files() {
        if let Ok(content) = std::str::from_utf8(file.contents()) {
            let rewritten = rewrite_prompt_paths(content, &prompts_rewrite_path);
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
            let rewritten = rewrite_prompt_paths(content, &prompts_rewrite_path);
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

    // ── Handle CLAUDE.md with short reference ──

    let short_ref = render_claude_md_short(
        &prompts_rewrite_path,
        &agents_display,
        &commands_display,
        agents_installed,
        commands_installed,
    );

    // CLAUDE.md location: project root for project scope, ~/.claude/ for global
    let claude_md_path = if is_project {
        let project = project_path.as_ref().unwrap();
        PathBuf::from(project).join("CLAUDE.md")
    } else {
        claude_dir.join("CLAUDE.md")
    };

    let claude_md_action = write_claude_md_section(&claude_md_path, &short_ref)?;

    // ── Write marker file (JSON format) ──

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let marker = serde_json::json!({
        "timestamp": timestamp,
        "scope": scope,
        "version": app_version,
        "agentsCount": agents_installed,
        "commandsCount": commands_installed,
        "promptsCount": prompts_installed,
    });

    // Always write global marker so the app knows an install happened
    let global_btf_dir = home.join(".bridge-to-fig");
    std::fs::create_dir_all(&global_btf_dir)
        .map_err(|e| format!("Create .bridge-to-fig dir: {}", e))?;

    let mut global_marker = marker.clone();
    if is_project {
        global_marker
            .as_object_mut()
            .unwrap()
            .insert("projectPath".to_string(), serde_json::json!(project_path));
    }
    std::fs::write(
        global_btf_dir.join(".installed"),
        serde_json::to_string_pretty(&global_marker).unwrap(),
    )
    .map_err(|e| format!("Write global marker: {}", e))?;

    // For project scope, also write a project-local marker
    if is_project {
        let project = project_path.as_ref().unwrap();
        let project_btf_dir = PathBuf::from(project).join(".bridge-to-fig");
        std::fs::create_dir_all(&project_btf_dir)
            .map_err(|e| format!("Create project marker dir: {}", e))?;
        std::fs::write(
            project_btf_dir.join(".installed"),
            serde_json::to_string_pretty(&marker).unwrap(),
        )
        .map_err(|e| format!("Write project marker: {}", e))?;
    }

    println!(
        "[Setup] Installed {} agents, {} commands, {} prompts (scope: {}, CLAUDE.md: {})",
        agents_installed, commands_installed, prompts_installed, scope, claude_md_action
    );

    Ok(serde_json::json!({
        "success": true,
        "agentsInstalled": agents_installed,
        "commandsInstalled": commands_installed,
        "promptsInstalled": prompts_installed,
        "promptsDir": prompts_rewrite_path,
        "claudeMd": claude_md_action,
        "scope": scope,
    }))
}

#[tauri::command]
fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Choose project folder")
        .pick_folder()
        .map(|p| p.to_string_lossy().into_owned())
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
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            check_claude_setup,
            install_claude_files,
            pick_folder,
            respawn_bridge_server,
            get_figma_plugin_info,
            install_figma_plugin,
            reveal_figma_plugin,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();

            // === Refresh the bundled Figma plugin on every launch ===
            // Cheap (a handful of small files) and it means an app update also updates the
            // plugin, with no re-import in Figma. Never fatal: the app is still useful if this
            // fails, and the dashboard surfaces the state.
            match extract_figma_plugin() {
                Ok(dir) => println!("[Plugin] Figma plugin ready at {}", dir.display()),
                Err(e) => eprintln!("[Plugin] Could not extract the Figma plugin: {}", e),
            }

            // === Auto-start: enable by default on first run ===
            // Uses LaunchAgent on macOS (plist in ~/Library/LaunchAgents/)
            // which is reliable on Ventura+ without accessibility permissions.
            let autolaunch = app.autolaunch();
            let autostart_enabled = autolaunch.is_enabled().unwrap_or(false);
            if !autostart_enabled {
                match autolaunch.enable() {
                    Ok(_) => println!("[Tauri] Auto-start enabled (first run)"),
                    Err(e) => eprintln!("[Tauri] Failed to enable auto-start: {}", e),
                }
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
                            let _ = window.eval("showSetupWizard()");
                        }
                    }
                    "launch_at_login" => {
                        let autolaunch = app.autolaunch();
                        let currently_enabled = autolaunch.is_enabled().unwrap_or(false);
                        if currently_enabled {
                            match autolaunch.disable() {
                                Ok(_) => println!("[Tauri] Auto-start disabled by user"),
                                Err(e) => eprintln!("[Tauri] Failed to disable auto-start: {}", e),
                            }
                        } else {
                            match autolaunch.enable() {
                                Ok(_) => println!("[Tauri] Auto-start enabled by user"),
                                Err(e) => eprintln!("[Tauri] Failed to enable auto-start: {}", e),
                            }
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

            // === Auto-show window on first install ===
            // Window starts hidden (tray app), but if Claude files aren't
            // installed yet we need to show the setup wizard immediately.
            if let Ok(status) = check_claude_setup() {
                let installed = status.get("installed").and_then(|v| v.as_bool()).unwrap_or(false);
                if !installed {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        println!("[Tauri] First install detected — showing setup wizard");
                    }
                }
            }

            // === Spawn sidecar ===
            // Register the sidecar handle in Tauri's managed state so the
            // `respawn_bridge_server` command can reach it from JS.
            app.manage(SidecarHandle(sidecar_child_clone.clone()));

            // Initial spawn — errors are surfaced via the `bridge-server-error`
            // event that the dashboard listens for.
            let _ = spawn_bridge_server(&handle, sidecar_child_clone.clone());

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
