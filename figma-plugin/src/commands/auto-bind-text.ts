// autoBindText — exact-match binding of text-node properties to Typography variables.
//
// Walks TEXT nodes in scope. For each, binds fontSize, lineHeight, letterSpacing,
// fontWeight, fontFamily to the matching Spectrum 2 typography variable when the
// value is an exact match. No fuzzy matching.
//
// Modeled after autoBindSpacing but for text properties. Same yield pattern so it
// stays cooperative on large selections.

import type { FigmaCommand, CommandResult } from '@bridge-to-fig/shared';
import { successResult, errorResult } from './types';

// Spectrum 2 puts its semantic typography tokens in the "Typography" collection
// and the raw scale in "Layout" / ".Platform scale". Prefer Typography first.
const COLLECTION_PRIORITY: Record<string, number> = {
  'Typography': 0,
  'Layout': 1,
  '.Platform scale': 2,
};

interface TextBinding {
  nodeId: string;
  nodeName: string;
  field: string;
  value: number | string;
  variableName: string;
}

function pickByPriority<T extends { collection: string; name: string }>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  // Prefer (1) most-preferred collection, (2) shorter (more generic) name
  const sorted = [...candidates].sort((a, b) => {
    const ca = COLLECTION_PRIORITY[a.collection] ?? 99;
    const cb = COLLECTION_PRIORITY[b.collection] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.name.length - b.name.length;
  });
  return sorted[0];
}

export async function handleAutoBindText(command: FigmaCommand): Promise<CommandResult> {
  const payload = (command.payload || {}) as {
    scope?: 'selection' | 'page' | 'file';
    bindFontSize?: boolean;
    bindLineHeight?: boolean;
    bindLetterSpacing?: boolean;
    bindFontWeight?: boolean;
    bindFontFamily?: boolean;
    includeInstanceChildren?: boolean;
    maxNodes?: number;
  };

  const scope = payload.scope ?? 'selection';
  const bindFontSize = payload.bindFontSize !== false;
  const bindLineHeight = payload.bindLineHeight !== false;
  const bindLetterSpacing = payload.bindLetterSpacing !== false;
  const bindFontWeight = payload.bindFontWeight !== false;
  const bindFontFamily = payload.bindFontFamily !== false;
  const includeInstanceChildren = payload.includeInstanceChildren === true;
  const maxNodes = payload.maxNodes ?? 50000;

  try {
    figma.skipInvisibleInstanceChildren = true;

    // --- Load and classify all variables ---
    const allFloat = await figma.variables.getLocalVariablesAsync('FLOAT');
    const allString = await figma.variables.getLocalVariablesAsync('STRING');

    // Map collection IDs to names (for priority)
    const collNameById = new Map<string, string>();
    for (const v of [...allFloat, ...allString]) {
      if (!collNameById.has(v.variableCollectionId)) {
        const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (c) collNameById.set(v.variableCollectionId, c.name);
      }
    }

    // Resolve a variable to its terminal value (walking aliases)
    async function resolveValue(v: Variable, depth = 0): Promise<unknown> {
      if (depth > 10) return null;
      const collection = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      if (!collection) return null;
      const modeId = collection.modes[0]?.modeId;
      if (!modeId) return null;
      const val = v.valuesByMode[modeId];
      if (val && typeof val === 'object' && (val as any).type === 'VARIABLE_ALIAS') {
        const aliased = await figma.variables.getVariableByIdAsync((val as any).id);
        if (!aliased) return null;
        return resolveValue(aliased, depth + 1);
      }
      return val;
    }

    // Buckets — keyed by category of typography variable
    interface NumCandidate { value: number; variable: Variable; collection: string; name: string }
    interface StrCandidate { value: string; variable: Variable; collection: string; name: string }

    const sizeCandidates: NumCandidate[] = [];
    const lineHeightCandidates: NumCandidate[] = [];
    const letterSpacingCandidates: NumCandidate[] = [];
    const fontWeightCandidates: NumCandidate[] = [];
    const fontFamilyCandidates: StrCandidate[] = [];

    for (const v of allFloat) {
      const value = await resolveValue(v);
      if (typeof value !== 'number') continue;
      const nl = v.name.toLowerCase();
      const collection = collNameById.get(v.variableCollectionId) ?? '';
      const entry: NumCandidate = { value, variable: v, collection, name: v.name };
      // Classify by name. A single variable may match multiple buckets (e.g., "font-size") — that's fine.
      // Size buckets: anything with /size/ or font-size, but NOT line-height or letter-spacing or icon-size
      if ((nl.includes('/size/') || nl.includes('font-size')) && !nl.includes('icon')) {
        sizeCandidates.push(entry);
      }
      if (nl.includes('line height') || nl.includes('line-height') || nl.includes('lineheight') || nl.includes('/line-height')) {
        lineHeightCandidates.push(entry);
      }
      if (nl.includes('letter spacing') || nl.includes('letter-spacing') || nl.includes('letterspacing')) {
        letterSpacingCandidates.push(entry);
      }
      if (nl.includes('font weight') || nl.includes('font-weight') || nl.includes('fontweight')) {
        fontWeightCandidates.push(entry);
      }
    }

    for (const v of allString) {
      const value = await resolveValue(v);
      if (typeof value !== 'string') continue;
      const nl = v.name.toLowerCase();
      const collection = collNameById.get(v.variableCollectionId) ?? '';
      if (nl.includes('font family') || nl.includes('font-family') || nl.includes('fontfamily')) {
        fontFamilyCandidates.push({ value, variable: v, collection, name: v.name });
      }
    }

    // Index by value for fast exact lookup
    const indexNum = (cands: NumCandidate[]) => {
      const m = new Map<number, NumCandidate[]>();
      for (const c of cands) {
        if (!m.has(c.value)) m.set(c.value, []);
        m.get(c.value)!.push(c);
      }
      return m;
    };
    const indexStr = (cands: StrCandidate[]) => {
      const m = new Map<string, StrCandidate[]>();
      for (const c of cands) {
        if (!m.has(c.value)) m.set(c.value, []);
        m.get(c.value)!.push(c);
      }
      return m;
    };
    const sizeIx = indexNum(sizeCandidates);
    const lhIx = indexNum(lineHeightCandidates);
    const lsIx = indexNum(letterSpacingCandidates);
    const fwIx = indexNum(fontWeightCandidates);
    const ffIx = indexStr(fontFamilyCandidates);

    // --- Collect text nodes ---
    let roots: SceneNode[] = [];
    if (scope === 'selection') {
      roots = [...figma.currentPage.selection];
      if (roots.length === 0) return errorResult(command.id, 'No nodes selected');
    } else if (scope === 'page') {
      roots = figma.currentPage.children.filter((n) => n.type !== 'SLICE') as SceneNode[];
    } else {
      await figma.loadAllPagesAsync();
      for (const page of figma.root.children) {
        roots.push(...(page.children.filter((n) => n.type !== 'SLICE') as SceneNode[]));
      }
    }

    const textNodes: TextNode[] = [];
    const MAX_DEPTH = 50;
    const collect = (nodes: readonly SceneNode[], depth: number, insideInstance: boolean) => {
      if (depth > MAX_DEPTH || textNodes.length >= maxNodes) return;
      for (const n of nodes) {
        if (textNodes.length >= maxNodes) return;
        if (!includeInstanceChildren && insideInstance && n.type !== 'INSTANCE') continue;
        if (n.type === 'TEXT') textNodes.push(n as TextNode);
        if ('children' in n) {
          collect((n as FrameNode).children as SceneNode[], depth + 1, insideInstance || n.type === 'INSTANCE');
        }
      }
    };
    collect(roots, 0, false);

    // --- Bind each text node ---
    const bindings: TextBinding[] = [];
    let yieldCounter = 0;
    let skippedMixed = 0;
    let skippedNoMatch: Record<string, number> = {};

    const recordNoMatch = (field: string, value: number | string) => {
      const k = `${field}:${value}`;
      skippedNoMatch[k] = (skippedNoMatch[k] ?? 0) + 1;
    };

    for (const node of textNodes) {
      if ((++yieldCounter % 50) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      // fontSize
      if (bindFontSize && node.fontSize !== figma.mixed) {
        const value = node.fontSize as number;
        const cands = sizeIx.get(value) ?? [];
        const pick = pickByPriority(cands);
        if (pick) {
          try {
            node.setBoundVariable('fontSize', pick.variable);
            bindings.push({ nodeId: node.id, nodeName: node.name, field: 'fontSize', value, variableName: pick.name });
          } catch (e) { /* ignore */ }
        } else {
          recordNoMatch('fontSize', value);
        }
      } else if (bindFontSize && node.fontSize === figma.mixed) {
        skippedMixed++;
      }

      // lineHeight (only when numeric pixel value)
      if (bindLineHeight && node.lineHeight !== figma.mixed && typeof node.lineHeight === 'object') {
        const lh = node.lineHeight as LineHeight;
        if (lh.unit === 'PIXELS') {
          const value = lh.value;
          const cands = lhIx.get(value) ?? sizeIx.get(value) ?? [];
          const pick = pickByPriority(cands);
          if (pick) {
            try {
              node.setBoundVariable('lineHeight', pick.variable);
              bindings.push({ nodeId: node.id, nodeName: node.name, field: 'lineHeight', value, variableName: pick.name });
            } catch (e) { /* ignore */ }
          } else {
            recordNoMatch('lineHeight', value);
          }
        }
      }

      // letterSpacing
      if (bindLetterSpacing && node.letterSpacing !== figma.mixed && typeof node.letterSpacing === 'object') {
        const ls = node.letterSpacing as LetterSpacing;
        if (ls.unit === 'PIXELS') {
          const value = ls.value;
          const cands = lsIx.get(value) ?? [];
          const pick = pickByPriority(cands);
          if (pick) {
            try {
              node.setBoundVariable('letterSpacing', pick.variable);
              bindings.push({ nodeId: node.id, nodeName: node.name, field: 'letterSpacing', value, variableName: pick.name });
            } catch (e) { /* ignore */ }
          } else if (value !== 0) {
            // Skip 0 letterSpacing — too common to be meaningful
            recordNoMatch('letterSpacing', value);
          }
        }
      }

      // fontWeight (only when font is set to a single weight)
      if (bindFontWeight && node.fontWeight !== figma.mixed) {
        const value = node.fontWeight as number;
        const cands = fwIx.get(value) ?? [];
        const pick = pickByPriority(cands);
        if (pick) {
          try {
            node.setBoundVariable('fontWeight', pick.variable);
            bindings.push({ nodeId: node.id, nodeName: node.name, field: 'fontWeight', value, variableName: pick.name });
          } catch (e) { /* ignore */ }
        }
      }

      // fontFamily (string)
      if (bindFontFamily && node.fontName !== figma.mixed) {
        const fn = node.fontName as FontName;
        const value = fn.family;
        const cands = ffIx.get(value) ?? [];
        const pick = pickByPriority(cands);
        if (pick) {
          try {
            node.setBoundVariable('fontFamily', pick.variable);
            bindings.push({ nodeId: node.id, nodeName: node.name, field: 'fontFamily', value, variableName: pick.name });
          } catch (e) { /* ignore */ }
        }
      }
    }

    // Summary by variable name
    const summaryMap = new Map<string, number>();
    for (const b of bindings) {
      summaryMap.set(b.variableName, (summaryMap.get(b.variableName) ?? 0) + 1);
    }
    const summary = Array.from(summaryMap.entries())
      .map(([variable, count]) => ({ variable, count }))
      .sort((a, b) => b.count - a.count);

    // Field counts
    const byField: Record<string, number> = {};
    for (const b of bindings) byField[b.field] = (byField[b.field] ?? 0) + 1;

    return successResult(command.id, {
      data: {
        message: `Bound ${bindings.length} text properties`,
        scope,
        textNodesScanned: textNodes.length,
        totalBound: bindings.length,
        byField,
        skippedMixed,
        skippedNoMatch,
        variablesAvailable: {
          fontSize: sizeCandidates.length,
          lineHeight: lineHeightCandidates.length,
          letterSpacing: letterSpacingCandidates.length,
          fontWeight: fontWeightCandidates.length,
          fontFamily: fontFamilyCandidates.length,
        },
        summary: summary.slice(0, 30),
        bindings: bindings.slice(0, 30), // sample
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, msg);
  }
}
