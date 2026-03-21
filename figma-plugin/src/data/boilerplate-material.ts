// Material Design 3 (M3) Design Tokens — Boilerplate
// Follows M3's role-based naming convention with semantic type scale.
// Base unit: 4dp grid. Reference: https://m3.material.io/styles
//
// This file provides M3-specific defaults that can be used as an alternative
// to the standard boilerplate-tokens.ts (Tailwind-based). Import from this file
// when the user selects the "material" organizing principle.

import type {
  EffectStyleDefinition,
  GridStyleDefinition,
} from './boilerplate-tokens';

// ============================================================================
// TYPOGRAPHY — M3 Type Scale
// 5 roles: Display, Headline, Title, Body, Label
// 3 sizes each: Large, Medium, Small
// Default typeface: Roboto
// ============================================================================

export const materialTypographyTokens = {
  // Font Families (M3 defaults)
  fontFamily: {
    'font-family-sans': {
      $value: 'Roboto',
      $type: 'string',
      $description: 'Primary sans-serif (M3 default)',
    },
    'font-family-serif': {
      $value: 'Roboto Serif',
      $type: 'string',
      $description: 'Serif for editorial content',
    },
    'font-family-mono': {
      $value: 'Roboto Mono',
      $type: 'string',
      $description: 'Monospace for code',
    },
  },

  // Font Sizes — M3 type scale (Display, Headline, Title, Body, Label × Large, Medium, Small)
  fontSize: {
    'font-size-display-large': { $value: 57, $type: 'float', $description: '57px — Display Large' },
    'font-size-display-medium': { $value: 45, $type: 'float', $description: '45px — Display Medium' },
    'font-size-display-small': { $value: 36, $type: 'float', $description: '36px — Display Small' },
    'font-size-headline-large': { $value: 32, $type: 'float', $description: '32px — Headline Large' },
    'font-size-headline-medium': { $value: 28, $type: 'float', $description: '28px — Headline Medium' },
    'font-size-headline-small': { $value: 24, $type: 'float', $description: '24px — Headline Small' },
    'font-size-title-large': { $value: 22, $type: 'float', $description: '22px — Title Large' },
    'font-size-title-medium': { $value: 16, $type: 'float', $description: '16px — Title Medium' },
    'font-size-title-small': { $value: 14, $type: 'float', $description: '14px — Title Small' },
    'font-size-body-large': { $value: 16, $type: 'float', $description: '16px — Body Large' },
    'font-size-body-medium': { $value: 14, $type: 'float', $description: '14px — Body Medium' },
    'font-size-body-small': { $value: 12, $type: 'float', $description: '12px — Body Small' },
    'font-size-label-large': { $value: 14, $type: 'float', $description: '14px — Label Large' },
    'font-size-label-medium': { $value: 12, $type: 'float', $description: '12px — Label Medium' },
    'font-size-label-small': { $value: 11, $type: 'float', $description: '11px — Label Small' },
  },

  // Font Weights — M3 uses Regular, Medium, Bold
  fontWeight: {
    'font-weight-regular': { $value: 400, $type: 'float', $description: 'Regular weight' },
    'font-weight-medium': { $value: 500, $type: 'float', $description: 'Medium weight' },
    'font-weight-bold': { $value: 700, $type: 'float', $description: 'Bold weight' },
  },

  // Line Heights — M3 exact pixel values per type role
  lineHeight: {
    'line-height-display-large': { $value: 64, $type: 'float', $description: '64px — Display Large line height' },
    'line-height-display-medium': { $value: 52, $type: 'float', $description: '52px — Display Medium line height' },
    'line-height-display-small': { $value: 44, $type: 'float', $description: '44px — Display Small line height' },
    'line-height-headline-large': { $value: 40, $type: 'float', $description: '40px — Headline Large line height' },
    'line-height-headline-medium': { $value: 36, $type: 'float', $description: '36px — Headline Medium line height' },
    'line-height-headline-small': { $value: 32, $type: 'float', $description: '32px — Headline Small line height' },
    'line-height-title-large': { $value: 28, $type: 'float', $description: '28px — Title Large line height' },
    'line-height-title-medium': { $value: 24, $type: 'float', $description: '24px — Title Medium line height' },
    'line-height-title-small': { $value: 20, $type: 'float', $description: '20px — Title Small line height' },
    'line-height-body-large': { $value: 24, $type: 'float', $description: '24px — Body Large line height' },
    'line-height-body-medium': { $value: 20, $type: 'float', $description: '20px — Body Medium line height' },
    'line-height-body-small': { $value: 16, $type: 'float', $description: '16px — Body Small line height' },
    'line-height-label-large': { $value: 20, $type: 'float', $description: '20px — Label Large line height' },
    'line-height-label-medium': { $value: 16, $type: 'float', $description: '16px — Label Medium line height' },
    'line-height-label-small': { $value: 16, $type: 'float', $description: '16px — Label Small line height' },
  },

  // Letter Spacing — M3 tracking values (in px)
  letterSpacing: {
    'letter-spacing-display-large': { $value: -0.25, $type: 'float', $description: '-0.25px — Display Large tracking' },
    'letter-spacing-display-medium': { $value: 0, $type: 'float', $description: '0px — Display Medium tracking' },
    'letter-spacing-display-small': { $value: 0, $type: 'float', $description: '0px — Display Small tracking' },
    'letter-spacing-headline-large': { $value: 0, $type: 'float', $description: '0px — Headline Large tracking' },
    'letter-spacing-headline-medium': { $value: 0, $type: 'float', $description: '0px — Headline Medium tracking' },
    'letter-spacing-headline-small': { $value: 0, $type: 'float', $description: '0px — Headline Small tracking' },
    'letter-spacing-title-large': { $value: 0, $type: 'float', $description: '0px — Title Large tracking' },
    'letter-spacing-title-medium': { $value: 0.15, $type: 'float', $description: '0.15px — Title Medium tracking' },
    'letter-spacing-title-small': { $value: 0.1, $type: 'float', $description: '0.1px — Title Small tracking' },
    'letter-spacing-body-large': { $value: 0.5, $type: 'float', $description: '0.5px — Body Large tracking' },
    'letter-spacing-body-medium': { $value: 0.25, $type: 'float', $description: '0.25px — Body Medium tracking' },
    'letter-spacing-body-small': { $value: 0.4, $type: 'float', $description: '0.4px — Body Small tracking' },
    'letter-spacing-label-large': { $value: 0.1, $type: 'float', $description: '0.1px — Label Large tracking' },
    'letter-spacing-label-medium': { $value: 0.5, $type: 'float', $description: '0.5px — Label Medium tracking' },
    'letter-spacing-label-small': { $value: 0.5, $type: 'float', $description: '0.5px — Label Small tracking' },
  },
};

// ============================================================================
// SHADOWS — M3 Elevation Levels 0-5
// M3 uses tonal color elevation + shadow for emphasis
// Each level has two shadow layers (key shadow + ambient shadow)
// ============================================================================

export const materialShadowTokens = {
  elevation: {
    'shadow-level0': { $value: '0 0 #0000', $type: 'string', $description: 'Level 0 — No shadow (resting)' },
    'shadow-level1': {
      $value: '0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px 1px rgb(0 0 0 / 0.15)',
      $type: 'string',
      $description: 'Level 1 — Cards, buttons at rest',
    },
    'shadow-level2': {
      $value: '0 1px 2px rgb(0 0 0 / 0.3), 0 2px 6px 2px rgb(0 0 0 / 0.15)',
      $type: 'string',
      $description: 'Level 2 — FAB, snackbar, bottom nav',
    },
    'shadow-level3': {
      $value: '0 4px 8px 3px rgb(0 0 0 / 0.15), 0 1px 3px rgb(0 0 0 / 0.3)',
      $type: 'string',
      $description: 'Level 3 — Navigation drawer, bottom sheet',
    },
    'shadow-level4': {
      $value: '0 6px 10px 4px rgb(0 0 0 / 0.15), 0 2px 3px rgb(0 0 0 / 0.3)',
      $type: 'string',
      $description: 'Level 4 — Top app bar (scrolled)',
    },
    'shadow-level5': {
      $value: '0 8px 12px 6px rgb(0 0 0 / 0.15), 0 4px 4px rgb(0 0 0 / 0.3)',
      $type: 'string',
      $description: 'Level 5 — Modal, dialog',
    },
  },
};

// Figma Effect Style Definitions — M3 elevation levels (dual shadow layers)
export const materialEffectStyleDefinitions: EffectStyleDefinition[] = [
  {
    name: 'Shadow/Level 1',
    description: 'M3 Level 1 — Cards, buttons at rest',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000026', offsetX: 0, offsetY: 1, radius: 3, spread: 1 },
      { type: 'DROP_SHADOW', color: '#0000004d', offsetX: 0, offsetY: 1, radius: 2, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Level 2',
    description: 'M3 Level 2 — FAB, snackbar, bottom nav',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000026', offsetX: 0, offsetY: 2, radius: 6, spread: 2 },
      { type: 'DROP_SHADOW', color: '#0000004d', offsetX: 0, offsetY: 1, radius: 2, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Level 3',
    description: 'M3 Level 3 — Navigation drawer, bottom sheet',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000026', offsetX: 0, offsetY: 4, radius: 8, spread: 3 },
      { type: 'DROP_SHADOW', color: '#0000004d', offsetX: 0, offsetY: 1, radius: 3, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Level 4',
    description: 'M3 Level 4 — Top app bar (scrolled)',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000026', offsetX: 0, offsetY: 6, radius: 10, spread: 4 },
      { type: 'DROP_SHADOW', color: '#0000004d', offsetX: 0, offsetY: 2, radius: 3, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Level 5',
    description: 'M3 Level 5 — Modal, dialog',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000026', offsetX: 0, offsetY: 8, radius: 12, spread: 6 },
      { type: 'DROP_SHADOW', color: '#0000004d', offsetX: 0, offsetY: 4, radius: 4, spread: 0 },
    ],
  },
];

// ============================================================================
// BORDERS — M3 Shape Scale
// M3 uses shape for expressiveness: None, Extra Small, Small, Medium, Large,
// Extra Large, Full
// ============================================================================

export const materialBorderTokens = {
  // Border Widths — M3 outline values
  width: {
    'border-width-none': { $value: 0, $type: 'float', $description: '0px — No border' },
    'border-width-thin': { $value: 1, $type: 'float', $description: '1px — Standard outline' },
    'border-width-medium': { $value: 2, $type: 'float', $description: '2px — Emphasized outline' },
  },

  // Corner Radius — M3 shape scale
  radius: {
    'corner-radius-none': { $value: 0, $type: 'float', $description: 'No radius — Sharp corners' },
    'corner-radius-extra-small': { $value: 4, $type: 'float', $description: '4px — Extra Small (chips, small buttons)' },
    'corner-radius-small': { $value: 8, $type: 'float', $description: '8px — Small (buttons, text fields)' },
    'corner-radius-medium': { $value: 12, $type: 'float', $description: '12px — Medium (cards, dialogs)' },
    'corner-radius-large': { $value: 16, $type: 'float', $description: '16px — Large (large cards, FAB)' },
    'corner-radius-extra-large': { $value: 28, $type: 'float', $description: '28px — Extra Large (bottom sheets, side sheets)' },
    'corner-radius-full': { $value: 9999, $type: 'float', $description: 'Full — Pill shape (badges, toggles)' },
  },
};

// ============================================================================
// OPACITY — M3 State Layers
// M3 uses state layers (transparent overlays) for interactive states
// ============================================================================

export const materialOpacityTokens = {
  values: {
    'opacity-0': { $value: 0, $type: 'float', $description: 'Fully transparent' },
    'opacity-hover': { $value: 0.08, $type: 'float', $description: '8% — Hover state layer' },
    'opacity-focus': { $value: 0.1, $type: 'float', $description: '10% — Focus state layer' },
    'opacity-pressed': { $value: 0.1, $type: 'float', $description: '10% — Pressed state layer' },
    'opacity-dragged': { $value: 0.16, $type: 'float', $description: '16% — Dragged state layer' },
    'opacity-disabled': { $value: 0.12, $type: 'float', $description: '12% — Disabled container' },
    'opacity-disabled-content': { $value: 0.38, $type: 'float', $description: '38% — Disabled content (text, icons)' },
    'opacity-100': { $value: 1, $type: 'float', $description: 'Fully opaque' },
  },
};

// ============================================================================
// Z-INDEX — layer ordering (same concept, M3 context)
// ============================================================================

export const materialZIndexTokens = {
  layers: {
    'z-index-behind': { $value: -1, $type: 'float', $description: 'Behind default layer' },
    'z-index-base': { $value: 0, $type: 'float', $description: 'Base layer' },
    'z-index-raised': { $value: 1, $type: 'float', $description: 'Slightly raised' },
    'z-index-dropdown': { $value: 10, $type: 'float', $description: 'Dropdown menus' },
    'z-index-sticky': { $value: 20, $type: 'float', $description: 'Sticky headers' },
    'z-index-fixed': { $value: 30, $type: 'float', $description: 'Fixed positioned elements' },
    'z-index-navigation-drawer': { $value: 40, $type: 'float', $description: 'Navigation drawer' },
    'z-index-modal': { $value: 50, $type: 'float', $description: 'Modal dialogs' },
    'z-index-snackbar': { $value: 60, $type: 'float', $description: 'Snackbar notifications' },
    'z-index-tooltip': { $value: 70, $type: 'float', $description: 'Tooltips' },
    'z-index-maximum': { $value: 9999, $type: 'float', $description: 'Maximum z-index' },
  },
};

// ============================================================================
// TRANSITIONS — M3 Motion Tokens
// M3 defines duration and easing for standard, emphasized, and decelerate/
// accelerate patterns
// ============================================================================

export const materialTransitionTokens = {
  duration: {
    'animation-duration-short1': { $value: 50, $type: 'float', $description: '50ms — Short 1' },
    'animation-duration-short2': { $value: 100, $type: 'float', $description: '100ms — Short 2' },
    'animation-duration-short3': { $value: 150, $type: 'float', $description: '150ms — Short 3' },
    'animation-duration-short4': { $value: 200, $type: 'float', $description: '200ms — Short 4' },
    'animation-duration-medium1': { $value: 250, $type: 'float', $description: '250ms — Medium 1' },
    'animation-duration-medium2': { $value: 300, $type: 'float', $description: '300ms — Medium 2' },
    'animation-duration-medium3': { $value: 350, $type: 'float', $description: '350ms — Medium 3' },
    'animation-duration-medium4': { $value: 400, $type: 'float', $description: '400ms — Medium 4' },
    'animation-duration-long1': { $value: 450, $type: 'float', $description: '450ms — Long 1' },
    'animation-duration-long2': { $value: 500, $type: 'float', $description: '500ms — Long 2' },
    'animation-duration-long3': { $value: 550, $type: 'float', $description: '550ms — Long 3' },
    'animation-duration-long4': { $value: 600, $type: 'float', $description: '600ms — Long 4' },
    'animation-duration-extra-long1': { $value: 700, $type: 'float', $description: '700ms — Extra Long 1' },
    'animation-duration-extra-long2': { $value: 800, $type: 'float', $description: '800ms — Extra Long 2' },
    'animation-duration-extra-long3': { $value: 900, $type: 'float', $description: '900ms — Extra Long 3' },
    'animation-duration-extra-long4': { $value: 1000, $type: 'float', $description: '1000ms — Extra Long 4' },
  },

  // M3 easing functions
  easing: {
    'ease-standard': {
      $value: 'cubic-bezier(0.2, 0, 0, 1)',
      $type: 'string',
      $description: 'Standard easing — general transitions',
    },
    'ease-standard-decelerate': {
      $value: 'cubic-bezier(0, 0, 0, 1)',
      $type: 'string',
      $description: 'Standard decelerate — entering elements',
    },
    'ease-standard-accelerate': {
      $value: 'cubic-bezier(0.3, 0, 1, 1)',
      $type: 'string',
      $description: 'Standard accelerate — exiting elements',
    },
    'ease-emphasized': {
      $value: 'cubic-bezier(0.2, 0, 0, 1)',
      $type: 'string',
      $description: 'Emphasized easing — important transitions',
    },
    'ease-emphasized-decelerate': {
      $value: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
      $type: 'string',
      $description: 'Emphasized decelerate — entering with emphasis',
    },
    'ease-emphasized-accelerate': {
      $value: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
      $type: 'string',
      $description: 'Emphasized accelerate — exiting with emphasis',
    },
  },
};

// ============================================================================
// SPACING — M3 uses 4dp grid increments
// ============================================================================

export const materialSpacingTokens = {
  scale: {
    'spacing-0': { $value: 0, $type: 'float', $description: '0px — No spacing' },
    'spacing-4': { $value: 4, $type: 'float', $description: '4px — Minimum spacing' },
    'spacing-8': { $value: 8, $type: 'float', $description: '8px — Tight spacing' },
    'spacing-12': { $value: 12, $type: 'float', $description: '12px — Small spacing' },
    'spacing-16': { $value: 16, $type: 'float', $description: '16px — Standard spacing' },
    'spacing-20': { $value: 20, $type: 'float', $description: '20px — Medium-small spacing' },
    'spacing-24': { $value: 24, $type: 'float', $description: '24px — Medium spacing' },
    'spacing-28': { $value: 28, $type: 'float', $description: '28px — Medium-large spacing' },
    'spacing-32': { $value: 32, $type: 'float', $description: '32px — Large spacing' },
    'spacing-36': { $value: 36, $type: 'float', $description: '36px — Section spacing' },
    'spacing-40': { $value: 40, $type: 'float', $description: '40px — Group spacing' },
    'spacing-48': { $value: 48, $type: 'float', $description: '48px — Layout spacing' },
    'spacing-56': { $value: 56, $type: 'float', $description: '56px — Major spacing' },
    'spacing-64': { $value: 64, $type: 'float', $description: '64px — Page-level spacing' },
  },
};

// ============================================================================
// COMPONENT HEIGHTS — M3 component sizing
// ============================================================================

export const materialComponentHeightTokens = {
  scale: {
    'component-height-chip': { $value: 32, $type: 'float', $description: '32px — Chip' },
    'component-height-button': { $value: 40, $type: 'float', $description: '40px — Button' },
    'component-height-field': { $value: 56, $type: 'float', $description: '56px — Text field, dropdown' },
    'component-height-top-app-bar': { $value: 64, $type: 'float', $description: '64px — Top app bar' },
    'component-height-navigation-bar': { $value: 80, $type: 'float', $description: '80px — Navigation bar' },
    'component-height-fab': { $value: 56, $type: 'float', $description: '56px — FAB (standard)' },
    'component-height-fab-small': { $value: 40, $type: 'float', $description: '40px — FAB (small)' },
    'component-height-fab-large': { $value: 96, $type: 'float', $description: '96px — FAB (large)' },
  },
};

// ============================================================================
// SCREEN BREAKPOINTS — M3 Window Size Classes
// Compact, Medium, Expanded, Large
// ============================================================================

export const materialScreenTokens = {
  breakpoints: {
    'screen-compact': { $value: 600, $type: 'float', $description: '600px — Compact (phone)' },
    'screen-medium': { $value: 840, $type: 'float', $description: '840px — Medium (foldable, tablet portrait)' },
    'screen-expanded': { $value: 1200, $type: 'float', $description: '1200px — Expanded (tablet landscape, desktop)' },
    'screen-large': { $value: 1600, $type: 'float', $description: '1600px — Large (desktop, ultra-wide)' },
  },
};

// ============================================================================
// GRID STYLES — M3 layout grids
// M3 recommends 4-column (compact), 8-column (medium), 12-column (expanded)
// Base grid: 4dp
// ============================================================================

export const materialGridStyleDefinitions: GridStyleDefinition[] = [
  {
    name: 'Grid/4-Column (Compact)',
    description: '4-column grid for compact layouts (phone) — 8px gutter, 16px margin',
    grids: [
      { pattern: 'COLUMNS', count: 4, gutterSize: 8, offset: 16, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/8-Column (Medium)',
    description: '8-column grid for medium layouts (tablet) — 12px gutter',
    grids: [
      { pattern: 'COLUMNS', count: 8, gutterSize: 12, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/12-Column (Expanded)',
    description: '12-column grid for expanded layouts (desktop) — 24px gutter',
    grids: [
      { pattern: 'COLUMNS', count: 12, gutterSize: 24, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/4dp',
    description: '4dp grid — M3 base spacing unit',
    grids: [
      { pattern: 'GRID', sectionSize: 4, color: '#0000ff0d' },
    ],
  },
  {
    name: 'Grid/8dp',
    description: '8dp grid — M3 common increment',
    grids: [
      { pattern: 'GRID', sectionSize: 8, color: '#0000ff0d' },
    ],
  },
];

// ============================================================================
// SEMANTIC COLORS — M3 Baseline Theme (Purple Primary)
// These define the M3 color roles for light theme.
// Actual tonal palettes are generated from key colors using M3 HCT algorithm.
// ============================================================================

export const materialSemanticBaseColors: Record<string, { hex: string; description: string }> = {
  primary: { hex: '#6750A4', description: 'Primary — Main brand color' },
  onPrimary: { hex: '#FFFFFF', description: 'On Primary — Content on primary' },
  primaryContainer: { hex: '#EADDFF', description: 'Primary Container — Prominent container fill' },
  onPrimaryContainer: { hex: '#21005D', description: 'On Primary Container — Content on primary container' },
  secondary: { hex: '#625B71', description: 'Secondary — Less prominent actions' },
  onSecondary: { hex: '#FFFFFF', description: 'On Secondary — Content on secondary' },
  secondaryContainer: { hex: '#E8DEF8', description: 'Secondary Container — Less prominent container fill' },
  onSecondaryContainer: { hex: '#1D192B', description: 'On Secondary Container — Content on secondary container' },
  tertiary: { hex: '#7D5260', description: 'Tertiary — Accent, complementary' },
  onTertiary: { hex: '#FFFFFF', description: 'On Tertiary — Content on tertiary' },
  tertiaryContainer: { hex: '#FFD8E4', description: 'Tertiary Container — Accent container fill' },
  onTertiaryContainer: { hex: '#31111D', description: 'On Tertiary Container — Content on tertiary container' },
  error: { hex: '#B3261E', description: 'Error — Error states' },
  onError: { hex: '#FFFFFF', description: 'On Error — Content on error' },
  errorContainer: { hex: '#F9DEDC', description: 'Error Container — Error container fill' },
  onErrorContainer: { hex: '#410E0B', description: 'On Error Container — Content on error container' },
  surface: { hex: '#FFFBFE', description: 'Surface — Default background' },
  onSurface: { hex: '#1C1B1F', description: 'On Surface — Primary text on surface' },
  surfaceVariant: { hex: '#E7E0EC', description: 'Surface Variant — Alternative surface' },
  onSurfaceVariant: { hex: '#49454F', description: 'On Surface Variant — Secondary text on surface' },
  outline: { hex: '#79747E', description: 'Outline — Borders, dividers' },
  outlineVariant: { hex: '#CAC4D0', description: 'Outline Variant — Subtle borders' },
};

// ============================================================================
// COLLECTION BUILDER — M3-organized Figma variable collections
// ============================================================================

export function getMaterialBoilerplateCollections() {
  return [
    {
      name: 'Typography',
      modes: ['Default'],
      tokens: {
        'Font Family': materialTypographyTokens.fontFamily,
        'Font Size': materialTypographyTokens.fontSize,
        'Font Weight': materialTypographyTokens.fontWeight,
        'Line Height': materialTypographyTokens.lineHeight,
        'Letter Spacing': materialTypographyTokens.letterSpacing,
      },
    },
    {
      name: 'Effects',
      modes: ['Default'],
      tokens: {
        Shadow: materialShadowTokens.elevation,
        Transition: {
          Duration: materialTransitionTokens.duration,
          Easing: materialTransitionTokens.easing,
        },
      },
    },
    {
      name: 'Layout',
      modes: ['Default'],
      tokens: {
        Border: {
          Width: materialBorderTokens.width,
          Radius: materialBorderTokens.radius,
        },
        Opacity: materialOpacityTokens.values,
        'Z-Index': materialZIndexTokens.layers,
        'Component Height': materialComponentHeightTokens.scale,
      },
    },
    {
      name: 'Spacing',
      modes: ['Default'],
      tokens: {
        Space: materialSpacingTokens.scale,
      },
    },
    {
      name: 'Screens',
      modes: ['Default'],
      tokens: {
        Breakpoint: materialScreenTokens.breakpoints,
      },
    },
  ];
}
