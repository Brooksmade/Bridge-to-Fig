// Adobe Spectrum 2 design system creation
//
// Spectrum 2 has a fundamentally different shape from the other organizing principles:
// six collections that alias into one another rather than a single primitives → semantic chain.
// `.Color theme` is the source-of-truth (Light/Dark/Wireframe modes); every other collection
// resolves through it. We create variables in two passes: first all raw values, then all
// aliases — so every alias target exists when we set the reference.

import { parseColor } from '../utils/variable-factory';
import {
  SPECTRUM_2_COLLECTIONS,
  SPECTRUM_2_CREATION_ORDER,
  isS2Alias,
  parseAliasRef,
  type S2Collection,
  type S2Variable,
  type S2Value,
  type Spectrum2CollectionName,
} from '../data/boilerplate-spectrum-2';

export interface Spectrum2CreationResult {
  collections: Record<string, { id: string; variableCount: number; created: boolean }>;
  totalVariables: number;
  totalAliases: number;
  totalAliasesResolved: number;
  unresolvedAliases: Array<{ from: string; to: string }>;
}

interface CollectionContext {
  config: S2Collection;
  collection: VariableCollection;
  created: boolean;
  /** mode name → modeId */
  modeIds: Record<string, string>;
  /** variable name → Variable (created in pass 1, used as alias targets in pass 2) */
  variables: Map<string, Variable>;
}

/** Get or create a collection with the given mode names. */
async function ensureCollection(config: S2Collection): Promise<CollectionContext> {
  const existing = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = existing.find((c) => c.name === config.name);
  let created = false;

  if (!collection) {
    collection = figma.variables.createVariableCollection(config.name);
    created = true;
    // Rename the auto-created default mode to the first configured mode
    if (config.modes.length > 0) {
      collection.renameMode(collection.modes[0].modeId, config.modes[0]);
    }
    // Add any additional modes
    for (let i = 1; i < config.modes.length; i++) {
      collection.addMode(config.modes[i]);
    }
  }

  // Build mode name → modeId map (whether collection is new or already existed)
  const modeIds: Record<string, string> = {};
  for (const m of collection.modes) {
    modeIds[m.name] = m.modeId;
  }

  // Existing variables in this collection — index by name so we don't double-create
  const variables = new Map<string, Variable>();
  for (const varId of collection.variableIds) {
    try {
      const v = await figma.variables.getVariableByIdAsync(varId);
      if (v) variables.set(v.name, v);
    } catch {
      // Stale reference — ignore
    }
  }

  return { config, collection, created, modeIds, variables };
}

/** Convert a non-alias S2Value into a Figma VariableValue for the given type. */
function s2ValueToFigma(value: S2Value, type: S2Variable['type']): VariableValue | null {
  if (isS2Alias(value)) return null; // Handled in pass 2
  switch (type) {
    case 'COLOR':
      if (typeof value !== 'string') return null;
      return parseColor(value);
    case 'FLOAT':
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const n = parseFloat(value);
        return isNaN(n) ? null : n;
      }
      return null;
    case 'STRING':
      return typeof value === 'string' ? value : String(value);
    case 'BOOLEAN':
      return typeof value === 'boolean' ? value : Boolean(value);
    default:
      return null;
  }
}

/** Pass 1: Create the variable (without setting alias values yet). Returns false if creation failed. */
function createVariableShell(ctx: CollectionContext, def: S2Variable): Variable | null {
  if (ctx.variables.has(def.name)) {
    return ctx.variables.get(def.name)!;
  }
  try {
    const v = figma.variables.createVariable(def.name, ctx.collection, def.type);
    // Set scopes / description / hidden flag now — these don't depend on aliases
    if (def.scopes && def.scopes.length > 0) {
      v.scopes = def.scopes as VariableScope[];
    }
    if (def.description) {
      v.description = def.description;
    }
    v.hiddenFromPublishing = def.hiddenFromPublishing;
    ctx.variables.set(def.name, v);
    return v;
  } catch (err) {
    console.error(`[S2] Failed to create variable ${ctx.config.name}/${def.name}:`, err);
    return null;
  }
}

/** Pass 1b: Set raw (non-alias) values for each mode. Aliases are skipped — pass 2 handles them. */
function setRawValues(ctx: CollectionContext, def: S2Variable, v: Variable): void {
  for (const modeName in def.valuesByMode) {
    const modeId = ctx.modeIds[modeName];
    if (!modeId) {
      console.warn(`[S2] Unknown mode "${modeName}" in collection "${ctx.config.name}" for var "${def.name}"`);
      continue;
    }
    const raw = def.valuesByMode[modeName];
    if (isS2Alias(raw)) continue; // pass 2

    const figmaValue = s2ValueToFigma(raw, def.type);
    if (figmaValue === null) continue;

    try {
      v.setValueForMode(modeId, figmaValue);
    } catch (err) {
      console.warn(`[S2] Failed to set ${def.name}[${modeName}]:`, err);
    }
  }
}

/** Pass 2: Resolve and set alias references now that every variable exists. */
function setAliasValues(
  ctx: CollectionContext,
  def: S2Variable,
  v: Variable,
  contexts: Record<string, CollectionContext>,
  unresolved: Array<{ from: string; to: string }>
): { aliasesResolved: number; aliasesAttempted: number } {
  let resolved = 0;
  let attempted = 0;
  for (const modeName in def.valuesByMode) {
    const raw = def.valuesByMode[modeName];
    if (!isS2Alias(raw)) continue;

    attempted++;
    const modeId = ctx.modeIds[modeName];
    if (!modeId) continue;

    const { collection: targetCollection, name: targetName } = parseAliasRef(raw.alias);
    const targetCtx = contexts[targetCollection];
    if (!targetCtx) {
      unresolved.push({ from: `${ctx.config.name}/${def.name}[${modeName}]`, to: raw.alias });
      continue;
    }
    const targetVar = targetCtx.variables.get(targetName);
    if (!targetVar) {
      unresolved.push({ from: `${ctx.config.name}/${def.name}[${modeName}]`, to: raw.alias });
      continue;
    }

    try {
      v.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: targetVar.id });
      resolved++;
    } catch (err) {
      unresolved.push({ from: `${ctx.config.name}/${def.name}[${modeName}]`, to: raw.alias });
      console.warn(`[S2] Failed to set alias ${def.name}[${modeName}] → ${raw.alias}:`, err);
    }
  }
  return { aliasesResolved: resolved, aliasesAttempted: attempted };
}

/**
 * Build the full Spectrum 2 design system in the current Figma file.
 *
 * Two-pass strategy:
 *  - Pass 1: Walk SPECTRUM_2_CREATION_ORDER (raw-value collections first), create every variable
 *            shell and set non-alias values.
 *  - Pass 2: Walk all collections again and resolve every alias — now safe because every target
 *            exists.
 */
export async function createSpectrum2DesignSystem(): Promise<Spectrum2CreationResult> {
  const contexts: Record<string, CollectionContext> = {};
  const result: Spectrum2CreationResult = {
    collections: {},
    totalVariables: 0,
    totalAliases: 0,
    totalAliasesResolved: 0,
    unresolvedAliases: [],
  };

  // Build a name → collection-config lookup for the creation-order iteration
  const configByName: Record<string, S2Collection> = {};
  for (const c of SPECTRUM_2_COLLECTIONS) {
    configByName[c.name] = c;
  }

  // === PASS 1: Create collections + variable shells + raw values ===
  for (const collectionName of SPECTRUM_2_CREATION_ORDER) {
    const config = configByName[collectionName];
    if (!config) {
      console.warn(`[S2] No config for collection "${collectionName}" — skipping`);
      continue;
    }

    const ctx = await ensureCollection(config);
    contexts[collectionName] = ctx;

    for (const def of config.variables) {
      const v = createVariableShell(ctx, def);
      if (v) {
        setRawValues(ctx, def, v);
      }
    }

    result.collections[collectionName] = {
      id: ctx.collection.id,
      variableCount: ctx.variables.size,
      created: ctx.created,
    };
    result.totalVariables += config.variables.length;
  }

  // === PASS 2: Resolve aliases ===
  for (const collectionName of SPECTRUM_2_CREATION_ORDER) {
    const config = configByName[collectionName];
    const ctx = contexts[collectionName];
    if (!config || !ctx) continue;

    for (const def of config.variables) {
      const v = ctx.variables.get(def.name);
      if (!v) continue;
      const { aliasesResolved, aliasesAttempted } = setAliasValues(ctx, def, v, contexts, result.unresolvedAliases);
      result.totalAliasesResolved += aliasesResolved;
      result.totalAliases += aliasesAttempted;
    }
  }

  return result;
}

/** True when the current organizing principle should route to the Spectrum 2 handler. */
export function isSpectrum2Principle(name: string | undefined): boolean {
  return name === 'spectrum-2';
}
