// Organizing Principles Configuration
// Defines different structural approaches for design system variable collections

import type { VariableTemplate } from './design-system-templates';

/**
 * Available organizing principle names
 */
export type OrganizingPrincipleName =
  | 'four-level'       // Default: Primitive → Semantic → Tokens → Theme
  | 'three-level'      // Simplified: Primitives → Tokens → Theme
  | 'two-level'        // Flat: Primitives → Tokens
  | 'material-design'  // Google M3: Reference → System → Component
  | 'tailwind'         // Utility-first: Colors → Semantic
  | 'spectrum'         // Adobe Spectrum: Global → Alias → Component → System
  | 'apple-hig';       // Apple HIG: System Palette → Dynamic Colors → Component Tokens

/**
 * Configuration for a single collection within an organizing principle
 */
export interface CollectionConfig {
  name: string;
  modes: string[];
  description: string;
  minVariableCount: number;
}

/**
 * Template getter function type
 */
export type TemplateGetter = (brandColorName?: string) => VariableTemplate[];

/**
 * Full configuration for an organizing principle
 */
export interface OrganizingPrinciple {
  name: OrganizingPrincipleName;
  displayName: string;
  description: string;
  bestFor: string;
  collections: CollectionConfig[];
  // Map collection index to template getter function name
  // Index 0 is always primitives (no templates, just raw values)
  templateGetters: Record<number, string>;
}

/**
 * All available organizing principles
 */
export const ORGANIZING_PRINCIPLES: Record<OrganizingPrincipleName, OrganizingPrinciple> = {
  'four-level': {
    name: 'four-level',
    displayName: '4-Level Hierarchy (Default)',
    description: 'Full enterprise design system with maximum flexibility and semantic layers',
    bestFor: 'Large teams, complex projects, extensive dark mode support',
    collections: [
      {
        name: 'Primitive [ Level 1 ]',
        modes: ['Value'],
        description: 'Raw color, typography, and number values',
        minVariableCount: 50,
      },
      {
        name: 'Semantic [ Level 2 ]',
        modes: ['Light', 'Dark'],
        description: 'Brand and system-level color meanings',
        minVariableCount: 7,
      },
      {
        name: 'Tokens [ Level 3 ]',
        modes: ['Light Mode', 'Dark Mode'],
        description: 'UI context-specific tokens (Surface, Text, Border)',
        minVariableCount: 10,
      },
      {
        name: 'Theme',
        modes: ['Light', 'Dark'],
        description: 'App-level theming variables',
        minVariableCount: 10,
      },
    ],
    templateGetters: {
      1: 'getSemanticTemplates',
      2: 'getTokenTemplates',
      3: 'getThemeTemplates',
    },
  },

  'three-level': {
    name: 'three-level',
    displayName: '3-Level Simplified',
    description: 'Streamlined structure without semantic layer',
    bestFor: 'Mid-size projects, faster setup, simpler token management',
    collections: [
      {
        name: 'Primitives',
        modes: ['Value'],
        description: 'Raw color, typography, and number values',
        minVariableCount: 50,
      },
      {
        name: 'Tokens',
        modes: ['Light', 'Dark'],
        description: 'Design tokens with light/dark modes',
        minVariableCount: 15,
      },
      {
        name: 'Theme',
        modes: ['Light', 'Dark'],
        description: 'App-level theming variables',
        minVariableCount: 10,
      },
    ],
    templateGetters: {
      1: 'getSimplifiedTokenTemplates',
      2: 'getThemeTemplates',
    },
  },

  'two-level': {
    name: 'two-level',
    displayName: '2-Level Flat',
    description: 'Minimal structure with just primitives and tokens',
    bestFor: 'Small projects, prototypes, simple theming needs',
    collections: [
      {
        name: 'Primitives',
        modes: ['Value'],
        description: 'Raw color, typography, and number values',
        minVariableCount: 50,
      },
      {
        name: 'Tokens',
        modes: ['Light', 'Dark'],
        description: 'All design tokens in one collection',
        minVariableCount: 20,
      },
    ],
    templateGetters: {
      1: 'getFlatTokenTemplates',
    },
  },

  'material-design': {
    name: 'material-design',
    displayName: 'Material Design 3',
    description: 'Google Material Design 3 token architecture',
    bestFor: 'Android apps, Google ecosystem, Material UI projects',
    collections: [
      {
        name: 'Reference',
        modes: ['Value'],
        description: 'M3 reference palette (raw colors)',
        minVariableCount: 50,
      },
      {
        name: 'System',
        modes: ['Light', 'Dark'],
        description: 'M3 system tokens (Primary, Surface, Outline)',
        minVariableCount: 20,
      },
      {
        name: 'Component',
        modes: ['Light', 'Dark'],
        description: 'Component-specific tokens (Button, Card, Input)',
        minVariableCount: 10,
      },
    ],
    templateGetters: {
      1: 'getMaterialSystemTemplates',
      2: 'getMaterialComponentTemplates',
    },
  },

  'tailwind': {
    name: 'tailwind',
    displayName: 'Tailwind CSS Style',
    description: 'Utility-first approach matching Tailwind conventions',
    bestFor: 'Web projects using Tailwind, developer-first workflows',
    collections: [
      {
        name: 'Colors',
        modes: ['Value'],
        description: 'Color scales (gray-50, gray-100, brand-500, etc.)',
        minVariableCount: 50,
      },
      {
        name: 'Semantic',
        modes: ['Light', 'Dark'],
        description: 'Semantic aliases (bg-primary, text-muted, border)',
        minVariableCount: 15,
      },
    ],
    templateGetters: {
      1: 'getTailwindSemanticTemplates',
    },
  },
  'spectrum': {
    name: 'spectrum',
    displayName: 'Adobe Spectrum Style',
    description: 'Adobe Spectrum-inspired token architecture with global primitives, semantic aliases, component-scoped tokens, and a system bridge layer. Uses flat naming and 3-theme support.',
    bestFor: 'Enterprise design systems, component libraries, multi-brand/multi-theme projects, accessibility-focused teams',
    collections: [
      {
        name: 'Global',
        modes: ['Value'],
        description: 'Raw color palette, spacing, sizing, and layout primitives with flat naming (gray-100, blue-800)',
        minVariableCount: 50,
      },
      {
        name: 'Alias',
        modes: ['Light', 'Dark', 'Darkest'],
        description: 'Semantic color references (accent, negative, positive, notice, informative) with 3-theme support',
        minVariableCount: 20,
      },
      {
        name: 'Component',
        modes: ['Light', 'Dark', 'Darkest'],
        description: 'Component-scoped tokens (button, input, card, tooltip, nav) isolated per component family',
        minVariableCount: 15,
      },
      {
        name: 'System',
        modes: ['Default', 'Express'],
        description: 'Brand bridge layer — remaps component tokens for different brand variants',
        minVariableCount: 10,
      },
    ],
    templateGetters: {
      1: 'getSpectrumAliasTemplates',
      2: 'getSpectrumComponentTemplates',
      3: 'getSpectrumSystemTemplates',
    },
  },
  'apple-hig': {
    name: 'apple-hig',
    displayName: 'Apple Human Interface Guidelines',
    description: 'Apple HIG token architecture with system palette primitives, dynamic semantic colors, and component tokens. Uses iOS/macOS naming conventions with light/dark mode support.',
    bestFor: 'iOS/macOS apps, SwiftUI projects, Apple platform design',
    collections: [
      {
        name: 'System Palette',
        modes: ['Value'],
        description: 'Apple system color primitives (12 system colors, 6 system grays, typography, spacing)',
        minVariableCount: 50,
      },
      {
        name: 'Dynamic Colors',
        modes: ['Light', 'Dark'],
        description: 'iOS/macOS semantic colors (backgrounds, labels, fills, separators, grouped backgrounds)',
        minVariableCount: 20,
      },
      {
        name: 'Component Tokens',
        modes: ['Light', 'Dark'],
        description: 'Component-scoped tokens for buttons, navigation bars, tab bars, alerts, sheets',
        minVariableCount: 15,
      },
    ],
    templateGetters: {
      1: 'getAppleHIGDynamicTemplates',
      2: 'getAppleHIGComponentTemplates',
    },
  },
};

/**
 * Get an organizing principle by name
 */
export function getOrganizingPrinciple(name: OrganizingPrincipleName): OrganizingPrinciple {
  return ORGANIZING_PRINCIPLES[name] || ORGANIZING_PRINCIPLES['four-level'];
}

/**
 * Get all principle names
 */
export function getAllPrincipleNames(): OrganizingPrincipleName[] {
  return Object.keys(ORGANIZING_PRINCIPLES) as OrganizingPrincipleName[];
}

/**
 * Get user-friendly display options for principle selection
 */
export function getPrincipleDisplayOptions(): Array<{
  value: OrganizingPrincipleName;
  label: string;
  description: string;
  bestFor: string;
}> {
  return Object.values(ORGANIZING_PRINCIPLES).map((p) => ({
    value: p.name,
    label: p.displayName,
    description: p.description,
    bestFor: p.bestFor,
  }));
}

/**
 * Check if a principle name is valid
 */
export function isValidPrincipleName(name: string): name is OrganizingPrincipleName {
  return name in ORGANIZING_PRINCIPLES;
}
