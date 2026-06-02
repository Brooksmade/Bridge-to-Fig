import type { FigmaCommand, CommandResult } from '@bridge-to-fig/shared';
import { successResult, errorResult } from './types';

// Lightweight color paint info — only what the bridge needs to compute bindings.
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
  // Walked up the parent chain to find the first opaque solid fill —
  // pre-computed in the plugin because it requires tree traversal.
  parentBgHex: string | null;
  fills: PaintInfo[];
  strokes: PaintInfo[];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const c = Math.max(0, Math.min(255, Math.round(v * 255)));
    return c.toString(16).padStart(2, '0');
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function extractPaint(paint: Paint, index: number): PaintInfo | null {
  if (paint.type !== 'SOLID') return null;
  if (paint.visible === false) return null;
  const solid = paint as SolidPaint;
  const bound = (solid as any).boundVariables?.color;
  return {
    index,
    hex: rgbToHex(solid.color.r, solid.color.g, solid.color.b),
    r: solid.color.r,
    g: solid.color.g,
    b: solid.color.b,
    opacity: solid.opacity ?? 1,
    hasBinding: !!bound,
    boundVarId: bound?.id,
  };
}

function getParentBgHex(node: SceneNode, maxDepth = 20): string | null {
  let current: BaseNode | null = node.parent;
  let depth = 0;
  while (current && depth < maxDepth) {
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') return '#ffffff';
    if ('fills' in current) {
      const fills = (current as MinimalFillsMixin).fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        for (let i = fills.length - 1; i >= 0; i--) {
          const fill = fills[i];
          if (fill.type === 'SOLID' && fill.visible !== false && (fill.opacity ?? 1) > 0.5) {
            return rgbToHex(fill.color.r, fill.color.g, fill.color.b);
          }
        }
      }
    }
    current = current.parent;
    depth++;
  }
  return null;
}

export async function handleExtractColorData(command: FigmaCommand): Promise<CommandResult> {
  const payload = (command.payload || {}) as {
    scope?: 'selection' | 'page' | 'file';
    includeFills?: boolean;
    includeStrokes?: boolean;
    skipBoundNodes?: boolean; // if true, omit nodes whose paints are all already bound
    includeInstanceChildren?: boolean;
    maxNodes?: number;
  };

  const scope = payload.scope ?? 'page';
  const includeFills = payload.includeFills !== false;
  const includeStrokes = payload.includeStrokes !== false;
  const skipBoundNodes = payload.skipBoundNodes === true;
  const includeInstanceChildren = payload.includeInstanceChildren === true;
  const maxNodes = payload.maxNodes ?? 100000;

  try {
    figma.skipInvisibleInstanceChildren = true;

    // Resolve scope
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

    // Flatten
    const all: SceneNode[] = [];
    const MAX_DEPTH = 50;
    const collect = (nodes: readonly SceneNode[], depth: number) => {
      if (depth > MAX_DEPTH || all.length >= maxNodes) return;
      for (const n of nodes) {
        if (all.length >= maxNodes) return;
        all.push(n);
        if ('children' in n) collect((n as FrameNode).children as SceneNode[], depth + 1);
      }
    };
    collect(roots, 0);

    const out: NodeColorData[] = [];
    let yieldCounter = 0;
    let totalScanned = 0;
    let skippedInstanceChildren = 0;
    let skippedAllBound = 0;

    for (const node of all) {
      if ((++yieldCounter % 200) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      // Skip instance children unless explicitly included
      if (!includeInstanceChildren && node.parent && node.parent.type === 'INSTANCE') {
        skippedInstanceChildren++;
        continue;
      }

      totalScanned++;

      // Extract fills
      let fills: PaintInfo[] = [];
      if (includeFills && 'fills' in node) {
        const fillsRaw = (node as MinimalFillsMixin).fills;
        if (fillsRaw !== figma.mixed && Array.isArray(fillsRaw)) {
          fillsRaw.forEach((p, i) => {
            const info = extractPaint(p, i);
            if (info) fills.push(info);
          });
        }
      }

      // Extract strokes
      let strokes: PaintInfo[] = [];
      if (includeStrokes && 'strokes' in node) {
        const strokesRaw = (node as MinimalStrokesMixin).strokes;
        if (Array.isArray(strokesRaw)) {
          strokesRaw.forEach((p, i) => {
            const info = extractPaint(p, i);
            if (info) strokes.push(info);
          });
        }
      }

      if (fills.length === 0 && strokes.length === 0) continue;

      // Skip nodes where ALL paints are already bound to a still-existing variable
      if (skipBoundNodes) {
        const allBound = [...fills, ...strokes].every((p) => p.hasBinding);
        if (allBound) {
          skippedAllBound++;
          continue;
        }
      }

      out.push({
        id: node.id,
        name: node.name,
        type: node.type,
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
        parentId: node.parent?.id ?? null,
        parentType: node.parent?.type ?? null,
        parentBgHex: getParentBgHex(node),
        fills,
        strokes,
      });
    }

    return successResult(command.id, {
      data: {
        nodes: out,
        totalScanned,
        totalEmitted: out.length,
        skippedInstanceChildren,
        skippedAllBound,
        scope,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, msg);
  }
}
