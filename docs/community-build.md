# The Community build

Bridge to Fig ships in two shapes from the same source tree:

- **Development build** — imported into Figma via *Plugins → Development → Import plugin from
  manifest*. Anyone can run one, and Figma grants it the private plugin API.
- **Community build** — the published listing. Figma applies extra restrictions to it, and a few
  commands behave differently as a result.

This document explains the differences and the reasons behind them, so that a change to the
manifest or to one of the affected commands does not silently break the published plugin.

## `enablePrivatePluginApi` is deliberately absent

The manifest in [`figma-plugin/build.js`](../figma-plugin/build.js) does not set
`enablePrivatePluginApi`. That flag is valid only for plugins published privately inside a Figma
organization; the Community rejects public plugins that set it. The APIs it unlocks are restricted
for security reasons — file-key exposure in particular.

Do not add the flag back to get a private API working. Three commands depend on private APIs and
are downgraded rather than removed:

| Command | Private API | Behavior in the Community build |
|---------|-------------|---------------------------------|
| `saveVersion` | `figma.saveVersionHistoryAsync()` | Returns an error explaining that version-history writes are restricted, and suggests saving a version manually or running as a development plugin. |
| `getFileThumbnail` | `figma.getFileThumbnailNodeAsync()` | Returns an error pointing at the manual *right-click a frame → Set as thumbnail* path. |
| `setFileThumbnail` | `figma.setFileThumbnailNodeAsync()` | Same error as above. |

Each of these feature-detects the API with `typeof … === 'function'` before calling it. The check is
what turns an unhelpful runtime `TypeError` into a message an agent can act on, so keep it in place
if you touch those handlers. See
[`figma-plugin/src/commands/utilities.ts`](../figma-plugin/src/commands/utilities.ts).

`getFileInfo` is affected too, but does not fail. `figma.fileKey` is undefined in the Community
build, so the command returns `fileKey: null` alongside `fileKeyAvailable: false`. The extra flag
lets a caller distinguish "this build cannot see the file key" from "the key really is null", and
ask the user to paste the file link instead of assuming it is in the wrong file.

## Network access is scoped to `localhost:4001`

Figma generates a network-access label on the listing directly from `allowedDomains`. Widening it
to `"*"` would work, but it puts a *this plugin can access any URL* warning on a listing that
already asks people to install a companion app. The manifest therefore allows only
`http://localhost:4001`.

That restriction blocks the plugin from fetching remote images directly, which
`createImageFromUrl` and `replaceImage` used to do. Both now call the bridge server's
`GET /proxy?url=…` endpoint instead: the plugin asks the local server, and the server makes the
outbound request.

Because the URL comes from a caller-supplied command payload, the proxy must not become an SSRF
hop. [`bridge-server/src/routes/proxy.ts`](../bridge-server/src/routes/proxy.ts) rejects anything
that is not plain `http`/`https`, refuses loopback and private-network hosts, caps responses at
25 MB, and times out after 30 seconds. Preserve those guards.

Any new plugin code that needs to reach a remote host must go through the proxy for the same
reason.

## The published name carries no version

`writeManifest()` appends the version to the plugin name only for local builds, which come out as
`Bridge to Fig v1.0.0 (dev)`. Community listings show the manifest name verbatim, and a hardcoded
version in the title goes stale on the next release, so release builds publish the clean name
`Bridge to Fig`.

Build the release artifact with:

```bash
pnpm build:plugin:release
```

That sets `BRIDGE_RELEASE=1`, which is the only thing suppressing the version suffix. A plain
`pnpm build:plugin` produces a dev-named plugin and must not be submitted.

The `build-plugin` job in [`.github/workflows/release.yml`](../.github/workflows/release.yml) runs
the same command on every tag, checks the resulting manifest (release name, numeric id, no
`enablePrivatePluginApi`), and publishes `Bridge-to-Fig-Figma-Plugin.zip` on the release next to
the desktop installers. The archive holds only `manifest.json`, `code.js`, `ui.html`, and
`icon.svg` — `ui.js` is inlined into `ui.html` at build time and is not shipped.

## The desktop app ships the plugin

Until the Community listing is live, users get the plugin from the installer rather than from a
clone. `desktop/src-tauri/src/lib.rs` embeds `figma-plugin/dist` with `include_dir!` and extracts
it to `~/.bridge-to-fig/figma-plugin` on every launch. Refreshing on each launch is what makes an
app update also update the plugin: Figma re-reads the imported path each time the plugin runs, so
the user never re-imports.

Two consequences to keep in mind when touching the build:

- **`include_dir!` is compile-time and hard-errors on a missing directory.** `figma-plugin/dist` is
  gitignored, so `desktop/src-tauri/build.rs` creates it if absent. That keeps a plugin-less
  `cargo build` compiling; the app detects the empty case at runtime and the dashboard reports
  "Not bundled".
- **A release build must run `pnpm build:plugin:release` before Tauri compiles**, or the installer
  ships with an empty plugin folder. The `build-tauri` job does this in its "Build the Figma plugin
  for embedding" step. Do not reorder it after the Tauri build.

The dashboard's **Figma plugin** card shows the extracted path and reveals the folder in Finder or
Explorer, because Figma has no API for installing a plugin and the manual import needs that path.
Backed by the `get_figma_plugin_info`, `install_figma_plugin`, and `reveal_figma_plugin` commands;
`reveal_figma_plugin` needs the `shell:allow-open` permission already present in
`capabilities/default.json`.

## Download links in the plugin UI

The download button in [`figma-plugin/src/ui.ts`](../figma-plugin/src/ui.ts) points at
`releases/latest/download/<filename>`. Those filenames must match the rename map in the
`rename-assets` job of [`.github/workflows/release.yml`](../.github/workflows/release.yml). A
mismatch is a silent 404 on the first button a new user presses.

Platforms without an artifact link to the releases page rather than to a URL that would 404 or
hand over a binary that will not launch. Today that means Intel Macs — the macOS build is a single
aarch64 `.dmg` — and Linux, which has no artifact yet.
