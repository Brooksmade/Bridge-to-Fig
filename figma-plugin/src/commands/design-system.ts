// Composite commands for creating complete design systems

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import type { ExtractedDesignTokens, ExtractedShadow } from './extract-tokens';
import {
  generateColorScale,
  generateGrayScale,
  generateWarmGrayScale,
  generateCoolGrayScale,
  generateSpectrumColorScale,
  generateSpectrumGrayScale,
  SPECTRUM_SEMANTIC_COLORS,
  SYSTEM_COLORS,
  FEEDBACK_COLORS,
} from '../utils/color-scale';
import { parseColor, getModeIdByName, convertVariableValue } from '../utils/variable-factory';
import {
  createDropShadow,
  createInnerShadow,
  createBlurEffect,
} from '../utils/style-factory';
import {
  COLLECTION_NAMES,
  MODE_NAMES,
  MINIMUM_VARIABLE_COUNTS,
  getSemanticTemplates,
  getTokenTemplates,
  getThemeTemplates,
  getTemplatesByName,
  type VariableTemplate,
} from '../data/design-system-templates';
import {
  type OrganizingPrincipleName,
  getOrganizingPrinciple,
  getPrincipleDisplayOptions,
  isValidPrincipleName,
} from '../data/organizing-principles';
import {
  typographyTokens,
  spacingTokens,
  borderTokens,
  shadowTokens,
  transitionTokens,
  opacityTokens,
  effectStyleDefinitions,
  gridStyleDefinitions,
  type EffectStyleDefinition,
  type EffectDefinition,
  type GridStyleDefinition,
  type GridDefinition,
} from '../data/boilerplate-tokens';
import {
  spectrumTypographyTokens,
  spectrumSpacingTokens,
  spectrumBorderTokens,
  spectrumShadowTokens,
  spectrumOpacityTokens,
  spectrumZIndexTokens,
  spectrumTransitionTokens,
  spectrumComponentHeightTokens,
  spectrumEffectStyleDefinitions,
  spectrumGridStyleDefinitions,
} from '../data/boilerplate-spectrum';

// === Shadow Processing Helpers ===

interface NormalizedShadow {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  key: string; // For deduplication
}

interface GroupedShadow {
  shadows: NormalizedShadow[];
  count: number;
  name: string;
  nodeIds: string[]; // All node IDs with this shadow (for binding)
}

// Round a number to 1 decimal place for grouping similar shadows
function roundShadowValue(value: number): number {
  return Math.round(value * 10) / 10;
}

// Create a normalized key for grouping similar shadows
function createShadowKey(shadow: ExtractedShadow): string {
  const type = shadow.type;
  const x = roundShadowValue(shadow.offsetX);
  const y = roundShadowValue(shadow.offsetY);
  const blur = roundShadowValue(shadow.blur);
  const spread = roundShadowValue(shadow.spread);
  // Normalize color to lowercase
  const color = shadow.color.toLowerCase();
  return `${type}|${x}|${y}|${blur}|${spread}|${color}`;
}

// Generate a descriptive name for a shadow based on its properties
function generateShadowName(shadow: NormalizedShadow, index: number): string {
  const prefix = shadow.type === 'INNER_SHADOW' ? 'Inner' : 'Shadow';

  // Categorize by blur/offset size
  const size = Math.max(shadow.blur, Math.abs(shadow.offsetY));
  let sizeName: string;
  if (size <= 2) sizeName = 'xxsmall';
  else if (size <= 4) sizeName = 'xsmall';
  else if (size <= 8) sizeName = 'small';
  else if (size <= 16) sizeName = 'medium';
  else if (size <= 24) sizeName = 'large';
  else if (size <= 48) sizeName = 'xlarge';
  else sizeName = 'xxlarge';

  // Add direction if offset is significant
  let direction = '';
  if (Math.abs(shadow.offsetX) > 1 || Math.abs(shadow.offsetY) > 1) {
    if (shadow.offsetY > 0) direction = '-down';
    else if (shadow.offsetY < 0) direction = '-up';
  }

  return `Extracted/${prefix}/${sizeName}${direction}-${index}`;
}

// Deduplicate and group extracted shadows
function processExtractedShadows(shadows: ExtractedShadow[]): GroupedShadow[] {
  const groups = new Map<string, { shadows: NormalizedShadow[]; count: number; nodeIds: string[] }>();

  for (const shadow of shadows) {
    const key = createShadowKey(shadow);
    const normalized: NormalizedShadow = {
      type: shadow.type,
      color: shadow.color,
      offsetX: roundShadowValue(shadow.offsetX),
      offsetY: roundShadowValue(shadow.offsetY),
      blur: roundShadowValue(shadow.blur),
      spread: roundShadowValue(shadow.spread),
      key,
    };

    if (!groups.has(key)) {
      groups.set(key, { shadows: [normalized], count: 0, nodeIds: [] });
    }
    const group = groups.get(key)!;
    group.count++;
    // Aggregate nodeIds from the extracted shadow
    if (shadow.nodeIds) {
      for (const nodeId of shadow.nodeIds) {
        if (!group.nodeIds.includes(nodeId)) {
          group.nodeIds.push(nodeId);
        }
      }
    }
  }

  // Sort by usage count (most used first) and generate names
  const sorted = Array.from(groups.values())
    .sort((a, b) => b.count - a.count);

  // Generate unique names
  const result: GroupedShadow[] = [];
  const nameCounters: Record<string, number> = {};

  for (const group of sorted) {
    const shadow = group.shadows[0];
    const baseName = generateShadowName(shadow, 0);
    const baseKey = baseName.replace(/-\d+$/, '');

    if (!nameCounters[baseKey]) nameCounters[baseKey] = 0;
    nameCounters[baseKey]++;

    const finalName = nameCounters[baseKey] === 1
      ? baseKey
      : `${baseKey}-${nameCounters[baseKey]}`;

    result.push({
      shadows: group.shadows,
      count: group.count,
      name: finalName,
      nodeIds: group.nodeIds,
    });
  }

  return result;
}

// === Typography Mapping Helpers ===

// Typography style structure - ordered from largest to smallest semantic role
const TYPOGRAPHY_STRUCTURE = [
  { name: 'Display/Hero', role: 'display', weight: 'Bold', minSize: 112 },
  { name: 'Display/Display XL', role: 'display', weight: 'Bold', minSize: 88 },
  { name: 'Display/Display Large', role: 'display', weight: 'Bold', minSize: 76 },
  { name: 'Display/Display 1', role: 'display', weight: 'Bold', minSize: 66 },
  { name: 'Display/Display 2', role: 'display', weight: 'Bold', minSize: 48 },
  { name: 'Headers/H1', role: 'header', weight: 'Bold', minSize: 36 },
  { name: 'Headers/H2', role: 'header', weight: 'Bold', minSize: 28 },
  { name: 'Headers/H3', role: 'header', weight: 'Bold', minSize: 22 },
  { name: 'Headers/H4', role: 'header', weight: 'SemiBold', minSize: 18 },
  { name: 'Headers/H5', role: 'header', weight: 'SemiBold', minSize: 16 },
  { name: 'Body/Body Large', role: 'body', weight: 'Regular', minSize: 17 },
  { name: 'Body/Body', role: 'body', weight: 'Regular', minSize: 14 },
  { name: 'Body/Body Small', role: 'body', weight: 'Regular', minSize: 12 },
  { name: 'Label/Label Large', role: 'label', weight: 'Medium', minSize: 13 },
  { name: 'Label/Label', role: 'label', weight: 'Medium', minSize: 11 },
  { name: 'Label/Label Small', role: 'label', weight: 'Medium', minSize: 10 },
  { name: 'Caption/Caption', role: 'caption', weight: 'Regular', minSize: 10 },
  { name: 'Caption/Caption Small', role: 'caption', weight: 'Regular', minSize: 9 },
];

interface MappedTypographyStyle {
  name: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  lineHeight?: number;
  letterSpacing?: number;
  isExtracted: boolean; // true if from file, false if boilerplate gap-fill
  nodeIds?: string[]; // Node IDs that have this font size (for binding)
}

/**
 * Map extracted typography values to text styles.
 * ONLY creates styles for font sizes that actually exist in the file.
 * Assigns semantic names based on size distribution.
 */
function mapExtractedTypography(
  extractedFontSizes: number[],
  extractedLineHeights: number[],
  extractedFontWeights: number[],
  primaryFont: string,
  fontSizeNodes?: Record<string, string[]>
): MappedTypographyStyle[] {
  if (!extractedFontSizes || extractedFontSizes.length === 0) {
    return [];
  }

  // Sort extracted sizes descending (largest first)
  const sortedSizes = [...extractedFontSizes].sort((a, b) => b - a);
  const result: MappedTypographyStyle[] = [];

  // Determine the most common font weight from extraction
  const weightMap: Record<number, string> = {
    100: 'Thin',
    200: 'ExtraLight',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black',
  };

  // Get the most common weight, default to Regular
  const defaultWeight = extractedFontWeights && extractedFontWeights.length > 0
    ? weightMap[extractedFontWeights[0]] || 'Regular'
    : 'Regular';

  // Assign semantic names based on size distribution
  // Largest sizes = Display, Medium-large = Headers, Medium = Body, Small = Label/Caption
  const totalSizes = sortedSizes.length;

  for (let i = 0; i < sortedSizes.length; i++) {
    const fontSize = sortedSizes[i];
    const position = i / Math.max(totalSizes - 1, 1); // 0 = largest, 1 = smallest

    // Determine semantic category and name based on relative position and absolute size
    let name: string;
    let weight: string;

    if (fontSize >= 48 || (position <= 0.1 && fontSize >= 36)) {
      // Display sizes (largest or >= 48px) - map to semantic display names
      if (fontSize >= 112) {
        name = 'Display/Hero';
      } else if (fontSize >= 88) {
        name = 'Display/Display XL';
      } else if (fontSize >= 76) {
        name = 'Display/Display Large';
      } else if (fontSize >= 66) {
        name = 'Display/Display 1';
      } else {
        name = 'Display/Display 2';
      }
      weight = 'Bold';
    } else if (fontSize >= 24 || (position <= 0.35 && fontSize >= 18)) {
      // Header sizes
      const headerSizes = sortedSizes.filter(s => s >= 18 && s < 48);
      const headerIndex = headerSizes.indexOf(fontSize);
      const headerNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
      name = `Headers/${headerNames[Math.min(headerIndex, headerNames.length - 1)]}`;
      weight = fontSize >= 24 ? 'Bold' : 'SemiBold';
    } else if (fontSize >= 14) {
      // Body sizes
      const bodySizes = sortedSizes.filter(s => s >= 14 && s < 18);
      const bodyIndex = bodySizes.indexOf(fontSize);
      if (bodyIndex === 0 || fontSize >= 16) {
        name = 'Body/Body Large';
      } else if (bodyIndex === 1 || fontSize >= 14) {
        name = 'Body/Body';
      } else {
        name = 'Body/Body Small';
      }
      weight = defaultWeight;
    } else if (fontSize >= 11) {
      // Label sizes
      const labelSizes = sortedSizes.filter(s => s >= 11 && s < 14);
      const labelIndex = labelSizes.indexOf(fontSize);
      if (labelIndex === 0) {
        name = 'Label/Label Large';
      } else if (labelIndex === 1) {
        name = 'Label/Label';
      } else {
        name = 'Label/Label Small';
      }
      weight = 'Medium';
    } else {
      // Caption sizes (smallest)
      const captionSizes = sortedSizes.filter(s => s < 11);
      const captionIndex = captionSizes.indexOf(fontSize);
      name = captionIndex === 0 ? 'Caption/Caption' : 'Caption/Caption Small';
      weight = 'Regular';
    }

    // Ensure unique names by appending size if duplicate
    const existingNames = result.map(r => r.name);
    if (existingNames.includes(name)) {
      name = `${name} (${fontSize}px)`;
    }

    // Calculate line height
    let lineHeight = Math.round(fontSize * 1.4);
    const closestLineHeight = extractedLineHeights?.find(lh =>
      Math.abs(lh - lineHeight) < 4 || Math.abs(lh / fontSize - 1.4) < 0.2
    );
    if (closestLineHeight) lineHeight = Math.round(closestLineHeight);

    // Get node IDs for this font size
    const sizeKey = String(Math.round(fontSize));
    const nodeIds = fontSizeNodes?.[sizeKey] || [];

    result.push({
      name,
      fontSize,
      fontWeight: weight,
      fontFamily: primaryFont,
      lineHeight,
      isExtracted: true,
      nodeIds,
    });
  }

  return result;
}

/**
 * Map extracted typography to Spectrum-style text styles.
 * Spectrum defines 4 text component types: Heading, Body, Detail, Code.
 * Uses flat naming (heading-xxl, body-m, detail-s, code-m).
 * Font scale follows Spectrum's 1.125 major second ratio.
 */
function mapExtractedTypographySpectrum(
  extractedFontSizes: number[],
  extractedLineHeights: number[],
  extractedFontWeights: number[],
  primaryFont: string,
  fontSizeNodes?: Record<string, string[]>
): MappedTypographyStyle[] {
  if (!extractedFontSizes || extractedFontSizes.length === 0) {
    return [];
  }

  const sortedSizes = [...extractedFontSizes].sort((a, b) => b - a);
  const result: MappedTypographyStyle[] = [];

  const weightMap: Record<number, string> = {
    100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
  };

  const defaultWeight = extractedFontWeights?.length > 0
    ? weightMap[extractedFontWeights[0]] || 'Regular'
    : 'Regular';

  for (let i = 0; i < sortedSizes.length; i++) {
    const fontSize = sortedSizes[i];
    let name: string;
    let weight: string;

    // Spectrum's 4-type system with flat naming
    if (fontSize >= 45) {
      // Heading — large display/hero sizes
      if (fontSize >= 80) name = 'heading-xxxl';
      else if (fontSize >= 60) name = 'heading-xxl';
      else name = 'heading-xl';
      weight = 'Bold';
    } else if (fontSize >= 20) {
      // Heading — standard heading sizes
      if (fontSize >= 36) name = 'heading-l';
      else if (fontSize >= 28) name = 'heading-m';
      else if (fontSize >= 24) name = 'heading-s';
      else name = 'heading-xs';
      weight = fontSize >= 28 ? 'Bold' : 'SemiBold';
    } else if (fontSize >= 13) {
      // Body — paragraph/component text
      if (fontSize >= 18) name = 'body-xl';
      else if (fontSize >= 16) name = 'body-l';
      else if (fontSize >= 14) name = 'body-m';
      else name = 'body-s';
      weight = defaultWeight;
    } else {
      // Detail — captions and supplementary text
      if (fontSize >= 12) name = 'detail-l';
      else if (fontSize >= 11) name = 'detail-m';
      else name = 'detail-s';
      weight = 'Regular';
    }

    // Ensure unique names
    const existingNames = result.map(r => r.name);
    if (existingNames.includes(name)) {
      name = `${name}-${Math.round(fontSize)}`;
    }

    // Calculate line height using Spectrum ratios
    // Heading/Detail: 1.3×, Body: 1.5×
    let lineHeight: number;
    if (name.startsWith('heading-') || name.startsWith('detail-')) {
      lineHeight = Math.round(fontSize * 1.3);
    } else {
      lineHeight = Math.round(fontSize * 1.5);
    }

    // Check if extracted line height is close
    const closestLineHeight = extractedLineHeights?.find(lh =>
      Math.abs(lh - lineHeight) < 4 || Math.abs(lh / fontSize - 1.4) < 0.2
    );
    if (closestLineHeight) lineHeight = Math.round(closestLineHeight);

    const sizeKey = String(Math.round(fontSize));
    const nodeIds = fontSizeNodes?.[sizeKey] || [];

    result.push({
      name,
      fontSize,
      fontWeight: weight,
      fontFamily: primaryFont,
      lineHeight,
      isExtracted: true,
      nodeIds,
    });
  }

  return result;
}

// Spectrum default typography styles (used when no extracted tokens)
// Based on Spectrum's 1.125 major second ratio, 14px desktop base
const SPECTRUM_DEFAULT_TYPOGRAPHY_STYLES: TypographyStyleDefinition[] = [
  // Heading — creates hierarchical levels
  { name: 'heading-xxxl', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 60, lineHeight: 78 },
  { name: 'heading-xxl', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 48, lineHeight: 62 },
  { name: 'heading-xl', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 36, lineHeight: 47 },
  { name: 'heading-l', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 28, lineHeight: 36 },
  { name: 'heading-m', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 22, lineHeight: 29 },
  { name: 'heading-s', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 18, lineHeight: 23 },
  { name: 'heading-xs', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 16, lineHeight: 21 },
  { name: 'heading-xxs', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 14, lineHeight: 18 },

  // Body — component and paragraph text
  { name: 'body-xl', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 20, lineHeight: 30 },
  { name: 'body-l', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 18, lineHeight: 27 },
  { name: 'body-m', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 16, lineHeight: 24 },
  { name: 'body-s', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 14, lineHeight: 21 },
  { name: 'body-xs', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 12, lineHeight: 18 },

  // Detail — captions and supplementary text
  { name: 'detail-l', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 14, lineHeight: 18 },
  { name: 'detail-m', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 12, lineHeight: 16 },
  { name: 'detail-s', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 11, lineHeight: 14 },

  // Code — monospace code text
  { name: 'code-l', fontFamily: 'Source Code Pro', fontStyle: 'Regular', fontSize: 16, lineHeight: 24 },
  { name: 'code-m', fontFamily: 'Source Code Pro', fontStyle: 'Regular', fontSize: 14, lineHeight: 21 },
  { name: 'code-s', fontFamily: 'Source Code Pro', fontStyle: 'Regular', fontSize: 12, lineHeight: 18 },
];

// === Shadow/Effect Style Mapping Helpers ===

// Shadow structure matching the boilerplate naming - ordered by blur/elevation size
const SHADOW_STRUCTURE = [
  { name: 'Shadow/xxsmall', role: 'elevation', minBlur: 0, maxBlur: 2, isInner: false },
  { name: 'Shadow/xsmall', role: 'elevation', minBlur: 2, maxBlur: 4, isInner: false },
  { name: 'Shadow/small', role: 'elevation', minBlur: 4, maxBlur: 8, isInner: false },
  { name: 'Shadow/medium', role: 'elevation', minBlur: 8, maxBlur: 16, isInner: false },
  { name: 'Shadow/large', role: 'elevation', minBlur: 16, maxBlur: 24, isInner: false },
  { name: 'Shadow/xlarge', role: 'elevation', minBlur: 24, maxBlur: 48, isInner: false },
  { name: 'Shadow/xxlarge', role: 'elevation', minBlur: 48, maxBlur: 100, isInner: false },
  // Component-specific shadows (inner shadows)
  { name: 'Shadow/button', role: 'component', minBlur: 0, maxBlur: 8, isInner: true },
  { name: 'Shadow/input', role: 'component', minBlur: 0, maxBlur: 12, isInner: true },
  { name: 'Shadow/block', role: 'component', minBlur: 0, maxBlur: 32, isInner: false },
];

// Spectrum shadow structure — 4 elevation levels matching Spectrum's tooltip/dropdown/dialog/overlay model
const SPECTRUM_SHADOW_STRUCTURE = [
  { name: 'Shadow/100', role: 'elevation', minBlur: 0, maxBlur: 4, isInner: false },
  { name: 'Shadow/200', role: 'elevation', minBlur: 4, maxBlur: 16, isInner: false },
  { name: 'Shadow/300', role: 'elevation', minBlur: 16, maxBlur: 32, isInner: false },
  { name: 'Shadow/400', role: 'elevation', minBlur: 32, maxBlur: 100, isInner: false },
];

interface MappedEffectStyle {
  name: string;
  effects: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW';
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
  }>;
  nodeIds: string[]; // For binding back to original nodes
  isExtracted: boolean; // true if from file, false if boilerplate gap-fill
  usageCount: number;
}

/**
 * Map extracted shadows to the design system structure.
 * Uses extracted shadow values where possible, fills gaps with boilerplate.
 */
function mapExtractedShadowsToStructure(
  groupedShadows: GroupedShadow[],
  shadowStructure: typeof SHADOW_STRUCTURE = SHADOW_STRUCTURE
): MappedEffectStyle[] {
  const result: MappedEffectStyle[] = [];
  const usedShadowKeys = new Set<string>();

  // Separate drop shadows from inner shadows
  const dropShadows = groupedShadows.filter(g => g.shadows[0].type === 'DROP_SHADOW');
  const innerShadows = groupedShadows.filter(g => g.shadows[0].type === 'INNER_SHADOW');

  // Sort by blur size (ascending) for elevation mapping
  const sortedDropShadows = [...dropShadows].sort((a, b) => a.shadows[0].blur - b.shadows[0].blur);
  const sortedInnerShadows = [...innerShadows].sort((a, b) => a.shadows[0].blur - b.shadows[0].blur);

  // Helper to find best matching shadow for a structure slot
  function findBestShadow(
    pool: GroupedShadow[],
    minBlur: number,
    maxBlur: number,
    isInner: boolean
  ): GroupedShadow | null {
    // Find shadows in the blur range that haven't been used
    const candidates = pool.filter(g => {
      if (usedShadowKeys.has(g.shadows[0].key)) return false;
      const blur = g.shadows[0].blur;
      const isInnerShadow = g.shadows[0].type === 'INNER_SHADOW';
      if (isInner !== isInnerShadow) return false;
      return blur >= minBlur && blur <= maxBlur;
    });

    if (candidates.length === 0) return null;

    // Prefer higher usage count (more intentional design choice)
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0];
  }

  // Map elevation shadows (drop shadows)
  const elevationSlots = shadowStructure.filter(s => s.role === 'elevation');
  for (const slot of elevationSlots) {
    const match = findBestShadow(sortedDropShadows, slot.minBlur, slot.maxBlur, false);

    if (match) {
      usedShadowKeys.add(match.shadows[0].key);
      const shadow = match.shadows[0];

      result.push({
        name: slot.name,
        effects: [{
          type: shadow.type,
          color: shadow.color,
          offsetX: shadow.offsetX,
          offsetY: shadow.offsetY,
          blur: shadow.blur,
          spread: shadow.spread,
        }],
        nodeIds: match.nodeIds,
        isExtracted: true,
        usageCount: match.count,
      });
    }
    // Don't add boilerplate here - that happens in the main function
  }

  // Map component shadows (looking for inner shadows first)
  const componentSlots = shadowStructure.filter(s => s.role === 'component');
  for (const slot of componentSlots) {
    const pool = slot.isInner ? sortedInnerShadows : sortedDropShadows;
    const match = findBestShadow(pool, slot.minBlur, slot.maxBlur, slot.isInner);

    if (match) {
      usedShadowKeys.add(match.shadows[0].key);
      const shadow = match.shadows[0];

      result.push({
        name: slot.name,
        effects: [{
          type: shadow.type,
          color: shadow.color,
          offsetX: shadow.offsetX,
          offsetY: shadow.offsetY,
          blur: shadow.blur,
          spread: shadow.spread,
        }],
        nodeIds: match.nodeIds,
        isExtracted: true,
        usageCount: match.count,
      });
    }
  }

  // Add any remaining extracted shadows that didn't fit the structure
  // These get named based on their properties (preserving existing naming)
  for (const group of groupedShadows) {
    if (usedShadowKeys.has(group.shadows[0].key)) continue;

    const shadow = group.shadows[0];
    result.push({
      name: group.name, // Use the generated name from processExtractedShadows
      effects: [{
        type: shadow.type,
        color: shadow.color,
        offsetX: shadow.offsetX,
        offsetY: shadow.offsetY,
        blur: shadow.blur,
        spread: shadow.spread,
      }],
      nodeIds: group.nodeIds,
      isExtracted: true,
      usageCount: group.count,
    });
  }

  return result;
}

// === Color Matching Helpers for Variable Binding ===

/**
 * Parse a hex color string to RGB values (0-255)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Convert RGB to Figma's 0-1 format
 */
function rgbToFigma(r: number, g: number, b: number): { r: number; g: number; b: number } {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Convert Figma's 0-1 RGB to hex string
 */
function figmaRgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate color distance using weighted Euclidean distance in RGB space
 * Lower values = more similar colors
 */
function colorDistance(hex1: string, hex2: string): number {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return Infinity;

  // Weighted RGB distance (human eye is more sensitive to green)
  const rMean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  // Weighted Euclidean distance formula
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db
  );
}

/**
 * Find the closest matching color variable for a given hex color
 * Returns the variable and distance, or null if no close match found
 */
function findClosestColorVariable(
  targetHex: string,
  colorVariables: Array<{ hex: string; variable: Variable }>,
  maxDistance: number = 50 // Threshold for "close enough" match
): { variable: Variable; hex: string; distance: number } | null {
  let closest: { variable: Variable; hex: string; distance: number } | null = null;

  for (const cv of colorVariables) {
    const dist = colorDistance(targetHex, cv.hex);
    if (dist < maxDistance && (!closest || dist < closest.distance)) {
      closest = { variable: cv.variable, hex: cv.hex, distance: dist };
    }
  }

  return closest;
}

// Payload types
interface CreateDesignSystemPayload {
  brandColors: {
    primary: string;
    secondary?: string;
    tertiary?: string;
  };
  grayBase?: 'neutral' | 'warm' | 'cool';
  projectType?: 'web' | 'mobile' | 'dashboard';
  includeBoilerplate?: boolean;
  // Extracted tokens from frame - boilerplate will only fill gaps
  extractedTokens?: ExtractedDesignTokens;
  // Create typography styles with variable bindings (default: true)
  createTypographyStyles?: boolean;
  // Create effect styles (shadows) from boilerplate (default: true)
  createEffectStyles?: boolean;
  // Create grid styles for layout (default: false - only create if file has grid styles or user requests)
  createGridStyles?: boolean;
  // Primary font family for typography styles (default: from extractedTokens or 'Inter')
  primaryFontFamily?: string;
  // Organizing principle for variable structure (default: 'four-level')
  organizingPrinciple?: OrganizingPrincipleName;
  // Existing styles from extraction - boilerplate will skip these
  existingTextStyleNames?: string[];
  existingEffectStyleNames?: string[];
  existingGridStyleNames?: string[];
  // Cleanup options - delete existing before creating new
  deleteExistingCollections?: boolean; // Delete ALL existing variable collections (default: false)
  deleteExistingStyles?: boolean; // Delete ALL existing text/effect/grid styles (default: false)
  collectionsToDelete?: string[]; // Specific collection names to delete (alternative to deleteExistingCollections)
}

interface DesignSystemStatus {
  hasAllCollections: boolean;
  collectionCounts: Record<string, number>;
  ready: boolean;
}

interface ValidationResult {
  valid: boolean;
  collections: Record<string, {
    exists: boolean;
    variableCount: number;
    valid: boolean;
    id?: string;
  }>;
  issues: Array<{
    severity: 'error' | 'warning';
    message: string;
  }>;
  fixable: boolean;
}

// Helper to find collection by name
async function findCollectionByName(name: string): Promise<VariableCollection | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return collections.find(function(c) { return c.name === name; }) || null;
}

// Helper to get or create a collection
async function getOrCreateCollection(
  name: string,
  modes: string[]
): Promise<{ collection: VariableCollection; created: boolean }> {
  const existing = await findCollectionByName(name);
  if (existing) {
    return { collection: existing, created: false };
  }

  const collection = figma.variables.createVariableCollection(name);

  // Rename default mode to first mode name
  if (modes.length > 0) {
    collection.renameMode(collection.modes[0].modeId, modes[0]);
  }

  // Add additional modes
  for (let i = 1; i < modes.length; i++) {
    collection.addMode(modes[i]);
  }

  return { collection, created: true };
}

// Helper to create a color variable in Level 1
// prefix: defaults to 'Color/' for hierarchical naming; use '' for flat naming (Spectrum)
async function createLevel1ColorVariable(
  collection: VariableCollection,
  name: string,
  hexValue: string,
  existingVars: Map<string, Variable>,
  prefix: string = 'Color/'
): Promise<Variable | null> {
  // Check if variable already exists
  const fullName = `${prefix}${name}`;
  if (existingVars.has(fullName)) {
    return existingVars.get(fullName)!;
  }

  try {
    const variable = figma.variables.createVariable(fullName, collection, 'COLOR');
    const colorValue = parseColor(hexValue);
    variable.setValueForMode(collection.defaultModeId, colorValue);
    variable.scopes = ['ALL_FILLS'];
    variable.hiddenFromPublishing = true;
    return variable;
  } catch (error) {
    console.error(`Failed to create variable ${fullName}:`, error);
    return null;
  }
}

// Helper to check if variable exists in collection
async function findVariableInCollection(
  collection: VariableCollection,
  name: string
): Promise<Variable | null> {
  for (var i = 0; i < collection.variableIds.length; i++) {
    var varId = collection.variableIds[i];
    try {
      var variable = await figma.variables.getVariableByIdAsync(varId);
      if (variable && variable.name === name) {
        return variable;
      }
    } catch {
      // Stale variable reference - skip
    }
  }
  return null;
}

// Helper to create a variable with mode aliases
// Supports 2-mode (Light/Dark) and 3-mode (Light/Dark/Darkest) collections
async function createAliasVariable(
  collection: VariableCollection,
  template: VariableTemplate,
  varMap: Map<string, string>,
  modeNames: readonly string[]
): Promise<Variable | null> {
  // Check if variable already exists
  var existing = await findVariableInCollection(collection, template.name);
  if (existing) {
    return existing; // Skip creation, return existing
  }

  // Resolve references
  const lightId = varMap.get(template.lightRef);
  const darkId = varMap.get(template.darkRef);
  const darkestId = template.darkestRef ? varMap.get(template.darkestRef) : null;

  if (!lightId || !darkId) {
    console.warn(`Missing reference for ${template.name}: light=${template.lightRef} (${lightId}), dark=${template.darkRef} (${darkId})`);
    return null;
  }

  try {
    const variable = figma.variables.createVariable(template.name, collection, 'COLOR');

    // Set values for each mode
    var modes = collection.modes;
    for (var i = 0; i < modes.length; i++) {
      var mode = modes[i];
      const modeLower = mode.name.toLowerCase();
      let refId: string;

      if (modeLower.includes('darkest') && darkestId) {
        // 3rd mode: Darkest theme
        refId = darkestId;
      } else if (modeLower.includes('dark') && !modeLower.includes('darkest')) {
        // 2nd mode: Dark theme
        refId = darkId;
      } else if (mode.name === modeNames[0] || modeLower.includes('light') || modeLower === 'value' || modeLower === 'default') {
        // 1st mode: Light / Default / Value
        refId = lightId;
      } else if (i === 0) {
        // Fallback: first mode = light
        refId = lightId;
      } else if (i === modes.length - 1 && darkestId) {
        // Fallback: last mode of 3+ = darkest
        refId = darkestId;
      } else {
        // Fallback: middle/other = dark
        refId = darkId;
      }

      variable.setValueForMode(mode.modeId, {
        type: 'VARIABLE_ALIAS',
        id: refId,
      });
    }

    variable.scopes = template.scopes;
    if (template.description) {
      variable.description = template.description;
    }
    variable.hiddenFromPublishing = false;

    return variable;
  } catch (error) {
    console.error(`Failed to create alias variable ${template.name}:`, error);
    return null;
  }
}

// Helper to check if a value exists in extracted tokens
function valueExistsInExtracted(
  value: any,
  category: string,
  extractedTokens?: ExtractedDesignTokens
): boolean {
  if (!extractedTokens) return false;

  const numValue = typeof value === 'number' ? value : parseFloat(value);

  // Safely access nested arrays with defaults
  const typography = extractedTokens.typography || {};
  const numbers = extractedTokens.numbers || {};
  const effects = extractedTokens.effects || {};
  const transitions = effects.transitions || {};

  switch (category) {
    case 'fontSize':
      return (typography.fontSize || []).includes(numValue);
    case 'fontWeight':
      return (typography.fontWeight || []).includes(numValue);
    case 'lineHeight':
      return (typography.lineHeight || []).some(lh => Math.abs(lh - numValue) < 0.01);
    case 'letterSpacing':
      return (typography.letterSpacing || []).some(ls => Math.abs(ls - numValue) < 0.001);
    case 'fontFamily':
      // Font families are strings - check if any extracted font matches
      return (typography.fontFamily || []).some(
        font => typeof value === 'string' && value.toLowerCase().includes(font.toLowerCase())
      );
    case 'spacing':
      return (numbers.spacing || []).includes(numValue);
    case 'borderWidth':
      return (numbers.borderWidth || []).includes(numValue);
    case 'borderRadius':
      return (numbers.borderRadius || []).includes(numValue);
    case 'opacity':
      return (numbers.opacity || []).some(op => Math.abs(op - numValue) < 0.01);
    case 'shadow':
      // Shadows are complex - for now, skip if we have any extracted shadows
      return (effects.shadows || []).length > 0;
    case 'transitionDuration':
      return (transitions.duration || []).includes(numValue);
    case 'transitionEasing':
      return (transitions.easing || []).some(
        ease => typeof value === 'string' && value.toLowerCase().includes(ease.toLowerCase())
      );
    default:
      return false;
  }
}

// Helper to create boilerplate tokens in Level 1
// Now accepts extractedTokens and only creates variables for values NOT in extracted
// Font family overrides for boilerplate tokens
interface FontFamilyOverrides {
  sans?: string;    // Override Font-Sans (default: Geist)
  serif?: string;   // Override Font-Serif (default: Georgia)
  mono?: string;    // Override Font-Mono (default: SF Mono)
}

// primaryFontFamily: Override Font-Sans variable with extracted font (instead of hardcoded Geist)
// fontFamilies: Override all three font variables with extracted fonts
async function createBoilerplateInLevel1(
  collection: VariableCollection,
  existingVars: Map<string, Variable>,
  extractedTokens?: ExtractedDesignTokens,
  primaryFontFamily?: string,
  fontFamilies?: FontFamilyOverrides,
  useSpectrum: boolean = false
): Promise<{ count: number; categories: string[]; skipped: number }> {
  let count = 0;
  let skipped = 0;
  const categories: string[] = [];

  // Helper to recursively create variables from token objects
  // Now checks if value exists in extracted tokens
  async function createFromTokens(
    tokens: Record<string, any>,
    prefix: string,
    tokenCategory: string
  ): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let localSkipped = 0;

    var tokenKeys = Object.keys(tokens);
    for (var j = 0; j < tokenKeys.length; j++) {
      var key = tokenKeys[j];
      var value = tokens[key];
      const path = `${prefix}/${key}`;

      if (value && typeof value === 'object' && '$value' in value) {
        // This is a token with a value
        const token = value as { $value: any; $type?: string; $description?: string };

        // Skip if already exists as a variable
        if (existingVars.has(path)) continue;

        // Skip if value exists in extracted tokens (user already has this value)
        // EXCEPTION: Typography tokens should always be created for style binding
        const typographyCategories = ['fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'fontFamily'];
        if (!typographyCategories.includes(tokenCategory) &&
            valueExistsInExtracted(token.$value, tokenCategory, extractedTokens)) {
          localSkipped++;
          continue;
        }

        // Determine variable type
        let type: VariableResolvedDataType = 'STRING';
        if (token.$type) {
          const typeMap: Record<string, VariableResolvedDataType> = {
            color: 'COLOR',
            number: 'FLOAT',
            float: 'FLOAT',
            string: 'STRING',
            boolean: 'BOOLEAN',
          };
          type = typeMap[token.$type.toLowerCase()] || 'STRING';
        } else if (typeof token.$value === 'number') {
          type = 'FLOAT';
        } else if (typeof token.$value === 'boolean') {
          type = 'BOOLEAN';
        }

        try {
          const variable = figma.variables.createVariable(path, collection, type);
          const convertedValue = convertVariableValue(token.$value, type);
          variable.setValueForMode(collection.defaultModeId, convertedValue);

          if (token.$description) {
            variable.description = token.$description;
          }

          created++;
        } catch (error) {
          console.warn(`Failed to create boilerplate variable ${path}:`, error);
        }
      } else if (value && typeof value === 'object') {
        // Nested group - recurse
        const result = await createFromTokens(value, path, tokenCategory);
        created += result.created;
        localSkipped += result.skipped;
      }
    }

    return { created, skipped: localSkipped };
  }

  // Select token sets based on organizing principle
  const activeTypography = useSpectrum ? spectrumTypographyTokens : typographyTokens;
  const activeSpacing = useSpectrum ? spectrumSpacingTokens : spacingTokens;
  const activeBorder = useSpectrum ? spectrumBorderTokens : borderTokens;
  const activeShadow = useSpectrum ? spectrumShadowTokens : shadowTokens;
  const activeTransition = useSpectrum ? spectrumTransitionTokens : transitionTokens;
  const activeOpacity = useSpectrum ? spectrumOpacityTokens : opacityTokens;

  // Create Typography tokens
  const typographyStart = count;

  // Override font families with extracted fonts
  // Priority: fontFamilies overrides > primaryFontFamily > defaults
  const baseFontFamily = activeTypography.fontFamily as Record<string, { $value: string; $type: string; $description?: string }>;
  const sansKey = useSpectrum ? 'font-family-sans' : 'Font-Sans';
  const serifKey = useSpectrum ? 'font-family-serif' : 'Font-Serif';
  const monoKey = useSpectrum ? 'font-family-mono' : 'Font-Mono';

  const fontFamilyTokens: Record<string, { $value: string; $type: string; $description?: string }> = {
    ...baseFontFamily,
    [sansKey]: {
      ...baseFontFamily[sansKey],
      $value: fontFamilies?.sans || primaryFontFamily || baseFontFamily[sansKey].$value,
    },
    [serifKey]: {
      ...baseFontFamily[serifKey],
      $value: fontFamilies?.serif || baseFontFamily[serifKey].$value,
    },
    [monoKey]: {
      ...baseFontFamily[monoKey],
      $value: fontFamilies?.mono || baseFontFamily[monoKey].$value,
    },
  };
  // Spectrum has a 4th font family (CJK) — include it if present
  if (useSpectrum && baseFontFamily['font-family-han']) {
    fontFamilyTokens['font-family-han'] = baseFontFamily['font-family-han'];
  }

  console.log(`[Boilerplate] Font families (${useSpectrum ? 'Spectrum' : 'standard'}): Sans="${fontFamilyTokens[sansKey].$value}", Serif="${fontFamilyTokens[serifKey].$value}", Mono="${fontFamilyTokens[monoKey].$value}"`);

  let result = await createFromTokens(fontFamilyTokens, 'Typography/Font Family', 'fontFamily');
  count += result.created;
  skipped += result.skipped;

  result = await createFromTokens(activeTypography.fontSize, 'Typography/Font Size', 'fontSize');
  count += result.created;
  skipped += result.skipped;

  result = await createFromTokens(activeTypography.fontWeight, 'Typography/Font Weight', 'fontWeight');
  count += result.created;
  skipped += result.skipped;

  result = await createFromTokens(activeTypography.lineHeight, 'Typography/Line Height', 'lineHeight');
  count += result.created;
  skipped += result.skipped;

  result = await createFromTokens(activeTypography.letterSpacing, 'Typography/Letter Spacing', 'letterSpacing');
  count += result.created;
  skipped += result.skipped;

  if (count > typographyStart) categories.push('typography');

  // Create Spacing tokens
  const spacingStart = count;
  result = await createFromTokens(activeSpacing.scale, 'Numbers/Spacing', 'spacing');
  count += result.created;
  skipped += result.skipped;
  if (count > spacingStart) categories.push('spacing');

  // Create Border tokens
  const borderStart = count;
  result = await createFromTokens(activeBorder.width, 'Numbers/Border Width', 'borderWidth');
  count += result.created;
  skipped += result.skipped;

  result = await createFromTokens(activeBorder.radius, 'Numbers/Border Radius', 'borderRadius');
  count += result.created;
  skipped += result.skipped;
  if (count > borderStart) categories.push('borders');

  // Create Shadow tokens (as strings for now - Figma can't store complex shadows as variables)
  const shadowStart = count;
  result = await createFromTokens(activeShadow.elevation, 'Effects/Shadow', 'shadow');
  count += result.created;
  skipped += result.skipped;
  if (count > shadowStart) categories.push('shadows');

  // Create Transition tokens
  const transitionStart = count;
  result = await createFromTokens(activeTransition.duration, 'Effects/Transition/Duration', 'transitionDuration');
  count += result.created;
  skipped += result.skipped;

  if ('easing' in activeTransition) {
    result = await createFromTokens((activeTransition as any).easing, 'Effects/Transition/Easing', 'transitionEasing');
    count += result.created;
    skipped += result.skipped;
  }
  if (count > transitionStart) categories.push('transitions');

  // Create Opacity tokens
  const opacityStart = count;
  result = await createFromTokens(activeOpacity.values, 'Numbers/Opacity', 'opacity');
  count += result.created;
  skipped += result.skipped;
  if (count > opacityStart) categories.push('opacity');

  // Spectrum-specific: Component Height tokens
  if (useSpectrum) {
    const heightStart = count;
    result = await createFromTokens(spectrumComponentHeightTokens.scale, 'Numbers/Component Height', 'componentHeight');
    count += result.created;
    skipped += result.skipped;
    if (count > heightStart) categories.push('component-heights');

    // Z-Index tokens
    const zStart = count;
    result = await createFromTokens(spectrumZIndexTokens.layers, 'Numbers/Z-Index', 'zIndex');
    count += result.created;
    skipped += result.skipped;
    if (count > zStart) categories.push('z-index');
  }

  return { count, categories, skipped };
}

// Build variable map from existing variables
async function buildVariableMap(collection: VariableCollection): Promise<Map<string, string>> {
  const varMap = new Map<string, string>();

  var varIds = collection.variableIds;
  for (var i = 0; i < varIds.length; i++) {
    var varId = varIds[i];
    try {
      const variable = await figma.variables.getVariableByIdAsync(varId);
      if (variable) {
        // Map full name
        varMap.set(variable.name, variable.id);

        // Also map short name (last segment)
        const shortName = variable.name.split('/').pop();
        if (shortName) {
          varMap.set(shortName, variable.id);
        }
      }
    } catch {
      // Stale variable reference - skip
    }
  }

  return varMap;
}

/**
 * Create a complete design system with configurable structure
 * Supports multiple organizing principles (4-level, 3-level, 2-level, material-design, tailwind)
 * This is idempotent - it will skip existing collections and variables
 */
export async function handleCreateDesignSystem(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as CreateDesignSystemPayload;

  if (!payload.brandColors || !payload.brandColors.primary) {
    return errorResult(command.id, 'brandColors.primary is required');
  }

  // Get organizing principle (default: four-level for backward compatibility)
  const principleName = payload.organizingPrinciple || 'four-level';
  const principle = getOrganizingPrinciple(principleName);

  const results = {
    organizingPrinciple: principleName,
    collections: {} as Record<string, { id: string; variableCount: number; created: boolean }>,
    totalVariables: 0,
    variableMap: {} as Record<string, string>,
    cleanup: {
      collectionsDeleted: 0,
      variablesDeleted: 0,
      textStylesDeleted: 0,
      effectStylesDeleted: 0,
      gridStylesDeleted: 0,
    },
  };

  try {
    // === STEP 0: Cleanup existing collections and styles if requested ===
    if (payload.deleteExistingCollections || payload.collectionsToDelete) {
      const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

      for (const collection of existingCollections) {
        // Check if we should delete this collection
        const shouldDelete = payload.deleteExistingCollections ||
          (payload.collectionsToDelete && payload.collectionsToDelete.includes(collection.name));

        if (shouldDelete) {
          // Count variables before deleting
          results.cleanup.variablesDeleted += collection.variableIds.length;

          // Delete all variables in the collection first
          for (const varId of collection.variableIds) {
            try {
              const variable = await figma.variables.getVariableByIdAsync(varId);
              if (variable) {
                variable.remove();
              }
            } catch {
              // Variable may already be removed or stale
            }
          }

          // Delete the collection
          collection.remove();
          results.cleanup.collectionsDeleted++;
        }
      }
    }

    if (payload.deleteExistingStyles) {
      // Delete text styles
      const textStyles = await figma.getLocalTextStylesAsync();
      for (const style of textStyles) {
        style.remove();
        results.cleanup.textStylesDeleted++;
      }

      // Delete effect styles
      const effectStyles = await figma.getLocalEffectStylesAsync();
      for (const style of effectStyles) {
        style.remove();
        results.cleanup.effectStylesDeleted++;
      }

      // Delete grid styles
      const gridStyles = await figma.getLocalGridStylesAsync();
      for (const style of gridStyles) {
        style.remove();
        results.cleanup.gridStylesDeleted++;
      }
    }

    // === STEP 1: Create/Get Primitives Collection ===
    // Use the first collection from the organizing principle (always primitives/reference)
    const primitivesConfig = principle.collections[0];
    const { collection: level1, created: level1Created } = await getOrCreateCollection(
      primitivesConfig.name,
      primitivesConfig.modes
    );

    // Get existing variables to avoid duplicates
    // Wrap in try-catch for stale variable references
    const existingLevel1Vars = new Map<string, Variable>();
    var level1VarIds = level1.variableIds;
    for (var idx = 0; idx < level1VarIds.length; idx++) {
      var varId = level1VarIds[idx];
      try {
        const v = await figma.variables.getVariableByIdAsync(varId);
        if (v) existingLevel1Vars.set(v.name, v);
      } catch {
        // Stale variable reference - skip
      }
    }

    let level1Count = existingLevel1Vars.size;

    // Track color variables for binding: {hex, variable}
    const colorVariablesForBinding: Array<{ hex: string; variable: Variable }> = [];

    // Determine if we're using Spectrum's flat naming (no prefix, lowercase-dash)
    const isSpectrum = principleName === 'spectrum';
    const colorPrefix = isSpectrum ? '' : 'Color/';

    if (isSpectrum) {
      // === SPECTRUM PRIMITIVES: Flat naming, 14-step scale, 11-step grays ===
      console.log('[DesignSystem] Using Spectrum-style flat naming with 14-step color scale');

      // Create Spectrum gray scale (11 steps: gray-100 through gray-1100)
      const specGrayScale = generateSpectrumGrayScale();
      var specGrayNames = Object.keys(specGrayScale);
      for (var i = 0; i < specGrayNames.length; i++) {
        var name = specGrayNames[i];
        var hex = specGrayScale[name];
        const v = await createLevel1ColorVariable(level1, name, hex, existingLevel1Vars, '');
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
        }
      }

      // Create brand color scale (14 steps: brand-100 through brand-1400)
      const specBrandScale = generateSpectrumColorScale(payload.brandColors.primary, 'brand');
      var specBrandNames = Object.keys(specBrandScale);
      for (var i = 0; i < specBrandNames.length; i++) {
        var name = specBrandNames[i];
        var hex = specBrandScale[name];
        const v = await createLevel1ColorVariable(level1, name, hex, existingLevel1Vars, '');
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
        }
      }

      // Create Spectrum semantic color scales (negative, positive, notice, informative)
      for (const [roleName, roleHex] of Object.entries(SPECTRUM_SEMANTIC_COLORS)) {
        const roleScale = generateSpectrumColorScale(roleHex, roleName);
        var roleScaleNames = Object.keys(roleScale);
        for (var i = 0; i < roleScaleNames.length; i++) {
          var name = roleScaleNames[i];
          var hex = roleScale[name];
          const v = await createLevel1ColorVariable(level1, name, hex, existingLevel1Vars, '');
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create secondary color scale if provided
      if (payload.brandColors.secondary) {
        const secondaryScale = generateSpectrumColorScale(payload.brandColors.secondary, 'secondary');
        var secondaryNames = Object.keys(secondaryScale);
        for (var i = 0; i < secondaryNames.length; i++) {
          var name = secondaryNames[i];
          var hex = secondaryScale[name];
          const v = await createLevel1ColorVariable(level1, name, hex, existingLevel1Vars, '');
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create tertiary color scale if provided
      if (payload.brandColors.tertiary) {
        const tertiaryScale = generateSpectrumColorScale(payload.brandColors.tertiary, 'tertiary');
        var tertiaryNames = Object.keys(tertiaryScale);
        for (var i = 0; i < tertiaryNames.length; i++) {
          var name = tertiaryNames[i];
          var hex = tertiaryScale[name];
          const v = await createLevel1ColorVariable(level1, name, hex, existingLevel1Vars, '');
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create system colors (white, black) with flat names
      const specSystemColors: Record<string, string> = { white: '#ffffff', black: '#000000' };
      for (const [sysName, sysHex] of Object.entries(specSystemColors)) {
        const v = await createLevel1ColorVariable(level1, sysName, sysHex, existingLevel1Vars, '');
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: sysHex.toLowerCase(), variable: v });
        }
      }
    } else {
      // === STANDARD PRIMITIVES: Hierarchical naming with Color/ prefix ===

      // Create gray scale
      const grayBase = payload.grayBase || 'neutral';
      let grayScale: Record<string, string>;
      switch (grayBase) {
        case 'warm':
          grayScale = generateWarmGrayScale();
          break;
        case 'cool':
          grayScale = generateCoolGrayScale();
          break;
        default:
          grayScale = generateGrayScale();
      }

      var grayNames = Object.keys(grayScale);
      for (var i = 0; i < grayNames.length; i++) {
        var name = grayNames[i];
        var hex = grayScale[name];
        const v = await createLevel1ColorVariable(level1, `Gray Scale/${name}`, hex, existingLevel1Vars);
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
        }
      }

      // Create brand color scale
      const brandScale = generateColorScale(payload.brandColors.primary, 'Brand');
      var brandNames = Object.keys(brandScale);
      for (var i = 0; i < brandNames.length; i++) {
        var name = brandNames[i];
        var hex = brandScale[name];
        const v = await createLevel1ColorVariable(level1, `Brand Scale/${name}`, hex, existingLevel1Vars);
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
        }
      }

      // Create secondary color scale if provided
      if (payload.brandColors.secondary) {
        const secondaryScale = generateColorScale(payload.brandColors.secondary, 'Secondary');
        var secondaryNames = Object.keys(secondaryScale);
        for (var i = 0; i < secondaryNames.length; i++) {
          var name = secondaryNames[i];
          var hex = secondaryScale[name];
          const v = await createLevel1ColorVariable(level1, `Secondary Scale/${name}`, hex, existingLevel1Vars);
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create tertiary color scale if provided
      if (payload.brandColors.tertiary) {
        const tertiaryScale = generateColorScale(payload.brandColors.tertiary, 'Tertiary');
        var tertiaryNames = Object.keys(tertiaryScale);
        for (var i = 0; i < tertiaryNames.length; i++) {
          var name = tertiaryNames[i];
          var hex = tertiaryScale[name];
          const v = await createLevel1ColorVariable(level1, `Tertiary Scale/${name}`, hex, existingLevel1Vars);
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create system colors
      var systemNames = Object.keys(SYSTEM_COLORS);
      for (var i = 0; i < systemNames.length; i++) {
        var name = systemNames[i];
        var hex = (SYSTEM_COLORS as Record<string, string>)[name];
        if (hex !== 'transparent') {
          const v = await createLevel1ColorVariable(level1, `System/${name}`, hex, existingLevel1Vars);
          if (v) {
            if (!existingLevel1Vars.has(v.name)) level1Count++;
            colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
          }
        }
      }

      // Create feedback colors
      var feedbackNames = Object.keys(FEEDBACK_COLORS);
      for (var i = 0; i < feedbackNames.length; i++) {
        var name = feedbackNames[i];
        var hex = (FEEDBACK_COLORS as Record<string, string>)[name];
        const v = await createLevel1ColorVariable(level1, `System/${name}`, hex, existingLevel1Vars);
        if (v) {
          if (!existingLevel1Vars.has(v.name)) level1Count++;
          colorVariablesForBinding.push({ hex: hex.toLowerCase(), variable: v });
        }
      }
    }

    // === Color Variable Binding ===
    // Bind color variables to nodes that have matching colors
    const colorBindingResults = {
      fillBindings: { applied: 0, failed: 0, details: [] as Array<{ nodeId: string; hex: string; variableName: string; success: boolean; error?: string }> },
      strokeBindings: { applied: 0, failed: 0, details: [] as Array<{ nodeId: string; hex: string; variableName: string; success: boolean; error?: string }> },
    };

    const colorNodes = payload.extractedTokens?.colors?.colorNodes;
    const strokeNodes = payload.extractedTokens?.colors?.strokeNodes;

    if (colorNodes && Object.keys(colorNodes).length > 0) {
      console.log(`[DesignSystem] Binding color variables to ${Object.keys(colorNodes).length} extracted colors`);

      // PERFORMANCE: Batch fetch all nodes first instead of sequential awaits
      // Wrap in try-catch for stale variable bindings
      const allFillNodeIds = Object.values(colorNodes).flat();
      let fillNodeMap = new Map<string, BaseNode | null>();
      try {
        const fillNodesArray = await Promise.all(allFillNodeIds.map(id => figma.getNodeByIdAsync(id)));
        allFillNodeIds.forEach((id, i) => fillNodeMap.set(id, fillNodesArray[i]));
      } catch (fetchErr) {
        console.warn(`[Colors] Failed to fetch some fill nodes (stale bindings?): ${fetchErr}`);
      }

      for (const [hex, nodeIds] of Object.entries(colorNodes)) {
        const match = findClosestColorVariable(hex.toLowerCase(), colorVariablesForBinding);
        if (match) {
          for (const nodeId of nodeIds) {
            try {
              const node = fillNodeMap.get(nodeId);
              if (node && 'fills' in node) {
                const fillableNode = node as MinimalFillsMixin;
                const currentFills = fillableNode.fills;
                if (currentFills !== figma.mixed && Array.isArray(currentFills) && currentFills.length > 0) {
                  const fills = [...currentFills] as Paint[];
                  const targetFill = fills[0];
                  if (targetFill.type === 'SOLID') {
                    const newFill = figma.variables.setBoundVariableForPaint(targetFill, 'color', match.variable);
                    fills[0] = newFill;
                    fillableNode.fills = fills;
                    colorBindingResults.fillBindings.applied++;
                    colorBindingResults.fillBindings.details.push({
                      nodeId,
                      hex,
                      variableName: match.variable.name,
                      success: true,
                    });
                  }
                }
              }
            } catch (err) {
              colorBindingResults.fillBindings.failed++;
              colorBindingResults.fillBindings.details.push({
                nodeId,
                hex,
                variableName: match.variable.name,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }
      }
    }

    if (strokeNodes && Object.keys(strokeNodes).length > 0) {
      console.log(`[DesignSystem] Binding stroke variables to ${Object.keys(strokeNodes).length} extracted stroke colors`);

      // PERFORMANCE: Batch fetch all nodes first instead of sequential awaits
      // Wrap in try-catch for stale variable bindings
      const allStrokeNodeIds = Object.values(strokeNodes).flat();
      let strokeNodeMap = new Map<string, BaseNode | null>();
      try {
        const strokeNodesArray = await Promise.all(allStrokeNodeIds.map(id => figma.getNodeByIdAsync(id)));
        allStrokeNodeIds.forEach((id, i) => strokeNodeMap.set(id, strokeNodesArray[i]));
      } catch (fetchErr) {
        console.warn(`[Colors] Failed to fetch some stroke nodes (stale bindings?): ${fetchErr}`);
      }

      for (const [hex, nodeIds] of Object.entries(strokeNodes)) {
        const match = findClosestColorVariable(hex.toLowerCase(), colorVariablesForBinding);
        if (match) {
          for (const nodeId of nodeIds) {
            try {
              const node = strokeNodeMap.get(nodeId);
              if (node && 'strokes' in node) {
                const strokeableNode = node as MinimalStrokesMixin;
                const currentStrokes = strokeableNode.strokes;
                if (Array.isArray(currentStrokes) && currentStrokes.length > 0) {
                  const strokes = [...currentStrokes] as Paint[];
                  const targetStroke = strokes[0];
                  if (targetStroke.type === 'SOLID') {
                    const newStroke = figma.variables.setBoundVariableForPaint(targetStroke, 'color', match.variable);
                    strokes[0] = newStroke;
                    strokeableNode.strokes = strokes;
                    colorBindingResults.strokeBindings.applied++;
                    colorBindingResults.strokeBindings.details.push({
                      nodeId,
                      hex,
                      variableName: match.variable.name,
                      success: true,
                    });
                  }
                }
              }
            } catch (err) {
              colorBindingResults.strokeBindings.failed++;
              colorBindingResults.strokeBindings.details.push({
                nodeId,
                hex,
                variableName: match.variable.name,
                success: false,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }
      }
    }

    console.log(`[DesignSystem] Color bindings: ${colorBindingResults.fillBindings.applied} fills, ${colorBindingResults.strokeBindings.applied} strokes`);
    (results as any).colorBindings = colorBindingResults;

    results.collections[primitivesConfig.name] = {
      id: level1.id,
      variableCount: level1Count,
      created: level1Created,
    };
    results.totalVariables += level1Count;

    // Build variable map for references
    const varMap = await buildVariableMap(level1);
    varMap.forEach(function(id, name) {
      results.variableMap[name] = id;
    });

    // === STEP 2+: Create remaining collections based on organizing principle ===
    // Loop through remaining collections (index 1+) and create with appropriate templates
    for (let collIndex = 1; collIndex < principle.collections.length; collIndex++) {
      const collConfig = principle.collections[collIndex];
      const templateGetterName = principle.templateGetters[collIndex];

      const { collection, created } = await getOrCreateCollection(
        collConfig.name,
        collConfig.modes
      );

      let collectionCount = collection.variableIds.length;

      if (created || collectionCount === 0) {
        // Get templates using the specified getter function
        // Spectrum uses lowercase flat names; others use PascalCase
        const brandNameForTemplates = isSpectrum ? 'brand' : 'Brand';
        const templates = getTemplatesByName(templateGetterName, brandNameForTemplates);

        for (let ti = 0; ti < templates.length; ti++) {
          const template = templates[ti];
          const v = await createAliasVariable(collection, template, varMap, collConfig.modes);
          if (v) collectionCount++;
        }
      }

      results.collections[collConfig.name] = {
        id: collection.id,
        variableCount: collectionCount,
        created,
      };
      results.totalVariables += collectionCount;
    }

    // === STEP 5: Create Boilerplate Tokens (if requested) ===
    // Pass extractedTokens - boilerplate will only fill gaps (values not already in frame)
    const includeBoilerplate = payload.includeBoilerplate !== false; // Default to true
    if (includeBoilerplate) {
      // Determine font families from extracted tokens
      const genericFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace'];

      // Helper to check if font is a sans-serif type font
      const isSansFont = (font: string) => {
        const lower = font.toLowerCase();
        return lower.includes('sans') || lower.includes('arial') || lower.includes('helvetica') ||
               lower.includes('inter') || lower.includes('roboto') || lower.includes('geist') ||
               lower.includes('grotesk') || lower.includes('gothic') || lower.includes('neue') ||
               !lower.includes('serif') && !lower.includes('mono') && !lower.includes('code') &&
               !lower.includes('courier') && !lower.includes('consolas');
      };

      // Helper to check if font is a serif type font
      const isSerifFont = (font: string) => {
        const lower = font.toLowerCase();
        return (lower.includes('serif') && !lower.includes('sans')) ||
               lower.includes('times') || lower.includes('georgia') || lower.includes('palatino') ||
               lower.includes('garamond') || lower.includes('baskerville') || lower.includes('minion');
      };

      // Helper to check if font is a monospace type font
      const isMonoFont = (font: string) => {
        const lower = font.toLowerCase();
        return lower.includes('mono') || lower.includes('code') || lower.includes('courier') ||
               lower.includes('consolas') || lower.includes('menlo') || lower.includes('fira code') ||
               lower.includes('jetbrains');
      };

      // Extract all non-generic fonts
      const extractedFonts = (payload.extractedTokens?.typography?.fontFamilies ||
                              payload.extractedTokens?.typography?.fontFamily || [])
        .filter((f: string) => !genericFonts.includes(f.toLowerCase()));

      // Also check resolved fonts (marketing names from web search)
      const resolvedFonts = payload.extractedTokens?.typography?.resolvedFonts || [];
      const resolvedFontNames = resolvedFonts
        .filter((f) => f.marketingName)
        .map((f) => f.marketingName!);

      // Combine all fonts, prioritizing resolved names
      const allFonts = [...new Set([...resolvedFontNames, ...extractedFonts])];

      console.log(`[DesignSystem] Extracted fonts: ${allFonts.join(', ') || '(none)'}`);

      // Categorize fonts
      let boilerplatePrimaryFont = payload.primaryFontFamily;
      let boilerplateSerifFont: string | undefined;
      let boilerplateMonoFont: string | undefined;

      for (const font of allFonts) {
        if (!boilerplatePrimaryFont && isSansFont(font)) {
          boilerplatePrimaryFont = font;
          console.log(`[DesignSystem] Using "${font}" for Font-Sans`);
        } else if (!boilerplateSerifFont && isSerifFont(font)) {
          boilerplateSerifFont = font;
          console.log(`[DesignSystem] Using "${font}" for Font-Serif`);
        } else if (!boilerplateMonoFont && isMonoFont(font)) {
          boilerplateMonoFont = font;
          console.log(`[DesignSystem] Using "${font}" for Font-Mono`);
        }
      }

      // If no sans font found but we have fonts, use the first one
      if (!boilerplatePrimaryFont && allFonts.length > 0) {
        boilerplatePrimaryFont = allFonts[0];
        console.log(`[DesignSystem] No sans font detected, using "${boilerplatePrimaryFont}" for Font-Sans`);
      }

      const fontFamilyOverrides: FontFamilyOverrides = {};
      if (boilerplatePrimaryFont) fontFamilyOverrides.sans = boilerplatePrimaryFont;
      if (boilerplateSerifFont) fontFamilyOverrides.serif = boilerplateSerifFont;
      if (boilerplateMonoFont) fontFamilyOverrides.mono = boilerplateMonoFont;

      const boilerplateResults = await createBoilerplateInLevel1(
        level1,
        existingLevel1Vars,
        payload.extractedTokens,
        boilerplatePrimaryFont, // Backward compatibility
        fontFamilyOverrides,
        isSpectrum
      );
      results.collections[primitivesConfig.name].variableCount += boilerplateResults.count;
      results.totalVariables += boilerplateResults.count;
      (results as any).boilerplateCreated = boilerplateResults.categories;
      (results as any).boilerplateSkipped = boilerplateResults.skipped;

      // Report which fonts were used
      const usedFonts: Record<string, string> = {};
      if (boilerplatePrimaryFont) usedFonts.sans = boilerplatePrimaryFont;
      if (boilerplateSerifFont) usedFonts.serif = boilerplateSerifFont;
      if (boilerplateMonoFont) usedFonts.mono = boilerplateMonoFont;
      if (Object.keys(usedFonts).length > 0) {
        (results as any).fontFamilies = usedFonts;
        (results as any).primaryFontFamily = boilerplatePrimaryFont;
      }
    }

    // === STEP 5b: Create FLOAT variables from extracted spacing/radius values ===
    // These are the actual values from the design/website that need to be variables
    const extractedNumbers = payload.extractedTokens?.numbers;
    if (extractedNumbers) {
      let extractedNumbersCreated = 0;

      // Create spacing variables from extracted values
      if (extractedNumbers.spacing?.length) {
        for (const value of extractedNumbers.spacing) {
          if (typeof value !== 'number' || value <= 0) continue;
          const varName = `Numbers/Spacing/Space-${value}`;

          // Skip if already exists
          const existing = await figma.variables.getLocalVariablesAsync('FLOAT');
          if (existing.some(v => v.name === varName)) continue;

          try {
            const variable = figma.variables.createVariable(varName, level1, 'FLOAT');
            variable.setValueForMode(level1.defaultModeId, value);
            variable.description = `${value}px spacing`;
            variable.scopes = ['GAP', 'WIDTH_HEIGHT'] as VariableScope[];
            extractedNumbersCreated++;
          } catch (e) {
            console.warn(`Failed to create spacing variable ${varName}:`, e);
          }
        }
      }

      // Create border radius variables from extracted values
      if (extractedNumbers.borderRadius?.length) {
        for (const value of extractedNumbers.borderRadius) {
          if (typeof value !== 'number' || value < 0) continue;
          const varName = `Numbers/Radius/Radius-${value}`;

          // Skip if already exists
          const existing = await figma.variables.getLocalVariablesAsync('FLOAT');
          if (existing.some(v => v.name === varName)) continue;

          try {
            const variable = figma.variables.createVariable(varName, level1, 'FLOAT');
            variable.setValueForMode(level1.defaultModeId, value);
            variable.description = `${value}px border radius`;
            variable.scopes = ['CORNER_RADIUS'] as VariableScope[];
            extractedNumbersCreated++;
          } catch (e) {
            console.warn(`Failed to create radius variable ${varName}:`, e);
          }
        }
      }

      if (extractedNumbersCreated > 0) {
        results.collections[primitivesConfig.name].variableCount += extractedNumbersCreated;
        results.totalVariables += extractedNumbersCreated;
        (results as any).extractedNumbersCreated = extractedNumbersCreated;
      }
    }

    // Create typography styles with variable bindings (default: true)
    const shouldCreateTypographyStyles = payload.createTypographyStyles !== false;
    if (shouldCreateTypographyStyles) {
      // Determine primary font family
      let primaryFont = payload.primaryFontFamily || 'Inter';
      const genericFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace'];

      // Priority 1: Use resolved fonts (marketing names from web search)
      const resolvedFonts = payload.extractedTokens?.typography?.resolvedFonts;
      if (!payload.primaryFontFamily && resolvedFonts?.length) {
        // Find first high-confidence resolved font
        const highConfidence = resolvedFonts.find((f: { confidence: string }) => f.confidence === 'high');
        const mediumConfidence = resolvedFonts.find((f: { confidence: string }) => f.confidence === 'medium');
        const anyResolved = resolvedFonts[0];

        const bestMatch = highConfidence || mediumConfidence || anyResolved;
        if (bestMatch?.marketingName && !genericFonts.includes(bestMatch.marketingName.toLowerCase())) {
          primaryFont = bestMatch.marketingName;
          console.log(`[DesignSystem] Using resolved font: "${bestMatch.cssName}" → "${primaryFont}" (${bestMatch.confidence} confidence)`);
        }
      }

      // Priority 2: Fall back to raw fontFamilies/fontFamily
      if (primaryFont === 'Inter' && !payload.primaryFontFamily) {
        const extractedFonts = payload.extractedTokens?.typography?.fontFamilies
          || payload.extractedTokens?.typography?.fontFamily;
        if (extractedFonts?.length) {
          const specificFont = extractedFonts.find((f: string) => !genericFonts.includes(f.toLowerCase()));
          if (specificFont) {
            primaryFont = specificFont;
            console.log(`[DesignSystem] Using extracted font (no resolution): ${primaryFont}`);
          }
        }
      }

      // Check font availability and track unavailable fonts
      const unavailableFonts: string[] = [];
      const suggestedFonts: string[] = ['Inter', 'Roboto', 'SF Pro', 'Open Sans', 'Helvetica Neue', 'Arial'];
      let availableFontFamilies: Set<string> = new Set();

      try {
        const availableFonts = await figma.listAvailableFontsAsync();
        availableFontFamilies = new Set(availableFonts.map(f => f.fontName.family));

        // Check if primary font is available
        if (primaryFont !== 'Inter' && !availableFontFamilies.has(primaryFont)) {
          console.log(`[DesignSystem] Font "${primaryFont}" not available in Figma`);
          unavailableFonts.push(primaryFont);

          // Filter suggested fonts to only include available ones
          const availableSuggestions = suggestedFonts.filter(f => availableFontFamilies.has(f));
          if (availableSuggestions.length > 0) {
            console.log(`[DesignSystem] Suggested replacements: ${availableSuggestions.join(', ')}`);
          }
        }
      } catch (fontErr) {
        console.warn(`[DesignSystem] Failed to check font availability: ${fontErr}`);
      }

      // Map extracted typography to text styles
      // ONLY creates styles for font sizes that actually exist in the file
      // Spectrum uses flat naming (heading-xxl, body-m, detail-s, code-m)
      let mappedStyles: MappedTypographyStyle[];
      if (payload.extractedTokens?.typography?.fontSize?.length) {
        const mapFn = isSpectrum ? mapExtractedTypographySpectrum : mapExtractedTypography;
        mappedStyles = mapFn(
          payload.extractedTokens.typography.fontSize,
          payload.extractedTokens.typography.lineHeight || [],
          payload.extractedTokens.typography.fontWeight || [],
          primaryFont,
          payload.extractedTokens.typography.fontSizeNodes // Pass node IDs for binding
        );
        console.log(`[DesignSystem] Created ${mappedStyles.length} text styles from ${payload.extractedTokens.typography.fontSize.length} extracted font sizes (${isSpectrum ? 'Spectrum naming' : 'standard naming'})`);
      } else if (includeBoilerplate) {
        // No extracted tokens but boilerplate requested - use defaults
        const defaultStyles = isSpectrum ? SPECTRUM_DEFAULT_TYPOGRAPHY_STYLES : DEFAULT_TYPOGRAPHY_STYLES;
        mappedStyles = defaultStyles.map(style => ({
          name: style.name,
          fontSize: style.fontSize,
          fontWeight: style.fontStyle,
          fontFamily: style.name.startsWith('code-') ? (style.fontFamily || primaryFont) : primaryFont,
          lineHeight: typeof style.lineHeight === 'number' ? style.lineHeight : undefined,
          letterSpacing: style.letterSpacing,
          isExtracted: false,
        }));
        console.log(`[DesignSystem] No extracted font sizes, using ${mappedStyles.length} ${isSpectrum ? 'Spectrum' : 'boilerplate'} text styles`);
      } else {
        // No extracted tokens and no boilerplate - skip text styles
        mappedStyles = [];
        console.log(`[DesignSystem] No extracted font sizes and boilerplate disabled, skipping text styles`);
      }

      // Convert mapped styles to the format expected by style creation
      // Include variable binding names based on the values
      const stylesToCreate = mappedStyles.map(mapped => {
        // Spectrum uses flat numeric naming (font-size-100); standard uses t-shirt sizing (Size-Base)
        const sizeVarMap: Record<number, string> = isSpectrum ? {
          11: 'font-size-50',
          12: 'font-size-75',
          14: 'font-size-100',
          16: 'font-size-200',
          18: 'font-size-300',
          20: 'font-size-400',
          22: 'font-size-500',
          25: 'font-size-600',
          28: 'font-size-700',
          32: 'font-size-800',
          36: 'font-size-900',
          40: 'font-size-1000',
          45: 'font-size-1100',
          48: 'font-size-1100',
          50: 'font-size-1200',
          60: 'font-size-1300',
        } : {
          10: 'Size-2XS',
          11: 'Size-XS',
          12: 'Size-SM',
          14: 'Size-Base',
          16: 'Size-MD',
          18: 'Size-LG',
          20: 'Size-XL',
          24: 'Size-2XL',
          30: 'Size-3XL',
          36: 'Size-4XL',
          48: 'Size-5XL',
          60: 'Size-6XL',
          72: 'Size-7XL',
        };
        // Round fontSize for lookup (handles floating point like 30.000001)
        const roundedSize = Math.round(mapped.fontSize);
        // Find matching size - first try exact, then closest
        let sizeVarName = sizeVarMap[roundedSize];
        if (!sizeVarName) {
          const sizes = Object.keys(sizeVarMap).map(Number).sort((a, b) => a - b);
          const closest = sizes.reduce((prev, curr) =>
            Math.abs(curr - roundedSize) < Math.abs(prev - roundedSize) ? curr : prev
          );
          sizeVarName = sizeVarMap[closest];
        }

        // Map font weight to variable name format
        const weightVarMap: Record<string, string> = isSpectrum ? {
          'Regular': 'font-weight-regular',
          'Medium': 'font-weight-medium',
          'SemiBold': 'font-weight-bold',
          'Semi Bold': 'font-weight-bold',
          'Bold': 'font-weight-bold',
          'Light': 'font-weight-light',
          'Thin': 'font-weight-light',
          'ExtraBold': 'font-weight-extra-bold',
          'Black': 'font-weight-black',
        } : {
          'Regular': 'Weight-Regular',
          'Medium': 'Weight-Medium',
          'SemiBold': 'Weight-SemiBold',
          'Semi Bold': 'Weight-SemiBold',
          'Bold': 'Weight-Bold',
          'Light': 'Weight-Light',
          'Thin': 'Weight-Thin',
          'ExtraBold': 'Weight-ExtraBold',
          'Black': 'Weight-Black',
        };
        const weightVarName = isSpectrum
          ? (weightVarMap[mapped.fontWeight] || 'font-weight-regular')
          : (weightVarMap[mapped.fontWeight] || 'Weight-Regular');

        // Determine font family variable — code styles use mono font
        // Spectrum uses flat naming (font-family-mono); standard uses grouped (Font-Mono)
        const isCodeStyle = mapped.name.startsWith('code-');
        const fontFamilyVarName = isSpectrum
          ? (isCodeStyle ? 'Typography/Font Family/font-family-mono' : 'Typography/Font Family/font-family-sans')
          : (isCodeStyle ? 'Typography/Font Family/Font-Mono' : 'Typography/Font Family/Font-Sans');

        return {
          name: mapped.name,
          fontFamily: mapped.fontFamily,
          fontStyle: mapped.fontWeight === 'SemiBold' ? 'Semi Bold' : mapped.fontWeight,
          fontSize: mapped.fontSize,
          lineHeight: mapped.lineHeight || Math.round(mapped.fontSize * (isSpectrum ? 1.3 : 1.4)),
          letterSpacing: mapped.letterSpacing,
          isExtracted: mapped.isExtracted,
          nodeIds: mapped.nodeIds || [], // Node IDs for binding
          // Variable bindings - using principle-specific variable naming convention
          fontFamilyVariable: fontFamilyVarName,
          fontSizeVariable: `Typography/Font Size/${sizeVarName}`,
          fontWeightVariable: `Typography/Font Weight/${weightVarName}`,
        };
      });

      // Get all variables for binding
      // PERFORMANCE: Fetch all variables from all collections in parallel
      // Wrap in try-catch for stale variable references
      const variablesByName = new Map<string, Variable>();
      try {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const allVariableArrays = await Promise.all(
          collections.map(collection =>
            Promise.all(collection.variableIds.map(id =>
              figma.variables.getVariableByIdAsync(id).catch(() => null)
            ))
          )
        );
        for (const variables of allVariableArrays) {
          for (const variable of variables) {
            if (variable) {
              variablesByName.set(variable.name, variable);
            }
          }
        }
      } catch (varErr) {
        console.warn(`[Typography] Failed to fetch variables (stale refs?): ${varErr}`);
      }

      const createdStyles: Array<{
        name: string;
        styleId: string;
        fontSize?: number;
        isExtracted?: boolean;
        fontFamilyBound?: boolean;
        fontSizeBound?: boolean;
        fontWeightBound?: boolean;
        nodesStyled?: number;
        nodeBindingDetails?: any;
      }> = [];
      const skippedStyles: string[] = [];
      let skippedNodesStyled = 0; // Track nodes styled from existing (skipped) styles

      // Get existing text style names once (from file and from payload)
      const existingTextStyles = await figma.getLocalTextStylesAsync();
      const existingTextStyleNames = new Set([
        ...existingTextStyles.map(s => s.name),
        ...(payload.existingTextStyleNames || []),
      ]);

      // Build a map of existing text styles by name for quick lookup
      const existingTextStyleMap = new Map<string, TextStyle>();
      for (const style of existingTextStyles) {
        existingTextStyleMap.set(style.name, style);
      }

      // PERFORMANCE: Pre-load all unique fonts in parallel
      const uniqueFonts = new Set<string>();
      for (const styleDef of stylesToCreate) {
        if (!existingTextStyleNames.has(styleDef.name)) {
          uniqueFonts.add(`${styleDef.fontFamily}|${styleDef.fontStyle}`);
        }
      }
      const fontLoadResults = await Promise.allSettled(
        [...uniqueFonts].map(font => {
          const [family, style] = font.split('|');
          return figma.loadFontAsync({ family, style });
        })
      );
      const loadedFonts = new Set<string>();
      [...uniqueFonts].forEach((font, i) => {
        if (fontLoadResults[i].status === 'fulfilled') {
          loadedFonts.add(font);
        }
      });
      console.log(`[Typography] Pre-loaded ${loadedFonts.size}/${uniqueFonts.size} fonts`);

      // PERFORMANCE: Batch fetch all nodes from all styleDefs
      // Wrap in try-catch to handle stale variable bindings on nodes
      const allNodeIds: string[] = [];
      for (const styleDef of stylesToCreate) {
        if (styleDef.nodeIds) {
          allNodeIds.push(...styleDef.nodeIds);
        }
      }
      let nodeMap = new Map<string, BaseNode | null>();
      try {
        const allNodesArray = await Promise.all(allNodeIds.map(id => figma.getNodeByIdAsync(id)));
        allNodeIds.forEach((id, i) => nodeMap.set(id, allNodesArray[i]));
        console.log(`[Typography] Pre-fetched ${allNodeIds.length} nodes for text style binding`);
      } catch (fetchErr) {
        console.warn(`[Typography] Failed to fetch some nodes (stale bindings?): ${fetchErr}`);
        // Continue without node map - styles will be created but not bound
      }

      for (const styleDef of stylesToCreate) {
        // Check if style already exists (in file or from extraction)
        if (existingTextStyleNames.has(styleDef.name)) {
          skippedStyles.push(styleDef.name);

          // Even though style exists, still bind it to matching nodes (using cached nodeMap)
          // PERFORMANCE: Batch all setTextStyleIdAsync calls
          const existingStyle = existingTextStyleMap.get(styleDef.name);
          if (existingStyle && styleDef.nodeIds && styleDef.nodeIds.length > 0) {
            const existingBindPromises: Promise<void>[] = [];
            let boundCount = 0;

            for (const nodeId of styleDef.nodeIds) {
              try {
                const node = nodeMap.get(nodeId); // Use cached node
                if (node && node.type === 'TEXT') {
                  const textNode = node as TextNode;
                  // Wrap property access in try-catch to handle stale variable bindings
                  let hasStyleId = false;
                  try {
                    hasStyleId = !!(textNode.textStyleId && textNode.textStyleId !== '');
                  } catch {
                    // Node may have stale variable bindings - skip
                    continue;
                  }
                  if (!hasStyleId) {
                    // Batch async binding
                    existingBindPromises.push(
                      textNode.setTextStyleIdAsync(existingStyle.id)
                        .then(() => {
                          boundCount++;
                          skippedNodesStyled++;
                        })
                        .catch(() => {
                          // Node not found or inaccessible
                        })
                    );
                  }
                }
              } catch {
                // Skip nodes with stale variable bindings
                continue;
              }
            }

            await Promise.all(existingBindPromises);
            if (boundCount > 0) {
              console.log(`[Typography] Bound existing style "${styleDef.name}" to ${boundCount} nodes`);
            }
          }
          continue;
        }

        // Check if font was pre-loaded (fonts were already loaded in parallel above)
        const fontKey = `${styleDef.fontFamily}|${styleDef.fontStyle}`;
        if (!loadedFonts.has(fontKey)) {
          console.warn(`Font not loaded: ${styleDef.fontFamily} ${styleDef.fontStyle}`);
          continue;
        }

        // Create text style
        const style = figma.createTextStyle();
        style.name = styleDef.name;
        style.fontName = { family: styleDef.fontFamily, style: styleDef.fontStyle };
        style.fontSize = styleDef.fontSize;

        if (typeof styleDef.lineHeight === 'number') {
          style.lineHeight = { value: styleDef.lineHeight, unit: 'PIXELS' };
        }

        if (styleDef.letterSpacing !== undefined) {
          style.letterSpacing = { value: styleDef.letterSpacing, unit: 'PERCENT' };
        }

        // Bind fontFamily variable (STRING type)
        let fontFamilyBound = false;
        if (styleDef.fontFamilyVariable) {
          const fontVar = variablesByName.get(styleDef.fontFamilyVariable);
          if (fontVar && fontVar.resolvedType === 'STRING') {
            try {
              style.setBoundVariable('fontFamily', fontVar);
              fontFamilyBound = true;
            } catch (e) {
              console.warn(`[Typography] Failed to bind fontFamily for ${styleDef.name}:`, e);
            }
          } else {
            console.log(`[Typography] Font family variable not found or wrong type: ${styleDef.fontFamilyVariable}`);
          }
        }

        // Bind fontSize variable (FLOAT type)
        let fontSizeBound = false;
        if (styleDef.fontSizeVariable) {
          const sizeVar = variablesByName.get(styleDef.fontSizeVariable);
          if (sizeVar && sizeVar.resolvedType === 'FLOAT') {
            try {
              style.setBoundVariable('fontSize', sizeVar);
              fontSizeBound = true;
            } catch (e) {
              console.warn(`[Typography] Failed to bind fontSize for ${styleDef.name}:`, e);
            }
          } else {
            console.log(`[Typography] Font size variable not found or wrong type: ${styleDef.fontSizeVariable}`);
          }
        }

        // Bind fontWeight variable (FLOAT type - numeric weight like 400, 500, 700)
        let fontWeightBound = false;
        if (styleDef.fontWeightVariable) {
          const weightVar = variablesByName.get(styleDef.fontWeightVariable);
          if (weightVar && weightVar.resolvedType === 'FLOAT') {
            try {
              style.setBoundVariable('fontWeight', weightVar);
              fontWeightBound = true;
            } catch (e) {
              console.warn(`[Typography] Failed to bind fontWeight for ${styleDef.name}:`, e);
            }
          } else {
            console.log(`[Typography] Font weight variable not found or wrong type: ${styleDef.fontWeightVariable}`);
          }
        }

        console.log(`[Typography] Created style "${styleDef.name}" - fontFamily: ${fontFamilyBound}, fontSize: ${fontSizeBound}, fontWeight: ${fontWeightBound}`);

        // Bind text style to nodes that have this font size
        let textBindingsApplied = 0;
        let textBindingsFailed = 0;
        const nodeBindingDetails: Array<{ nodeId: string; status: string; nodeType?: string }> = [];

        // Use nodeIds directly from styleDef (using cached nodeMap for performance)
        // PERFORMANCE: Batch all setTextStyleIdAsync calls
        if (styleDef.nodeIds && styleDef.nodeIds.length > 0) {
          const textBindingPromises: Promise<void>[] = [];

          for (const nodeId of styleDef.nodeIds) {
            try {
              const node = nodeMap.get(nodeId); // Use cached node
              if (!node) {
                nodeBindingDetails.push({ nodeId, status: 'not_found' });
                textBindingsFailed++;
              } else if (node.type !== 'TEXT') {
                nodeBindingDetails.push({ nodeId, status: 'wrong_type', nodeType: node.type });
              } else {
                const textNode = node as TextNode;
                // Only apply if not already styled - wrap in try-catch for stale bindings
                let hasStyleId = false;
                try {
                  hasStyleId = !!(textNode.textStyleId && textNode.textStyleId !== '');
                } catch {
                  // Node may have stale variable bindings - skip
                  textBindingsFailed++;
                  nodeBindingDetails.push({ nodeId, status: 'stale_binding' });
                  continue;
                }
                if (!hasStyleId) {
                  // Batch async binding
                  textBindingPromises.push(
                    textNode.setTextStyleIdAsync(style.id)
                      .then(() => {
                        textBindingsApplied++;
                        nodeBindingDetails.push({ nodeId, status: 'applied' });
                      })
                      .catch((err) => {
                        textBindingsFailed++;
                        nodeBindingDetails.push({ nodeId, status: 'error', nodeType: String(err) });
                      })
                  );
                } else {
                  nodeBindingDetails.push({ nodeId, status: 'already_styled' });
                }
              }
            } catch {
              // Skip nodes with stale variable bindings
              textBindingsFailed++;
              nodeBindingDetails.push({ nodeId, status: 'stale_binding' });
            }
          }

          // Wait for all bindings to complete
          await Promise.all(textBindingPromises);
          console.log(`[Typography] Applied style "${styleDef.name}" (${styleDef.fontSize}px) to ${textBindingsApplied}/${styleDef.nodeIds.length} text nodes (${textBindingsFailed} failed)`);
        } else {
          console.log(`[Typography] No nodes to bind for style "${styleDef.name}" (${styleDef.fontSize}px)`);
        }

        createdStyles.push({
          name: styleDef.name,
          styleId: style.id,
          fontSize: styleDef.fontSize,
          isExtracted: (styleDef as any).isExtracted || false,
          fontFamilyBound,
          fontSizeBound,
          fontWeightBound,
          nodesStyled: textBindingsApplied,
          nodeBindingDetails, // Debug info
        });
      }

      const extractedCount = createdStyles.filter(s => s.isExtracted).length;
      const boilerplateCount = createdStyles.filter(s => !s.isExtracted).length;
      const newStylesNodesStyled = createdStyles.reduce((sum, s) => sum + (s.nodesStyled || 0), 0);
      const totalNodesStyled = newStylesNodesStyled + skippedNodesStyled;

      // Filter suggested fonts to only available ones for the result
      const availableSuggestedFonts = suggestedFonts.filter(f => availableFontFamilies.has(f));

      (results as any).typographyStyles = {
        created: createdStyles.length,
        fromExtracted: extractedCount,
        fromBoilerplate: boilerplateCount,
        skipped: skippedStyles.length,
        nodesStyled: totalNodesStyled,
        skippedNodesStyled, // Separately report nodes styled from existing styles
        styles: createdStyles,
        primaryFont,
        // Font availability info for workflow pause/prompt
        unavailableFonts: unavailableFonts.length > 0 ? unavailableFonts : undefined,
        suggestedFonts: unavailableFonts.length > 0 ? availableSuggestedFonts : undefined,
      };

      console.log(`[DesignSystem] Typography: ${createdStyles.length} styles created, ${totalNodesStyled} text nodes styled (${skippedNodesStyled} from existing styles)`);
      if (unavailableFonts.length > 0) {
        console.log(`[DesignSystem] Unavailable fonts: ${unavailableFonts.join(', ')}. Suggested: ${availableSuggestedFonts.join(', ')}`);
      }
    }

    // Create effect styles from extracted shadows AND boilerplate
    const shouldCreateEffectStyles = payload.createEffectStyles !== false;
    if (shouldCreateEffectStyles) {
      const createdFromExtracted: Array<{ name: string; styleId: string; count: number; nodeIds?: string[] }> = [];
      const createdFromBoilerplate: Array<{ name: string; styleId: string }> = [];
      const skippedEffectStyles: string[] = [];

      // Get existing effect style names (from file and from payload)
      const existingEffectStyles = await figma.getLocalEffectStylesAsync();
      const existingNames = new Set([
        ...existingEffectStyles.map(s => s.name),
        ...(payload.existingEffectStyleNames || []),
      ]);

      // Build a map of existing effect styles by name for quick lookup
      const existingEffectStyleMap = new Map<string, EffectStyle>();
      for (const style of existingEffectStyles) {
        existingEffectStyleMap.set(style.name, style);
      }

      // Track skipped styles that need binding (existing styles with nodeIds)
      const skippedWithNodeIds: Array<{ name: string; styleId: string; nodeIds: string[] }> = [];

      // Track which structure slots are filled by extracted values
      const filledStructureSlots = new Set<string>();

      // STEP 1: Map extracted shadows to design system structure
      const extractedShadows = payload.extractedTokens?.effects?.shadows || [];
      if (extractedShadows.length > 0) {
        const groupedShadows = processExtractedShadows(extractedShadows);
        const mappedStyles = mapExtractedShadowsToStructure(groupedShadows, isSpectrum ? SPECTRUM_SHADOW_STRUCTURE : SHADOW_STRUCTURE);

        console.log(`[DesignSystem] Mapped ${mappedStyles.length} extracted shadows to effect style structure`);

        for (const mapped of mappedStyles) {
          // Skip if already exists
          if (existingNames.has(mapped.name)) {
            skippedEffectStyles.push(mapped.name);
            filledStructureSlots.add(mapped.name); // Still counts as filled

            // Track existing style for binding if it has nodeIds
            const existingStyle = existingEffectStyleMap.get(mapped.name);
            if (existingStyle && mapped.nodeIds && mapped.nodeIds.length > 0) {
              skippedWithNodeIds.push({
                name: mapped.name,
                styleId: existingStyle.id,
                nodeIds: mapped.nodeIds,
              });
            }
            continue;
          }

          // Create effect style with extracted values
          const effectStyle = figma.createEffectStyle();
          effectStyle.name = mapped.name;
          effectStyle.description = `Extracted from file (used ${mapped.usageCount}x)`;

          // Create effects array
          const figmaEffects: Effect[] = mapped.effects.map(eff => {
            if (eff.type === 'DROP_SHADOW') {
              return createDropShadow(
                eff.color,
                eff.offsetX,
                eff.offsetY,
                eff.blur,
                eff.spread
              );
            } else {
              return createInnerShadow(
                eff.color,
                eff.offsetX,
                eff.offsetY,
                eff.blur,
                eff.spread
              );
            }
          });

          effectStyle.effects = figmaEffects;
          existingNames.add(mapped.name);
          filledStructureSlots.add(mapped.name);
          createdFromExtracted.push({
            name: mapped.name,
            styleId: effectStyle.id,
            count: mapped.usageCount,
            nodeIds: mapped.nodeIds,
          });
        }
      }

      // STEP 2: Add boilerplate effect styles ONLY for true gaps (if boilerplate is enabled)
      // A "gap" is a structure slot that wasn't filled by extracted shadows
      if (includeBoilerplate) {
        console.log(`[DesignSystem] Adding boilerplate for gaps. ${filledStructureSlots.size} slots filled by extraction.`);

        const activeEffectStyleDefs = isSpectrum ? spectrumEffectStyleDefinitions : effectStyleDefinitions;
        for (const styleDef of activeEffectStyleDefs) {
          // Skip if already exists (from file, payload, or filled by extracted)
          if (existingNames.has(styleDef.name) || filledStructureSlots.has(styleDef.name)) {
            if (!skippedEffectStyles.includes(styleDef.name)) {
              skippedEffectStyles.push(styleDef.name);
            }
            continue;
          }

          // Create effect style
          const effectStyle = figma.createEffectStyle();
          effectStyle.name = styleDef.name;
          if (styleDef.description) {
            effectStyle.description = styleDef.description;
          }

          // Convert effects to Figma format using helper functions
          const figmaEffects: Effect[] = styleDef.effects.map(eff => {
            if (eff.type === 'DROP_SHADOW') {
              const shadow = createDropShadow(
                eff.color || '#00000033',
                eff.offsetX || 0,
                eff.offsetY || 0,
                eff.radius || 0,
                eff.spread || 0
              );
              if (eff.visible === false) {
                return { ...shadow, visible: false };
              }
              return shadow;
            } else if (eff.type === 'INNER_SHADOW') {
              const shadow = createInnerShadow(
                eff.color || '#00000033',
                eff.offsetX || 0,
                eff.offsetY || 0,
                eff.radius || 0,
                eff.spread || 0
              );
              if (eff.visible === false) {
                return { ...shadow, visible: false };
              }
              return shadow;
            } else if (eff.type === 'LAYER_BLUR') {
              return createBlurEffect('LAYER_BLUR', eff.radius || 0);
            } else {
              return createBlurEffect('BACKGROUND_BLUR', eff.radius || 0);
            }
          });

          effectStyle.effects = figmaEffects;
          existingNames.add(styleDef.name);
          createdFromBoilerplate.push({ name: styleDef.name, styleId: effectStyle.id });
        }
      }

      // STEP 3: Bind effect styles to their original nodes (both newly created AND existing skipped styles)
      let bindingsApplied = 0;
      let bindingsFailed = 0;
      const bindingDetails: Array<{ styleName: string; nodeId: string; success: boolean; error?: string }> = [];

      // Combine newly created styles and skipped existing styles that need binding
      const stylesToBind = [
        ...createdFromExtracted.map(s => ({ name: s.name, styleId: s.styleId, nodeIds: s.nodeIds || [] })),
        ...skippedWithNodeIds,
      ];

      // PERFORMANCE: Batch fetch all nodes first, then batch bind effects
      const allEffectNodeIds: string[] = [];
      const nodeIdToStyleInfo = new Map<string, { name: string; styleId: string }>();

      for (const styleInfo of stylesToBind) {
        if (styleInfo.nodeIds && styleInfo.nodeIds.length > 0) {
          for (const nodeId of styleInfo.nodeIds) {
            allEffectNodeIds.push(nodeId);
            nodeIdToStyleInfo.set(nodeId, { name: styleInfo.name, styleId: styleInfo.styleId });
          }
        }
      }

      // Batch fetch all nodes - wrap in try-catch for stale bindings
      let effectNodeMap = new Map<string, BaseNode | null>();
      try {
        const effectNodesArray = await Promise.all(allEffectNodeIds.map(id => figma.getNodeByIdAsync(id)));
        allEffectNodeIds.forEach((id, i) => effectNodeMap.set(id, effectNodesArray[i]));
      } catch (fetchErr) {
        console.warn(`[Effects] Failed to fetch some nodes (stale bindings?): ${fetchErr}`);
        // Continue without node map - styles created but not bound
      }

      // Batch bind effect styles
      const bindingPromises: Promise<void>[] = [];
      for (const nodeId of allEffectNodeIds) {
        const node = effectNodeMap.get(nodeId);
        const styleInfo = nodeIdToStyleInfo.get(nodeId)!;

        if (node && 'effects' in node) {
          bindingPromises.push(
            (node as any).setEffectStyleIdAsync(styleInfo.styleId)
              .then(() => {
                bindingsApplied++;
                bindingDetails.push({
                  styleName: styleInfo.name,
                  nodeId,
                  success: true,
                });
              })
              .catch((err: any) => {
                bindingsFailed++;
                bindingDetails.push({
                  styleName: styleInfo.name,
                  nodeId,
                  success: false,
                  error: err instanceof Error ? err.message : String(err),
                });
              })
          );
        } else {
          bindingsFailed++;
          bindingDetails.push({
            styleName: styleInfo.name,
            nodeId,
            success: false,
            error: node ? 'Node does not support effects' : 'Node not found',
          });
        }
      }

      await Promise.all(bindingPromises);

      (results as any).effectStyles = {
        created: createdFromExtracted.length + createdFromBoilerplate.length,
        fromExtracted: createdFromExtracted.length,
        fromBoilerplate: createdFromBoilerplate.length,
        skipped: skippedEffectStyles.length,
        structureSlotsFilled: filledStructureSlots.size,
        extractedStyles: createdFromExtracted,
        boilerplateStyles: createdFromBoilerplate,
        bindings: {
          applied: bindingsApplied,
          failed: bindingsFailed,
          details: bindingDetails,
        },
      };

      console.log(`[DesignSystem] Effect styles: ${createdFromExtracted.length} from extracted, ${createdFromBoilerplate.length} from boilerplate, ${skippedEffectStyles.length} skipped`);
    }

    // === STEP 7: Create Grid Styles ===
    const shouldCreateGridStyles = payload.createGridStyles === true;

    if (shouldCreateGridStyles) {
      // PERFORMANCE: Only fetch grid styles if we're actually creating them
      const existingGridStyles = await figma.getLocalGridStylesAsync();
      const hasExistingGridStyles = existingGridStyles.length > 0;
      const createdGridStyles: Array<{ name: string; styleId: string; fromExtracted: boolean }> = [];
      const skippedGridStyles: string[] = [];

      // Get existing grid style names (from file and from payload)
      const existingNames = new Set([
        ...existingGridStyles.map(s => s.name),
        ...(payload.existingGridStyleNames || []),
      ]);

      // Track which boilerplate slots are covered by extracted styles
      const coveredSlots = new Set<string>();

      // STEP 1: Use extracted grid styles as the source of truth
      // Map extracted grid styles to our standard naming convention where possible
      if (hasExistingGridStyles) {
        console.log(`[DesignSystem] Found ${existingGridStyles.length} existing grid styles in file`);

        for (const extracted of existingGridStyles) {
          // Check if this matches a boilerplate pattern
          // Map common patterns: column count, baseline size, etc.
          const name = extracted.name;

          // Mark this slot as covered so boilerplate doesn't duplicate
          // Check if it matches a boilerplate name pattern
          const activeGridStyleDefs = isSpectrum ? spectrumGridStyleDefinitions : gridStyleDefinitions;
          for (const boilerplate of activeGridStyleDefs) {
            if (name.toLowerCase().includes(boilerplate.name.toLowerCase().replace('Grid/', ''))) {
              coveredSlots.add(boilerplate.name);
            }
          }

          // Also mark exact name matches
          coveredSlots.add(name);

          // Log existing styles
          createdGridStyles.push({
            name: name,
            styleId: extracted.id,
            fromExtracted: true,
          });
        }
      }

      // STEP 2: Add boilerplate grid styles ONLY for gaps (if boilerplate is enabled)
      if (includeBoilerplate) {
        console.log(`[DesignSystem] Adding boilerplate grid styles for gaps. ${coveredSlots.size} slots covered by existing.`);

        const activeGridBoilerplate = isSpectrum ? spectrumGridStyleDefinitions : gridStyleDefinitions;
        for (const styleDef of activeGridBoilerplate) {
          // Skip if already exists or covered by extracted
          if (existingNames.has(styleDef.name) || coveredSlots.has(styleDef.name)) {
            skippedGridStyles.push(styleDef.name);
            continue;
          }

          // Create grid style
          const gridStyle = figma.createGridStyle();
          gridStyle.name = styleDef.name;
          if (styleDef.description) {
            gridStyle.description = styleDef.description;
          }

          // Convert grid definitions to Figma format
          const layoutGrids: LayoutGrid[] = [];
          for (const gridDef of styleDef.grids) {
            // Parse color
            let gridColor = { r: 1, g: 0, b: 0, a: 0.1 }; // Default red with 10% opacity
            if (gridDef.color) {
              const hex = gridDef.color.replace('#', '');
              gridColor.r = parseInt(hex.substring(0, 2), 16) / 255;
              gridColor.g = parseInt(hex.substring(2, 4), 16) / 255;
              gridColor.b = parseInt(hex.substring(4, 6), 16) / 255;
              if (hex.length === 8) {
                gridColor.a = parseInt(hex.substring(6, 8), 16) / 255;
              }
            }

            let grid: LayoutGrid;
            if (gridDef.pattern === 'GRID') {
              // GRID pattern: simple square grid with sectionSize only
              grid = {
                pattern: 'GRID',
                sectionSize: gridDef.sectionSize || 10,
                visible: gridDef.visible !== false,
                color: gridColor,
              };
            } else {
              // COLUMNS or ROWS pattern - use STRETCH alignment (most compatible)
              // Note: MIN/MAX/CENTER alignments have stricter Figma validation requirements
              grid = {
                pattern: gridDef.pattern as 'COLUMNS' | 'ROWS',
                alignment: 'STRETCH' as const,
                gutterSize: gridDef.gutterSize || 20,
                count: gridDef.count || 12,
                visible: gridDef.visible !== false,
                color: gridColor,
              };
            }

            layoutGrids.push(grid);
          }

          gridStyle.layoutGrids = layoutGrids;
          existingNames.add(styleDef.name);
          createdGridStyles.push({
            name: styleDef.name,
            styleId: gridStyle.id,
            fromExtracted: false,
          });
        }
      }

      const fromExtracted = createdGridStyles.filter(s => s.fromExtracted).length;
      const fromBoilerplate = createdGridStyles.filter(s => !s.fromExtracted).length;

      (results as any).gridStyles = {
        created: fromBoilerplate, // Only count newly created
        existing: fromExtracted,
        skipped: skippedGridStyles.length,
        styles: createdGridStyles,
      };

      console.log(`[DesignSystem] Grid styles: ${fromExtracted} existing, ${fromBoilerplate} created from boilerplate, ${skippedGridStyles.length} skipped`);
    } else {
      // No grid styles in file and user didn't request them
      (results as any).gridStyles = {
        created: 0,
        existing: 0,
        skipped: 0,
        message: 'No grid styles in file. Set createGridStyles: true to add boilerplate grid styles.',
      };
    }

    return successResult(command.id, {
      data: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Failed to create design system: ${message}`);
  }
}

/**
 * Get available organizing principles for user selection
 */
export async function handleGetOrganizingPrinciples(command: FigmaCommand): Promise<CommandResult> {
  try {
    const principles = getPrincipleDisplayOptions();

    return successResult(command.id, {
      data: {
        principles,
        default: 'four-level',
        description: 'Available organizing principles for design system variable structure',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Failed to get organizing principles: ${message}`);
  }
}

/**
 * Validate that a complete design system exists
 * Supports different organizing principles
 */
export async function handleValidateDesignSystem(command: FigmaCommand): Promise<CommandResult> {
  // Get organizing principle from payload (default: four-level for backward compatibility)
  const payload = command.payload as { organizingPrinciple?: OrganizingPrincipleName } | undefined;
  const principleName = payload?.organizingPrinciple || 'four-level';
  const principle = getOrganizingPrinciple(principleName);

  const result: ValidationResult & { organizingPrinciple?: string } = {
    valid: true,
    organizingPrinciple: principleName,
    collections: {},
    issues: [],
    fixable: true,
  };

  try {
    // Check each required collection based on the organizing principle
    const requiredCollections = principle.collections.map(coll => ({
      name: coll.name,
      minVars: coll.minVariableCount,
      modes: coll.modes,
    }));

    for (var r = 0; r < requiredCollections.length; r++) {
      var req = requiredCollections[r];
      const collection = await findCollectionByName(req.name);

      if (!collection) {
        result.valid = false;
        result.collections[req.name] = {
          exists: false,
          variableCount: 0,
          valid: false,
        };
        result.issues.push({
          severity: 'error',
          message: `Missing collection: ${req.name}`,
        });
      } else {
        const varCount = collection.variableIds.length;
        const isValid = varCount >= req.minVars;

        result.collections[req.name] = {
          exists: true,
          variableCount: varCount,
          valid: isValid,
          id: collection.id,
        };

        if (!isValid) {
          result.valid = false;
          result.issues.push({
            severity: varCount === 0 ? 'error' : 'warning',
            message: `${req.name} has ${varCount} variables (minimum: ${req.minVars})`,
          });
        }
      }
    }

    // Check for proper mode configuration based on the organizing principle
    for (const collConfig of requiredCollections) {
      const collection = await findCollectionByName(collConfig.name);
      if (collection && collConfig.modes.length > 1) {
        const actualModes = collection.modes.map(function(m) { return m.name; });
        for (const expectedMode of collConfig.modes) {
          if (!actualModes.includes(expectedMode)) {
            result.issues.push({
              severity: 'warning',
              message: `${collConfig.name} should have '${expectedMode}' mode`,
            });
          }
        }
      }
    }

    return successResult(command.id, { data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Validation failed: ${message}`);
  }
}

/**
 * Get quick status of design system
 * Supports different organizing principles
 */
export async function handleGetDesignSystemStatus(command: FigmaCommand): Promise<CommandResult> {
  // Get organizing principle from payload (default: four-level for backward compatibility)
  const payload = command.payload as { organizingPrinciple?: OrganizingPrincipleName } | undefined;
  const principleName = payload?.organizingPrinciple || 'four-level';
  const principle = getOrganizingPrinciple(principleName);

  try {
    const status: DesignSystemStatus & { organizingPrinciple?: string } = {
      organizingPrinciple: principleName,
      hasAllCollections: true,
      collectionCounts: {},
      ready: true,
    };

    // Build required collections and minimums from the organizing principle
    const requiredNames = principle.collections.map(c => c.name);
    const minimums: Record<string, number> = {};
    for (const coll of principle.collections) {
      minimums[coll.name] = coll.minVariableCount;
    }

    for (var n = 0; n < requiredNames.length; n++) {
      var name = requiredNames[n];
      const collection = await findCollectionByName(name);
      if (!collection) {
        status.hasAllCollections = false;
        status.ready = false;
        status.collectionCounts[name] = 0;
      } else {
        status.collectionCounts[name] = collection.variableIds.length;
        if (collection.variableIds.length < minimums[name]) {
          status.ready = false;
        }
      }
    }

    return successResult(command.id, { data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Status check failed: ${message}`);
  }
}

/**
 * Bind all documentation frame elements to their corresponding variables
 * This systematically finds all rectangles/elements in documentation frames
 * and binds them to variables based on naming conventions
 */
export async function handleBindDocumentationVariables(command: FigmaCommand): Promise<CommandResult> {
  try {
    const bindings: Array<{ nodeId: string; nodeName: string; variableId: string; variableName: string; field: string }> = [];
    const errors: string[] = [];
    const skipped: string[] = [];

    // Get all local variables indexed by name for quick lookup
    // Wrap in try-catch for stale variable references
    const variablesByName: Map<string, Variable> = new Map();
    try {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();

      for (const collection of collections) {
        for (const varId of collection.variableIds) {
          try {
            const variable = await figma.variables.getVariableByIdAsync(varId);
            if (variable) {
              variablesByName.set(variable.name, variable);
            }
          } catch {
            // Stale variable reference - skip
          }
        }
      }
    } catch (err) {
      console.warn(`[Boilerplate] Failed to fetch variables: ${err}`);
    }

    // Helper: recursively find all nodes of certain types
    function findNodesRecursive(node: SceneNode, types: string[]): SceneNode[] {
      const results: SceneNode[] = [];

      if (types.includes(node.type)) {
        results.push(node);
      }

      if ('children' in node) {
        for (const child of node.children) {
          results.push(...findNodesRecursive(child, types));
        }
      }

      return results;
    }

    // Helper: bind a color variable to a node's fill
    async function bindColorToFill(node: SceneNode, variable: Variable): Promise<boolean> {
      if (!('fills' in node)) return false;

      try {
        const fillableNode = node as MinimalFillsMixin;
        const currentFills = fillableNode.fills;

        if (currentFills === figma.mixed || !Array.isArray(currentFills)) return false;

        const fills = [...currentFills] as Paint[];

        if (fills.length === 0) {
          // Create a solid paint if none exists
          fills.push({
            type: 'SOLID',
            color: { r: 1, g: 1, b: 1 },
            visible: true,
            opacity: 1,
            blendMode: 'NORMAL',
          } as SolidPaint);
        }

        const targetFill = fills[0];
        if (targetFill.type !== 'SOLID') return false;

        const newFill = figma.variables.setBoundVariableForPaint(targetFill, 'color', variable);
        fills[0] = newFill;
        fillableNode.fills = fills;

        return true;
      } catch {
        // Node may have stale variable bindings - skip
        return false;
      }
    }

    // Helper: bind a float variable to a node property
    async function bindFloatToProperty(node: SceneNode, variable: Variable, field: string): Promise<boolean> {
      if (!(field in node)) return false;

      try {
        (node as any).setBoundVariable(field, variable);
        return true;
      } catch {
        return false;
      }
    }

    // Define variable name patterns and their mappings
    // Format: { pattern: RegExp, variablePath: string template }
    const colorMappings: Array<{ nodeNamePattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      // Primitive Level 1 colors
      { nodeNamePattern: /^Gray-(\d+)$/i, variablePath: (m) => `Color/Gray Scale/Gray-${m[1]}` },
      { nodeNamePattern: /^Brand-(\d+)$/i, variablePath: (m) => `Color/Brand Scale/Brand-${m[1]}` },
      { nodeNamePattern: /^(White|Black|Success|Warning|Error|Info)$/i, variablePath: (m) => `Color/System/${m[1]}` },

      // For rectangles named "Light" or "Dark" inside semantic frames
      // We'll handle these specially by looking at parent frame name
    ];

    const spacingMappings: Array<{ nodeNamePattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { nodeNamePattern: /^Space-(\d+)$/i, variablePath: (m) => `Numbers/Spacing/Space-${m[1]}` },
    ];

    const radiusMappings: Array<{ nodeNamePattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { nodeNamePattern: /^Radius-(None|XS|SM|MD|LG|XL|2XL|3XL|4XL|Full)$/i, variablePath: (m) => `Numbers/Border Radius/Radius-${m[1]}` },
    ];

    // Typography font size mappings - parent frame name pattern -> variable path
    const fontSizeMappings: Array<{ parentPattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { parentPattern: /^Size-(2XS|XS|SM|Base|MD|LG|XL|2XL|3XL|4XL|5XL|6XL|7XL)$/i, variablePath: (m) => `Typography/Font Size/Size-${m[1]}` },
    ];

    // Typography font weight mappings
    const fontWeightMappings: Array<{ parentPattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { parentPattern: /^Weight-(Thin|ExtraLight|Light|Regular|Medium|SemiBold|Bold|ExtraBold|Black)$/i, variablePath: (m) => `Typography/Font Weight/Weight-${m[1]}` },
    ];

    // Typography line height mappings
    const lineHeightMappings: Array<{ parentPattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { parentPattern: /^LineHeight-(None|Tight|Snug|Normal|Relaxed|Loose)$/i, variablePath: (m) => `Typography/Line Height/LineHeight-${m[1]}` },
    ];

    // Typography letter spacing mappings
    const letterSpacingMappings: Array<{ parentPattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { parentPattern: /^Tracking-(Tighter|Tight|Normal|Wide|Wider|Widest)$/i, variablePath: (m) => `Typography/Letter Spacing/Tracking-${m[1]}` },
    ];

    // Duration transition mappings (for Effects bars)
    const durationMappings: Array<{ parentPattern: RegExp; variablePath: (match: RegExpMatchArray) => string }> = [
      { parentPattern: /^Duration-(Instant|Fast|Normal|Moderate|Slow|Slower|Slowest|1000)$/i, variablePath: (m) => `Effects/Transition/Duration/Duration-${m[1]}` },
    ];

    // Find all top-level frames on the current page
    const page = figma.currentPage;
    const topFrames = page.children.filter(n => n.type === 'FRAME') as FrameNode[];

    // Process each frame
    for (const frame of topFrames) {
      // Find all rectangles in this frame
      const rectangles = findNodesRecursive(frame, ['RECTANGLE']) as RectangleNode[];

      for (const rect of rectangles) {
        let bound = false;

        // Try color mappings first (for fills)
        for (const mapping of colorMappings) {
          const match = rect.name.match(mapping.nodeNamePattern);
          if (match) {
            const varPath = mapping.variablePath(match);
            const variable = variablesByName.get(varPath);

            if (variable && variable.resolvedType === 'COLOR') {
              const success = await bindColorToFill(rect, variable);
              if (success) {
                bindings.push({
                  nodeId: rect.id,
                  nodeName: rect.name,
                  variableId: variable.id,
                  variableName: variable.name,
                  field: 'fills',
                });
                bound = true;
                break;
              }
            }
          }
        }

        if (bound) continue;

        // Check parent frame for semantic variable naming (Light/Dark swatches)
        if (rect.name === 'Light' || rect.name === 'Dark') {
          const parent = rect.parent;
          if (parent && parent.type === 'FRAME' && parent.name === 'Swatches') {
            const grandparent = parent.parent;
            if (grandparent && grandparent.type === 'FRAME') {
              // grandparent.name is like "Brand/Primary" or "Neutral/Light"
              const semanticPath = grandparent.name;
              const variable = variablesByName.get(semanticPath);

              if (variable && variable.resolvedType === 'COLOR') {
                const success = await bindColorToFill(rect, variable);
                if (success) {
                  bindings.push({
                    nodeId: rect.id,
                    nodeName: `${grandparent.name}/${rect.name}`,
                    variableId: variable.id,
                    variableName: variable.name,
                    field: 'fills',
                  });
                  bound = true;
                }
              }
            }
          }
        }

        if (bound) continue;

        // Try spacing mappings (for width)
        for (const mapping of spacingMappings) {
          const parentName = rect.parent?.name || '';
          const match = parentName.match(mapping.nodeNamePattern);
          if (match) {
            const varPath = mapping.variablePath(match);
            const variable = variablesByName.get(varPath);

            if (variable && variable.resolvedType === 'FLOAT') {
              const success = await bindFloatToProperty(rect, variable, 'width');
              if (success) {
                bindings.push({
                  nodeId: rect.id,
                  nodeName: rect.name,
                  variableId: variable.id,
                  variableName: variable.name,
                  field: 'width',
                });
                bound = true;
                break;
              }
            }
          }
        }

        if (bound) continue;

        // Try radius mappings (for cornerRadius)
        for (const mapping of radiusMappings) {
          const parentName = rect.parent?.name || '';
          const match = parentName.match(mapping.nodeNamePattern);
          if (match) {
            const varPath = mapping.variablePath(match);
            const variable = variablesByName.get(varPath);

            if (variable && variable.resolvedType === 'FLOAT') {
              const success = await bindFloatToProperty(rect, variable, 'topLeftRadius');
              if (success) {
                // Bind all corners
                await bindFloatToProperty(rect, variable, 'topRightRadius');
                await bindFloatToProperty(rect, variable, 'bottomLeftRadius');
                await bindFloatToProperty(rect, variable, 'bottomRightRadius');

                bindings.push({
                  nodeId: rect.id,
                  nodeName: rect.name,
                  variableId: variable.id,
                  variableName: variable.name,
                  field: 'cornerRadius',
                });
                bound = true;
                break;
              }
            }
          }
        }

        if (bound) continue;

        // Try typography font size mappings (rectangles named "bar" inside Size-XX frames)
        if (rect.name === 'bar' || rect.name === 'Bar') {
          const parentName = rect.parent?.name || '';
          for (const mapping of fontSizeMappings) {
            const match = parentName.match(mapping.parentPattern);
            if (match) {
              const varPath = mapping.variablePath(match);
              const variable = variablesByName.get(varPath);

              if (variable && variable.resolvedType === 'FLOAT') {
                const success = await bindFloatToProperty(rect, variable, 'width');
                if (success) {
                  bindings.push({
                    nodeId: rect.id,
                    nodeName: `${parentName}/bar`,
                    variableId: variable.id,
                    variableName: variable.name,
                    field: 'width',
                  });
                  bound = true;
                  break;
                }
              }
            }
          }

          // Try font weight mappings
          if (!bound) {
            for (const mapping of fontWeightMappings) {
              const match = parentName.match(mapping.parentPattern);
              if (match) {
                const varPath = mapping.variablePath(match);
                const variable = variablesByName.get(varPath);

                if (variable && variable.resolvedType === 'FLOAT') {
                  const success = await bindFloatToProperty(rect, variable, 'width');
                  if (success) {
                    bindings.push({
                      nodeId: rect.id,
                      nodeName: `${parentName}/bar`,
                      variableId: variable.id,
                      variableName: variable.name,
                      field: 'width',
                    });
                    bound = true;
                    break;
                  }
                }
              }
            }
          }

          // Try line height mappings
          if (!bound) {
            for (const mapping of lineHeightMappings) {
              const match = parentName.match(mapping.parentPattern);
              if (match) {
                const varPath = mapping.variablePath(match);
                const variable = variablesByName.get(varPath);

                if (variable && variable.resolvedType === 'FLOAT') {
                  const success = await bindFloatToProperty(rect, variable, 'height');
                  if (success) {
                    bindings.push({
                      nodeId: rect.id,
                      nodeName: `${parentName}/bar`,
                      variableId: variable.id,
                      variableName: variable.name,
                      field: 'height',
                    });
                    bound = true;
                    break;
                  }
                }
              }
            }
          }

          // Try letter spacing mappings
          if (!bound) {
            for (const mapping of letterSpacingMappings) {
              const match = parentName.match(mapping.parentPattern);
              if (match) {
                const varPath = mapping.variablePath(match);
                const variable = variablesByName.get(varPath);

                if (variable && variable.resolvedType === 'FLOAT') {
                  const success = await bindFloatToProperty(rect, variable, 'width');
                  if (success) {
                    bindings.push({
                      nodeId: rect.id,
                      nodeName: `${parentName}/bar`,
                      variableId: variable.id,
                      variableName: variable.name,
                      field: 'width',
                    });
                    bound = true;
                    break;
                  }
                }
              }
            }
          }

          // Try duration transition mappings
          if (!bound) {
            for (const mapping of durationMappings) {
              const match = parentName.match(mapping.parentPattern);
              if (match) {
                const varPath = mapping.variablePath(match);
                const variable = variablesByName.get(varPath);

                if (variable && variable.resolvedType === 'FLOAT') {
                  const success = await bindFloatToProperty(rect, variable, 'width');
                  if (success) {
                    bindings.push({
                      nodeId: rect.id,
                      nodeName: `${parentName}/bar`,
                      variableId: variable.id,
                      variableName: variable.name,
                      field: 'width',
                    });
                    bound = true;
                    break;
                  }
                }
              }
            }
          }
        }

        if (bound) continue;

        // Try Level 3 and Theme swatches (rectangles named "Swatch" or "swatch")
        if (rect.name.toLowerCase() === 'swatch') {
          // For Level 3/Theme, look at grandparent frame name for the variable path
          // Structure: Theme > Background/Primary > Swatches > [Light, Dark]
          // or: Theme > Background/Primary > Swatch
          const parent = rect.parent;
          if (parent && parent.type === 'FRAME') {
            let varPath = '';

            // Check if parent is a container like "Swatches" or "swatches"
            if (parent.name.toLowerCase() === 'swatches' || parent.name.toLowerCase() === 'row' || parent.name.toLowerCase() === 'samples') {
              const grandparent = parent.parent;
              if (grandparent && grandparent.type === 'FRAME') {
                varPath = grandparent.name;
              }
            } else {
              // Parent IS the variable name container
              varPath = parent.name;
            }

            if (varPath) {
              // Try to find matching variable in any collection
              let variable = variablesByName.get(varPath);

              // If not found, try common prefixes for Level 3/Theme variables
              if (!variable) {
                const prefixes = ['Background/', 'Text/', 'Border/', 'Status/', 'Surface/', 'Foreground/', 'Action/', 'Interactive/', 'State/', 'Feedback/'];
                for (const prefix of prefixes) {
                  variable = variablesByName.get(prefix + varPath);
                  if (variable && variable.resolvedType === 'COLOR') break;
                  variable = undefined;
                }
              }

              if (variable && variable.resolvedType === 'COLOR') {
                const success = await bindColorToFill(rect, variable);
                if (success) {
                  bindings.push({
                    nodeId: rect.id,
                    nodeName: `${varPath}/Swatch`,
                    variableId: variable.id,
                    variableName: variable.name,
                    field: 'fills',
                  });
                  bound = true;
                }
              }
            }
          }
        }

        if (!bound && rect.name !== 'Rectangle' && rect.name !== 'box') {
          skipped.push(`${rect.name} (${rect.id})`);
        }
      }
    }

    return successResult(command.id, {
      data: {
        boundCount: bindings.length,
        bindings,
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 20), // Limit to first 20
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Binding failed: ${message}`);
  }
}

// Typography style definitions that bind to variables
interface TypographyStyleDefinition {
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number | 'AUTO';
  letterSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  // Variable binding names (we'll look these up by name in collections)
  fontSizeVariable?: string;
  lineHeightVariable?: string;
  letterSpacingVariable?: string;
  fontFamilyVariable?: string;  // STRING variable for font family
  fontStyleVariable?: string;   // STRING variable for font style (weight)
}

// Default typography style definitions based on common design systems
const DEFAULT_TYPOGRAPHY_STYLES: TypographyStyleDefinition[] = [
  // Hero/Display Headers (for hero sections and large marketing text)
  { name: 'Display/Hero', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 128, lineHeight: 140, fontSizeVariable: 'Typography/Font Size/fontSize-128', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Display/Display XL', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 96, lineHeight: 108, fontSizeVariable: 'Typography/Font Size/fontSize-96', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Display/Display Large', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 80, lineHeight: 92, fontSizeVariable: 'Typography/Font Size/fontSize-80', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Display/Display 1', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 72, lineHeight: 88, fontSizeVariable: 'Typography/Font Size/fontSize-72', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Display/Display 2', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 60, lineHeight: 72, fontSizeVariable: 'Typography/Font Size/fontSize-60', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },

  // Headers
  { name: 'Headers/H1', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 48, lineHeight: 56, fontSizeVariable: 'Typography/Font Size/fontSize-48', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Headers/H2', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 36, lineHeight: 44, fontSizeVariable: 'Typography/Font Size/fontSize-36', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Headers/H3', fontFamily: 'Inter', fontStyle: 'Bold', fontSize: 30, lineHeight: 38, fontSizeVariable: 'Typography/Font Size/fontSize-30', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Headers/H4', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 24, lineHeight: 32, fontSizeVariable: 'Typography/Font Size/fontSize-24', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Headers/H5', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 20, lineHeight: 28, fontSizeVariable: 'Typography/Font Size/fontSize-20', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Headers/H6', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 18, lineHeight: 24, fontSizeVariable: 'Typography/Font Size/fontSize-18', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },

  // Body
  { name: 'Body/Body Large', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 18, lineHeight: 28, fontSizeVariable: 'Typography/Font Size/fontSize-18', lineHeightVariable: 'Typography/Line Height/lineHeight-28', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Body/Body', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 16, lineHeight: 24, fontSizeVariable: 'Typography/Font Size/fontSize-16', lineHeightVariable: 'Typography/Line Height/lineHeight-24', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Body/Body Small', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 14, lineHeight: 20, fontSizeVariable: 'Typography/Font Size/fontSize-14', lineHeightVariable: 'Typography/Line Height/lineHeight-20', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },

  // Labels
  { name: 'Label/Label Large', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 14, lineHeight: 20, fontSizeVariable: 'Typography/Font Size/fontSize-14', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Label/Label', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 12, lineHeight: 16, fontSizeVariable: 'Typography/Font Size/fontSize-12', lineHeightVariable: 'Typography/Line Height/lineHeight-16', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Label/Label Small', fontFamily: 'Inter', fontStyle: 'Medium', fontSize: 11, lineHeight: 16, fontSizeVariable: 'Typography/Font Size/fontSize-11', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Label/Label Caps', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 12, lineHeight: 16, letterSpacing: 1, textCase: 'UPPER', fontSizeVariable: 'Typography/Font Size/fontSize-12', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },

  // Buttons
  { name: 'Button/Button Large', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 18, lineHeight: 24, fontSizeVariable: 'Typography/Font Size/fontSize-18', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Button/Button', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 16, lineHeight: 24, fontSizeVariable: 'Typography/Font Size/fontSize-16', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Button/Button Small', fontFamily: 'Inter', fontStyle: 'Semi Bold', fontSize: 14, lineHeight: 20, fontSizeVariable: 'Typography/Font Size/fontSize-14', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },

  // Caption
  { name: 'Caption/Caption', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 12, lineHeight: 16, fontSizeVariable: 'Typography/Font Size/fontSize-12', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
  { name: 'Caption/Caption Small', fontFamily: 'Inter', fontStyle: 'Regular', fontSize: 11, lineHeight: 14, fontSizeVariable: 'Typography/Font Size/fontSize-11', fontFamilyVariable: 'Typography/Font Family/Font-Sans' },
];

// Create typography styles with variable bindings
export async function handleCreateTypographyStyles(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    styles?: TypographyStyleDefinition[];
    defaultFontFamily?: string;
    bindToVariables?: boolean;
  };

  const stylesToCreate = payload.styles || DEFAULT_TYPOGRAPHY_STYLES;
  const defaultFontFamily = payload.defaultFontFamily || 'Inter';
  const bindToVariables = payload.bindToVariables !== false; // Default true

  try {
    // Get all variables for binding
    let variablesByName = new Map<string, Variable>();
    if (bindToVariables) {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      for (const collection of collections) {
        const variables = await Promise.all(
          collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
        );
        for (const variable of variables) {
          if (variable) {
            variablesByName.set(variable.name, variable);
          }
        }
      }
    }

    const createdStyles: Array<{
      styleId: string;
      name: string;
      boundVariables: string[];
    }> = [];
    const errors: string[] = [];

    for (const styleDef of stylesToCreate) {
      try {
        // Use provided font family or default
        const fontFamily = styleDef.fontFamily || defaultFontFamily;
        const fontStyle = styleDef.fontStyle || 'Regular';
        const fontName: FontName = { family: fontFamily, style: fontStyle };

        // Load font
        await figma.loadFontAsync(fontName);

        // Create style
        const style = figma.createTextStyle();
        style.name = styleDef.name;
        style.fontName = fontName;
        style.fontSize = styleDef.fontSize;

        // Set line height
        if (styleDef.lineHeight === 'AUTO') {
          style.lineHeight = { unit: 'AUTO' };
        } else {
          style.lineHeight = { value: styleDef.lineHeight, unit: 'PIXELS' };
        }

        // Set letter spacing if provided
        if (styleDef.letterSpacing !== undefined) {
          style.letterSpacing = { value: styleDef.letterSpacing, unit: 'PIXELS' };
        }

        // Set text case if provided
        if (styleDef.textCase) {
          style.textCase = styleDef.textCase;
        }

        // Bind variables if enabled
        const boundVariables: string[] = [];
        if (bindToVariables) {
          // Bind fontSize
          if (styleDef.fontSizeVariable) {
            const fontSizeVar = variablesByName.get(styleDef.fontSizeVariable);
            if (fontSizeVar && fontSizeVar.resolvedType === 'FLOAT') {
              style.setBoundVariable('fontSize', fontSizeVar);
              boundVariables.push(`fontSize → ${fontSizeVar.name}`);
            }
          }

          // Bind lineHeight
          if (styleDef.lineHeightVariable) {
            const lineHeightVar = variablesByName.get(styleDef.lineHeightVariable);
            if (lineHeightVar && lineHeightVar.resolvedType === 'FLOAT') {
              style.setBoundVariable('lineHeight', lineHeightVar);
              boundVariables.push(`lineHeight → ${lineHeightVar.name}`);
            }
          }

          // Bind letterSpacing
          if (styleDef.letterSpacingVariable) {
            const letterSpacingVar = variablesByName.get(styleDef.letterSpacingVariable);
            if (letterSpacingVar && letterSpacingVar.resolvedType === 'FLOAT') {
              style.setBoundVariable('letterSpacing', letterSpacingVar);
              boundVariables.push(`letterSpacing → ${letterSpacingVar.name}`);
            }
          }

          // Bind fontFamily (STRING variable)
          if (styleDef.fontFamilyVariable) {
            const fontFamilyVar = variablesByName.get(styleDef.fontFamilyVariable);
            if (fontFamilyVar && fontFamilyVar.resolvedType === 'STRING') {
              style.setBoundVariable('fontFamily', fontFamilyVar);
              boundVariables.push(`fontFamily → ${fontFamilyVar.name}`);
            }
          }

          // Bind fontStyle (STRING variable)
          if (styleDef.fontStyleVariable) {
            const fontStyleVar = variablesByName.get(styleDef.fontStyleVariable);
            if (fontStyleVar && fontStyleVar.resolvedType === 'STRING') {
              style.setBoundVariable('fontStyle', fontStyleVar);
              boundVariables.push(`fontStyle → ${fontStyleVar.name}`);
            }
          }
        }

        createdStyles.push({
          styleId: style.id,
          name: style.name,
          boundVariables,
        });
      } catch (styleError) {
        const msg = styleError instanceof Error ? styleError.message : String(styleError);
        errors.push(`Failed to create style "${styleDef.name}": ${msg}`);
      }
    }

    return successResult(command.id, {
      data: {
        createdCount: createdStyles.length,
        styles: createdStyles,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Typography styles creation failed: ${message}`);
  }
}

// Create Theme [ State ] collection with multiple modes
// Extract first from file, fill gaps with boilerplate
export async function handleCreateStateCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    collectionName?: string;
    modes?: string[];
    boilerplateVariables?: Array<{
      name: string;
      type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
      valuesByMode: Record<string, string | number | boolean>;
      scopes?: string[];
    }>;
    includeBoilerplate?: boolean;
  };

  const collectionName = payload.collectionName || 'Theme [ State ]';
  const defaultModes = ['Default', 'Hover', 'Inactive/Disabled', 'Contrast'];
  const includeBoilerplate = payload.includeBoilerplate !== false;

  // Boilerplate variables - only used if not found in file
  const boilerplateVariables = payload.boilerplateVariables || [
    {
      name: 'Button State/Button-Color',
      type: 'COLOR' as const,
      valuesByMode: {
        'Default': 'Buttons (Primary & Secondary)/Color/States/Default-State',
        'Hover': 'Buttons (Primary & Secondary)/Color/States/Hover-State',
        'Inactive/Disabled': 'Buttons (Primary & Secondary)/Color/States/Disabled-State',
        'Contrast': 'Buttons (Primary & Secondary)/Color/States/Contrast-State',
      },
      scopes: ['ALL_SCOPES'],
    },
  ];

  try {
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

    // Build a map of all existing variables by name for aliasing
    const allVariablesByName = new Map<string, Variable>();
    for (const coll of existingCollections) {
      const variables = await Promise.all(
        coll.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const variable of variables) {
        if (variable) {
          allVariablesByName.set(variable.name, variable);
        }
      }
    }

    // Check if collection already exists
    let collection = existingCollections.find(c => c.name === collectionName);
    let collectionExisted = false;
    let existingVariableNames = new Set<string>();
    let modes = payload.modes || defaultModes;
    let modeIds: Record<string, string> = {};

    if (collection) {
      // Collection exists - extract its structure
      collectionExisted = true;

      // Get existing modes
      modes = collection.modes.map(m => m.name);
      for (const mode of collection.modes) {
        modeIds[mode.name] = mode.modeId;
      }

      // Get existing variable names in this collection
      const existingVars = await Promise.all(
        collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const v of existingVars) {
        if (v) existingVariableNames.add(v.name);
      }
    } else {
      // Create the collection
      collection = figma.variables.createVariableCollection(collectionName);

      // Rename the default mode and add additional modes
      collection.renameMode(collection.modes[0].modeId, modes[0]);
      modeIds[modes[0]] = collection.modes[0].modeId;

      for (let i = 1; i < modes.length; i++) {
        const newModeId = collection.addMode(modes[i]);
        modeIds[modes[i]] = newModeId;
      }
    }

    const createdVariables: Array<{ variableId: string; name: string; modeBindings: Record<string, string>; source: string }> = [];
    const skippedVariables: string[] = [];
    const errors: string[] = [];

    // Only add boilerplate variables that don't already exist
    if (includeBoilerplate) {
      for (const varDef of boilerplateVariables) {
        // Skip if variable already exists
        if (existingVariableNames.has(varDef.name)) {
          skippedVariables.push(`${varDef.name} (already exists)`);
          continue;
        }

        try {
          const resolvedType = varDef.type === 'FLOAT' ? 'FLOAT' :
                              varDef.type === 'COLOR' ? 'COLOR' :
                              varDef.type === 'STRING' ? 'STRING' : 'BOOLEAN';

          const variable = figma.variables.createVariable(varDef.name, collection, resolvedType);

          if (varDef.scopes && varDef.scopes.length > 0) {
            variable.scopes = varDef.scopes as VariableScope[];
          }

          const modeBindings: Record<string, string> = {};

          for (const modeName of modes) {
            const modeId = modeIds[modeName];
            if (!modeId) continue;

            const modeValue = varDef.valuesByMode[modeName];
            if (modeValue === undefined) continue;

            if (typeof modeValue === 'string' && varDef.type === 'COLOR') {
              const referencedVar = allVariablesByName.get(modeValue);
              if (referencedVar && referencedVar.resolvedType === 'COLOR') {
                variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: referencedVar.id });
                modeBindings[modeName] = `→ ${referencedVar.name}`;
              } else {
                const color = parseColor(modeValue);
                if (color) {
                  variable.setValueForMode(modeId, color);
                  modeBindings[modeName] = modeValue;
                }
              }
            } else if (typeof modeValue === 'string' && varDef.type === 'STRING') {
              variable.setValueForMode(modeId, modeValue);
              modeBindings[modeName] = modeValue;
            } else if (typeof modeValue === 'number') {
              variable.setValueForMode(modeId, modeValue);
              modeBindings[modeName] = String(modeValue);
            } else if (typeof modeValue === 'boolean') {
              variable.setValueForMode(modeId, modeValue);
              modeBindings[modeName] = String(modeValue);
            }
          }

          createdVariables.push({
            variableId: variable.id,
            name: variable.name,
            modeBindings,
            source: 'boilerplate',
          });
        } catch (varError) {
          const msg = varError instanceof Error ? varError.message : String(varError);
          errors.push(`Failed to create variable "${varDef.name}": ${msg}`);
        }
      }
    }

    return successResult(command.id, {
      data: {
        collectionId: collection.id,
        collectionName: collection.name,
        collectionExisted,
        modes,
        modeIds,
        existingVariableCount: existingVariableNames.size,
        createdCount: createdVariables.length,
        variables: createdVariables,
        skippedCount: skippedVariables.length,
        skipped: skippedVariables,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `State collection creation failed: ${message}`);
  }
}

// Create Theme [ Component Size ] collection with size modes (Large/Medium/Small)
// Extract first from file, fill gaps with boilerplate
export async function handleCreateComponentSizeCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    collectionName?: string;
    modes?: string[];
    includeBoilerplate?: boolean;
  };

  const collectionName = payload.collectionName || 'Theme [ Component Size ]';
  const defaultModes = ['Large', 'Medium', 'Small'];
  const includeBoilerplate = payload.includeBoilerplate !== false;

  // Boilerplate variables - only used if not found in file
  const boilerplateVariables = [
    { name: 'Button/Size', valuesByMode: { 'Large': 56, 'Medium': 48, 'Small': 40 }, scopes: ['WIDTH_HEIGHT'] },
    { name: 'Icon/Size', valuesByMode: { 'Large': 24, 'Medium': 20, 'Small': 16 }, scopes: ['WIDTH_HEIGHT'] },
    { name: 'Button/Corner Radius', valuesByMode: { 'Large': 12, 'Medium': 12, 'Small': 12 }, scopes: ['CORNER_RADIUS'] },
    { name: 'Button/Padding', valuesByMode: { 'Large': 24, 'Medium': 20, 'Small': 16 }, scopes: ['GAP'] },
    { name: 'Modal Size/Modal Size', valuesByMode: { 'Large': 584, 'Medium': 560, 'Small': 500 }, scopes: ['ALL_SCOPES'] },
  ];

  try {
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

    // Build variable map for aliasing
    const allVariablesByName = new Map<string, Variable>();
    for (const coll of existingCollections) {
      const variables = await Promise.all(
        coll.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const variable of variables) {
        if (variable) allVariablesByName.set(variable.name, variable);
      }
    }

    // Check if collection already exists
    let collection = existingCollections.find(c => c.name === collectionName);
    let collectionExisted = false;
    let existingVariableNames = new Set<string>();
    let modes = payload.modes || defaultModes;
    let modeIds: Record<string, string> = {};

    if (collection) {
      collectionExisted = true;
      modes = collection.modes.map(m => m.name);
      for (const mode of collection.modes) {
        modeIds[mode.name] = mode.modeId;
      }
      const existingVars = await Promise.all(
        collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const v of existingVars) {
        if (v) existingVariableNames.add(v.name);
      }
    } else {
      collection = figma.variables.createVariableCollection(collectionName);
      collection.renameMode(collection.modes[0].modeId, modes[0]);
      modeIds[modes[0]] = collection.modes[0].modeId;
      for (let i = 1; i < modes.length; i++) {
        const newModeId = collection.addMode(modes[i]);
        modeIds[modes[i]] = newModeId;
      }
    }

    const createdVariables: Array<{ variableId: string; name: string; modeValues: Record<string, string | number>; source: string }> = [];
    const skippedVariables: string[] = [];
    const errors: string[] = [];

    if (includeBoilerplate) {
      for (const varDef of boilerplateVariables) {
        if (existingVariableNames.has(varDef.name)) {
          skippedVariables.push(`${varDef.name} (already exists)`);
          continue;
        }

        try {
          const variable = figma.variables.createVariable(varDef.name, collection, 'FLOAT');
          if (varDef.scopes && varDef.scopes.length > 0) {
            variable.scopes = varDef.scopes as VariableScope[];
          }

          const modeValues: Record<string, string | number> = {};
          for (const modeName of modes) {
            const modeId = modeIds[modeName];
            if (!modeId) continue;
            const modeValue = varDef.valuesByMode[modeName as keyof typeof varDef.valuesByMode];
            if (modeValue === undefined) continue;

            if (typeof modeValue === 'string') {
              const referencedVar = allVariablesByName.get(modeValue);
              if (referencedVar && referencedVar.resolvedType === 'FLOAT') {
                variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: referencedVar.id });
                modeValues[modeName] = `→ ${referencedVar.name}`;
              }
            } else {
              variable.setValueForMode(modeId, modeValue);
              modeValues[modeName] = modeValue;
            }
          }

          createdVariables.push({ variableId: variable.id, name: variable.name, modeValues, source: 'boilerplate' });
        } catch (varError) {
          const msg = varError instanceof Error ? varError.message : String(varError);
          errors.push(`Failed to create variable "${varDef.name}": ${msg}`);
        }
      }
    }

    return successResult(command.id, {
      data: {
        collectionId: collection.id,
        collectionName: collection.name,
        collectionExisted,
        modes,
        modeIds,
        existingVariableCount: existingVariableNames.size,
        createdCount: createdVariables.length,
        variables: createdVariables,
        skippedCount: skippedVariables.length,
        skipped: skippedVariables,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Component size collection creation failed: ${message}`);
  }
}

// Create Theme [ Screen Sizes ] collection with responsive modes (Mobile/iPad/Web)
// Extract first from file, fill gaps with boilerplate
export async function handleCreateScreenSizeCollection(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    collectionName?: string;
    modes?: string[];
    includeBoilerplate?: boolean;
  };

  const collectionName = payload.collectionName || 'Theme [ Screen Sizes ]';
  const defaultModes = ['Mobile', 'iPad', 'Web'];
  const includeBoilerplate = payload.includeBoilerplate !== false;

  // Boilerplate variables - only used if not found in file
  const boilerplateVariables = [
    { name: 'Screen Size/Screen Width/Width', type: 'FLOAT' as const, valuesByMode: { 'Mobile': 375, 'iPad': 744, 'Web': 1440 }, scopes: ['WIDTH_HEIGHT'] },
    { name: 'Screen Size/Screen Padding/Padding', type: 'FLOAT' as const, valuesByMode: { 'Mobile': 20, 'iPad': 50, 'Web': 120 }, scopes: ['GAP'] },
    { name: 'Screen Size/Includes/Includes-MenuItems', type: 'BOOLEAN' as const, valuesByMode: { 'Mobile': false, 'iPad': false, 'Web': true }, scopes: ['ALL_SCOPES'] },
    { name: 'Screen Size/Includes/Includes-Buttons', type: 'BOOLEAN' as const, valuesByMode: { 'Mobile': false, 'iPad': true, 'Web': true }, scopes: ['ALL_SCOPES'] },
    { name: 'Screen Size/Includes/Includes-Hamburger Icon', type: 'BOOLEAN' as const, valuesByMode: { 'Mobile': true, 'iPad': true, 'Web': false }, scopes: ['ALL_SCOPES'] },
    { name: 'Screen Size/Includes/Includes-Logo', type: 'BOOLEAN' as const, valuesByMode: { 'Mobile': false, 'iPad': false, 'Web': true }, scopes: ['ALL_SCOPES'] },
  ];

  try {
    const existingCollections = await figma.variables.getLocalVariableCollectionsAsync();

    // Build variable map for aliasing
    const allVariablesByName = new Map<string, Variable>();
    for (const coll of existingCollections) {
      const variables = await Promise.all(
        coll.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const variable of variables) {
        if (variable) allVariablesByName.set(variable.name, variable);
      }
    }

    // Check if collection already exists
    let collection = existingCollections.find(c => c.name === collectionName);
    let collectionExisted = false;
    let existingVariableNames = new Set<string>();
    let modes = payload.modes || defaultModes;
    let modeIds: Record<string, string> = {};

    if (collection) {
      collectionExisted = true;
      modes = collection.modes.map(m => m.name);
      for (const mode of collection.modes) {
        modeIds[mode.name] = mode.modeId;
      }
      const existingVars = await Promise.all(
        collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );
      for (const v of existingVars) {
        if (v) existingVariableNames.add(v.name);
      }
    } else {
      collection = figma.variables.createVariableCollection(collectionName);
      collection.renameMode(collection.modes[0].modeId, modes[0]);
      modeIds[modes[0]] = collection.modes[0].modeId;
      for (let i = 1; i < modes.length; i++) {
        const newModeId = collection.addMode(modes[i]);
        modeIds[modes[i]] = newModeId;
      }
    }

    const createdVariables: Array<{ variableId: string; name: string; type: string; modeValues: Record<string, string | number | boolean>; source: string }> = [];
    const skippedVariables: string[] = [];
    const errors: string[] = [];

    if (includeBoilerplate) {
      for (const varDef of boilerplateVariables) {
        if (existingVariableNames.has(varDef.name)) {
          skippedVariables.push(`${varDef.name} (already exists)`);
          continue;
        }

        try {
          const resolvedType = varDef.type === 'BOOLEAN' ? 'BOOLEAN' : 'FLOAT';
          const variable = figma.variables.createVariable(varDef.name, collection, resolvedType);
          if (varDef.scopes && varDef.scopes.length > 0) {
            variable.scopes = varDef.scopes as VariableScope[];
          }

          const modeValues: Record<string, string | number | boolean> = {};
          for (const modeName of modes) {
            const modeId = modeIds[modeName];
            if (!modeId) continue;
            const modeValue = varDef.valuesByMode[modeName as keyof typeof varDef.valuesByMode];
            if (modeValue === undefined) continue;

            if (typeof modeValue === 'string' && varDef.type === 'FLOAT') {
              const referencedVar = allVariablesByName.get(modeValue);
              if (referencedVar && referencedVar.resolvedType === 'FLOAT') {
                variable.setValueForMode(modeId, { type: 'VARIABLE_ALIAS', id: referencedVar.id });
                modeValues[modeName] = `→ ${referencedVar.name}`;
              }
            } else if (typeof modeValue === 'number') {
              variable.setValueForMode(modeId, modeValue);
              modeValues[modeName] = modeValue;
            } else if (typeof modeValue === 'boolean') {
              variable.setValueForMode(modeId, modeValue);
              modeValues[modeName] = modeValue;
            }
          }

          createdVariables.push({ variableId: variable.id, name: variable.name, type: resolvedType, modeValues, source: 'boilerplate' });
        } catch (varError) {
          const msg = varError instanceof Error ? varError.message : String(varError);
          errors.push(`Failed to create variable "${varDef.name}": ${msg}`);
        }
      }
    }

    return successResult(command.id, {
      data: {
        collectionId: collection.id,
        collectionName: collection.name,
        collectionExisted,
        modes,
        modeIds,
        existingVariableCount: existingVariableNames.size,
        createdCount: createdVariables.length,
        variables: createdVariables,
        skippedCount: skippedVariables.length,
        skipped: skippedVariables,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Screen size collection creation failed: ${message}`);
  }
}
