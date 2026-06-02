// Adobe Spectrum 2 Design Tokens — Full Boilerplate
//
// Auto-extracted from the Spectrum 2 Figma library (2,919 variables across 6 collections).
// Encodes the full alias graph so the structure can be recreated faithfully.
//
// Collections (in order):
//   1. S2.Color-theme       (Modeless)              — Hierarchical color primitives ("Palette/gray/100") — aliases into .Color theme
//   2. .Platform scale      (Desktop)               — Component-level dimensions; private (hidden from publishing)
//   3. Iconography          (Modeless)              — Icon size scales (Workflow / UI icon)
//   4. Typography           (Modeless)              — Font families, weights, sizes, composite text styles
//   5. Layout               (Modeless)              — Component-scoped layout tokens
//   6. .Color theme         (Light / Dark / Wireframe) — Source-of-truth color values; private (hidden from publishing)
//
// Editing brand color: change values in ".Color theme" — every other collection aliases into it.

import source from './spectrum-2-source.json';

/** Reference to another variable, encoded as "CollectionName:VariableName". */
export interface S2Alias {
  alias: string;
}

export type S2Value = string | number | boolean | S2Alias;

export type S2VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

export interface S2Variable {
  name: string;
  type: S2VariableType;
  /** Map of mode name → value (raw or alias reference). */
  valuesByMode: Record<string, S2Value>;
  scopes: string[];
  description: string;
  hiddenFromPublishing: boolean;
}

export interface S2Collection {
  name: string;
  modes: string[];
  defaultMode: string;
  /** Collections starting with "." are private (hidden from publishing) in Figma's UI. */
  hidden: boolean;
  variables: S2Variable[];
}

/**
 * Spectrum 2 collection names — used as keys for alias resolution.
 * Variables in one collection can alias into another via "CollectionName:VariableName".
 */
export const SPECTRUM_2_COLLECTION_NAMES = [
  'S2.Color-theme',
  '.Platform scale',
  'Iconography',
  'Typography',
  'Layout',
  '.Color theme',
] as const;

export type Spectrum2CollectionName = (typeof SPECTRUM_2_COLLECTION_NAMES)[number];

/** All 6 Spectrum 2 collections in creation order (raw-value collections first, alias-only collections last). */
export const SPECTRUM_2_COLLECTIONS: S2Collection[] = source as S2Collection[];

/**
 * Topological order for creating collections.
 *
 * `.Color theme` holds raw color values and must be created first so other collections can alias into it.
 * `.Platform scale` holds raw FLOAT values and must be created before Iconography/Layout (which alias to it).
 * Typography is self-contained but referenced by Layout, so it goes mid-stream.
 */
export const SPECTRUM_2_CREATION_ORDER: Spectrum2CollectionName[] = [
  '.Color theme',
  '.Platform scale',
  'Typography',
  'Iconography',
  'Layout',
  'S2.Color-theme',
];

/** Lookup a collection by name. Returns undefined if not found. */
export function getSpectrum2Collection(name: Spectrum2CollectionName): S2Collection | undefined {
  return SPECTRUM_2_COLLECTIONS.find((c) => c.name === name);
}

/** True if the value is an alias reference. */
export function isS2Alias(v: S2Value): v is S2Alias {
  return typeof v === 'object' && v !== null && 'alias' in v;
}

/** Parse an "CollectionName:VariableName" reference into its parts. */
export function parseAliasRef(ref: string): { collection: string; name: string } {
  const idx = ref.indexOf(':');
  if (idx < 0) {
    return { collection: '', name: ref };
  }
  return { collection: ref.slice(0, idx), name: ref.slice(idx + 1) };
}

/** Total variable count across all collections. */
export function spectrum2VariableCount(): number {
  return SPECTRUM_2_COLLECTIONS.reduce((sum, c) => sum + c.variables.length, 0);
}
