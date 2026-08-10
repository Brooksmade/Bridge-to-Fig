import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

// Build the main plugin code
async function buildCode() {
  const ctx = await esbuild.context({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    format: 'iife',
    target: 'es6',
    logLevel: 'info',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching code.ts...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

// Build the UI
async function buildUI() {
  const ctx = await esbuild.context({
    entryPoints: ['src/ui.ts'],
    bundle: true,
    outfile: 'dist/ui.js',
    format: 'iife',
    target: 'es6',
    logLevel: 'info',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching ui.ts...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  // Copy and process HTML file
  const htmlSrc = fs.readFileSync('src/ui.html', 'utf-8');
  const uiJs = fs.readFileSync('dist/ui.js', 'utf-8');

  // Inline the JS into HTML
  const htmlDist = htmlSrc.replace(
    '<script src="ui.js"></script>',
    `<script>${uiJs}</script>`
  );

  fs.writeFileSync('dist/ui.html', htmlDist);
}

// Plugin manifest. Config lives here (not in a sibling manifest.json) so there
// is exactly ONE manifest file in the repo — dist/manifest.json — and no chance
// of accidentally importing an unbuilt source manifest into Figma.
const MANIFEST = {
  name: 'Bridge to Fig',
  // Issued by Figma when the plugin was registered. It is the identity Figma matches on, so
  // changing it makes this a different plugin — installs and published versions do not follow.
  id: '1668702796032787499',
  api: '1.0.0',
  main: 'code.js',
  ui: 'ui.html',
  documentAccess: 'dynamic-page',
  // 'dev' enables Dev Mode (required for figma.currentPage.focusedNode); 'slides' and 'buzz'
  // make the Slides and Buzz command handlers reachable in those editors.
  editorType: ['figma', 'figjam', 'dev', 'slides', 'buzz'],
  permissions: ['teamlibrary'],
  // NOTE: `enablePrivatePluginApi` is deliberately absent. It is only valid for plugins published
  // privately inside a Figma organization, and the Community rejects public plugins that set it.
  // See docs/community-build.md for the three commands that were downgraded as a result.
  networkAccess: {
    allowedDomains: ['http://localhost:4001'],
    reasoning:
      'Bridge to Fig talks to a companion app running locally on your own machine at localhost:4001. Nothing is sent to a remote server, and no data leaves your computer.',
  },
};

function writeManifest() {
  // The published name must NOT carry a version — Community shows the manifest name verbatim and a
  // hardcoded version goes stale on the next release. Local dev builds append it for convenience.
  const versionSrc = fs.readFileSync('src/version.ts', 'utf-8');
  const match = versionSrc.match(/APP_VERSION\s*=\s*'([^']+)'/);
  const version = match ? match[1] : null;

  const manifest = { ...MANIFEST };
  if (version && process.env.BRIDGE_RELEASE !== '1') {
    manifest.name = `Bridge to Fig v${version} (dev)`;
  }
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));
  fs.copyFileSync('src/icon.svg', 'dist/icon.svg');
}

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Run builds
try {
  await buildCode();
  await buildUI();
  writeManifest();
  console.log('Build complete!');

  if (isWatch) {
    console.log('Watching for changes...');
  }
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
