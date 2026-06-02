// Decoupled autoBindByRole: heavy CPU work (alias resolution + role analysis + matching)
// runs in Node here on the bridge, so the Figma plugin thread stays free.
//
// Flow:
//   1) plugin → extractColorData (cheap walk)
//   2) plugin → getVariables (cheap dump)
//   3) bridge → analyze + match (this file)
//   4) plugin → applyColorBindings, chunked (cheap I/O)
//
// The plugin never has to think; the bridge never has to touch Figma.

import { v4 as uuidv4 } from 'uuid';
import { queue } from './queue.js';

// ---------- Types ----------

type SemanticRole =
  | 'background'
  | 'surface'
  | 'card'
  | 'border'
  | 'text-on-light'
  | 'text-on-dark'
  | 'accent'
  | 'neutral';

interface PaintInfo {
  index: number;
  hex: string;
  r: number;
  g: number;
  b: number;
  opacity: number;
  hasBinding: boolean;
  boundVarId?: string;
}

interface NodeColorData {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  parentId: string | null;
  parentType: string | null;
  parentBgHex: string | null;
  fills: PaintInfo[];
  strokes: PaintInfo[];
}

interface VariableInfo {
  id: string;
  name: string;
  collectionName: string;
  resolvedHex: string | null;
}

interface BindingRequest {
  nodeId: string;
  field: 'fill' | 'stroke';
  index: number;
  variableId: string;
}

export interface AutoBindByRoleOptions {
  scope?: 'selection' | 'page' | 'file';
  forceRebind?: boolean;
  includeInstanceChildren?: boolean;
  bindFills?: boolean;
  bindStrokes?: boolean;
  minConfidence?: number;
  applyChunkSize?: number;
  dryRun?: boolean;
}

export interface AutoBindByRoleResult {
  scope: string;
  nodesScanned: number;
  nodesConsidered: number;
  bindingsComputed: number;
  bindingsApplied: number;
  bindingsFailed: number;
  fillsBound: number;
  strokesBound: number;
  roleDistribution: Array<{ role: string; count: number }>;
  variableSummary: Array<{ variable: string; count: number }>;
  unmatchedColors: Array<{ hex: string; count: number }>;
  applyErrors: Array<{ nodeId: string; field: string; index: number; error: string }>;
  durationMs: number;
}

// ---------- Color math ----------

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

// ---------- Role inference (ported from the old plugin code) ----------

function determineSemanticRole(
  hex: string,
  nodeType: string,
  width: number,
  height: number,
  isStroke: boolean,
  parentBgHex: string | null
): { role: SemanticRole; confidence: number; reason: string } {
  const rgb = hexToRgb(hex);
  if (!rgb) return { role: 'neutral', confidence: 0, reason: 'Could not parse hex' };
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const area = width * height;
  const isLargeArea = area > 10000;
  const isVeryLargeArea = area > 100000;
  const isTextNode = nodeType === 'TEXT';
  const parentLightness = parentBgHex
    ? rgbToHsl(...(Object.values(hexToRgb(parentBgHex) ?? { r: 1, g: 1, b: 1 }) as [number, number, number])).l
    : undefined;

  // Very dark colors
  if (hsl.l < 0.15) {
    if (isTextNode) return { role: 'text-on-light', confidence: 0.9, reason: 'Dark text on light bg' };
    if (isStroke) return { role: 'border', confidence: 0.7, reason: 'Dark stroke' };
    if (isVeryLargeArea) return { role: 'background', confidence: 0.95, reason: 'Very dark + huge area' };
    if (isLargeArea) return { role: 'surface', confidence: 0.85, reason: 'Dark + medium area' };
    return { role: 'surface', confidence: 0.7, reason: 'Dark fill' };
  }

  // Very light colors
  if (hsl.l > 0.9) {
    if (isTextNode) {
      if (parentLightness !== undefined && parentLightness < 0.3) {
        return { role: 'text-on-dark', confidence: 0.95, reason: 'Light text on dark parent' };
      }
      return { role: 'text-on-dark', confidence: 0.85, reason: 'Very light text' };
    }
    if (isStroke) return { role: 'border', confidence: 0.6, reason: 'Light stroke' };
    if (isLargeArea) return { role: 'card', confidence: 0.8, reason: 'Light + large area = card' };
    return { role: 'neutral', confidence: 0.6, reason: 'Light fill' };
  }

  // High saturation = accent
  if (hsl.s > 0.5) {
    if (isTextNode) return { role: 'accent', confidence: 0.7, reason: 'Saturated text = link/accent' };
    return { role: 'accent', confidence: 0.85, reason: 'High saturation = brand/accent' };
  }

  // Low saturation = neutral/gray
  if (hsl.s < 0.15) {
    if (isTextNode) {
      return hsl.l < 0.5
        ? { role: 'text-on-light', confidence: 0.75, reason: 'Gray text on light' }
        : { role: 'text-on-dark', confidence: 0.75, reason: 'Light gray text on dark' };
    }
    if (hsl.l > 0.7) return { role: 'card', confidence: 0.7, reason: 'Light gray = card' };
    if (hsl.l > 0.4) return { role: 'border', confidence: 0.6, reason: 'Mid gray = border' };
    return { role: 'surface', confidence: 0.65, reason: 'Dark gray = surface' };
  }

  // Default
  if (isTextNode) {
    return {
      role: hsl.l > 0.5 ? 'text-on-dark' : 'text-on-light',
      confidence: 0.5,
      reason: 'Mid-tone text',
    };
  }
  return { role: 'neutral', confidence: 0.4, reason: 'No clear role' };
}

// Pattern preference per role — first match wins.
// Patterns are checked as substrings on the lower-cased variable name.
const ROLE_PATTERNS: Record<SemanticRole, string[]> = {
  background: [
    'surface/page',
    'surface/background/primary',
    'colortheme/background-base-color',
    'colortheme/background-layer-1-color',
    'gray scale/950',
    'gray scale/900',
  ],
  surface: [
    'surface/elevated',
    'surface/background/secondary',
    'colortheme/background-layer-2-color',
    'colortheme/background-elevated-color',
    'gray scale/900',
    'gray scale/850',
    'gray scale/100',
  ],
  card: [
    'surface/card',
    'surface/elevated',
    'colortheme/background-elevated-color',
    'colortheme/background-layer-2-color',
    'system/white',
    'gray scale/50',
  ],
  border: [
    'border/default',
    'colortheme/border-color-default',
    'colortheme/gray-300',
    'colortheme/gray-400',
    'gray scale/300',
    'gray scale/400',
  ],
  'text-on-light': [
    'text/primary',
    'text/default',
    'colortheme/neutral-content-color-default',
    'colortheme/gray-900',
    'gray scale/900',
    'system/black',
  ],
  'text-on-dark': [
    'text/inverse',
    'text/on-dark',
    'colortheme/static-white-text-color',
    'colortheme/gray-50',
    'gray scale/50',
    'system/white',
  ],
  accent: [
    'colortheme/accent-background-color-default',
    'colortheme/accent-content-color-default',
    'brand/primary',
    'brand-scale/500',
    'brand scale/500',
  ],
  neutral: ['gray scale/500', 'colortheme/gray-500'],
};

// ---------- Matching ----------

interface MatchContext {
  // hex → list of vars with that exact hex
  byHex: Map<string, VariableInfo[]>;
  // all variables (for pattern-name lookup)
  all: VariableInfo[];
}

function buildMatchContext(vars: VariableInfo[]): MatchContext {
  const byHex = new Map<string, VariableInfo[]>();
  for (const v of vars) {
    if (!v.resolvedHex) continue;
    const k = v.resolvedHex.toLowerCase();
    if (!byHex.has(k)) byHex.set(k, []);
    byHex.get(k)!.push(v);
  }
  return { byHex, all: vars };
}

// Interaction-state markers in variable names. Variables containing these should NOT be
// the default pick for an element that isn't actually in that state — otherwise plain surfaces
// end up bound to "selected", "disabled", or "hover" tokens.
const STATE_MARKERS = [
  'selected',
  'hover',
  'down',
  'pressed',
  'focused',
  'focus',
  'disabled',
  'subdued',
  'static-black',
  'static-white',
];

// Collection preference: semantic theme tokens first, then aliases, then raw palette.
function collectionRank(name: string): number {
  if (name === '.Color theme') return 0;
  if (name === 'S2.Color-theme') return 2; // raw palette layer — last resort
  if (name.includes('Color theme') || name.includes('color-theme')) return 0;
  if (name.includes('Alias')) return 1;
  if (name.includes('Palette')) return 2;
  return 3;
}

function isStateVariant(name: string): boolean {
  const lower = name.toLowerCase();
  return STATE_MARKERS.some((m) => lower.includes('/' + m + '/') || lower.includes('-' + m + '-') || lower.endsWith('-' + m) || lower.endsWith('/' + m));
}

function isDefaultVariant(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('/default') || lower.endsWith('-default') || lower.endsWith('default');
}

// Rank an exact-hex candidate (lower is better) so we pick the most semantically-default option.
// Filters out interaction-state variants unless `allowStates` is true.
function rankCandidate(v: VariableInfo, role: SemanticRole, allowStates: boolean): number {
  const name = v.name;
  const lower = name.toLowerCase();
  const stateBad = !allowStates && isStateVariant(name) ? 10000 : 0;
  const collection = collectionRank(v.collectionName) * 100;
  const defaultBonus = isDefaultVariant(name) ? -10 : 0;
  // Role bias: if the candidate name mentions a hint that's appropriate for this role, prefer it
  let roleBias = 0;
  const patterns = ROLE_PATTERNS[role] ?? [];
  for (const pattern of patterns) {
    if (lower.includes(pattern.toLowerCase())) {
      roleBias = -20;
      break;
    }
  }
  // Shorter, simpler names win ties (less specific = more generic = better default)
  const lengthPenalty = name.length / 100;
  return stateBad + collection + defaultBonus + roleBias + lengthPenalty;
}

function matchVariableForRole(
  hex: string,
  role: SemanticRole,
  ctx: MatchContext
): VariableInfo | null {
  const exactCandidates = ctx.byHex.get(hex.toLowerCase()) ?? [];

  // 1) Exact hex match — rank candidates so we prefer semantic defaults over interaction states.
  if (exactCandidates.length > 0) {
    // First pass: exclude state variants
    const nonState = exactCandidates.filter((c) => !isStateVariant(c.name));
    const pool = nonState.length > 0 ? nonState : exactCandidates;
    const sorted = [...pool].sort((a, b) => rankCandidate(a, role, nonState.length === 0) - rankCandidate(b, role, nonState.length === 0));
    return sorted[0];
  }

  // 2) No exact hex match — fall back to role-pattern name match against all vars,
  //    same ranking (avoid state variants, prefer theme collection).
  const patterns = ROLE_PATTERNS[role] ?? [];
  const patternMatches: VariableInfo[] = [];
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase();
    for (const v of ctx.all) {
      if (v.name.toLowerCase().includes(lower) && !isStateVariant(v.name)) {
        patternMatches.push(v);
      }
    }
    if (patternMatches.length > 0) break;
  }
  if (patternMatches.length > 0) {
    const sorted = [...patternMatches].sort((a, b) => rankCandidate(a, role, false) - rankCandidate(b, role, false));
    return sorted[0];
  }

  return null;
}

// ---------- Plugin RPC helpers ----------

async function send<T>(type: string, payload: object, timeoutMs: number): Promise<T> {
  const id = uuidv4();
  queue.addCommand({ id, type: type as any, payload: payload as any, timestamp: Date.now() });
  const result = await queue.waitForResult(id, timeoutMs);
  if (!result) throw new Error(`Timeout waiting for ${type}`);
  if (!result.success) throw new Error(`${type} failed: ${result.error}`);
  return result.data as T;
}

// ---------- Main orchestrator ----------

export async function autoBindByRoleV2(opts: AutoBindByRoleOptions): Promise<AutoBindByRoleResult> {
  const start = Date.now();
  const {
    scope = 'page',
    forceRebind = false,
    includeInstanceChildren = false,
    bindFills = true,
    bindStrokes = true,
    minConfidence = 0.4,
    applyChunkSize = 1000,
    dryRun = false,
  } = opts;

  // 1) extract color data
  console.log(`[autoBindByRoleV2] extracting color data (scope=${scope})`);
  const extractData = await send<{
    nodes: NodeColorData[];
    totalScanned: number;
    totalEmitted: number;
    skippedInstanceChildren: number;
    skippedAllBound: number;
  }>(
    'extractColorData',
    {
      scope,
      includeFills: bindFills,
      includeStrokes: bindStrokes,
      skipBoundNodes: !forceRebind,
      includeInstanceChildren,
    },
    600_000
  );
  console.log(
    `[autoBindByRoleV2] extracted ${extractData.totalEmitted}/${extractData.totalScanned} nodes ` +
      `(skippedAllBound=${extractData.skippedAllBound}, skippedInstanceChildren=${extractData.skippedInstanceChildren})`
  );

  // 2) load variables (we resolve aliases here, off-thread)
  console.log('[autoBindByRoleV2] loading variables');
  const vars = await send<{
    collections: Array<{
      name: string;
      modes: Array<{ modeId: string; name: string } | string>;
      variables: Array<{
        id: string;
        name: string;
        type: string;
        valuesByMode: Record<string, any>;
      }>;
    }>;
  }>('getVariables', { includeValues: true }, 60_000);

  // Index every variable; resolve color variables to a single hex (first mode, follow alias chain).
  const allVarsById = new Map<string, (typeof vars.collections)[number]['variables'][number] & { collectionName: string }>();
  for (const c of vars.collections) {
    for (const v of c.variables) {
      allVarsById.set(v.id, { ...v, collectionName: c.name });
    }
  }
  const variableInfos: VariableInfo[] = [];
  for (const [id, v] of allVarsById) {
    if (v.type !== 'COLOR') continue;
    let depth = 0;
    let value: any = v.valuesByMode[Object.keys(v.valuesByMode)[0]];
    while (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS' && depth < 15) {
      const aliased = allVarsById.get(value.id);
      if (!aliased) break;
      const modeKey = Object.keys(aliased.valuesByMode)[0];
      value = aliased.valuesByMode[modeKey];
      depth++;
    }
    let hex: string | null = null;
    if (typeof value === 'string' && value.startsWith('#')) {
      hex = value.toLowerCase();
    } else if (value && typeof value === 'object' && 'r' in value) {
      const toHex = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n * 255))).toString(16).padStart(2, '0');
      hex = ('#' + toHex(value.r) + toHex(value.g) + toHex(value.b)).toLowerCase();
    }
    variableInfos.push({ id, name: v.name, collectionName: v.collectionName, resolvedHex: hex });
  }
  console.log(`[autoBindByRoleV2] resolved ${variableInfos.length} COLOR variables`);

  const matchCtx = buildMatchContext(variableInfos);

  // 3) compute bindings (CPU-only)
  const bindings: BindingRequest[] = [];
  const roleDist: Record<string, number> = {};
  const varCounts: Record<string, number> = {};
  const unmatched: Record<string, number> = {};
  let fillsBound = 0;
  let strokesBound = 0;

  for (const node of extractData.nodes) {
    const handlePaint = (p: PaintInfo, isStroke: boolean) => {
      if (p.opacity < 0.1) return;
      if (!forceRebind && p.hasBinding && p.boundVarId && allVarsById.has(p.boundVarId)) {
        // already bound to a still-existing variable — skip
        return;
      }
      const inference = determineSemanticRole(
        p.hex,
        node.type,
        node.width,
        node.height,
        isStroke,
        node.parentBgHex
      );
      if (inference.confidence < minConfidence) return;
      const v = matchVariableForRole(p.hex, inference.role, matchCtx);
      if (!v) {
        unmatched[p.hex] = (unmatched[p.hex] ?? 0) + 1;
        return;
      }
      bindings.push({
        nodeId: node.id,
        field: isStroke ? 'stroke' : 'fill',
        index: p.index,
        variableId: v.id,
      });
      roleDist[inference.role] = (roleDist[inference.role] ?? 0) + 1;
      varCounts[v.name] = (varCounts[v.name] ?? 0) + 1;
      if (isStroke) strokesBound++;
      else fillsBound++;
    };
    if (bindFills) for (const p of node.fills) handlePaint(p, false);
    if (bindStrokes) for (const p of node.strokes) handlePaint(p, true);
  }
  console.log(
    `[autoBindByRoleV2] computed ${bindings.length} bindings ` +
      `(fills=${fillsBound}, strokes=${strokesBound}, unmatched-hexes=${Object.keys(unmatched).length})`
  );

  // 4) apply, in chunks
  let applied = 0;
  let failed = 0;
  const applyErrors: Array<{ nodeId: string; field: string; index: number; error: string }> = [];
  if (!dryRun) {
    for (let i = 0; i < bindings.length; i += applyChunkSize) {
      const chunk = bindings.slice(i, i + applyChunkSize);
      console.log(
        `[autoBindByRoleV2] applying chunk ${i / applyChunkSize + 1} (${chunk.length} bindings, ${i}+${chunk.length}/${bindings.length})`
      );
      const res = await send<{
        applied: number;
        failed: number;
        errors: Array<{ nodeId: string; field: string; index: number; error: string }>;
      }>('applyColorBindings', { bindings: chunk, yieldEvery: 50 }, 600_000);
      applied += res.applied;
      failed += res.failed;
      for (const e of res.errors ?? []) {
        if (applyErrors.length < 100) applyErrors.push(e);
      }
    }
  }

  return {
    scope,
    nodesScanned: extractData.totalScanned,
    nodesConsidered: extractData.totalEmitted,
    bindingsComputed: bindings.length,
    bindingsApplied: applied,
    bindingsFailed: failed,
    fillsBound,
    strokesBound,
    roleDistribution: Object.entries(roleDist)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count),
    variableSummary: Object.entries(varCounts)
      .map(([variable, count]) => ({ variable, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30),
    unmatchedColors: Object.entries(unmatched)
      .map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30),
    applyErrors,
    durationMs: Date.now() - start,
  };
}
