// Tailwind CSS v4 Design Tokens — Boilerplate
// Follows Tailwind's utility-first naming convention with its default design scale.
// Base spacing unit: 4px. Font scale uses Tailwind's default type sizes.
// Reference: https://tailwindcss.com/docs
//
// This file provides Tailwind-specific defaults that can be used as an alternative
// to the standard boilerplate-tokens.ts. Import from this file when the user
// selects the "tailwind" organizing principle.

import type {
  EffectStyleDefinition,
  GridStyleDefinition,
} from './boilerplate-tokens';

// ============================================================================
// TYPOGRAPHY — Tailwind CSS v4 Type System
// Default font scale with Inter as the primary sans-serif.
// ============================================================================

export const tailwindTypographyTokens = {
  // Font Families
  fontFamily: {
    'font-family-sans': {
      $value: 'Inter',
      $type: 'string',
      $description: 'Primary sans-serif (Tailwind default)',
    },
    'font-family-serif': {
      $value: 'Georgia',
      $type: 'string',
      $description: 'Serif font family',
    },
    'font-family-mono': {
      $value: 'JetBrains Mono',
      $type: 'string',
      $description: 'Monospace font for code',
    },
  },

  // Font Sizes — Tailwind's default scale (px values)
  fontSize: {
    'font-size-xs': { $value: 12, $type: 'float', $description: '12px — Extra small (text-xs)' },
    'font-size-sm': { $value: 14, $type: 'float', $description: '14px — Small (text-sm)' },
    'font-size-base': { $value: 16, $type: 'float', $description: '16px — Base (text-base)' },
    'font-size-lg': { $value: 18, $type: 'float', $description: '18px — Large (text-lg)' },
    'font-size-xl': { $value: 20, $type: 'float', $description: '20px — Extra large (text-xl)' },
    'font-size-2xl': { $value: 24, $type: 'float', $description: '24px — 2XL (text-2xl)' },
    'font-size-3xl': { $value: 30, $type: 'float', $description: '30px — 3XL (text-3xl)' },
    'font-size-4xl': { $value: 36, $type: 'float', $description: '36px — 4XL (text-4xl)' },
    'font-size-5xl': { $value: 48, $type: 'float', $description: '48px — 5XL (text-5xl)' },
    'font-size-6xl': { $value: 60, $type: 'float', $description: '60px — 6XL (text-6xl)' },
    'font-size-7xl': { $value: 72, $type: 'float', $description: '72px — 7XL (text-7xl)' },
    'font-size-8xl': { $value: 96, $type: 'float', $description: '96px — 8XL (text-8xl)' },
    'font-size-9xl': { $value: 128, $type: 'float', $description: '128px — 9XL (text-9xl)' },
  },

  // Font Weights — all 9 standard CSS weights
  fontWeight: {
    'font-weight-thin': { $value: 100, $type: 'float', $description: 'Thin (font-thin)' },
    'font-weight-extralight': { $value: 200, $type: 'float', $description: 'Extra light (font-extralight)' },
    'font-weight-light': { $value: 300, $type: 'float', $description: 'Light (font-light)' },
    'font-weight-normal': { $value: 400, $type: 'float', $description: 'Normal (font-normal)' },
    'font-weight-medium': { $value: 500, $type: 'float', $description: 'Medium (font-medium)' },
    'font-weight-semibold': { $value: 600, $type: 'float', $description: 'Semibold (font-semibold)' },
    'font-weight-bold': { $value: 700, $type: 'float', $description: 'Bold (font-bold)' },
    'font-weight-extrabold': { $value: 800, $type: 'float', $description: 'Extra bold (font-extrabold)' },
    'font-weight-black': { $value: 900, $type: 'float', $description: 'Black (font-black)' },
  },

  // Line Heights — Tailwind defaults (multipliers)
  lineHeight: {
    'line-height-none': { $value: 1, $type: 'float', $description: '1x — No extra leading (leading-none)' },
    'line-height-tight': { $value: 1.25, $type: 'float', $description: '1.25x — Tight (leading-tight)' },
    'line-height-snug': { $value: 1.375, $type: 'float', $description: '1.375x — Snug (leading-snug)' },
    'line-height-normal': { $value: 1.5, $type: 'float', $description: '1.5x — Normal (leading-normal)' },
    'line-height-relaxed': { $value: 1.625, $type: 'float', $description: '1.625x — Relaxed (leading-relaxed)' },
    'line-height-loose': { $value: 2, $type: 'float', $description: '2x — Loose (leading-loose)' },
  },

  // Letter Spacing — Tailwind defaults (em units)
  letterSpacing: {
    'letter-spacing-tighter': { $value: -0.05, $type: 'float', $description: '-0.05em (tracking-tighter)' },
    'letter-spacing-tight': { $value: -0.025, $type: 'float', $description: '-0.025em (tracking-tight)' },
    'letter-spacing-normal': { $value: 0, $type: 'float', $description: '0em (tracking-normal)' },
    'letter-spacing-wide': { $value: 0.025, $type: 'float', $description: '0.025em (tracking-wide)' },
    'letter-spacing-wider': { $value: 0.05, $type: 'float', $description: '0.05em (tracking-wider)' },
    'letter-spacing-widest': { $value: 0.1, $type: 'float', $description: '0.1em (tracking-widest)' },
  },
};

// ============================================================================
// SHADOWS — Tailwind's default shadow scale
// ============================================================================

export const tailwindShadowTokens = {
  elevation: {
    'shadow-none': { $value: '0 0 #0000', $type: 'string', $description: 'No shadow (shadow-none)' },
    'shadow-sm': {
      $value: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      $type: 'string',
      $description: 'Small shadow (shadow-sm)',
    },
    'shadow': {
      $value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      $type: 'string',
      $description: 'Default shadow (shadow)',
    },
    'shadow-md': {
      $value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      $type: 'string',
      $description: 'Medium shadow (shadow-md)',
    },
    'shadow-lg': {
      $value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      $type: 'string',
      $description: 'Large shadow (shadow-lg)',
    },
    'shadow-xl': {
      $value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      $type: 'string',
      $description: 'Extra large shadow (shadow-xl)',
    },
    'shadow-2xl': {
      $value: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      $type: 'string',
      $description: 'Highest elevation shadow (shadow-2xl)',
    },
  },
};

// Figma Effect Style Definitions — Tailwind shadow scale
export const tailwindEffectStyleDefinitions: EffectStyleDefinition[] = [
  {
    name: 'Shadow/sm',
    description: 'Small shadow (shadow-sm)',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000000d', offsetX: 0, offsetY: 1, radius: 2, spread: 0 },
    ],
  },
  {
    name: 'Shadow/default',
    description: 'Default shadow (shadow)',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 1, radius: 3, spread: 0 },
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 1, radius: 2, spread: -1 },
    ],
  },
  {
    name: 'Shadow/md',
    description: 'Medium shadow (shadow-md)',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 4, radius: 6, spread: -1 },
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 2, radius: 4, spread: -2 },
    ],
  },
  {
    name: 'Shadow/lg',
    description: 'Large shadow (shadow-lg)',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 10, radius: 15, spread: -3 },
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 4, radius: 6, spread: -4 },
    ],
  },
  {
    name: 'Shadow/xl',
    description: 'Extra large shadow (shadow-xl)',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 20, radius: 25, spread: -5 },
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 8, radius: 10, spread: -6 },
    ],
  },
  {
    name: 'Shadow/2xl',
    description: 'Highest elevation shadow (shadow-2xl)',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000040', offsetX: 0, offsetY: 25, radius: 50, spread: -12 },
    ],
  },
];

// ============================================================================
// BORDERS — Tailwind defaults
// ============================================================================

export const tailwindBorderTokens = {
  // Border Widths
  width: {
    'border-width-0': { $value: 0, $type: 'float', $description: '0px — No border (border-0)' },
    'border-width-1': { $value: 1, $type: 'float', $description: '1px — Default border (border)' },
    'border-width-2': { $value: 2, $type: 'float', $description: '2px — Medium border (border-2)' },
    'border-width-4': { $value: 4, $type: 'float', $description: '4px — Thick border (border-4)' },
    'border-width-8': { $value: 8, $type: 'float', $description: '8px — Extra thick border (border-8)' },
  },

  // Corner Radius — Tailwind scale
  radius: {
    'corner-radius-none': { $value: 0, $type: 'float', $description: '0px — No radius (rounded-none)' },
    'corner-radius-xs': { $value: 2, $type: 'float', $description: '2px — Extra small (rounded-xs)' },
    'corner-radius-sm': { $value: 4, $type: 'float', $description: '4px — Small (rounded-sm)' },
    'corner-radius-md': { $value: 6, $type: 'float', $description: '6px — Medium (rounded-md)' },
    'corner-radius-lg': { $value: 8, $type: 'float', $description: '8px — Large (rounded-lg)' },
    'corner-radius-xl': { $value: 12, $type: 'float', $description: '12px — Extra large (rounded-xl)' },
    'corner-radius-2xl': { $value: 16, $type: 'float', $description: '16px — 2XL (rounded-2xl)' },
    'corner-radius-3xl': { $value: 24, $type: 'float', $description: '24px — 3XL (rounded-3xl)' },
    'corner-radius-4xl': { $value: 32, $type: 'float', $description: '32px — 4XL (rounded-4xl)' },
    'corner-radius-full': { $value: 9999, $type: 'float', $description: 'Pill shape (rounded-full)' },
  },
};

// ============================================================================
// OPACITY — Tailwind defaults (0 to 100 in standard increments)
// ============================================================================

export const tailwindOpacityTokens = {
  values: {
    'opacity-0': { $value: 0, $type: 'float', $description: 'Fully transparent (opacity-0)' },
    'opacity-5': { $value: 0.05, $type: 'float', $description: '5% opacity (opacity-5)' },
    'opacity-10': { $value: 0.10, $type: 'float', $description: '10% opacity (opacity-10)' },
    'opacity-20': { $value: 0.20, $type: 'float', $description: '20% opacity (opacity-20)' },
    'opacity-25': { $value: 0.25, $type: 'float', $description: '25% opacity (opacity-25)' },
    'opacity-30': { $value: 0.30, $type: 'float', $description: '30% opacity (opacity-30)' },
    'opacity-40': { $value: 0.40, $type: 'float', $description: '40% opacity (opacity-40)' },
    'opacity-50': { $value: 0.50, $type: 'float', $description: '50% opacity (opacity-50)' },
    'opacity-60': { $value: 0.60, $type: 'float', $description: '60% opacity (opacity-60)' },
    'opacity-70': { $value: 0.70, $type: 'float', $description: '70% opacity (opacity-70)' },
    'opacity-75': { $value: 0.75, $type: 'float', $description: '75% opacity (opacity-75)' },
    'opacity-80': { $value: 0.80, $type: 'float', $description: '80% opacity (opacity-80)' },
    'opacity-90': { $value: 0.90, $type: 'float', $description: '90% opacity (opacity-90)' },
    'opacity-95': { $value: 0.95, $type: 'float', $description: '95% opacity (opacity-95)' },
    'opacity-100': { $value: 1, $type: 'float', $description: 'Fully opaque (opacity-100)' },
  },
};

// ============================================================================
// Z-INDEX — Tailwind defaults
// ============================================================================

export const tailwindZIndexTokens = {
  layers: {
    'z-index-0': { $value: 0, $type: 'float', $description: 'Base layer (z-0)' },
    'z-index-10': { $value: 10, $type: 'float', $description: 'Layer 10 (z-10)' },
    'z-index-20': { $value: 20, $type: 'float', $description: 'Layer 20 (z-20)' },
    'z-index-30': { $value: 30, $type: 'float', $description: 'Layer 30 (z-30)' },
    'z-index-40': { $value: 40, $type: 'float', $description: 'Layer 40 (z-40)' },
    'z-index-50': { $value: 50, $type: 'float', $description: 'Layer 50 (z-50)' },
  },
};

// ============================================================================
// TRANSITIONS — Tailwind animation durations and easing
// ============================================================================

export const tailwindTransitionTokens = {
  // Duration in milliseconds
  duration: {
    'animation-duration-75': { $value: 75, $type: 'float', $description: '75ms (duration-75)' },
    'animation-duration-100': { $value: 100, $type: 'float', $description: '100ms (duration-100)' },
    'animation-duration-150': { $value: 150, $type: 'float', $description: '150ms (duration-150)' },
    'animation-duration-200': { $value: 200, $type: 'float', $description: '200ms (duration-200)' },
    'animation-duration-300': { $value: 300, $type: 'float', $description: '300ms (duration-300)' },
    'animation-duration-500': { $value: 500, $type: 'float', $description: '500ms (duration-500)' },
    'animation-duration-700': { $value: 700, $type: 'float', $description: '700ms (duration-700)' },
    'animation-duration-1000': { $value: 1000, $type: 'float', $description: '1000ms (duration-1000)' },
  },

  // Easing functions
  easing: {
    'ease-linear': { $value: 'linear', $type: 'string', $description: 'Linear easing (ease-linear)' },
    'ease-in': { $value: 'cubic-bezier(0.4, 0, 1, 1)', $type: 'string', $description: 'Ease in (ease-in)' },
    'ease-out': { $value: 'cubic-bezier(0, 0, 0.58, 1)', $type: 'string', $description: 'Ease out (ease-out)' },
    'ease-in-out': { $value: 'cubic-bezier(0.4, 0, 0.2, 1)', $type: 'string', $description: 'Ease in-out (ease-in-out)' },
  },
};

// ============================================================================
// SPACING — Tailwind's 4px base unit scale
// ============================================================================

export const tailwindSpacingTokens = {
  scale: {
    'spacing-0': { $value: 0, $type: 'float', $description: '0px (spacing-0)' },
    'spacing-0.5': { $value: 2, $type: 'float', $description: '2px (spacing-0.5)' },
    'spacing-1': { $value: 4, $type: 'float', $description: '4px (spacing-1)' },
    'spacing-1.5': { $value: 6, $type: 'float', $description: '6px (spacing-1.5)' },
    'spacing-2': { $value: 8, $type: 'float', $description: '8px (spacing-2)' },
    'spacing-2.5': { $value: 10, $type: 'float', $description: '10px (spacing-2.5)' },
    'spacing-3': { $value: 12, $type: 'float', $description: '12px (spacing-3)' },
    'spacing-3.5': { $value: 14, $type: 'float', $description: '14px (spacing-3.5)' },
    'spacing-4': { $value: 16, $type: 'float', $description: '16px (spacing-4)' },
    'spacing-5': { $value: 20, $type: 'float', $description: '20px (spacing-5)' },
    'spacing-6': { $value: 24, $type: 'float', $description: '24px (spacing-6)' },
    'spacing-7': { $value: 28, $type: 'float', $description: '28px (spacing-7)' },
    'spacing-8': { $value: 32, $type: 'float', $description: '32px (spacing-8)' },
    'spacing-9': { $value: 36, $type: 'float', $description: '36px (spacing-9)' },
    'spacing-10': { $value: 40, $type: 'float', $description: '40px (spacing-10)' },
    'spacing-12': { $value: 48, $type: 'float', $description: '48px (spacing-12)' },
    'spacing-14': { $value: 56, $type: 'float', $description: '56px (spacing-14)' },
    'spacing-16': { $value: 64, $type: 'float', $description: '64px (spacing-16)' },
    'spacing-20': { $value: 80, $type: 'float', $description: '80px (spacing-20)' },
    'spacing-24': { $value: 96, $type: 'float', $description: '96px (spacing-24)' },
  },
};

// ============================================================================
// COMPONENT HEIGHTS — common web component sizes
// ============================================================================

export const tailwindComponentHeightTokens = {
  scale: {
    'component-height-xs': { $value: 24, $type: 'float', $description: '24px — Extra small' },
    'component-height-sm': { $value: 32, $type: 'float', $description: '32px — Small' },
    'component-height-md': { $value: 40, $type: 'float', $description: '40px — Medium (default)' },
    'component-height-lg': { $value: 48, $type: 'float', $description: '48px — Large' },
    'component-height-xl': { $value: 56, $type: 'float', $description: '56px — Extra large' },
  },
};

// ============================================================================
// SCREEN BREAKPOINTS — Tailwind defaults
// ============================================================================

export const tailwindScreenTokens = {
  breakpoints: {
    'screen-sm': { $value: 640, $type: 'float', $description: '640px — Small (sm)' },
    'screen-md': { $value: 768, $type: 'float', $description: '768px — Medium (md)' },
    'screen-lg': { $value: 1024, $type: 'float', $description: '1024px — Large (lg)' },
    'screen-xl': { $value: 1280, $type: 'float', $description: '1280px — Extra large (xl)' },
    'screen-2xl': { $value: 1536, $type: 'float', $description: '1536px — 2XL (2xl)' },
  },
};

// ============================================================================
// GRID STYLES — Tailwind-aligned layout grids
// ============================================================================

export const tailwindGridStyleDefinitions: GridStyleDefinition[] = [
  {
    name: 'Grid/4-Column (Mobile)',
    description: '4-column grid for mobile layouts (16px gutter)',
    grids: [
      { pattern: 'COLUMNS', count: 4, gutterSize: 16, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/8-Column (Tablet)',
    description: '8-column grid for tablet layouts (24px gutter)',
    grids: [
      { pattern: 'COLUMNS', count: 8, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/12-Column (Desktop)',
    description: '12-column grid for desktop layouts (24px gutter)',
    grids: [
      { pattern: 'COLUMNS', count: 12, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/4px',
    description: '4px grid — Tailwind base spacing unit',
    grids: [
      { pattern: 'GRID', sectionSize: 4, color: '#0000ff0d' },
    ],
  },
  {
    name: 'Grid/8px',
    description: '8px grid — Tailwind spacing-2',
    grids: [
      { pattern: 'GRID', sectionSize: 8, color: '#0000ff0d' },
    ],
  },
];

// ============================================================================
// TAILWIND DEFAULT COLOR PALETTE — 500-level base colors
// These are the well-known Tailwind palette midpoints (hex values).
// ============================================================================

export const tailwindDefaultColors: Record<string, { hex: string; description: string }> = {
  slate: { hex: '#64748b', description: 'Slate 500 — cool gray' },
  gray: { hex: '#6b7280', description: 'Gray 500 — neutral gray' },
  zinc: { hex: '#71717a', description: 'Zinc 500 — warm gray' },
  neutral: { hex: '#737373', description: 'Neutral 500 — true neutral' },
  stone: { hex: '#78716c', description: 'Stone 500 — warm stone' },
  red: { hex: '#ef4444', description: 'Red 500 — danger, error' },
  orange: { hex: '#f97316', description: 'Orange 500 — warning' },
  amber: { hex: '#f59e0b', description: 'Amber 500 — caution' },
  yellow: { hex: '#eab308', description: 'Yellow 500 — attention' },
  lime: { hex: '#84cc16', description: 'Lime 500 — fresh green' },
  green: { hex: '#22c55e', description: 'Green 500 — success' },
  emerald: { hex: '#10b981', description: 'Emerald 500 — positive' },
  teal: { hex: '#14b8a6', description: 'Teal 500 — calm' },
  cyan: { hex: '#06b6d4', description: 'Cyan 500 — informative' },
  sky: { hex: '#0ea5e9', description: 'Sky 500 — light blue' },
  blue: { hex: '#3b82f6', description: 'Blue 500 — primary' },
  indigo: { hex: '#6366f1', description: 'Indigo 500 — deep blue' },
  violet: { hex: '#8b5cf6', description: 'Violet 500 — purple-blue' },
  purple: { hex: '#a855f7', description: 'Purple 500 — purple' },
  fuchsia: { hex: '#d946ef', description: 'Fuchsia 500 — pink-purple' },
  pink: { hex: '#ec4899', description: 'Pink 500 — pink' },
  rose: { hex: '#f43f5e', description: 'Rose 500 — red-pink' },
};

// ============================================================================
// COLLECTION BUILDER — Tailwind-organized Figma variable collections
// ============================================================================

export function getTailwindBoilerplateCollections() {
  return [
    {
      name: 'Typography',
      modes: ['Default'],
      tokens: {
        'Font Family': tailwindTypographyTokens.fontFamily,
        'Font Size': tailwindTypographyTokens.fontSize,
        'Font Weight': tailwindTypographyTokens.fontWeight,
        'Line Height': tailwindTypographyTokens.lineHeight,
        'Letter Spacing': tailwindTypographyTokens.letterSpacing,
      },
    },
    {
      name: 'Effects',
      modes: ['Default'],
      tokens: {
        Shadow: tailwindShadowTokens.elevation,
        Transition: {
          Duration: tailwindTransitionTokens.duration,
          Easing: tailwindTransitionTokens.easing,
        },
      },
    },
    {
      name: 'Layout',
      modes: ['Default'],
      tokens: {
        Border: {
          Width: tailwindBorderTokens.width,
          Radius: tailwindBorderTokens.radius,
        },
        Opacity: tailwindOpacityTokens.values,
        'Z-Index': tailwindZIndexTokens.layers,
        'Component Height': tailwindComponentHeightTokens.scale,
      },
    },
    {
      name: 'Spacing',
      modes: ['Default'],
      tokens: {
        Space: tailwindSpacingTokens.scale,
      },
    },
    {
      name: 'Screens',
      modes: ['Default'],
      tokens: {
        Breakpoint: tailwindScreenTokens.breakpoints,
      },
    },
  ];
}
