// Design System Variable Templates
// These templates define the structure for Level 2, Level 3, and Theme variables

/**
 * Template for creating a variable with light/dark mode aliases
 */
export interface VariableTemplate {
  name: string;
  lightRef: string;  // Reference to Level 1 variable (e.g., 'Gray-50')
  darkRef: string;   // Reference to Level 1 variable (e.g., 'Gray-950')
  darkestRef?: string; // Optional: Reference for 3rd mode (e.g., Spectrum "Darkest" theme)
  scopes: VariableScope[];
  description?: string;
}

/**
 * Collection names - must match exactly
 */
export const COLLECTION_NAMES = {
  level1: 'Primitive [ Level 1 ]',
  level2: 'Semantic [ Level 2 ]',
  level3: 'Tokens [ Level 3 ]',
  theme: 'Theme',
} as const;

/**
 * Mode names - must match exactly (case-sensitive)
 */
export const MODE_NAMES: {
  level1: string[];
  level2: string[];
  level3: string[];
  theme: string[];
} = {
  level1: ['Value'],
  level2: ['Light', 'Dark'],
  level3: ['Light Mode', 'Dark Mode'],
  theme: ['Light', 'Dark'],
};

/**
 * Semantic [ Level 2 ] Templates
 * These define brand and system-level color meanings
 * References: Level 1 primitives only
 */
export function getSemanticTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Brand Colors
    {
      name: 'Brand/Primary',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Primary brand color',
    },
    {
      name: 'Brand/Primary-Light',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-800`,
      scopes: ['ALL_FILLS'],
      description: 'Light variant of primary brand color',
    },
    {
      name: 'Brand/Primary-Dark',
      lightRef: `${brandColorName}-700`,
      darkRef: `${brandColorName}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Dark variant of primary brand color',
    },

    // Secondary Colors
    {
      name: 'Secondary/Secondary',
      lightRef: 'Secondary-500',
      darkRef: 'Secondary-400',
      scopes: ['ALL_FILLS'],
      description: 'Secondary brand color',
    },
    {
      name: 'Secondary/Secondary-Light',
      lightRef: 'Secondary-300',
      darkRef: 'Secondary-700',
      scopes: ['ALL_FILLS'],
      description: 'Light variant of secondary color',
    },
    {
      name: 'Secondary/Secondary-Dark',
      lightRef: 'Secondary-700',
      darkRef: 'Secondary-300',
      scopes: ['ALL_FILLS'],
      description: 'Dark variant of secondary color',
    },

    // Tertiary Colors
    {
      name: 'Tertiary/Tertiary',
      lightRef: 'Tertiary-500',
      darkRef: 'Tertiary-400',
      scopes: ['ALL_FILLS'],
      description: 'Tertiary accent color',
    },
    {
      name: 'Tertiary/Tertiary-Light',
      lightRef: 'Tertiary-300',
      darkRef: 'Tertiary-700',
      scopes: ['ALL_FILLS'],
      description: 'Light variant of tertiary color',
    },
    {
      name: 'Tertiary/Tertiary-Dark',
      lightRef: 'Tertiary-700',
      darkRef: 'Tertiary-300',
      scopes: ['ALL_FILLS'],
      description: 'Dark variant of tertiary color',
    },

    // Neutral Colors
    {
      name: 'Neutral/Light',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['ALL_FILLS'],
      description: 'Light neutral color',
    },
    {
      name: 'Neutral/Dark',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['ALL_FILLS'],
      description: 'Dark neutral color',
    },
    {
      name: 'Neutral/Medium',
      lightRef: 'Gray-500',
      darkRef: 'Gray-400',
      scopes: ['ALL_FILLS'],
      description: 'Medium neutral color',
    },

    // System/Feedback Colors
    {
      name: 'System/Success',
      lightRef: 'Success',
      darkRef: 'Success',
      scopes: ['ALL_FILLS'],
      description: 'Success state color',
    },
    {
      name: 'System/Warning',
      lightRef: 'Warning',
      darkRef: 'Warning',
      scopes: ['ALL_FILLS'],
      description: 'Warning state color',
    },
    {
      name: 'System/Error',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'Error state color',
    },
    {
      name: 'System/Info',
      lightRef: 'Info',
      darkRef: 'Info',
      scopes: ['ALL_FILLS'],
      description: 'Informational state color',
    },
  ];
}

/**
 * Tokens [ Level 3 ] Templates
 * These define UI context-specific tokens
 * References: Level 1 primitives
 * Mode names: 'Light Mode', 'Dark Mode'
 */
export function getTokenTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Surface Colors (backgrounds)
    {
      name: 'Surface/Background/Primary',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Primary surface background',
    },
    {
      name: 'Surface/Background/Secondary',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Secondary surface background',
    },
    {
      name: 'Surface/Background/Tertiary',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Tertiary surface background',
    },
    {
      name: 'Surface/Background/Inverse',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['FRAME_FILL'],
      description: 'Inverse surface background',
    },
    // Additional surface tokens for card/elevated surfaces
    {
      name: 'Surface/Page',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Page background',
    },
    {
      name: 'Surface/Card',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Card/panel background',
    },
    {
      name: 'Surface/Elevated',
      lightRef: 'Gray-50',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Elevated surface background',
    },

    // Text Colors
    {
      name: 'Text/Primary',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL'],
      description: 'Primary text color',
    },
    {
      name: 'Text/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Secondary text color',
    },
    {
      name: 'Text/Tertiary',
      lightRef: 'Gray-500',
      darkRef: 'Gray-500',
      scopes: ['TEXT_FILL'],
      description: 'Tertiary/muted text color',
    },
    {
      name: 'Text/Disabled',
      lightRef: 'Gray-400',
      darkRef: 'Gray-600',
      scopes: ['TEXT_FILL'],
      description: 'Disabled text color',
    },
    {
      name: 'Text/Inverse',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL'],
      description: 'Inverse text color (on dark backgrounds)',
    },
    {
      name: 'Text/Brand',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-400`,
      scopes: ['TEXT_FILL'],
      description: 'Brand-colored text for emphasis',
    },
    {
      name: 'Text/Link',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-400`,
      scopes: ['TEXT_FILL'],
      description: 'Link text color',
    },
    {
      name: 'Text/Link-Hover',
      lightRef: `${brandColorName}-800`,
      darkRef: `${brandColorName}-300`,
      scopes: ['TEXT_FILL'],
      description: 'Link text hover color',
    },

    // Border Colors
    {
      name: 'Border/Default',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Default border color',
    },
    {
      name: 'Border/Strong',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Strong/emphasized border color',
    },
    {
      name: 'Border/Subtle',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Subtle/light border color',
    },

    // Icon Colors
    {
      name: 'Icon/Primary',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['SHAPE_FILL'],
      description: 'Primary icon color',
    },
    {
      name: 'Icon/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['SHAPE_FILL'],
      description: 'Secondary icon color',
    },
    {
      name: 'Icon/Disabled',
      lightRef: 'Gray-400',
      darkRef: 'Gray-600',
      scopes: ['SHAPE_FILL'],
      description: 'Disabled icon color',
    },

    // Accent Colors - Secondary
    {
      name: 'Accent/Secondary',
      lightRef: 'Secondary-500',
      darkRef: 'Secondary-400',
      scopes: ['ALL_FILLS'],
      description: 'Secondary accent color',
    },
    {
      name: 'Accent/Secondary-Subtle',
      lightRef: 'Secondary-100',
      darkRef: 'Secondary-900',
      scopes: ['FRAME_FILL'],
      description: 'Subtle secondary accent background',
    },
    {
      name: 'Accent/Secondary-Strong',
      lightRef: 'Secondary-600',
      darkRef: 'Secondary-300',
      scopes: ['ALL_FILLS'],
      description: 'Strong secondary accent color',
    },

    // Accent Colors - Tertiary
    {
      name: 'Accent/Tertiary',
      lightRef: 'Tertiary-500',
      darkRef: 'Tertiary-400',
      scopes: ['ALL_FILLS'],
      description: 'Tertiary accent color',
    },
    {
      name: 'Accent/Tertiary-Subtle',
      lightRef: 'Tertiary-100',
      darkRef: 'Tertiary-900',
      scopes: ['FRAME_FILL'],
      description: 'Subtle tertiary accent background',
    },
    {
      name: 'Accent/Tertiary-Strong',
      lightRef: 'Tertiary-600',
      darkRef: 'Tertiary-300',
      scopes: ['ALL_FILLS'],
      description: 'Strong tertiary accent color',
    },
  ];
}

/**
 * Theme Templates
 * These provide global theming support
 * References: Level 1 primitives
 * Mode names: 'Light', 'Dark'
 */
export function getThemeTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Background - Mixed approach: Brand tint for primary, Gray for neutral, Secondary/Tertiary for accents
    {
      name: 'Background/Primary',
      lightRef: `${brandColorName}-50`,
      darkRef: `${brandColorName}-950`,
      scopes: ['FRAME_FILL'],
      description: 'Primary background with brand tint',
    },
    {
      name: 'Background/Secondary',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Secondary background (neutral)',
    },
    {
      name: 'Background/Tertiary',
      lightRef: 'Secondary-100',
      darkRef: 'Secondary-800',
      scopes: ['FRAME_FILL'],
      description: 'Tertiary background with secondary color tint',
    },
    {
      name: 'Background/Accent',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-900`,
      scopes: ['FRAME_FILL'],
      description: 'Accent background with stronger brand presence',
    },
    {
      name: 'Background/Neutral',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Pure neutral background (no brand influence)',
    },
    {
      name: 'Background/Inverse',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['FRAME_FILL'],
      description: 'Inverse background color',
    },

    // Foreground
    {
      name: 'Foreground/Primary',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Primary foreground color (text/icons)',
    },
    {
      name: 'Foreground/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Secondary foreground color',
    },
    {
      name: 'Foreground/Tertiary',
      lightRef: 'Gray-500',
      darkRef: 'Gray-500',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Tertiary foreground color',
    },
    {
      name: 'Foreground/Disabled',
      lightRef: 'Gray-400',
      darkRef: 'Gray-600',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Disabled foreground color',
    },
    {
      name: 'Foreground/Inverse',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Inverse foreground color',
    },
    {
      name: 'Foreground/On-Brand',
      lightRef: 'White',
      darkRef: `${brandColorName}-50`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Text/icons on brand-colored backgrounds',
    },
    {
      name: 'Foreground/On-Secondary',
      lightRef: 'Secondary-900',
      darkRef: 'Secondary-50',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Text/icons on secondary-colored backgrounds',
    },

    // Border
    {
      name: 'Border/Default',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Default border color',
    },
    {
      name: 'Border/Strong',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Strong border color',
    },
    {
      name: 'Border/Subtle',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Subtle border color',
    },

    // Interactive (using brand color) - wider gaps for better contrast
    {
      name: 'Interactive/Default',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Default interactive element color',
    },
    {
      name: 'Interactive/Hover',
      lightRef: `${brandColorName}-700`,
      darkRef: `${brandColorName}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Hover state interactive color',
    },
    {
      name: 'Interactive/Active',
      lightRef: `${brandColorName}-900`,
      darkRef: `${brandColorName}-200`,
      scopes: ['ALL_FILLS'],
      description: 'Active/pressed state interactive color',
    },
    {
      name: 'Interactive/Disabled',
      lightRef: 'Gray-300',
      darkRef: 'Gray-700',
      scopes: ['ALL_FILLS'],
      description: 'Disabled interactive element color',
    },

    // Interactive - Secondary (using secondary color)
    {
      name: 'Interactive/Secondary-Default',
      lightRef: 'Secondary-500',
      darkRef: 'Secondary-400',
      scopes: ['ALL_FILLS'],
      description: 'Default secondary interactive element color',
    },
    {
      name: 'Interactive/Secondary-Hover',
      lightRef: 'Secondary-600',
      darkRef: 'Secondary-300',
      scopes: ['ALL_FILLS'],
      description: 'Hover state secondary interactive color',
    },
    {
      name: 'Interactive/Secondary-Active',
      lightRef: 'Secondary-700',
      darkRef: 'Secondary-200',
      scopes: ['ALL_FILLS'],
      description: 'Active/pressed state secondary interactive color',
    },

    // Interactive - Tertiary (using tertiary color)
    {
      name: 'Interactive/Tertiary-Default',
      lightRef: 'Tertiary-500',
      darkRef: 'Tertiary-400',
      scopes: ['ALL_FILLS'],
      description: 'Default tertiary interactive element color',
    },
    {
      name: 'Interactive/Tertiary-Hover',
      lightRef: 'Tertiary-600',
      darkRef: 'Tertiary-300',
      scopes: ['ALL_FILLS'],
      description: 'Hover state tertiary interactive color',
    },
    {
      name: 'Interactive/Tertiary-Active',
      lightRef: 'Tertiary-700',
      darkRef: 'Tertiary-200',
      scopes: ['ALL_FILLS'],
      description: 'Active/pressed state tertiary interactive color',
    },

    // Accent tokens - direct color references for emphasis
    {
      name: 'Accent/Primary',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Primary accent color (brand)',
    },
    {
      name: 'Accent/Secondary',
      lightRef: 'Secondary-500',
      darkRef: 'Secondary-400',
      scopes: ['ALL_FILLS'],
      description: 'Secondary accent color',
    },
    {
      name: 'Accent/Tertiary',
      lightRef: 'Tertiary-500',
      darkRef: 'Tertiary-400',
      scopes: ['ALL_FILLS'],
      description: 'Tertiary accent color',
    },

    // Feedback
    {
      name: 'Feedback/Success',
      lightRef: 'Success',
      darkRef: 'Success',
      scopes: ['ALL_FILLS'],
      description: 'Success feedback color',
    },
    {
      name: 'Feedback/Warning',
      lightRef: 'Warning',
      darkRef: 'Warning',
      scopes: ['ALL_FILLS'],
      description: 'Warning feedback color',
    },
    {
      name: 'Feedback/Error',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'Error feedback color',
    },
    {
      name: 'Feedback/Info',
      lightRef: 'Info',
      darkRef: 'Info',
      scopes: ['ALL_FILLS'],
      description: 'Info feedback color',
    },
  ];
}

/**
 * Minimum variable counts for validation (legacy - use organizing principles instead)
 */
export const MINIMUM_VARIABLE_COUNTS = {
  level1: 50,
  level2: 7,
  level3: 10,
  theme: 10,
} as const;

// ============================================================================
// ADDITIONAL TEMPLATE FUNCTIONS FOR ORGANIZING PRINCIPLES
// ============================================================================

/**
 * Simplified Token Templates (for 3-level principle)
 * Combines Semantic + Token layers into one collection
 * References: Level 1 primitives
 * Modes: 'Light', 'Dark'
 */
export function getSimplifiedTokenTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Background
    {
      name: 'Background/Primary',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Primary background',
    },
    {
      name: 'Background/Secondary',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Secondary background',
    },
    {
      name: 'Background/Tertiary',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Tertiary background',
    },

    // Text
    {
      name: 'Text/Primary',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL'],
      description: 'Primary text',
    },
    {
      name: 'Text/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Secondary text',
    },
    {
      name: 'Text/Muted',
      lightRef: 'Gray-500',
      darkRef: 'Gray-500',
      scopes: ['TEXT_FILL'],
      description: 'Muted text',
    },
    {
      name: 'Text/Inverse',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL'],
      description: 'Inverse text',
    },

    // Border
    {
      name: 'Border/Default',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Default border',
    },
    {
      name: 'Border/Strong',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Strong border',
    },

    // Brand
    {
      name: 'Brand/Primary',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Primary brand color',
    },
    {
      name: 'Brand/Hover',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-500`,
      scopes: ['ALL_FILLS'],
      description: 'Brand hover state',
    },
    {
      name: 'Brand/Active',
      lightRef: `${brandColorName}-700`,
      darkRef: `${brandColorName}-600`,
      scopes: ['ALL_FILLS'],
      description: 'Brand active state',
    },

    // Status/Feedback
    {
      name: 'Status/Success',
      lightRef: 'Success',
      darkRef: 'Success',
      scopes: ['ALL_FILLS'],
      description: 'Success state',
    },
    {
      name: 'Status/Warning',
      lightRef: 'Warning',
      darkRef: 'Warning',
      scopes: ['ALL_FILLS'],
      description: 'Warning state',
    },
    {
      name: 'Status/Error',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'Error state',
    },
    {
      name: 'Status/Info',
      lightRef: 'Info',
      darkRef: 'Info',
      scopes: ['ALL_FILLS'],
      description: 'Info state',
    },
  ];
}

/**
 * Flat Token Templates (for 2-level principle)
 * All tokens in a single collection with comprehensive coverage
 * References: Level 1 primitives
 * Modes: 'Light', 'Dark'
 */
export function getFlatTokenTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Surfaces
    {
      name: 'Surface/Page',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Page background',
    },
    {
      name: 'Surface/Card',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Card background',
    },
    {
      name: 'Surface/Elevated',
      lightRef: 'Gray-50',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Elevated surface',
    },
    {
      name: 'Surface/Overlay',
      lightRef: 'Gray-100',
      darkRef: 'Gray-850',
      scopes: ['FRAME_FILL'],
      description: 'Overlay/modal background',
    },

    // Content (text & icons)
    {
      name: 'Content/Primary',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Primary content',
    },
    {
      name: 'Content/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Secondary content',
    },
    {
      name: 'Content/Tertiary',
      lightRef: 'Gray-500',
      darkRef: 'Gray-500',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Tertiary content',
    },
    {
      name: 'Content/Disabled',
      lightRef: 'Gray-400',
      darkRef: 'Gray-600',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Disabled content',
    },
    {
      name: 'Content/Inverse',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Inverse content',
    },

    // Lines (borders & dividers)
    {
      name: 'Line/Default',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Default line/border',
    },
    {
      name: 'Line/Strong',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Strong line/border',
    },
    {
      name: 'Line/Subtle',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Subtle line/border',
    },

    // Accent (brand-colored elements)
    {
      name: 'Accent/Default',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Default accent',
    },
    {
      name: 'Accent/Hover',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-500`,
      scopes: ['ALL_FILLS'],
      description: 'Hover accent',
    },
    {
      name: 'Accent/Active',
      lightRef: `${brandColorName}-700`,
      darkRef: `${brandColorName}-600`,
      scopes: ['ALL_FILLS'],
      description: 'Active accent',
    },
    {
      name: 'Accent/Subtle',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-900`,
      scopes: ['ALL_FILLS'],
      description: 'Subtle accent background',
    },

    // State colors
    {
      name: 'State/Success',
      lightRef: 'Success',
      darkRef: 'Success',
      scopes: ['ALL_FILLS'],
      description: 'Success state',
    },
    {
      name: 'State/Warning',
      lightRef: 'Warning',
      darkRef: 'Warning',
      scopes: ['ALL_FILLS'],
      description: 'Warning state',
    },
    {
      name: 'State/Error',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'Error state',
    },
    {
      name: 'State/Info',
      lightRef: 'Info',
      darkRef: 'Info',
      scopes: ['ALL_FILLS'],
      description: 'Info state',
    },
  ];
}

/**
 * Material Design 3 System Templates
 * Based on M3 token architecture
 * References: Reference palette (Level 1)
 * Modes: 'Light', 'Dark'
 */
export function getMaterialSystemTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Primary
    {
      name: 'Primary/Primary',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Primary color',
    },
    {
      name: 'Primary/OnPrimary',
      lightRef: 'White',
      darkRef: `${brandColorName}-900`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on primary',
    },
    {
      name: 'Primary/PrimaryContainer',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-800`,
      scopes: ['FRAME_FILL'],
      description: 'Primary container',
    },
    {
      name: 'Primary/OnPrimaryContainer',
      lightRef: `${brandColorName}-900`,
      darkRef: `${brandColorName}-100`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on primary container',
    },

    // Secondary (using gray as secondary in this implementation)
    {
      name: 'Secondary/Secondary',
      lightRef: 'Gray-600',
      darkRef: 'Gray-300',
      scopes: ['ALL_FILLS'],
      description: 'Secondary color',
    },
    {
      name: 'Secondary/OnSecondary',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on secondary',
    },
    {
      name: 'Secondary/SecondaryContainer',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Secondary container',
    },
    {
      name: 'Secondary/OnSecondaryContainer',
      lightRef: 'Gray-900',
      darkRef: 'Gray-100',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on secondary container',
    },

    // Surface
    {
      name: 'Surface/Surface',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Surface',
    },
    {
      name: 'Surface/SurfaceDim',
      lightRef: 'Gray-100',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Dim surface',
    },
    {
      name: 'Surface/SurfaceBright',
      lightRef: 'White',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Bright surface',
    },
    {
      name: 'Surface/OnSurface',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on surface',
    },
    {
      name: 'Surface/OnSurfaceVariant',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Secondary content on surface',
    },

    // Outline
    {
      name: 'Outline/Outline',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Outline',
    },
    {
      name: 'Outline/OutlineVariant',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Outline variant',
    },

    // Error
    {
      name: 'Error/Error',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'Error color',
    },
    {
      name: 'Error/OnError',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on error',
    },
    {
      name: 'Error/ErrorContainer',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Error container',
    },

    // Background
    {
      name: 'Background/Background',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'Background',
    },
    {
      name: 'Background/OnBackground',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on background',
    },
  ];
}

/**
 * Material Design 3 Component Templates
 * Component-specific tokens
 * References: Reference palette (Level 1)
 * Modes: 'Light', 'Dark'
 */
export function getMaterialComponentTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Button
    {
      name: 'Button/FilledBackground',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Filled button background',
    },
    {
      name: 'Button/FilledForeground',
      lightRef: 'White',
      darkRef: `${brandColorName}-900`,
      scopes: ['TEXT_FILL'],
      description: 'Filled button text',
    },
    {
      name: 'Button/OutlinedBorder',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Outlined button border',
    },
    {
      name: 'Button/OutlinedForeground',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-300`,
      scopes: ['TEXT_FILL'],
      description: 'Outlined button text',
    },
    {
      name: 'Button/TextForeground',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-300`,
      scopes: ['TEXT_FILL'],
      description: 'Text button foreground',
    },

    // Card
    {
      name: 'Card/FilledBackground',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Filled card background',
    },
    {
      name: 'Card/ElevatedBackground',
      lightRef: 'White',
      darkRef: 'Gray-850',
      scopes: ['FRAME_FILL'],
      description: 'Elevated card background',
    },
    {
      name: 'Card/OutlinedBorder',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Outlined card border',
    },

    // Input (TextField)
    {
      name: 'Input/FilledBackground',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'Filled input background',
    },
    {
      name: 'Input/OutlinedBorder',
      lightRef: 'Gray-400',
      darkRef: 'Gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'Outlined input border',
    },
    {
      name: 'Input/FocusBorder',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Input focus border',
    },
    {
      name: 'Input/LabelText',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Input label text',
    },

    // Navigation
    {
      name: 'Nav/SelectedIndicator',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-800`,
      scopes: ['ALL_FILLS'],
      description: 'Navigation selected indicator',
    },
    {
      name: 'Nav/SelectedIcon',
      lightRef: `${brandColorName}-600`,
      darkRef: `${brandColorName}-300`,
      scopes: ['SHAPE_FILL'],
      description: 'Navigation selected icon',
    },
    {
      name: 'Nav/UnselectedIcon',
      lightRef: 'Gray-600',
      darkRef: 'Gray-400',
      scopes: ['SHAPE_FILL'],
      description: 'Navigation unselected icon',
    },
  ];
}

/**
 * Tailwind CSS Style Semantic Templates
 * Utility-first approach with semantic shortcuts
 * References: Colors collection (Level 1)
 * Modes: 'Light', 'Dark'
 */
export function getTailwindSemanticTemplates(brandColorName: string = 'Brand'): VariableTemplate[] {
  return [
    // Background utilities
    {
      name: 'bg-background',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['FRAME_FILL'],
      description: 'bg-background utility',
    },
    {
      name: 'bg-foreground',
      lightRef: 'Gray-50',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'bg-foreground utility',
    },
    {
      name: 'bg-card',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'bg-card utility',
    },
    {
      name: 'bg-card-foreground',
      lightRef: 'Gray-50',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'bg-card-foreground utility',
    },
    {
      name: 'bg-popover',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['FRAME_FILL'],
      description: 'bg-popover utility',
    },
    {
      name: 'bg-muted',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['FRAME_FILL'],
      description: 'bg-muted utility',
    },
    {
      name: 'bg-primary',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['ALL_FILLS'],
      description: 'bg-primary utility',
    },
    {
      name: 'bg-secondary',
      lightRef: 'Gray-100',
      darkRef: 'Gray-800',
      scopes: ['ALL_FILLS'],
      description: 'bg-secondary utility',
    },
    {
      name: 'bg-accent',
      lightRef: `${brandColorName}-100`,
      darkRef: `${brandColorName}-900`,
      scopes: ['ALL_FILLS'],
      description: 'bg-accent utility',
    },
    {
      name: 'bg-destructive',
      lightRef: 'Error',
      darkRef: 'Error',
      scopes: ['ALL_FILLS'],
      description: 'bg-destructive utility',
    },

    // Text utilities
    {
      name: 'text-foreground',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL'],
      description: 'text-foreground utility',
    },
    {
      name: 'text-muted-foreground',
      lightRef: 'Gray-500',
      darkRef: 'Gray-400',
      scopes: ['TEXT_FILL'],
      description: 'text-muted-foreground utility',
    },
    {
      name: 'text-primary-foreground',
      lightRef: 'White',
      darkRef: 'Gray-900',
      scopes: ['TEXT_FILL'],
      description: 'text-primary-foreground utility',
    },
    {
      name: 'text-secondary-foreground',
      lightRef: 'Gray-900',
      darkRef: 'Gray-50',
      scopes: ['TEXT_FILL'],
      description: 'text-secondary-foreground utility',
    },
    {
      name: 'text-accent-foreground',
      lightRef: `${brandColorName}-900`,
      darkRef: `${brandColorName}-50`,
      scopes: ['TEXT_FILL'],
      description: 'text-accent-foreground utility',
    },
    {
      name: 'text-destructive-foreground',
      lightRef: 'White',
      darkRef: 'White',
      scopes: ['TEXT_FILL'],
      description: 'text-destructive-foreground utility',
    },

    // Border utilities
    {
      name: 'border',
      lightRef: 'Gray-200',
      darkRef: 'Gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'border utility',
    },
    {
      name: 'border-input',
      lightRef: 'Gray-200',
      darkRef: 'Gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'border-input utility',
    },
    {
      name: 'ring',
      lightRef: `${brandColorName}-500`,
      darkRef: `${brandColorName}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'ring (focus) utility',
    },
    {
      name: 'ring-offset',
      lightRef: 'White',
      darkRef: 'Gray-950',
      scopes: ['ALL_FILLS'],
      description: 'ring-offset utility',
    },
  ];
}

// ============================================================================
// SPECTRUM-STYLE TEMPLATE FUNCTIONS
// ============================================================================

/**
 * Spectrum Alias Templates
 * Semantic color references following Adobe Spectrum's 5-role system.
 * Uses flat naming (no `/` groups) and 3-mode support (Light/Dark/Darkest).
 * References: Global collection primitives (flat names like gray-800, blue-400)
 */
export function getSpectrumAliasTemplates(brandColorName: string = 'brand'): VariableTemplate[] {
  const brand = brandColorName.toLowerCase();
  return [
    // === Accent (brand-derived) ===
    {
      name: 'accent-background-color-default',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Default accent background color',
    },
    {
      name: 'accent-background-color-hover',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-400`,
      darkestRef: `${brand}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Accent background hover state',
    },
    {
      name: 'accent-background-color-down',
      lightRef: `${brand}-1000`,
      darkRef: `${brand}-300`,
      darkestRef: `${brand}-200`,
      scopes: ['ALL_FILLS'],
      description: 'Accent background pressed/down state',
    },
    {
      name: 'accent-content-color-default',
      lightRef: 'white',
      darkRef: `${brand}-1200`,
      darkestRef: `${brand}-1300`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Content on accent backgrounds',
    },
    {
      name: 'accent-border-color-default',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Accent border color',
    },

    // === Negative (error/destructive) ===
    {
      name: 'negative-background-color-default',
      lightRef: 'negative-800',
      darkRef: 'negative-500',
      darkestRef: 'negative-400',
      scopes: ['ALL_FILLS'],
      description: 'Error/destructive background',
    },
    {
      name: 'negative-content-color-default',
      lightRef: 'negative-900',
      darkRef: 'negative-300',
      darkestRef: 'negative-200',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Error/destructive content text',
    },
    {
      name: 'negative-border-color-default',
      lightRef: 'negative-800',
      darkRef: 'negative-500',
      darkestRef: 'negative-400',
      scopes: ['STROKE_COLOR'],
      description: 'Error/destructive border',
    },

    // === Positive (success) ===
    {
      name: 'positive-background-color-default',
      lightRef: 'positive-800',
      darkRef: 'positive-500',
      darkestRef: 'positive-400',
      scopes: ['ALL_FILLS'],
      description: 'Success background',
    },
    {
      name: 'positive-content-color-default',
      lightRef: 'positive-900',
      darkRef: 'positive-300',
      darkestRef: 'positive-200',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Success content text',
    },
    {
      name: 'positive-border-color-default',
      lightRef: 'positive-800',
      darkRef: 'positive-500',
      darkestRef: 'positive-400',
      scopes: ['STROKE_COLOR'],
      description: 'Success border',
    },

    // === Notice (warning) ===
    {
      name: 'notice-background-color-default',
      lightRef: 'notice-800',
      darkRef: 'notice-500',
      darkestRef: 'notice-400',
      scopes: ['ALL_FILLS'],
      description: 'Warning background',
    },
    {
      name: 'notice-content-color-default',
      lightRef: 'notice-900',
      darkRef: 'notice-300',
      darkestRef: 'notice-200',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Warning content text',
    },
    {
      name: 'notice-border-color-default',
      lightRef: 'notice-800',
      darkRef: 'notice-500',
      darkestRef: 'notice-400',
      scopes: ['STROKE_COLOR'],
      description: 'Warning border',
    },

    // === Informative (info) ===
    {
      name: 'informative-background-color-default',
      lightRef: 'informative-800',
      darkRef: 'informative-500',
      darkestRef: 'informative-400',
      scopes: ['ALL_FILLS'],
      description: 'Informative background',
    },
    {
      name: 'informative-content-color-default',
      lightRef: 'informative-900',
      darkRef: 'informative-300',
      darkestRef: 'informative-200',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Informative content text',
    },
    {
      name: 'informative-border-color-default',
      lightRef: 'informative-800',
      darkRef: 'informative-500',
      darkestRef: 'informative-400',
      scopes: ['STROKE_COLOR'],
      description: 'Informative border',
    },

    // === Neutral backgrounds ===
    {
      name: 'background-color-default',
      lightRef: 'gray-100',
      darkRef: 'gray-800',
      darkestRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Default page background (gray-100 per theme)',
    },
    {
      name: 'background-color-elevated',
      lightRef: 'white',
      darkRef: 'gray-700',
      darkestRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'Elevated surface (cards, popovers)',
    },
    {
      name: 'background-color-layer-1',
      lightRef: 'gray-200',
      darkRef: 'gray-700',
      darkestRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'First layer above background',
    },
    {
      name: 'background-color-layer-2',
      lightRef: 'gray-300',
      darkRef: 'gray-600',
      darkestRef: 'gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Second layer above background',
    },

    // === Neutral content (text/icons) ===
    {
      name: 'heading-color',
      lightRef: 'gray-1100',
      darkRef: 'gray-100',
      darkestRef: 'gray-100',
      scopes: ['TEXT_FILL'],
      description: 'Heading text color (highest contrast)',
    },
    {
      name: 'body-color',
      lightRef: 'gray-900',
      darkRef: 'gray-200',
      darkestRef: 'gray-200',
      scopes: ['TEXT_FILL'],
      description: 'Body text color',
    },
    {
      name: 'detail-color',
      lightRef: 'gray-700',
      darkRef: 'gray-400',
      darkestRef: 'gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Detail/caption text color',
    },
    {
      name: 'disabled-content-color',
      lightRef: 'gray-400',
      darkRef: 'gray-600',
      darkestRef: 'gray-700',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Disabled text/icon color',
    },

    // === Neutral borders ===
    {
      name: 'border-color-default',
      lightRef: 'gray-300',
      darkRef: 'gray-600',
      darkestRef: 'gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Default border color',
    },
    {
      name: 'border-color-hover',
      lightRef: 'gray-400',
      darkRef: 'gray-500',
      darkestRef: 'gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Border hover state',
    },
    {
      name: 'border-color-focus',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Focus indicator border (accent)',
    },
    {
      name: 'border-color-disabled',
      lightRef: 'gray-200',
      darkRef: 'gray-700',
      darkestRef: 'gray-900',
      scopes: ['STROKE_COLOR'],
      description: 'Disabled border color',
    },

    // === Icon colors ===
    {
      name: 'icon-color-default',
      lightRef: 'gray-900',
      darkRef: 'gray-200',
      darkestRef: 'gray-200',
      scopes: ['SHAPE_FILL'],
      description: 'Default icon color',
    },
    {
      name: 'icon-color-hover',
      lightRef: 'gray-1100',
      darkRef: 'gray-100',
      darkestRef: 'gray-100',
      scopes: ['SHAPE_FILL'],
      description: 'Icon hover color',
    },
    {
      name: 'icon-color-disabled',
      lightRef: 'gray-400',
      darkRef: 'gray-600',
      darkestRef: 'gray-700',
      scopes: ['SHAPE_FILL'],
      description: 'Disabled icon color',
    },

    // === Disabled backgrounds ===
    {
      name: 'disabled-background-color',
      lightRef: 'gray-200',
      darkRef: 'gray-700',
      darkestRef: 'gray-900',
      scopes: ['ALL_FILLS'],
      description: 'Disabled element background',
    },

    // === Focus ===
    {
      name: 'focus-indicator-color',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Focus ring indicator color',
    },

    // === Overlay ===
    {
      name: 'overlay-color',
      lightRef: 'black',
      darkRef: 'black',
      darkestRef: 'black',
      scopes: ['ALL_FILLS'],
      description: 'Overlay/scrim color (apply opacity separately)',
    },
  ];
}

/**
 * Spectrum Component Templates
 * Component-scoped tokens following Spectrum's per-component isolation.
 * Uses flat naming and 3-mode support (Light/Dark/Darkest).
 * References: Global collection primitives
 */
export function getSpectrumComponentTemplates(brandColorName: string = 'brand'): VariableTemplate[] {
  const brand = brandColorName.toLowerCase();
  return [
    // === Button ===
    {
      name: 'button-background-color-default',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Primary button background',
    },
    {
      name: 'button-background-color-hover',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-400`,
      darkestRef: `${brand}-300`,
      scopes: ['ALL_FILLS'],
      description: 'Primary button hover background',
    },
    {
      name: 'button-background-color-down',
      lightRef: `${brand}-1000`,
      darkRef: `${brand}-300`,
      darkestRef: `${brand}-200`,
      scopes: ['ALL_FILLS'],
      description: 'Primary button pressed background',
    },
    {
      name: 'button-background-color-disabled',
      lightRef: 'gray-200',
      darkRef: 'gray-700',
      darkestRef: 'gray-900',
      scopes: ['ALL_FILLS'],
      description: 'Disabled button background',
    },
    {
      name: 'button-content-color-default',
      lightRef: 'white',
      darkRef: `${brand}-1200`,
      darkestRef: `${brand}-1300`,
      scopes: ['TEXT_FILL'],
      description: 'Primary button text',
    },
    {
      name: 'button-border-color-default',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Button border color',
    },
    {
      name: 'button-secondary-background-color-default',
      lightRef: 'gray-200',
      darkRef: 'gray-700',
      darkestRef: 'gray-900',
      scopes: ['ALL_FILLS'],
      description: 'Secondary button background',
    },
    {
      name: 'button-secondary-content-color-default',
      lightRef: 'gray-900',
      darkRef: 'gray-200',
      darkestRef: 'gray-200',
      scopes: ['TEXT_FILL'],
      description: 'Secondary button text',
    },

    // === Input/TextField ===
    {
      name: 'input-background-color',
      lightRef: 'white',
      darkRef: 'gray-800',
      darkestRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'Input field background',
    },
    {
      name: 'input-border-color-default',
      lightRef: 'gray-400',
      darkRef: 'gray-500',
      darkestRef: 'gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Input border default state',
    },
    {
      name: 'input-border-color-hover',
      lightRef: 'gray-500',
      darkRef: 'gray-400',
      darkestRef: 'gray-600',
      scopes: ['STROKE_COLOR'],
      description: 'Input border hover state',
    },
    {
      name: 'input-border-color-focus',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Input border focus state',
    },
    {
      name: 'input-label-color',
      lightRef: 'gray-700',
      darkRef: 'gray-300',
      darkestRef: 'gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Input label text',
    },
    {
      name: 'input-placeholder-color',
      lightRef: 'gray-500',
      darkRef: 'gray-500',
      darkestRef: 'gray-600',
      scopes: ['TEXT_FILL'],
      description: 'Input placeholder text',
    },

    // === Card ===
    {
      name: 'card-background-color',
      lightRef: 'white',
      darkRef: 'gray-700',
      darkestRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'Card background',
    },
    {
      name: 'card-border-color',
      lightRef: 'gray-200',
      darkRef: 'gray-600',
      darkestRef: 'gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Card border',
    },

    // === Tooltip ===
    {
      name: 'tooltip-background-color',
      lightRef: 'gray-1100',
      darkRef: 'gray-200',
      darkestRef: 'gray-300',
      scopes: ['FRAME_FILL'],
      description: 'Tooltip background (inverted)',
    },
    {
      name: 'tooltip-content-color',
      lightRef: 'white',
      darkRef: 'gray-1100',
      darkestRef: 'gray-1100',
      scopes: ['TEXT_FILL'],
      description: 'Tooltip text color',
    },

    // === Checkbox ===
    {
      name: 'checkbox-control-color-default',
      lightRef: 'gray-400',
      darkRef: 'gray-500',
      darkestRef: 'gray-700',
      scopes: ['STROKE_COLOR'],
      description: 'Checkbox unchecked border',
    },
    {
      name: 'checkbox-control-color-selected',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Checkbox checked fill',
    },

    // === Switch/Toggle ===
    {
      name: 'switch-track-color-default',
      lightRef: 'gray-300',
      darkRef: 'gray-600',
      darkestRef: 'gray-800',
      scopes: ['ALL_FILLS'],
      description: 'Switch track off state',
    },
    {
      name: 'switch-track-color-selected',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Switch track on state',
    },
    {
      name: 'switch-handle-color',
      lightRef: 'white',
      darkRef: 'white',
      darkestRef: 'gray-100',
      scopes: ['ALL_FILLS'],
      description: 'Switch handle/thumb',
    },

    // === Navigation ===
    {
      name: 'nav-item-background-color-selected',
      lightRef: `${brand}-100`,
      darkRef: `${brand}-1000`,
      darkestRef: `${brand}-1100`,
      scopes: ['FRAME_FILL'],
      description: 'Selected nav item background',
    },
    {
      name: 'nav-item-content-color-default',
      lightRef: 'gray-700',
      darkRef: 'gray-300',
      darkestRef: 'gray-400',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Nav item text/icon default',
    },
    {
      name: 'nav-item-content-color-selected',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-400`,
      darkestRef: `${brand}-300`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Selected nav item text/icon',
    },

    // === Tab ===
    {
      name: 'tab-indicator-color-selected',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      darkestRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Selected tab indicator',
    },
    {
      name: 'tab-content-color-default',
      lightRef: 'gray-700',
      darkRef: 'gray-300',
      darkestRef: 'gray-400',
      scopes: ['TEXT_FILL'],
      description: 'Tab label default',
    },
    {
      name: 'tab-content-color-selected',
      lightRef: 'gray-1100',
      darkRef: 'gray-100',
      darkestRef: 'gray-100',
      scopes: ['TEXT_FILL'],
      description: 'Tab label selected',
    },

    // === Badge ===
    {
      name: 'badge-background-color-default',
      lightRef: `${brand}-100`,
      darkRef: `${brand}-1000`,
      darkestRef: `${brand}-1100`,
      scopes: ['ALL_FILLS'],
      description: 'Badge background',
    },
    {
      name: 'badge-content-color-default',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-300`,
      darkestRef: `${brand}-200`,
      scopes: ['TEXT_FILL'],
      description: 'Badge text',
    },

    // === Divider ===
    {
      name: 'divider-color-default',
      lightRef: 'gray-300',
      darkRef: 'gray-600',
      darkestRef: 'gray-800',
      scopes: ['STROKE_COLOR', 'ALL_FILLS'],
      description: 'Divider/separator color',
    },
  ];
}

/**
 * Spectrum System Templates
 * Brand bridge layer — maps component tokens for brand variants.
 * Modes: "Default" and "Express" (2 brand variants, not light/dark).
 * References: Global collection primitives.
 *
 * The System layer enables multi-brand theming from the same design system.
 * "Default" = standard Spectrum, "Express" = Adobe Express (bolder, rounder).
 */
export function getSpectrumSystemTemplates(brandColorName: string = 'brand'): VariableTemplate[] {
  const brand = brandColorName.toLowerCase();
  return [
    // === System backgrounds ===
    {
      name: 'system-background-color-default',
      lightRef: 'gray-100',
      darkRef: 'gray-100',
      scopes: ['FRAME_FILL'],
      description: 'System background — maps to different values per brand',
    },
    {
      name: 'system-accent-color',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-700`,
      scopes: ['ALL_FILLS'],
      description: 'System accent — can shift hue/saturation per brand',
    },
    {
      name: 'system-accent-color-hover',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-800`,
      scopes: ['ALL_FILLS'],
      description: 'System accent hover per brand',
    },

    // === System typography colors ===
    {
      name: 'system-heading-color',
      lightRef: 'gray-1100',
      darkRef: 'gray-1100',
      scopes: ['TEXT_FILL'],
      description: 'System heading text per brand',
    },
    {
      name: 'system-body-color',
      lightRef: 'gray-900',
      darkRef: 'gray-900',
      scopes: ['TEXT_FILL'],
      description: 'System body text per brand',
    },

    // === System borders ===
    {
      name: 'system-border-color',
      lightRef: 'gray-300',
      darkRef: 'gray-400',
      scopes: ['STROKE_COLOR'],
      description: 'System border per brand — Express uses thicker, more visible borders',
    },
    {
      name: 'system-focus-indicator-color',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-700`,
      scopes: ['STROKE_COLOR'],
      description: 'System focus indicator per brand',
    },

    // === System component overrides ===
    {
      name: 'system-button-background-color',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-700`,
      scopes: ['ALL_FILLS'],
      description: 'System button background — Express may use different saturation',
    },
    {
      name: 'system-button-content-color',
      lightRef: 'white',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'System button text per brand',
    },
    {
      name: 'system-card-background-color',
      lightRef: 'white',
      darkRef: 'white',
      scopes: ['FRAME_FILL'],
      description: 'System card background per brand',
    },
    {
      name: 'system-input-border-color',
      lightRef: 'gray-400',
      darkRef: 'gray-500',
      scopes: ['STROKE_COLOR'],
      description: 'System input border per brand',
    },
    {
      name: 'system-nav-background-color',
      lightRef: 'gray-100',
      darkRef: 'gray-200',
      scopes: ['FRAME_FILL'],
      description: 'System nav background per brand',
    },
  ];
}

// ============================================================================
// APPLE HIG TEMPLATES
// Apple Human Interface Guidelines token architecture
// Collection 1 (Dynamic Colors): Semantic colors with Light/Dark mode aliases
// Collection 2 (Component Tokens): Component-scoped tokens
// Uses Apple's camelCase naming grouped with / separators
// References: System Palette primitives (flat names like gray-600, systemBlue-800)
// ============================================================================

/**
 * Apple HIG Dynamic Colors — semantic color aliases
 * Maps to iOS UIColor semantic colors and macOS NSColor dynamic colors.
 * References primitives from "System Palette" collection.
 */
export function getAppleHIGDynamicTemplates(brandColorName: string = 'systemBlue'): VariableTemplate[] {
  const brand = brandColorName.toLowerCase();
  return [
    // === Backgrounds (System set — flat/ungrouped) ===
    {
      name: 'Background/systemBackground',
      lightRef: 'white',
      darkRef: 'black',
      scopes: ['FRAME_FILL'],
      description: 'Primary overall view background',
    },
    {
      name: 'Background/secondarySystemBackground',
      lightRef: 'gray-100',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Grouping content within overall view',
    },
    {
      name: 'Background/tertiarySystemBackground',
      lightRef: 'white',
      darkRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'Content within secondary elements',
    },

    // === Backgrounds (Grouped set — table views) ===
    {
      name: 'Background/systemGroupedBackground',
      lightRef: 'gray-100',
      darkRef: 'black',
      scopes: ['FRAME_FILL'],
      description: 'Primary grouped table view background',
    },
    {
      name: 'Background/secondarySystemGroupedBackground',
      lightRef: 'white',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Content grouping in grouped layout',
    },
    {
      name: 'Background/tertiarySystemGroupedBackground',
      lightRef: 'gray-100',
      darkRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'Content within secondary grouping',
    },

    // === Labels (4 levels) ===
    {
      name: 'Label/label',
      lightRef: 'black',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'Primary content text',
    },
    {
      name: 'Label/secondaryLabel',
      lightRef: 'gray-600',
      darkRef: 'gray-500',
      scopes: ['TEXT_FILL'],
      description: 'Secondary content text (60% opacity equivalent)',
    },
    {
      name: 'Label/tertiaryLabel',
      lightRef: 'gray-500',
      darkRef: 'gray-700',
      scopes: ['TEXT_FILL'],
      description: 'Tertiary content text (30% opacity equivalent)',
    },
    {
      name: 'Label/quaternaryLabel',
      lightRef: 'gray-400',
      darkRef: 'gray-800',
      scopes: ['TEXT_FILL'],
      description: 'Quaternary content text (18% opacity equivalent)',
    },
    {
      name: 'Label/placeholderText',
      lightRef: 'gray-400',
      darkRef: 'gray-700',
      scopes: ['TEXT_FILL'],
      description: 'Placeholder text in controls and text views',
    },

    // === Fill Colors (4 levels — for thin overlays) ===
    {
      name: 'Fill/systemFill',
      lightRef: 'gray-500',
      darkRef: 'gray-600',
      scopes: ['ALL_FILLS'],
      description: 'System fill (thin overlay, 20% light / 36% dark equivalent)',
    },
    {
      name: 'Fill/secondarySystemFill',
      lightRef: 'gray-400',
      darkRef: 'gray-700',
      scopes: ['ALL_FILLS'],
      description: 'Secondary system fill (16% light / 32% dark equivalent)',
    },
    {
      name: 'Fill/tertiarySystemFill',
      lightRef: 'gray-300',
      darkRef: 'gray-800',
      scopes: ['ALL_FILLS'],
      description: 'Tertiary system fill (12% light / 24% dark equivalent)',
    },
    {
      name: 'Fill/quaternarySystemFill',
      lightRef: 'gray-200',
      darkRef: 'gray-900',
      scopes: ['ALL_FILLS'],
      description: 'Quaternary system fill (8% light / 18% dark equivalent)',
    },

    // === Separators ===
    {
      name: 'Separator/separator',
      lightRef: 'gray-300',
      darkRef: 'gray-800',
      scopes: ['ALL_FILLS', 'STROKE_COLOR'],
      description: 'Standard separator (allows underlying content visible)',
    },
    {
      name: 'Separator/opaqueSeparator',
      lightRef: 'gray-400',
      darkRef: 'gray-900',
      scopes: ['ALL_FILLS', 'STROKE_COLOR'],
      description: 'Opaque separator (no underlying content visible)',
    },

    // === Link ===
    {
      name: 'Link/link',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL'],
      description: 'Link text color',
    },

    // === Accent / Tint ===
    {
      name: 'Accent/tintColor',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['ALL_FILLS'],
      description: 'System accent/tint color',
    },
    {
      name: 'Accent/tintColorHover',
      lightRef: `${brand}-900`,
      darkRef: `${brand}-400`,
      scopes: ['ALL_FILLS'],
      description: 'Accent/tint hover state',
    },

    // === Semantic status colors ===
    {
      name: 'Status/destructive',
      lightRef: 'systemRed-800',
      darkRef: 'systemRed-500',
      scopes: ['ALL_FILLS', 'TEXT_FILL'],
      description: 'Destructive/error action color',
    },
    {
      name: 'Status/success',
      lightRef: 'systemGreen-800',
      darkRef: 'systemGreen-500',
      scopes: ['ALL_FILLS', 'TEXT_FILL'],
      description: 'Success/positive color',
    },
    {
      name: 'Status/warning',
      lightRef: 'systemOrange-800',
      darkRef: 'systemOrange-500',
      scopes: ['ALL_FILLS', 'TEXT_FILL'],
      description: 'Warning/notice color',
    },
    {
      name: 'Status/info',
      lightRef: 'systemBlue-800',
      darkRef: 'systemBlue-500',
      scopes: ['ALL_FILLS', 'TEXT_FILL'],
      description: 'Informational color',
    },

    // === macOS Semantic Colors ===
    {
      name: 'macOS/windowBackground',
      lightRef: 'gray-100',
      darkRef: 'gray-1000',
      scopes: ['FRAME_FILL'],
      description: 'macOS window background',
    },
    {
      name: 'macOS/controlBackground',
      lightRef: 'white',
      darkRef: 'gray-900',
      scopes: ['FRAME_FILL'],
      description: 'macOS control background',
    },
    {
      name: 'macOS/selectedContentBackground',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-600`,
      scopes: ['ALL_FILLS'],
      description: 'macOS selected content background (key window)',
    },
    {
      name: 'macOS/underPageBackground',
      lightRef: 'gray-200',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'macOS background behind document content',
    },

    // === Disabled ===
    {
      name: 'Disabled/disabledContent',
      lightRef: 'gray-400',
      darkRef: 'gray-800',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Disabled text and icon color',
    },
    {
      name: 'Disabled/disabledBackground',
      lightRef: 'gray-200',
      darkRef: 'gray-1000',
      scopes: ['ALL_FILLS'],
      description: 'Disabled element background',
    },

    // === Focus ===
    {
      name: 'Focus/focusRing',
      lightRef: `${brand}-700`,
      darkRef: `${brand}-400`,
      scopes: ['STROKE_COLOR'],
      description: 'Keyboard focus indicator',
    },
  ];
}

/**
 * Apple HIG Component Tokens — component-scoped design tokens
 * Maps to iOS UIKit and SwiftUI component appearances.
 * References primitives from "System Palette" collection.
 */
export function getAppleHIGComponentTemplates(brandColorName: string = 'systemBlue'): VariableTemplate[] {
  const brand = brandColorName.toLowerCase();
  return [
    // === Button (Filled) ===
    {
      name: 'Button/filled-background',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-600`,
      scopes: ['ALL_FILLS'],
      description: 'Filled button background',
    },
    {
      name: 'Button/filled-foreground',
      lightRef: 'white',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'Filled button text',
    },
    {
      name: 'Button/tinted-background',
      lightRef: `${brand}-200`,
      darkRef: `${brand}-1300`,
      scopes: ['ALL_FILLS'],
      description: 'Tinted button background',
    },
    {
      name: 'Button/tinted-foreground',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL'],
      description: 'Tinted button text',
    },
    {
      name: 'Button/plain-foreground',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL'],
      description: 'Plain button text (no background)',
    },
    {
      name: 'Button/destructive-foreground',
      lightRef: 'systemRed-800',
      darkRef: 'systemRed-500',
      scopes: ['TEXT_FILL'],
      description: 'Destructive button text',
    },

    // === Navigation Bar ===
    {
      name: 'NavigationBar/background',
      lightRef: 'gray-100',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Navigation bar background (translucent in practice)',
    },
    {
      name: 'NavigationBar/title',
      lightRef: 'black',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'Navigation bar title text',
    },
    {
      name: 'NavigationBar/tint',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Navigation bar tint (back button, bar items)',
    },

    // === Tab Bar ===
    {
      name: 'TabBar/background',
      lightRef: 'gray-100',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Tab bar background',
    },
    {
      name: 'TabBar/selectedTint',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Selected tab item tint',
    },
    {
      name: 'TabBar/unselectedTint',
      lightRef: 'gray-600',
      darkRef: 'gray-600',
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Unselected tab item tint',
    },

    // === Toolbar ===
    {
      name: 'Toolbar/background',
      lightRef: 'gray-100',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Toolbar background',
    },
    {
      name: 'Toolbar/tint',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL', 'SHAPE_FILL'],
      description: 'Toolbar item tint',
    },

    // === Search Bar ===
    {
      name: 'SearchBar/background',
      lightRef: 'gray-200',
      darkRef: 'gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Search bar field background',
    },
    {
      name: 'SearchBar/text',
      lightRef: 'black',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'Search bar text',
    },
    {
      name: 'SearchBar/placeholder',
      lightRef: 'gray-600',
      darkRef: 'gray-600',
      scopes: ['TEXT_FILL'],
      description: 'Search bar placeholder text',
    },
    {
      name: 'SearchBar/icon',
      lightRef: 'gray-600',
      darkRef: 'gray-600',
      scopes: ['SHAPE_FILL'],
      description: 'Search bar icon (magnifying glass)',
    },

    // === Alert ===
    {
      name: 'Alert/background',
      lightRef: 'white',
      darkRef: 'gray-900',
      scopes: ['FRAME_FILL'],
      description: 'Alert dialog background',
    },
    {
      name: 'Alert/title',
      lightRef: 'black',
      darkRef: 'white',
      scopes: ['TEXT_FILL'],
      description: 'Alert title text',
    },
    {
      name: 'Alert/message',
      lightRef: 'gray-600',
      darkRef: 'gray-500',
      scopes: ['TEXT_FILL'],
      description: 'Alert message body text',
    },
    {
      name: 'Alert/destructiveAction',
      lightRef: 'systemRed-800',
      darkRef: 'systemRed-500',
      scopes: ['TEXT_FILL'],
      description: 'Alert destructive action button',
    },
    {
      name: 'Alert/defaultAction',
      lightRef: `${brand}-800`,
      darkRef: `${brand}-500`,
      scopes: ['TEXT_FILL'],
      description: 'Alert default action button',
    },

    // === Sheet ===
    {
      name: 'Sheet/background',
      lightRef: 'white',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Sheet/modal background',
    },
    {
      name: 'Sheet/handleIndicator',
      lightRef: 'gray-400',
      darkRef: 'gray-700',
      scopes: ['ALL_FILLS'],
      description: 'Sheet grab handle indicator',
    },

    // === Card / Grouped Content ===
    {
      name: 'Card/background',
      lightRef: 'white',
      darkRef: 'gray-1100',
      scopes: ['FRAME_FILL'],
      description: 'Card/grouped content background',
    },
    {
      name: 'Card/border',
      lightRef: 'gray-300',
      darkRef: 'gray-800',
      scopes: ['STROKE_COLOR'],
      description: 'Card border (when visible)',
    },

    // === Toggle / Switch ===
    {
      name: 'Toggle/trackOn',
      lightRef: 'systemGreen-800',
      darkRef: 'systemGreen-600',
      scopes: ['ALL_FILLS'],
      description: 'Toggle track on state (Apple green)',
    },
    {
      name: 'Toggle/trackOff',
      lightRef: 'gray-200',
      darkRef: 'gray-800',
      scopes: ['ALL_FILLS'],
      description: 'Toggle track off state',
    },
    {
      name: 'Toggle/thumb',
      lightRef: 'white',
      darkRef: 'white',
      scopes: ['ALL_FILLS'],
      description: 'Toggle thumb/knob',
    },

    // === Divider ===
    {
      name: 'Divider/default',
      lightRef: 'gray-300',
      darkRef: 'gray-800',
      scopes: ['ALL_FILLS', 'STROKE_COLOR'],
      description: 'Standard divider/separator line',
    },
  ];
}

/**
 * Helper to get templates by function name
 * Used by design-system.ts to dynamically call template functions
 */
export function getTemplatesByName(getterName: string, brandColorName: string = 'Brand'): VariableTemplate[] {
  const templateGetters: Record<string, (brand: string) => VariableTemplate[]> = {
    getSemanticTemplates,
    getTokenTemplates,
    getThemeTemplates,
    getSimplifiedTokenTemplates,
    getFlatTokenTemplates,
    getMaterialSystemTemplates,
    getMaterialComponentTemplates,
    getTailwindSemanticTemplates,
    getSpectrumAliasTemplates,
    getSpectrumComponentTemplates,
    getSpectrumSystemTemplates,
    getAppleHIGDynamicTemplates,
    getAppleHIGComponentTemplates,
  };

  const getter = templateGetters[getterName];
  return getter ? getter(brandColorName) : [];
}
