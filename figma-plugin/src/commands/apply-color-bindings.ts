import type { FigmaCommand, CommandResult } from '@bridge-to-fig/shared';
import { successResult, errorResult } from './types';

interface BindingRequest {
  nodeId: string;
  field: 'fill' | 'stroke';
  index: number;
  variableId: string;
}

interface BindingError {
  nodeId: string;
  field: string;
  index: number;
  error: string;
}

export async function handleApplyColorBindings(command: FigmaCommand): Promise<CommandResult> {
  const payload = (command.payload || {}) as {
    bindings?: BindingRequest[];
    yieldEvery?: number;
  };

  const bindings = payload.bindings || [];
  const yieldEvery = payload.yieldEvery ?? 100;

  if (bindings.length === 0) {
    return successResult(command.id, {
      data: { applied: 0, failed: 0, errors: [], skippedNoNode: 0, skippedNoVariable: 0 },
    });
  }

  try {
    // Resolve variables once, cache by id
    const variableCache = new Map<string, Variable | null>();
    async function getVar(id: string): Promise<Variable | null> {
      if (variableCache.has(id)) return variableCache.get(id) ?? null;
      try {
        const v = await figma.variables.getVariableByIdAsync(id);
        variableCache.set(id, v);
        return v;
      } catch {
        variableCache.set(id, null);
        return null;
      }
    }

    // Group bindings by node so we can mutate one fills/strokes array per node, not per binding
    const byNode = new Map<string, BindingRequest[]>();
    for (const b of bindings) {
      if (!byNode.has(b.nodeId)) byNode.set(b.nodeId, []);
      byNode.get(b.nodeId)!.push(b);
    }

    let applied = 0;
    let failed = 0;
    let skippedNoNode = 0;
    let skippedNoVariable = 0;
    const errors: BindingError[] = [];
    let counter = 0;

    for (const [nodeId, nodeBindings] of byNode) {
      if ((++counter % yieldEvery) === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        skippedNoNode += nodeBindings.length;
        for (const b of nodeBindings) {
          errors.length < 100 && errors.push({ nodeId, field: b.field, index: b.index, error: 'Node not found' });
        }
        continue;
      }

      // Fills mutation — clone once, apply all fill bindings, then write back
      const fillBindings = nodeBindings.filter((b) => b.field === 'fill');
      if (fillBindings.length > 0 && 'fills' in node) {
        const fillsRaw = (node as MinimalFillsMixin).fills;
        if (fillsRaw === figma.mixed || !Array.isArray(fillsRaw)) {
          failed += fillBindings.length;
          for (const b of fillBindings) {
            errors.length < 100 && errors.push({ nodeId, field: 'fill', index: b.index, error: 'Mixed or non-array fills' });
          }
        } else {
          const fillsCopy = [...fillsRaw] as Paint[];
          for (const b of fillBindings) {
            try {
              const v = await getVar(b.variableId);
              if (!v) {
                skippedNoVariable++;
                errors.length < 100 && errors.push({ nodeId, field: 'fill', index: b.index, error: 'Variable not found' });
                continue;
              }
              if (b.index >= fillsCopy.length) {
                failed++;
                errors.length < 100 && errors.push({ nodeId, field: 'fill', index: b.index, error: 'Fill index out of range' });
                continue;
              }
              const target = fillsCopy[b.index];
              if (target.type !== 'SOLID') {
                failed++;
                errors.length < 100 && errors.push({ nodeId, field: 'fill', index: b.index, error: 'Non-solid fill' });
                continue;
              }
              fillsCopy[b.index] = figma.variables.setBoundVariableForPaint(target as SolidPaint, 'color', v);
              applied++;
            } catch (err) {
              failed++;
              const msg = err instanceof Error ? err.message : String(err);
              errors.length < 100 && errors.push({ nodeId, field: 'fill', index: b.index, error: msg });
            }
          }
          try {
            (node as MinimalFillsMixin).fills = fillsCopy;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.length < 100 && errors.push({ nodeId, field: 'fill', index: -1, error: 'Could not write fills: ' + msg });
          }
        }
      }

      // Strokes mutation — same pattern
      const strokeBindings = nodeBindings.filter((b) => b.field === 'stroke');
      if (strokeBindings.length > 0 && 'strokes' in node) {
        const strokesRaw = (node as MinimalStrokesMixin).strokes;
        if (!Array.isArray(strokesRaw)) {
          failed += strokeBindings.length;
          for (const b of strokeBindings) {
            errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: b.index, error: 'Non-array strokes' });
          }
        } else {
          const strokesCopy = [...strokesRaw] as Paint[];
          for (const b of strokeBindings) {
            try {
              const v = await getVar(b.variableId);
              if (!v) {
                skippedNoVariable++;
                errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: b.index, error: 'Variable not found' });
                continue;
              }
              if (b.index >= strokesCopy.length) {
                failed++;
                errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: b.index, error: 'Stroke index out of range' });
                continue;
              }
              const target = strokesCopy[b.index];
              if (target.type !== 'SOLID') {
                failed++;
                errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: b.index, error: 'Non-solid stroke' });
                continue;
              }
              strokesCopy[b.index] = figma.variables.setBoundVariableForPaint(target as SolidPaint, 'color', v);
              applied++;
            } catch (err) {
              failed++;
              const msg = err instanceof Error ? err.message : String(err);
              errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: b.index, error: msg });
            }
          }
          try {
            (node as MinimalStrokesMixin).strokes = strokesCopy;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.length < 100 && errors.push({ nodeId, field: 'stroke', index: -1, error: 'Could not write strokes: ' + msg });
          }
        }
      }
    }

    return successResult(command.id, {
      data: {
        applied,
        failed,
        skippedNoNode,
        skippedNoVariable,
        nodesProcessed: byNode.size,
        errors: errors.slice(0, 50),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, msg);
  }
}
