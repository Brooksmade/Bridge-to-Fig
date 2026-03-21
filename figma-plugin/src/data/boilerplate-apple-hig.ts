// Apple Human Interface Guidelines Design Tokens — Boilerplate
// Based on Apple's published HIG specifications for iOS/iPadOS/macOS.
// Typography uses iOS Dynamic Type defaults. Colors use Apple's system palette.
// Reference: https://developer.apple.com/design/human-interface-guidelines/
//
// This file provides Apple HIG-specific defaults that can be used as an alternative
// to the standard boilerplate-tokens.ts (Tailwind-based). Import from this file
// when the user selects the "apple-hig" organizing principle.

import type {
  BoilerplateTokens,
  EffectStyleDefinition,
  GridStyleDefinition,
} from './boilerplate-tokens';

// ============================================================================
// TYPOGRAPHY — Apple Dynamic Type System (iOS defaults)
// SF Pro is the system font; Inter is used as a Figma proxy since SF Pro
// is not available in Figma's font library.
// ============================================================================

export const appleTypographyTokens = {
  // Font Families
  fontFamily: {
    'font-family-sans': {
      $value: 'Inter',
      $type: 'string',
      $description: 'Primary sans-serif (proxy for SF Pro — not available in Figma)',
    },
    'font-family-serif': {
      $value: 'New York Small',
      $type: 'string',
      $description: 'Serif typeface (Apple New York)',
    },
    'font-family-mono': {
      $value: 'SF Mono',
      $type: 'string',
      $description: 'Monospace for code (Apple SF Mono)',
    },
    'font-family-rounded': {
      $value: 'Inter',
      $type: 'string',
      $description: 'Rounded sans-serif (proxy for SF Pro Rounded)',
    },
  },

  // Font Sizes — iOS Dynamic Type defaults (in points)
  fontSize: {
    'font-size-caption2': { $value: 11, $type: 'float', $description: '11pt — Caption 2' },
    'font-size-caption1': { $value: 12, $type: 'float', $description: '12pt — Caption 1' },
    'font-size-footnote': { $value: 13, $type: 'float', $description: '13pt — Footnote' },
    'font-size-subheadline': { $value: 15, $type: 'float', $description: '15pt — Subheadline' },
    'font-size-callout': { $value: 16, $type: 'float', $description: '16pt — Callout' },
    'font-size-body': { $value: 17, $type: 'float', $description: '17pt — Body (default text size)' },
    'font-size-headline': { $value: 17, $type: 'float', $description: '17pt — Headline (semibold)' },
    'font-size-title3': { $value: 20, $type: 'float', $description: '20pt — Title 3' },
    'font-size-title2': { $value: 22, $type: 'float', $description: '22pt — Title 2' },
    'font-size-title1': { $value: 28, $type: 'float', $description: '28pt — Title 1' },
    'font-size-largeTitle': { $value: 34, $type: 'float', $description: '34pt — Large Title' },
  },

  // Font Weights — full CSS weight scale
  fontWeight: {
    'font-weight-ultralight': { $value: 100, $type: 'float', $description: 'Ultralight' },
    'font-weight-thin': { $value: 200, $type: 'float', $description: 'Thin' },
    'font-weight-light': { $value: 300, $type: 'float', $description: 'Light' },
    'font-weight-regular': { $value: 400, $type: 'float', $description: 'Regular' },
    'font-weight-medium': { $value: 500, $type: 'float', $description: 'Medium' },
    'font-weight-semibold': { $value: 600, $type: 'float', $description: 'Semibold' },
    'font-weight-bold': { $value: 700, $type: 'float', $description: 'Bold' },
    'font-weight-heavy': { $value: 800, $type: 'float', $description: 'Heavy' },
    'font-weight-black': { $value: 900, $type: 'float', $description: 'Black' },
  },

  // Line Heights — Apple's exact leading values (in points)
  lineHeight: {
    'line-height-caption2': { $value: 13, $type: 'float', $description: '13pt — Caption 2 leading' },
    'line-height-caption1': { $value: 16, $type: 'float', $description: '16pt — Caption 1 leading' },
    'line-height-footnote': { $value: 18, $type: 'float', $description: '18pt — Footnote leading' },
    'line-height-subheadline': { $value: 20, $type: 'float', $description: '20pt — Subheadline leading' },
    'line-height-callout': { $value: 21, $type: 'float', $description: '21pt — Callout leading' },
    'line-height-body': { $value: 22, $type: 'float', $description: '22pt — Body leading' },
    'line-height-headline': { $value: 22, $type: 'float', $description: '22pt — Headline leading' },
    'line-height-title3': { $value: 25, $type: 'float', $description: '25pt — Title 3 leading' },
    'line-height-title2': { $value: 28, $type: 'float', $description: '28pt — Title 2 leading' },
    'line-height-title1': { $value: 34, $type: 'float', $description: '34pt — Title 1 leading' },
    'line-height-largeTitle': { $value: 41, $type: 'float', $description: '41pt — Large Title leading' },
  },

  // Letter Spacing — Apple's tracking values (in points)
  letterSpacing: {
    'letter-spacing-caption2': { $value: 0.06, $type: 'float', $description: '0.06pt — Caption 2 tracking' },
    'letter-spacing-caption1': { $value: 0, $type: 'float', $description: '0pt — Caption 1 tracking' },
    'letter-spacing-footnote': { $value: -0.08, $type: 'float', $description: '-0.08pt — Footnote tracking' },
    'letter-spacing-subheadline': { $value: -0.23, $type: 'float', $description: '-0.23pt — Subheadline tracking' },
    'letter-spacing-callout': { $value: -0.31, $type: 'float', $description: '-0.31pt — Callout tracking' },
    'letter-spacing-body': { $value: -0.43, $type: 'float', $description: '-0.43pt — Body tracking' },
    'letter-spacing-headline': { $value: -0.43, $type: 'float', $description: '-0.43pt — Headline tracking' },
    'letter-spacing-title3': { $value: -0.45, $type: 'float', $description: '-0.45pt — Title 3 tracking' },
    'letter-spacing-title2': { $value: 0.35, $type: 'float', $description: '0.35pt — Title 2 tracking' },
    'letter-spacing-title1': { $value: 0.38, $type: 'float', $description: '0.38pt — Title 1 tracking' },
    'letter-spacing-largeTitle': { $value: 0.40, $type: 'float', $description: '0.40pt — Large Title tracking' },
  },
};

// ============================================================================
// SHADOWS — Apple HIG: subtle, layered shadows
// Apple favors soft, diffused shadows with minimal offset
// ============================================================================

export const appleShadowTokens = {
  elevation: {
    'shadow-none': { $value: '0 0 #0000', $type: 'string', $description: 'No shadow' },
    'shadow-small': {
      $value: '0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06)',
      $type: 'string',
      $description: 'Small shadow — cards, buttons',
    },
    'shadow-medium': {
      $value: '0 4px 6px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.06)',
      $type: 'string',
      $description: 'Medium shadow — popovers, menus',
    },
    'shadow-large': {
      $value: '0 10px 15px rgb(0 0 0 / 0.1), 0 4px 6px rgb(0 0 0 / 0.05)',
      $type: 'string',
      $description: 'Large shadow — sheets, dialogs',
    },
    'shadow-modal': {
      $value: '0 25px 50px rgb(0 0 0 / 0.25)',
      $type: 'string',
      $description: 'Modal shadow — full-screen overlays',
    },
  },
};

// Figma Effect Style Definitions — Apple HIG shadow scale
export const appleEffectStyleDefinitions: EffectStyleDefinition[] = [
  {
    name: 'Shadow/Small',
    description: 'Small shadow — cards, buttons',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 1, radius: 3, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Medium',
    description: 'Medium shadow — popovers, menus',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000012', offsetX: 0, offsetY: 4, radius: 6, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Large',
    description: 'Large shadow — sheets, dialogs',
    effects: [
      { type: 'DROP_SHADOW', color: '#0000001a', offsetX: 0, offsetY: 10, radius: 15, spread: 0 },
    ],
  },
  {
    name: 'Shadow/Modal',
    description: 'Modal shadow — full-screen overlays',
    effects: [
      { type: 'DROP_SHADOW', color: '#00000040', offsetX: 0, offsetY: 25, radius: 50, spread: 0 },
    ],
  },
];

// ============================================================================
// BORDERS — Apple HIG
// Apple uses continuous (superellipse) corners and hairline borders
// ============================================================================

export const appleBorderTokens = {
  // Border Widths — Apple hairline-first approach
  width: {
    'border-width-hairline': { $value: 0.33, $type: 'float', $description: '0.33px — Hairline (1/3pt retina)' },
    'border-width-thin': { $value: 0.5, $type: 'float', $description: '0.5px — Thin border (1/2pt retina)' },
    'border-width-regular': { $value: 1, $type: 'float', $description: '1px — Standard border' },
    'border-width-thick': { $value: 2, $type: 'float', $description: '2px — Thick/emphasized border' },
  },

  // Corner Radius — Apple continuous corner scale
  radius: {
    'corner-radius-none': { $value: 0, $type: 'float', $description: 'No radius — sharp corners' },
    'corner-radius-small': { $value: 6, $type: 'float', $description: '6px — Small rounding (text fields)' },
    'corner-radius-medium': { $value: 10, $type: 'float', $description: '10px — Medium rounding (buttons)' },
    'corner-radius-large': { $value: 12, $type: 'float', $description: '12px — Large rounding (cards)' },
    'corner-radius-xlarge': { $value: 16, $type: 'float', $description: '16px — Extra large rounding' },
    'corner-radius-card': { $value: 20, $type: 'float', $description: '20px — Card/widget rounding' },
    'corner-radius-notification': { $value: 26, $type: 'float', $description: '26px — Notification banner' },
    'corner-radius-sheet': { $value: 38, $type: 'float', $description: '38px — Sheet/modal rounding' },
    'corner-radius-full': { $value: 9999, $type: 'float', $description: 'Pill shape — full rounding' },
  },
};

// ============================================================================
// OPACITY — Apple HIG label and overlay values
// ============================================================================

export const appleOpacityTokens = {
  values: {
    'opacity-0': { $value: 0, $type: 'float', $description: 'Fully transparent' },
    'opacity-quaternaryLabel': { $value: 0.18, $type: 'float', $description: 'Quaternary label opacity' },
    'opacity-disabled': { $value: 0.3, $type: 'float', $description: 'Disabled state opacity' },
    'opacity-tertiaryLabel': { $value: 0.3, $type: 'float', $description: 'Tertiary label opacity' },
    'opacity-overlay': { $value: 0.4, $type: 'float', $description: 'Overlay/scrim opacity' },
    'opacity-secondaryLabel': { $value: 0.6, $type: 'float', $description: 'Secondary label opacity' },
    'opacity-100': { $value: 1, $type: 'float', $description: 'Fully opaque' },
  },
};

// ============================================================================
// TRANSITIONS — Apple standard animation durations and spring curves
// ============================================================================

export const appleTransitionTokens = {
  duration: {
    'animation-duration-instant': { $value: 0, $type: 'float', $description: 'No transition' },
    'animation-duration-quick': { $value: 150, $type: 'float', $description: '150ms — Quick micro-interactions' },
    'animation-duration-default': { $value: 250, $type: 'float', $description: '250ms — Standard transitions' },
    'animation-duration-spring': { $value: 350, $type: 'float', $description: '350ms — Spring animations' },
    'animation-duration-modal': { $value: 500, $type: 'float', $description: '500ms — Modal present/dismiss' },
    'animation-duration-slow': { $value: 700, $type: 'float', $description: '700ms — Slow/elaborate transitions' },
  },

  // Apple spring curves
  easing: {
    'ease-default': {
      $value: 'cubic-bezier(0.2, 0, 0, 1)',
      $type: 'string',
      $description: 'Default ease (Apple standard)',
    },
    'ease-spring': {
      $value: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      $type: 'string',
      $description: 'Spring bounce ease',
    },
    'ease-decelerate': {
      $value: 'cubic-bezier(0, 0, 0.58, 1)',
      $type: 'string',
      $description: 'Decelerate — entering elements',
    },
    'ease-accelerate': {
      $value: 'cubic-bezier(0.42, 0, 1, 1)',
      $type: 'string',
      $description: 'Accelerate — exiting elements',
    },
  },
};

// ============================================================================
// SPACING — Apple 4pt/8pt grid system
// ============================================================================

export const appleSpacingTokens = {
  scale: {
    'spacing-0': { $value: 0, $type: 'float', $description: '0px — No spacing' },
    'spacing-2': { $value: 2, $type: 'float', $description: '2px — Hairline gaps' },
    'spacing-4': { $value: 4, $type: 'float', $description: '4px — Tight spacing (half grid)' },
    'spacing-6': { $value: 6, $type: 'float', $description: '6px — Small gap' },
    'spacing-8': { $value: 8, $type: 'float', $description: '8px — Base grid unit' },
    'spacing-10': { $value: 10, $type: 'float', $description: '10px — Compact spacing' },
    'spacing-12': { $value: 12, $type: 'float', $description: '12px — Standard small gap' },
    'spacing-16': { $value: 16, $type: 'float', $description: '16px — Standard margin/padding' },
    'spacing-20': { $value: 20, $type: 'float', $description: '20px — Comfortable spacing' },
    'spacing-24': { $value: 24, $type: 'float', $description: '24px — Section spacing' },
    'spacing-32': { $value: 32, $type: 'float', $description: '32px — Large gaps' },
    'spacing-40': { $value: 40, $type: 'float', $description: '40px — Group spacing' },
    'spacing-48': { $value: 48, $type: 'float', $description: '48px — Layout spacing' },
    'spacing-64': { $value: 64, $type: 'float', $description: '64px — Major section spacing' },
    'spacing-80': { $value: 80, $type: 'float', $description: '80px — Page-level spacing' },
  },
};

// ============================================================================
// COMPONENT HEIGHTS — iOS touch targets
// Apple's minimum tap target is 44pt
// ============================================================================

export const appleComponentHeightTokens = {
  scale: {
    'component-height-small': { $value: 28, $type: 'float', $description: '28px — Small compact controls' },
    'component-height-regular': { $value: 34, $type: 'float', $description: '34px — Regular controls' },
    'component-height-standard': { $value: 44, $type: 'float', $description: '44px — Standard tap target (Apple minimum)' },
    'component-height-large': { $value: 50, $type: 'float', $description: '50px — Large controls' },
    'component-height-xlarge': { $value: 56, $type: 'float', $description: '56px — Extra large controls' },
  },
};

// ============================================================================
// SCREEN BREAKPOINTS — Apple device widths
// ============================================================================

export const appleScreenTokens = {
  breakpoints: {
    'screen-iphone-se': { $value: 375, $type: 'float', $description: '375px — iPhone SE' },
    'screen-iphone': { $value: 393, $type: 'float', $description: '393px — iPhone 15/16' },
    'screen-iphone-max': { $value: 430, $type: 'float', $description: '430px — iPhone Plus/Max' },
    'screen-ipad-mini': { $value: 744, $type: 'float', $description: '744px — iPad mini' },
    'screen-ipad': { $value: 820, $type: 'float', $description: '820px — iPad (10th gen)' },
    'screen-ipad-pro-11': { $value: 834, $type: 'float', $description: '834px — iPad Pro 11"' },
    'screen-ipad-pro-13': { $value: 1024, $type: 'float', $description: '1024px — iPad Pro 13"' },
    'screen-mac-small': { $value: 1280, $type: 'float', $description: '1280px — MacBook Air 13"' },
    'screen-mac-standard': { $value: 1440, $type: 'float', $description: '1440px — MacBook Pro 14"' },
  },
};

// ============================================================================
// GRID STYLES — Apple layout grids
// ============================================================================

export const appleGridStyleDefinitions: GridStyleDefinition[] = [
  {
    name: 'Grid/4-Column (iPhone)',
    description: '4-column grid for iPhone layouts',
    grids: [
      { pattern: 'COLUMNS', count: 4, gutterSize: 16, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/6-Column (iPad Compact)',
    description: '6-column grid for iPad compact width',
    grids: [
      { pattern: 'COLUMNS', count: 6, gutterSize: 20, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/12-Column (iPad/Mac)',
    description: '12-column grid for iPad and Mac layouts',
    grids: [
      { pattern: 'COLUMNS', count: 12, gutterSize: 20, alignment: 'STRETCH', color: '#ff00001a' },
    ],
  },
  {
    name: 'Grid/8pt',
    description: '8pt grid — Apple base spacing unit',
    grids: [
      { pattern: 'GRID', sectionSize: 8, color: '#0000ff0d' },
    ],
  },
  {
    name: 'Grid/4pt',
    description: '4pt grid — Apple half-grid for fine alignment',
    grids: [
      { pattern: 'GRID', sectionSize: 4, color: '#0000ff0d' },
    ],
  },
];

// ============================================================================
// SEMANTIC COLORS — Apple system colors (iOS light mode base values)
// These are the base hues for generating tonal scales.
// ============================================================================

export const appleSemanticBaseColors: Record<string, { hex: string; description: string }> = {
  systemBlue: { hex: '#007AFF', description: 'System Blue — default tint, links, interactive elements' },
  systemGreen: { hex: '#34C759', description: 'System Green — success, positive actions' },
  systemRed: { hex: '#FF3B30', description: 'System Red — errors, destructive actions' },
  systemOrange: { hex: '#FF9500', description: 'System Orange — warnings, attention' },
  systemYellow: { hex: '#FFCC00', description: 'System Yellow — caution, highlights' },
  systemPink: { hex: '#FF2D55', description: 'System Pink — accent, health' },
  systemPurple: { hex: '#AF52DE', description: 'System Purple — creativity, personal' },
  systemIndigo: { hex: '#5856D6', description: 'System Indigo — focus, productivity' },
  systemTeal: { hex: '#30B0C7', description: 'System Teal — communication, media' },
  systemMint: { hex: '#00C7BE', description: 'System Mint — fresh, natural' },
  systemCyan: { hex: '#32ADE6', description: 'System Cyan — information, discovery' },
  systemBrown: { hex: '#A2845E', description: 'System Brown — earth, warmth' },
};

// ============================================================================
// SYSTEM GRAY PALETTE — Apple's 6-step gray scale
// Light and dark mode have distinct values; systemGray is identical in both.
// ============================================================================

export const appleGrayPalette = {
  light: {
    'systemGray': '#8E8E93',
    'systemGray2': '#AEAEB2',
    'systemGray3': '#C7C7CC',
    'systemGray4': '#D1D1D6',
    'systemGray5': '#E5E5EA',
    'systemGray6': '#F2F2F7',
  },
  dark: {
    'systemGray': '#8E8E93',
    'systemGray2': '#636366',
    'systemGray3': '#48484A',
    'systemGray4': '#3A3A3C',
    'systemGray5': '#2C2C2E',
    'systemGray6': '#1C1C1E',
  },
};

// ============================================================================
// COLLECTION BUILDER — Apple HIG-organized Figma variable collections
// ============================================================================

export function getAppleHIGBoilerplateCollections() {
  return [
    {
      name: 'Typography',
      modes: ['Default'],
      tokens: {
        'Font Family': appleTypographyTokens.fontFamily,
        'Font Size': appleTypographyTokens.fontSize,
        'Font Weight': appleTypographyTokens.fontWeight,
        'Line Height': appleTypographyTokens.lineHeight,
        'Letter Spacing': appleTypographyTokens.letterSpacing,
      },
    },
    {
      name: 'Effects',
      modes: ['Default'],
      tokens: {
        Shadow: appleShadowTokens.elevation,
        Transition: {
          Duration: appleTransitionTokens.duration,
          Easing: appleTransitionTokens.easing,
        },
      },
    },
    {
      name: 'Layout',
      modes: ['Default'],
      tokens: {
        Border: {
          Width: appleBorderTokens.width,
          Radius: appleBorderTokens.radius,
        },
        Opacity: appleOpacityTokens.values,
        'Component Height': appleComponentHeightTokens.scale,
      },
    },
    {
      name: 'Spacing',
      modes: ['Default'],
      tokens: {
        Space: appleSpacingTokens.scale,
      },
    },
    {
      name: 'Screens',
      modes: ['Default'],
      tokens: {
        Breakpoint: appleScreenTokens.breakpoints,
      },
    },
  ];
}
