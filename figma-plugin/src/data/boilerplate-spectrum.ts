// Adobe Spectrum Design Tokens — Boilerplate
// Follows Spectrum's flat, human-readable naming convention with numeric scale indices.
// Higher index = more prominent/larger. Base unit: 8px.
// Reference: https://spectrum.adobe.com/page/design-tokens/
//
// This file provides Spectrum-specific defaults that can be used as an alternative
// to the standard boilerplate-tokens.ts (Tailwind-based). Import from this file
// when the user selects the "spectrum" organizing principle.

import type {
  BoilerplateTokens,
  EffectStyleDefinition,
  GridStyleDefinition,
} from './boilerplate-tokens';

// ============================================================================
// TYPOGRAPHY — Spectrum Type System
// Major second ratio (1.125), base 14px desktop / 17px mobile (1.25 platform scale)
// 4 text types: Heading, Body, Detail, Code
// Line heights: 1.3× headings/detail (Latin), 1.5× body/code (Latin)
// ============================================================================

export const spectrumTypographyTokens = {
  // Font Families (Spectrum defaults)
  fontFamily: {
    'font-family-sans': {
      $value: 'Adobe Clean',
      $type: 'string',
      $description: 'Primary sans-serif (Spectrum default)',
    },
    'font-family-serif': {
      $value: 'Adobe Clean Serif',
      $type: 'string',
      $description: 'Serif for editorial content',
    },
    'font-family-mono': {
      $value: 'Source Code Pro',
      $type: 'string',
      $description: 'Monospace for code',
    },
    'font-family-han': {
      $value: 'Adobe Clean Han',
      $type: 'string',
      $description: 'CJK language support',
    },
  },

  // Font Sizes — Spectrum 15-step scale (font-size-50 through font-size-1300)
  // Desktop values shown; mobile = desktop × 1.25
  fontSize: {
    'font-size-50': { $value: 11, $type: 'float', $description: '11px — Detail/caption small' },
    'font-size-75': { $value: 12, $type: 'float', $description: '12px — Detail/caption' },
    'font-size-100': { $value: 14, $type: 'float', $description: '14px — Body (desktop base)' },
    'font-size-200': { $value: 16, $type: 'float', $description: '16px — Body large' },
    'font-size-300': { $value: 18, $type: 'float', $description: '18px — Heading small' },
    'font-size-400': { $value: 20, $type: 'float', $description: '20px — Heading medium' },
    'font-size-500': { $value: 22, $type: 'float', $description: '22px — Heading' },
    'font-size-600': { $value: 25, $type: 'float', $description: '25px — Heading large' },
    'font-size-700': { $value: 28, $type: 'float', $description: '28px — Display small' },
    'font-size-800': { $value: 32, $type: 'float', $description: '32px — Display' },
    'font-size-900': { $value: 36, $type: 'float', $description: '36px — Display large' },
    'font-size-1000': { $value: 40, $type: 'float', $description: '40px — Hero small' },
    'font-size-1100': { $value: 45, $type: 'float', $description: '45px — Hero' },
    'font-size-1200': { $value: 50, $type: 'float', $description: '50px — Hero large' },
    'font-size-1300': { $value: 60, $type: 'float', $description: '60px — Hero maximum' },
  },

  // Font Weights — standard CSS values
  fontWeight: {
    'font-weight-light': { $value: 300, $type: 'float', $description: 'Light weight' },
    'font-weight-regular': { $value: 400, $type: 'float', $description: 'Regular weight' },
    'font-weight-medium': { $value: 500, $type: 'float', $description: 'Medium weight' },
    'font-weight-bold': { $value: 700, $type: 'float', $description: 'Bold weight' },
    'font-weight-extra-bold': { $value: 800, $type: 'float', $description: 'Extra bold weight' },
    'font-weight-black': { $value: 900, $type: 'float', $description: 'Black weight' },
  },

  // Line Heights — Spectrum values
  // Headings/Detail: 1.3× (Latin), 1.5× (CJK)
  // Body/Code: 1.5× (Latin), 1.7× (CJK)
  lineHeight: {
    'line-height-100': { $value: 1.3, $type: 'float', $description: '1.3× — Headings, detail text (Latin)' },
    'line-height-200': { $value: 1.5, $type: 'float', $description: '1.5× — Body text, code (Latin); headings (CJK)' },
    'line-height-300': { $value: 1.7, $type: 'float', $description: '1.7× — Body text (CJK)' },
  },

  // Letter Spacing
  letterSpacing: {
    'letter-spacing-none': { $value: 0, $type: 'float', $description: 'Default letter spacing' },
    'letter-spacing-tight': { $value: -0.025, $type: 'float', $description: 'Tight spacing for large headings' },
    'letter-spacing-wide': { $value: 0.06, $type: 'float', $description: 'Wide spacing for uppercase/small text' },
  },
};

// ============================================================================
// SHADOWS — Spectrum: only for transient, dismissible elements
// (tooltips, dropdowns, popovers, dialogs)
// Opacity increases in dark/darkest themes
// ============================================================================

export const spectrumShadowTokens = {
  elevation: {
    'shadow-none': { $value: '0 0 #0000', $type: 'string', $description: 'No shadow' },
    'shadow-100': {
      $value: '0 1px 4px rgb(0 0 0 / 0.16)',
      $type: 'string',
      $description: 'Tooltip shadow',
    },
    'shadow-200': {
      $value: '0 4px 16px rgb(0 0 0 / 0.16)',
      $type: 'string',
      $description: 'Dropdown, popover shadow',
    },
    'shadow-300': {
      $value: '0 8px 28px rgb(0 0 0 / 0.16)',
      $type: 'string',
      $description: 'Dialog, modal shadow',
    },
    'shadow-400': {
      $value: '0 12px 48px rgb(0 0 0 / 0.2)',
      $type: 'string',
      $description: 'Full-screen overlay shadow',
    },
  },
};

// Figma Effect Style Definitions — Spectrum shadow scale
export const spectrumEffectStyleDefinitions: EffectStyleDefinition[] = [
  {
    name: 'Shadow/100',
    description: 'Tooltip shadow',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000029', offsetX: 0, offsetY: 1, radius: 4, spread: 0 },
    ],
  },
  {
    name: 'Shadow/200',
    description: 'Dropdown, popover shadow',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000029', offsetX: 0, offsetY: 4, radius: 16, spread: 0 },
    ],
  },
  {
    name: 'Shadow/300',
    description: 'Dialog, modal shadow',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000029', offsetX: 0, offsetY: 8, radius: 28, spread: 0 },
    ],
  },
  {
    name: 'Shadow/400',
    description: 'Full-screen overlay shadow',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000033', offsetX: 0, offsetY: 12, radius: 48, spread: 0 },
    ],
  },
];

// ============================================================================
// BORDERS — Spectrum
// Border radius: 4px default desktop, 5px mobile (1.25 platform scale)
// Border widths: 1px standard, 2px emphasized, 4px large dividers
// ============================================================================

export const spectrumBorderTokens = {
  // Border Widths — 3 levels
  width: {
    'border-width-100': { $value: 1, $type: 'float', $description: '1px — Standard borders, small dividers' },
    'border-width-200': { $value: 2, $type: 'float', $description: '2px — Emphasized borders, medium dividers, slider tracks' },
    'border-width-400': { $value: 4, $type: 'float', $description: '4px — Large dividers only' },
  },

  // Corner Radius — Spectrum scale
  radius: {
    'corner-radius-none': { $value: 0, $type: 'float', $description: 'No radius — sharp corners' },
    'corner-radius-50': { $value: 1, $type: 'float', $description: '1px — Hairline rounding' },
    'corner-radius-75': { $value: 2, $type: 'float', $description: '2px — Small (checkbox, connected borders)' },
    'corner-radius-100': { $value: 4, $type: 'float', $description: '4px — Default (desktop)' },
    'corner-radius-200': { $value: 8, $type: 'float', $description: '8px — Medium rounding' },
    'corner-radius-300': { $value: 12, $type: 'float', $description: '12px — Large rounding' },
    'corner-radius-400': { $value: 16, $type: 'float', $description: '16px — Extra large rounding' },
    'corner-radius-full': { $value: 9999, $type: 'float', $description: 'Pill shape — CTAs, tags' },
  },
};

// ============================================================================
// OPACITY — Spectrum disabled/overlay values
// ============================================================================

export const spectrumOpacityTokens = {
  values: {
    'opacity-0': { $value: 0, $type: 'float', $description: 'Fully transparent' },
    'opacity-disabled': { $value: 0.38, $type: 'float', $description: 'Disabled state opacity (Spectrum)' },
    'opacity-overlay-light': { $value: 0.4, $type: 'float', $description: 'Light overlay scrim' },
    'opacity-overlay-default': { $value: 0.5, $type: 'float', $description: 'Default overlay scrim' },
    'opacity-overlay-heavy': { $value: 0.7, $type: 'float', $description: 'Heavy overlay scrim' },
    'opacity-100': { $value: 1, $type: 'float', $description: 'Fully opaque' },
  },
};

// ============================================================================
// Z-INDEX — layer ordering
// ============================================================================

export const spectrumZIndexTokens = {
  layers: {
    'z-index-behind': { $value: -1, $type: 'float', $description: 'Behind default layer' },
    'z-index-base': { $value: 0, $type: 'float', $description: 'Base layer' },
    'z-index-raised': { $value: 1, $type: 'float', $description: 'Slightly raised' },
    'z-index-dropdown': { $value: 10, $type: 'float', $description: 'Dropdown menus' },
    'z-index-sticky': { $value: 20, $type: 'float', $description: 'Sticky headers' },
    'z-index-fixed': { $value: 30, $type: 'float', $description: 'Fixed positioned elements' },
    'z-index-overlay': { $value: 40, $type: 'float', $description: 'Overlay backgrounds' },
    'z-index-modal': { $value: 50, $type: 'float', $description: 'Modal dialogs' },
    'z-index-popover': { $value: 60, $type: 'float', $description: 'Popovers and tooltips' },
    'z-index-toast': { $value: 70, $type: 'float', $description: 'Toast notifications' },
    'z-index-maximum': { $value: 9999, $type: 'float', $description: 'Maximum z-index' },
  },
};

// ============================================================================
// TRANSITIONS — Spectrum animation durations
// ============================================================================

export const spectrumTransitionTokens = {
  duration: {
    'animation-duration-0': { $value: 0, $type: 'float', $description: 'No transition' },
    'animation-duration-100': { $value: 130, $type: 'float', $description: '130ms — Quick micro-interactions' },
    'animation-duration-200': { $value: 160, $type: 'float', $description: '160ms — Standard transitions' },
    'animation-duration-300': { $value: 190, $type: 'float', $description: '190ms — Medium transitions' },
    'animation-duration-400': { $value: 220, $type: 'float', $description: '220ms — Deliberate transitions' },
    'animation-duration-500': { $value: 250, $type: 'float', $description: '250ms — Slow transitions' },
  },

  // Spectrum easing functions
  easing: {
    'ease-in': { $value: 'cubic-bezier(0.5, 0, 1, 1)', $type: 'string', $description: 'Ease in (Spectrum)' },
    'ease-out': { $value: 'cubic-bezier(0, 0, 0.4, 1)', $type: 'string', $description: 'Ease out (Spectrum)' },
    'ease-in-out': { $value: 'cubic-bezier(0.45, 0, 0.4, 1)', $type: 'string', $description: 'Ease in-out (Spectrum)' },
  },
};

// ============================================================================
// SPACING — Spectrum 12-step static spacing scale (8px base unit)
// These values don't change with platform scale
// ============================================================================

export const spectrumSpacingTokens = {
  scale: {
    'spacing-0': { $value: 0, $type: 'float', $description: '0px — No spacing' },
    'spacing-50': { $value: 2, $type: 'float', $description: '2px — Hairline gaps' },
    'spacing-75': { $value: 4, $type: 'float', $description: '4px — Tight spacing' },
    'spacing-100': { $value: 8, $type: 'float', $description: '8px — Base spacing unit' },
    'spacing-200': { $value: 12, $type: 'float', $description: '12px — Small gaps' },
    'spacing-300': { $value: 16, $type: 'float', $description: '16px — Standard spacing' },
    'spacing-400': { $value: 24, $type: 'float', $description: '24px — Section spacing' },
    'spacing-500': { $value: 32, $type: 'float', $description: '32px — Large gaps' },
    'spacing-600': { $value: 40, $type: 'float', $description: '40px — Group spacing' },
    'spacing-700': { $value: 48, $type: 'float', $description: '48px — Layout spacing' },
    'spacing-800': { $value: 64, $type: 'float', $description: '64px — Major sections' },
    'spacing-900': { $value: 80, $type: 'float', $description: '80px — Page-level spacing' },
    'spacing-1000': { $value: 96, $type: 'float', $description: '96px — Maximum spacing' },
  },
};

// ============================================================================
// COMPONENT HEIGHTS — Spectrum T-shirt sizing (linear 8px increments)
// Desktop values; mobile = desktop × 1.25 (platform scale)
// ============================================================================

export const spectrumComponentHeightTokens = {
  scale: {
    'component-height-75': { $value: 24, $type: 'float', $description: '24px — Small (S)' },
    'component-height-100': { $value: 32, $type: 'float', $description: '32px — Medium (M) — default' },
    'component-height-200': { $value: 40, $type: 'float', $description: '40px — Large (L)' },
    'component-height-300': { $value: 48, $type: 'float', $description: '48px — Extra Large (XL)' },
  },
};

// ============================================================================
// SCREEN BREAKPOINTS
// ============================================================================

export const spectrumScreenTokens = {
  breakpoints: {
    'screen-mobile': { $value: 375, $type: 'float', $description: '375px — Mobile' },
    'screen-tablet': { $value: 768, $type: 'float', $description: '768px — Tablet' },
    'screen-desktop': { $value: 1024, $type: 'float', $description: '1024px — Desktop' },
    'screen-desktop-wide': { $value: 1280, $type: 'float', $description: '1280px — Wide desktop' },
    'screen-desktop-ultra': { $value: 1536, $type: 'float', $description: '1536px — Ultra-wide desktop' },
  },
};

// ============================================================================
// GRID STYLES — same patterns as standard boilerplate, Spectrum base unit
// ============================================================================

export const spectrumGridStyleDefinitions: GridStyleDefinition[] = [
  {
    name: 'Grid/4-Column',
    description: '4-column grid for mobile layouts',
    grids: [
      { pattern: 'COLUMNS', count: 4, gutterSize: 16, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/6-Column',
    description: '6-column grid for tablet layouts',
    grids: [
      { pattern: 'COLUMNS', count: 6, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/8-Column',
    description: '8-column grid for small desktop layouts',
    grids: [
      { pattern: 'COLUMNS', count: 8, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/12-Column',
    description: '12-column grid for standard desktop layouts',
    grids: [
      { pattern: 'COLUMNS', count: 12, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/8px',
    description: '8px grid — Spectrum base spacing unit',
    grids: [
      { pattern: 'GRID', sectionSize: 8, color: '#0000ff0d' },
    ],
  },
  {
    name: 'Grid/16px',
    description: '16px grid — Spectrum spacing-300',
    grids: [
      { pattern: 'GRID', sectionSize: 16, color: '#0000ff0d' },
    ],
  },
];

// ============================================================================
// SEMANTIC COLORS — Spectrum's 5 semantic roles
// These are the base hues for the Alias layer's semantic references.
// Actual color scales are generated by generateSpectrumColorScale() in color-scale.ts.
// ============================================================================

export const spectrumSemanticBaseColors: Record<string, { hex: string; description: string }> = {
  accent: { hex: '#0265dc', description: 'Accent / brand — primary action color (Spectrum blue)' },
  informative: { hex: '#2680eb', description: 'Informative — information callouts (blue)' },
  positive: { hex: '#2d9d78', description: 'Positive — success states (green)' },
  notice: { hex: '#e68619', description: 'Notice — warnings (orange)' },
  negative: { hex: '#e34850', description: 'Negative — errors, destructive actions (red)' },
};

// ============================================================================
// SPECTRUM GRAY PALETTE — 11 steps per theme
// Fully desaturated, work alongside any chromatic color.
// In Light theme: gray-100 is lightest (background), gray-1100 is darkest (text).
// In Dark/Darkest themes: values are inverted so higher = more contrast.
// ============================================================================

export const spectrumGrayPalette = {
  light: {
    'gray-100': '#f8f8f8',   // Background
    'gray-200': '#e6e6e6',
    'gray-300': '#d5d5d5',
    'gray-400': '#b1b1b1',
    'gray-500': '#909090',
    'gray-600': '#6d6d6d',
    'gray-700': '#464646',
    'gray-800': '#222222',
    'gray-900': '#1a1a1a',
    'gray-1000': '#121212',
    'gray-1100': '#000000',  // Highest contrast text
  },
  dark: {
    'gray-100': '#1a1a1a',   // Background
    'gray-200': '#2c2c2c',
    'gray-300': '#393939',
    'gray-400': '#494949',
    'gray-500': '#5c5c5c',
    'gray-600': '#7c7c7c',
    'gray-700': '#a2a2a2',
    'gray-800': '#c8c8c8',
    'gray-900': '#dedede',
    'gray-1000': '#efefef',
    'gray-1100': '#ffffff',  // Highest contrast text
  },
  darkest: {
    'gray-100': '#0f0f0f',   // Background (near-black)
    'gray-200': '#1d1d1d',
    'gray-300': '#282828',
    'gray-400': '#383838',
    'gray-500': '#4a4a4a',
    'gray-600': '#686868',
    'gray-700': '#9a9a9a',
    'gray-800': '#bfbfbf',
    'gray-900': '#d5d5d5',
    'gray-1000': '#e8e8e8',
    'gray-1100': '#ffffff',  // Highest contrast text
  },
};

// ============================================================================
// TRANSPARENT WHITE/BLACK — 8 values each for overlays on colored backgrounds
// ============================================================================

export const spectrumTransparentColors = {
  white: {
    'transparent-white-100': 'rgba(255, 255, 255, 0.07)',
    'transparent-white-200': 'rgba(255, 255, 255, 0.12)',
    'transparent-white-300': 'rgba(255, 255, 255, 0.2)',
    'transparent-white-400': 'rgba(255, 255, 255, 0.3)',
    'transparent-white-500': 'rgba(255, 255, 255, 0.45)',
    'transparent-white-600': 'rgba(255, 255, 255, 0.6)',
    'transparent-white-700': 'rgba(255, 255, 255, 0.75)',
    'transparent-white-800': 'rgba(255, 255, 255, 0.9)',
  },
  black: {
    'transparent-black-100': 'rgba(0, 0, 0, 0.04)',
    'transparent-black-200': 'rgba(0, 0, 0, 0.08)',
    'transparent-black-300': 'rgba(0, 0, 0, 0.14)',
    'transparent-black-400': 'rgba(0, 0, 0, 0.22)',
    'transparent-black-500': 'rgba(0, 0, 0, 0.36)',
    'transparent-black-600': 'rgba(0, 0, 0, 0.5)',
    'transparent-black-700': 'rgba(0, 0, 0, 0.62)',
    'transparent-black-800': 'rgba(0, 0, 0, 0.78)',
  },
};

// ============================================================================
// COLLECTION BUILDER — Spectrum-organized Figma variable collections
// ============================================================================

export function getSpectrumBoilerplateCollections() {
  return [
    {
      name: 'Typography',
      modes: ['Default'],
      tokens: {
        'Font Family': spectrumTypographyTokens.fontFamily,
        'Font Size': spectrumTypographyTokens.fontSize,
        'Font Weight': spectrumTypographyTokens.fontWeight,
        'Line Height': spectrumTypographyTokens.lineHeight,
        'Letter Spacing': spectrumTypographyTokens.letterSpacing,
      },
    },
    {
      name: 'Effects',
      modes: ['Default'],
      tokens: {
        Shadow: spectrumShadowTokens.elevation,
        Transition: {
          Duration: spectrumTransitionTokens.duration,
          Easing: spectrumTransitionTokens.easing,
        },
      },
    },
    {
      name: 'Layout',
      modes: ['Default'],
      tokens: {
        Border: {
          Width: spectrumBorderTokens.width,
          Radius: spectrumBorderTokens.radius,
        },
        Opacity: spectrumOpacityTokens.values,
        'Z-Index': spectrumZIndexTokens.layers,
        'Component Height': spectrumComponentHeightTokens.scale,
      },
    },
    {
      name: 'Spacing',
      modes: ['Default'],
      tokens: {
        Space: spectrumSpacingTokens.scale,
      },
    },
    {
      name: 'Screens',
      modes: ['Default'],
      tokens: {
        Breakpoint: spectrumScreenTokens.breakpoints,
      },
    },
  ];
}
