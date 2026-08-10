use std::path::Path;

fn main() {
    // `include_dir!` is a compile-time macro and hard-errors if the directory is missing.
    // figma-plugin/dist is a build artifact and is gitignored, so it does not exist on a fresh
    // clone. Create it if absent so a `cargo build` before `pnpm build:plugin` still compiles —
    // the app detects the empty case at runtime and tells the user to build the plugin.
    //
    // Release builds MUST run `pnpm build:plugin:release` first, or the app will ship without the
    // plugin files. See .github/workflows/release.yml.
    let dist = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../figma-plugin/dist");
    if !dist.exists() {
        let _ = std::fs::create_dir_all(&dist);
    }
    println!("cargo:rerun-if-changed=../../figma-plugin/dist");

    tauri_build::build()
}
