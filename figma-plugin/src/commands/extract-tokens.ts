// Extract design tokens from Figma frames
// Pulls all token types: colors, typography, numbers, effects

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { colorToHex, ColorValue } from '../utils/variable-factory';

// Color with frequency data
export interface ColorWithFrequency {
  hex: string;
  count: number;
  percentage: number; // Percentage of total color usage
}

// Brand color candidate for user selection
export interface BrandColorCandidate {
  hex: string;
  count: number;
  percentage: number;
  isRecommended: boolean; // True if this is the most prominent
}

// Extracted token structure matching the 4-category variable system
export interface ExtractedDesignTokens {
  // === COLOR ===
  colors: {
    all: string[];            // All unique hex colors
    allWithFrequency: ColorWithFrequency[]; // Colors sorted by frequency
    grayScale: string[];      // Detected grays
    brandScale: string[];     // Chromatic (non-gray) colors
    brandCandidates: BrandColorCandidate[]; // Top chromatic colors by frequency
    secondaryScale: string[]; // Secondary colors
    tertiaryScale: string[];  // Tertiary colors
    system: string[];         // White, black, status colors
    colorNodes?: Record<string, string[]>; // Node IDs per fill color (for color variable binding)
    strokeNodes?: Record<string, string[]>; // Node IDs per stroke color (for stroke variable binding)
  };

  // === TYPOGRAPHY ===
  typography: {
    fontFamily: string[];     // Unique font families
    fontFamilies?: string[];  // Alias for fontFamily (used by website extraction)
    fontSize: number[];       // Unique font sizes
    fontWeight: number[];     // Unique font weights
    lineHeight: number[];     // Unique line heights (as multipliers)
    letterSpacing: number[];  // Unique letter spacing values
    fontSizeNodes?: Record<number, string[]>; // Node IDs per font size (for text style binding)
    fontFamilyMap?: Record<string, string>; // Map each font size to its most-used font family
    fontCombos?: Array<{  // Every unique family+style+size combo with node IDs
      fontFamily: string;
      fontStyle: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number | null;  // In pixels
      letterSpacing: number;      // In pixels
      nodeIds: string[];
    }>;
    resolvedFonts?: Array<{   // Resolved font names from web search
      cssName: string;
      marketingName?: string;
      confidence: string;
    }>;
  };

  // === NUMBERS ===
  numbers: {
    spacing: number[];        // Gaps, padding, margins
    borderWidth: number[];    // Stroke weights
    borderRadius: number[];   // Corner radii
    opacity: number[];        // Opacity values
  };

  // === EFFECTS ===
  effects: {
    shadows: ExtractedShadow[];
    transitions: {
      duration: number[];     // Transition durations in ms
      easing: string[];       // Easing function names/values
    };
  };

  // Metadata
  meta: {
    nodeId: string;
    nodeName: string;
    nodesScanned: number;
    extractionTime: number;
  };
}

export interface ExtractedShadow {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: string;
  opacity: number;   // Color opacity (0-1), separate from hex
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  cssValue: string;  // CSS box-shadow equivalent
  nodeIds?: string[]; // Node IDs that have this shadow (for binding)
}

// Payload for the extract command
interface ExtractDesignTokensPayload {
  nodeId?: string;           // Specific node, or selection if not specified
  includeChildren?: boolean; // Default true
  detectColorScales?: boolean; // Auto-categorize colors into scales
  scope?: 'selection' | 'page' | 'file'; // Extraction scope (default: 'selection')
  includeStyles?: boolean;   // Include existing text/effect styles (default: false)
}

// Extracted existing style from file
export interface ExtractedTextStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number | 'AUTO';
  letterSpacing: number;
  textCase: string;
}

export interface ExtractedEffectStyle {
  id: string;
  name: string;
  description?: string;
  effects: Array<{
    type: string;
    color?: string;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
    visible?: boolean;
  }>;
}

export interface ExtractedGridStyle {
  id: string;
  name: string;
  description?: string;
  grids: Array<{
    pattern: 'GRID' | 'COLUMNS' | 'ROWS';
    sectionSize?: number;
    count?: number;
    gutterSize?: number;
    offset?: number;
    alignment?: 'MIN' | 'MAX' | 'CENTER' | 'STRETCH';
    color?: string;
    visible?: boolean;
  }>;
}

export interface ExtractedExistingStyles {
  textStyles: ExtractedTextStyle[];
  effectStyles: ExtractedEffectStyle[];
  gridStyles: ExtractedGridStyle[];
}

// Helper: Check if a color is grayscale
function isGrayColor(r: number, g: number, b: number): boolean {
  const tolerance = 0.05;
  return Math.abs(r - g) < tolerance && Math.abs(g - b) < tolerance && Math.abs(r - b) < tolerance;
}

// Helper: Get luminance of a color (0-1)
function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Helper: Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Helper: Extract color from paint
function extractColorFromPaint(paint: Paint): ColorValue | null {
  if (paint.type === 'SOLID' && paint.visible !== false) {
    const solid = paint as SolidPaint;
    return {
      r: solid.color.r,
      g: solid.color.g,
      b: solid.color.b,
      a: solid.opacity !== undefined ? solid.opacity : 1,
    };
  }

  // For gradients, extract all stop colors
  if (
    paint.type === 'GRADIENT_LINEAR' ||
    paint.type === 'GRADIENT_RADIAL' ||
    paint.type === 'GRADIENT_ANGULAR' ||
    paint.type === 'GRADIENT_DIAMOND'
  ) {
    const gradient = paint as GradientPaint;
    if (gradient.gradientStops && gradient.gradientStops.length > 0) {
      const stop = gradient.gradientStops[0];
      return {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a,
      };
    }
  }

  return null;
}

// Helper: Convert shadow effect to extracted format
function extractShadow(effect: DropShadowEffect | InnerShadowEffect): ExtractedShadow {
  const hex = rgbToHex(effect.color.r, effect.color.g, effect.color.b);
  const alpha = effect.color.a;

  // Build CSS box-shadow value
  const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
  const cssValue = `${inset}${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread}px rgba(${Math.round(effect.color.r * 255)}, ${Math.round(effect.color.g * 255)}, ${Math.round(effect.color.b * 255)}, ${alpha.toFixed(2)})`;

  return {
    type: effect.type as 'DROP_SHADOW' | 'INNER_SHADOW',
    color: hex,
    opacity: alpha,
    offsetX: effect.offset.x,
    offsetY: effect.offset.y,
    blur: effect.radius,
    spread: effect.spread ?? 0,
    cssValue,
  };
}

// Helper: Normalize line height to multiplier
function normalizeLineHeight(lineHeight: LineHeight, fontSize: number): number | null {
  if (lineHeight.unit === 'AUTO') {
    return 1.2; // Figma's default auto line height approximation
  } else if (lineHeight.unit === 'PIXELS') {
    return fontSize > 0 ? lineHeight.value / fontSize : null;
  } else if (lineHeight.unit === 'PERCENT') {
    return lineHeight.value / 100;
  }
  return null;
}

// Helper: Normalize letter spacing to percentage
function normalizeLetterSpacing(letterSpacing: LetterSpacing, fontSize: number): number | null {
  if (letterSpacing.unit === 'PIXELS') {
    return fontSize > 0 ? letterSpacing.value / fontSize : null;
  } else if (letterSpacing.unit === 'PERCENT') {
    return letterSpacing.value / 100;
  }
  return null;
}

// Main extraction class
class TokenExtractor {
  private colorFrequency: Map<string, number> = new Map(); // Track frequency
  private colorNodes: Map<string, string[]> = new Map(); // Track nodeIds per color (for binding)
  private fontFamilies: Set<string> = new Set();
  private fontSizes: Set<number> = new Set();
  private fontSizeNodes: Map<number, string[]> = new Map(); // Track nodeIds per font size
  private fontSizeFamilyCount: Map<number, Map<string, number>> = new Map(); // Track font family usage per size
  private fontComboNodes: Map<string, { fontFamily: string; fontStyle: string; fontSize: number; fontWeight: number; lineHeight: number | null; letterSpacing: number; nodeIds: string[] }> = new Map(); // Track every unique font combo
  private fontWeights: Set<number> = new Set();
  private lineHeights: Set<number> = new Set();
  private letterSpacings: Set<number> = new Set();
  private spacings: Set<number> = new Set();
  private borderWidths: Set<number> = new Set();
  private borderRadii: Set<number> = new Set();
  private opacities: Set<number> = new Set();
  private shadows: Map<string, ExtractedShadow & { nodeIds: string[] }> = new Map();
  private transitionDurations: Set<number> = new Set();
  private transitionEasings: Set<string> = new Set();
  private nodesScanned: number = 0;

  // Extract from a single node
  extractFromNode(node: SceneNode): void {
    this.nodesScanned++;

    // === COLORS ===
    // Extract fill colors (with frequency and nodeId tracking)
    if ('fills' in node) {
      const fills = node.fills;
      if (Array.isArray(fills)) {
        for (const fill of fills) {
          const color = extractColorFromPaint(fill);
          if (color) {
            const hex = rgbToHex(color.r, color.g, color.b);
            this.colorFrequency.set(hex, (this.colorFrequency.get(hex) || 0) + 1);
            // Track nodeId for this color (for binding)
            if (!this.colorNodes.has(hex)) {
              this.colorNodes.set(hex, []);
            }
            const nodeIds = this.colorNodes.get(hex)!;
            if (!nodeIds.includes(node.id)) {
              nodeIds.push(node.id);
            }
          }
        }
      }
    }

    // Extract stroke colors (with frequency and nodeId tracking)
    if ('strokes' in node) {
      const strokes = node.strokes;
      if (Array.isArray(strokes)) {
        for (const stroke of strokes) {
          const color = extractColorFromPaint(stroke);
          if (color) {
            const hex = rgbToHex(color.r, color.g, color.b);
            this.colorFrequency.set(hex, (this.colorFrequency.get(hex) || 0) + 1);
            // Track nodeId for strokes separately (prefixed for differentiation)
            const strokeKey = `stroke:${hex}`;
            if (!this.colorNodes.has(strokeKey)) {
              this.colorNodes.set(strokeKey, []);
            }
            const nodeIds = this.colorNodes.get(strokeKey)!;
            if (!nodeIds.includes(node.id)) {
              nodeIds.push(node.id);
            }
          }
        }
      }
    }

    // === TYPOGRAPHY (Text nodes only) ===
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;

      // Font family
      const fontName = textNode.fontName;
      if (fontName !== figma.mixed) {
        this.fontFamilies.add(fontName.family);
      }

      // Font size (with nodeId tracking and font family association)
      const fontSize = textNode.fontSize;
      if (fontSize !== figma.mixed && typeof fontSize === 'number') {
        this.fontSizes.add(fontSize);
        // Track nodeId for this font size
        const roundedSize = Math.round(fontSize);
        if (!this.fontSizeNodes.has(roundedSize)) {
          this.fontSizeNodes.set(roundedSize, []);
        }
        this.fontSizeNodes.get(roundedSize)!.push(node.id);

        // Track which font family is used at each font size
        if (fontName !== figma.mixed) {
          if (!this.fontSizeFamilyCount.has(roundedSize)) {
            this.fontSizeFamilyCount.set(roundedSize, new Map());
          }
          const familyCount = this.fontSizeFamilyCount.get(roundedSize)!;
          familyCount.set(fontName.family, (familyCount.get(fontName.family) || 0) + 1);
        }
      }

      // Font weight
      const fontWeight = textNode.fontWeight;
      if (fontWeight !== figma.mixed && typeof fontWeight === 'number') {
        this.fontWeights.add(fontWeight);
      }

      // Line height
      const lineHeight = textNode.lineHeight;
      const currentFontSize = fontSize !== figma.mixed ? fontSize : 16;
      if (lineHeight !== figma.mixed) {
        const normalized = normalizeLineHeight(lineHeight, currentFontSize as number);
        if (normalized !== null) {
          // Round to 3 decimal places
          this.lineHeights.add(Math.round(normalized * 1000) / 1000);
        }
      }

      // Letter spacing
      const letterSpacing = textNode.letterSpacing;
      if (letterSpacing !== figma.mixed) {
        const normalized = normalizeLetterSpacing(letterSpacing, currentFontSize as number);
        if (normalized !== null) {
          // Round to 3 decimal places
          this.letterSpacings.add(Math.round(normalized * 1000) / 1000);
        }
      }

      // Track unique font combos (family + style + size + weight + lineHeight + letterSpacing)
      if (fontName !== figma.mixed && fontSize !== figma.mixed && typeof fontSize === 'number'
          && fontWeight !== figma.mixed && typeof fontWeight === 'number') {
        const lhPx = lineHeight !== figma.mixed
          ? (lineHeight.unit === 'PIXELS' ? lineHeight.value
             : lineHeight.unit === 'PERCENT' ? (fontSize * lineHeight.value / 100)
             : null)
          : null;
        const lsPx = letterSpacing !== figma.mixed
          ? (letterSpacing.unit === 'PIXELS' ? letterSpacing.value
             : letterSpacing.unit === 'PERCENT' ? (fontSize * letterSpacing.value / 100)
             : 0)
          : 0;
        const comboKey = `${fontName.family}|${fontName.style}|${Math.round(fontSize)}|${fontWeight}`;
        if (!this.fontComboNodes.has(comboKey)) {
          this.fontComboNodes.set(comboKey, {
            fontFamily: fontName.family,
            fontStyle: fontName.style,
            fontSize: Math.round(fontSize),
            fontWeight,
            lineHeight: lhPx !== null ? Math.round(lhPx * 10) / 10 : null,
            letterSpacing: Math.round(lsPx * 100) / 100,
            nodeIds: [],
          });
        }
        this.fontComboNodes.get(comboKey)!.nodeIds.push(node.id);
      }
    }

    // === NUMBERS ===
    // Border width (stroke weight)
    if ('strokeWeight' in node) {
      const strokeWeight = node.strokeWeight;
      if (strokeWeight !== figma.mixed && typeof strokeWeight === 'number' && strokeWeight > 0) {
        this.borderWidths.add(strokeWeight);
      }
    }

    // Border radius
    if ('cornerRadius' in node) {
      const cornerRadius = node.cornerRadius;
      if (cornerRadius !== figma.mixed && typeof cornerRadius === 'number') {
        this.borderRadii.add(cornerRadius);
      } else if (cornerRadius === figma.mixed) {
        // Get individual corners
        const rectNode = node as RectangleNode | FrameNode;
        if ('topLeftRadius' in rectNode) {
          this.borderRadii.add(rectNode.topLeftRadius);
          this.borderRadii.add(rectNode.topRightRadius);
          this.borderRadii.add(rectNode.bottomLeftRadius);
          this.borderRadii.add(rectNode.bottomRightRadius);
        }
      }
    }

    // Spacing (from auto-layout frames)
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const frameNode = node as FrameNode | ComponentNode | InstanceNode;

      if (frameNode.layoutMode !== 'NONE') {
        // Item spacing (gap)
        if (frameNode.itemSpacing !== undefined && frameNode.itemSpacing > 0) {
          this.spacings.add(frameNode.itemSpacing);
        }

        // Counter axis spacing (for wrap)
        if ('counterAxisSpacing' in frameNode && frameNode.counterAxisSpacing !== undefined && frameNode.counterAxisSpacing !== null && frameNode.counterAxisSpacing > 0) {
          this.spacings.add(frameNode.counterAxisSpacing as number);
        }

        // Padding
        if (frameNode.paddingLeft > 0) this.spacings.add(frameNode.paddingLeft);
        if (frameNode.paddingRight > 0) this.spacings.add(frameNode.paddingRight);
        if (frameNode.paddingTop > 0) this.spacings.add(frameNode.paddingTop);
        if (frameNode.paddingBottom > 0) this.spacings.add(frameNode.paddingBottom);
      }
    }

    // Opacity
    if ('opacity' in node) {
      const opacity = node.opacity;
      if (typeof opacity === 'number' && opacity < 1) {
        // Round to 2 decimal places
        this.opacities.add(Math.round(opacity * 100) / 100);
      }
    }

    // Fill opacity (separate from node opacity)
    if ('fills' in node) {
      const fills = node.fills;
      if (Array.isArray(fills)) {
        for (const fill of fills) {
          if (fill.type === 'SOLID' && fill.opacity !== undefined && fill.opacity < 1) {
            this.opacities.add(Math.round(fill.opacity * 100) / 100);
          }
        }
      }
    }

    // === EFFECTS ===
    if ('effects' in node) {
      const effects = node.effects;
      if (Array.isArray(effects)) {
        for (const effect of effects) {
          if (effect.visible !== false) {
            // Shadows
            if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
              const shadow = extractShadow(effect as DropShadowEffect | InnerShadowEffect);
              // Use CSS value as key for deduplication, but track all nodeIds
              const existing = this.shadows.get(shadow.cssValue);
              if (existing) {
                // Add this node ID if not already tracked
                if (!existing.nodeIds.includes(node.id)) {
                  existing.nodeIds.push(node.id);
                }
              } else {
                this.shadows.set(shadow.cssValue, { ...shadow, nodeIds: [node.id] });
              }
            }
          }
        }
      }
    }

    // === TRANSITIONS (from prototype reactions) ===
    if ('reactions' in node) {
      const reactions = (node as any).reactions;
      if (Array.isArray(reactions)) {
        for (const reaction of reactions) {
          if (reaction.action && reaction.action.transition) {
            const transition = reaction.action.transition;

            // Duration
            if (transition.duration !== undefined) {
              // Convert to ms if needed (Figma stores in seconds)
              const durationMs = transition.duration * 1000;
              this.transitionDurations.add(Math.round(durationMs));
            }

            // Easing
            if (transition.easing) {
              const easing = transition.easing;
              if (easing.type === 'CUSTOM_CUBIC_BEZIER' && easing.easingFunctionCubicBezier) {
                const bez = easing.easingFunctionCubicBezier;
                this.transitionEasings.add(`cubic-bezier(${bez.x1}, ${bez.y1}, ${bez.x2}, ${bez.y2})`);
              } else if (easing.type) {
                // Map Figma easing types to CSS
                const easingMap: Record<string, string> = {
                  'LINEAR': 'linear',
                  'EASE_IN': 'ease-in',
                  'EASE_OUT': 'ease-out',
                  'EASE_IN_AND_OUT': 'ease-in-out',
                  'EASE_IN_BACK': 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
                  'EASE_OUT_BACK': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  'EASE_IN_AND_OUT_BACK': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                  'CUSTOM_SPRING': 'spring',
                };
                const cssEasing = easingMap[easing.type] || easing.type.toLowerCase();
                this.transitionEasings.add(cssEasing);
              }
            }
          }
        }
      }
    }
  }

  // Recursively extract from node and children
  extractRecursive(node: SceneNode, includeChildren: boolean): void {
    this.extractFromNode(node);

    if (includeChildren && 'children' in node) {
      const parent = node as FrameNode | GroupNode | ComponentNode | InstanceNode;
      for (const child of parent.children) {
        this.extractRecursive(child, true);
      }
    }
  }

  // Categorize colors into scales with frequency analysis
  categorizeColors(): ExtractedDesignTokens['colors'] {
    const allColors = Array.from(this.colorFrequency.keys());
    const totalUsage = Array.from(this.colorFrequency.values()).reduce((a, b) => a + b, 0);

    // Build frequency array sorted by count (descending)
    const allWithFrequency: ColorWithFrequency[] = allColors
      .map(hex => ({
        hex,
        count: this.colorFrequency.get(hex) || 0,
        percentage: totalUsage > 0 ? ((this.colorFrequency.get(hex) || 0) / totalUsage) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const grayScale: string[] = [];
    const chromatic: ColorWithFrequency[] = [];
    const system: string[] = [];

    // Separate grays from chromatic colors
    for (const colorData of allWithFrequency) {
      const hex = colorData.hex;
      const lower = hex.toLowerCase();
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      // Detect system colors (pure white, pure black)
      if (lower === '#ffffff' || lower === '#000000') {
        system.push(hex);
      } else if (isGrayColor(r, g, b)) {
        grayScale.push(hex);
      } else {
        chromatic.push(colorData);
      }
    }

    // Sort grays by luminance (light to dark)
    grayScale.sort((a, b) => {
      const aR = parseInt(a.slice(1, 3), 16) / 255;
      const aG = parseInt(a.slice(3, 5), 16) / 255;
      const aB = parseInt(a.slice(5, 7), 16) / 255;
      const bR = parseInt(b.slice(1, 3), 16) / 255;
      const bG = parseInt(b.slice(3, 5), 16) / 255;
      const bB = parseInt(b.slice(5, 7), 16) / 255;
      return getLuminance(bR, bG, bB) - getLuminance(aR, aG, aB);
    });

    // Chromatic colors are already sorted by frequency
    // Top candidates for brand color (up to 5 most frequent chromatic colors)
    const brandCandidates: BrandColorCandidate[] = chromatic.slice(0, 5).map((c, index) => ({
      hex: c.hex,
      count: c.count,
      percentage: c.percentage,
      isRecommended: index === 0, // Most frequent is recommended
    }));

    return {
      all: allColors,
      allWithFrequency,
      grayScale,
      brandScale: chromatic.map(c => c.hex),
      brandCandidates,
      secondaryScale: [],
      tertiaryScale: [],
      system,
    };
  }

  // Get final extracted tokens
  getTokens(nodeId: string, nodeName: string, startTime: number): ExtractedDesignTokens {
    // Build colorNodes map (fill nodeIds only, strokes have 'stroke:' prefix)
    const colorNodesObj: Record<string, string[]> = {};
    for (const [key, nodeIds] of this.colorNodes.entries()) {
      if (!key.startsWith('stroke:')) {
        colorNodesObj[key] = nodeIds;
      }
    }
    // Also add stroke nodeIds separately
    const strokeNodesObj: Record<string, string[]> = {};
    for (const [key, nodeIds] of this.colorNodes.entries()) {
      if (key.startsWith('stroke:')) {
        strokeNodesObj[key.replace('stroke:', '')] = nodeIds;
      }
    }

    const colors = this.categorizeColors();
    // Add nodeIds to colors output
    (colors as any).colorNodes = colorNodesObj;
    (colors as any).strokeNodes = strokeNodesObj;

    return {
      colors,
      typography: {
        fontFamily: Array.from(this.fontFamilies).sort(),
        fontSize: Array.from(this.fontSizes).sort((a, b) => a - b),
        fontWeight: Array.from(this.fontWeights).sort((a, b) => a - b),
        lineHeight: Array.from(this.lineHeights).sort((a, b) => a - b),
        letterSpacing: Array.from(this.letterSpacings).sort((a, b) => a - b),
        // Include nodeIds for each font size (for binding)
        fontSizeNodes: Object.fromEntries(
          Array.from(this.fontSizeNodes.entries())
            .sort(([a], [b]) => a - b)
            .map(([size, nodeIds]) => [size, nodeIds])
        ),
        // Map each font size to its most-used font family
        fontFamilyMap: Object.fromEntries(
          Array.from(this.fontSizeFamilyCount.entries())
            .sort(([a], [b]) => a - b)
            .map(([size, familyMap]) => {
              // Pick the font family used most at this size
              let maxCount = 0;
              let topFamily = '';
              for (const [family, count] of familyMap) {
                if (count > maxCount) {
                  maxCount = count;
                  topFamily = family;
                }
              }
              return [size, topFamily];
            })
        ),
        // Every unique font combo with node IDs (for per-combo text style creation)
        fontCombos: Array.from(this.fontComboNodes.values())
          .sort((a, b) => a.fontFamily.localeCompare(b.fontFamily) || a.fontSize - b.fontSize || a.fontWeight - b.fontWeight),
      },
      numbers: {
        spacing: Array.from(this.spacings).sort((a, b) => a - b),
        borderWidth: Array.from(this.borderWidths).sort((a, b) => a - b),
        borderRadius: Array.from(this.borderRadii).sort((a, b) => a - b),
        opacity: Array.from(this.opacities).sort((a, b) => a - b),
      },
      effects: {
        shadows: Array.from(this.shadows.values()),
        transitions: {
          duration: Array.from(this.transitionDurations).sort((a, b) => a - b),
          easing: Array.from(this.transitionEasings).sort(),
        },
      },
      meta: {
        nodeId,
        nodeName,
        nodesScanned: this.nodesScanned,
        extractionTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Extract existing text styles and effect styles from the file
 */
async function extractExistingStyles(): Promise<ExtractedExistingStyles> {
  const textStyles: ExtractedTextStyle[] = [];
  const effectStyles: ExtractedEffectStyle[] = [];

  // Get all local text styles
  const localTextStyles = await figma.getLocalTextStylesAsync();
  for (const style of localTextStyles) {
    let lineHeightValue: number | 'AUTO' = 'AUTO';
    const lh = style.lineHeight as { unit: string; value?: number };
    if (lh && lh.unit !== 'AUTO' && lh.value !== undefined) {
      lineHeightValue = lh.value;
    }

    let letterSpacingValue = 0;
    if (style.letterSpacing && typeof style.letterSpacing === 'object') {
      letterSpacingValue = style.letterSpacing.value || 0;
    }

    textStyles.push({
      id: style.id,
      name: style.name,
      fontFamily: style.fontName?.family || 'Inter',
      fontStyle: style.fontName?.style || 'Regular',
      fontSize: style.fontSize as number,
      lineHeight: lineHeightValue,
      letterSpacing: letterSpacingValue,
      textCase: style.textCase || 'ORIGINAL',
    });
  }

  // Get all local effect styles
  const localEffectStyles = await figma.getLocalEffectStylesAsync();
  for (const style of localEffectStyles) {
    const effects: ExtractedEffectStyle['effects'] = [];

    for (const effect of style.effects) {
      const extractedEffect: ExtractedEffectStyle['effects'][0] = {
        type: effect.type,
        visible: effect.visible,
      };

      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        const shadow = effect as DropShadowEffect | InnerShadowEffect;
        if (shadow.color) {
          const r = Math.round(shadow.color.r * 255);
          const g = Math.round(shadow.color.g * 255);
          const b = Math.round(shadow.color.b * 255);
          const a = shadow.color.a !== undefined ? shadow.color.a : 1;
          if (a < 1) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            extractedEffect.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alphaHex}`;
          } else {
            extractedEffect.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          }
        }
        extractedEffect.offsetX = shadow.offset?.x || 0;
        extractedEffect.offsetY = shadow.offset?.y || 0;
        extractedEffect.radius = shadow.radius || 0;
        extractedEffect.spread = shadow.spread || 0;
      } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
        const blur = effect as BlurEffect;
        extractedEffect.radius = blur.radius || 0;
      }

      effects.push(extractedEffect);
    }

    effectStyles.push({
      id: style.id,
      name: style.name,
      description: style.description || undefined,
      effects,
    });
  }

  // Get all local grid styles
  const gridStyles: ExtractedGridStyle[] = [];
  const localGridStyles = await figma.getLocalGridStylesAsync();
  for (const style of localGridStyles) {
    const grids: ExtractedGridStyle['grids'] = [];

    for (const grid of style.layoutGrids) {
      const extractedGrid: ExtractedGridStyle['grids'][0] = {
        pattern: grid.pattern,
        visible: grid.visible,
      };

      // Extract color if present
      if (grid.color) {
        const r = Math.round(grid.color.r * 255);
        const g = Math.round(grid.color.g * 255);
        const b = Math.round(grid.color.b * 255);
        const a = grid.color.a !== undefined ? grid.color.a : 1;
        if (a < 1) {
          const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
          extractedGrid.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alphaHex}`;
        } else {
          extractedGrid.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
      }

      if (grid.pattern === 'GRID') {
        extractedGrid.sectionSize = grid.sectionSize;
      } else {
        // COLUMNS or ROWS
        const rowCol = grid as RowsColsLayoutGrid;
        extractedGrid.count = rowCol.count;
        extractedGrid.sectionSize = rowCol.sectionSize;
        extractedGrid.gutterSize = rowCol.gutterSize;
        extractedGrid.offset = rowCol.offset;
        extractedGrid.alignment = rowCol.alignment;
      }

      grids.push(extractedGrid);
    }

    gridStyles.push({
      id: style.id,
      name: style.name,
      description: style.description || undefined,
      grids,
    });
  }

  return { textStyles, effectStyles, gridStyles };
}

/**
 * Extract all design tokens from a node/frame
 * Returns colors, typography, numbers, and effects
 *
 * Scope options:
 * - 'selection' (default): Extract from selected nodes only
 * - 'page': Extract from all frames on current page
 * - 'file': Extract from all frames on all pages
 */
export async function handleExtractDesignTokens(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as ExtractDesignTokensPayload;
  const includeChildren = payload.includeChildren !== false; // Default true
  const includeStyles = payload.includeStyles === true; // Default false
  const scope = payload.scope || 'selection';
  const startTime = Date.now();

  try {
    let nodesToProcess: SceneNode[] = [];
    let scopeDescription = '';
    let pagesScanned = 0;
    let framesScanned = 0;
    let existingStyles: ExtractedExistingStyles | null = null;

    if (scope === 'file') {
      // Extract from ALL pages and ALL frames in the file
      // Must load all pages first before accessing children
      await figma.loadAllPagesAsync();

      const pages = figma.root.children;
      pagesScanned = pages.length;

      for (const page of pages) {
        for (const child of page.children) {
          if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'COMPONENT_SET') {
            nodesToProcess.push(child);
            framesScanned++;
          }
        }
      }

      scopeDescription = `entire file (${pagesScanned} pages, ${framesScanned} frames)`;

      if (nodesToProcess.length === 0) {
        return errorResult(command.id, 'No frames found in the file');
      }

    } else if (scope === 'page') {
      // Extract from all frames on current page
      pagesScanned = 1;

      for (const child of figma.currentPage.children) {
        if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'COMPONENT_SET') {
          nodesToProcess.push(child);
          framesScanned++;
        }
      }

      scopeDescription = `current page "${figma.currentPage.name}" (${framesScanned} frames)`;

      if (nodesToProcess.length === 0) {
        return errorResult(command.id, 'No frames found on current page');
      }

    } else if (payload.nodeId) {
      // Extract from specific node
      const node = await figma.getNodeByIdAsync(payload.nodeId);
      if (!node) {
        return errorResult(command.id, 'Node not found: ' + payload.nodeId);
      }
      if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
        return errorResult(command.id, 'Cannot extract from document or page node. Use scope: "page" or scope: "file" instead.');
      }
      nodesToProcess.push(node as SceneNode);
      scopeDescription = `node "${node.name}"`;
      framesScanned = 1;

    } else {
      // Use selection (default)
      if (figma.currentPage.selection.length === 0) {
        return errorResult(command.id, 'No node specified and nothing selected. Use scope: "page" or scope: "file" to extract without selection.');
      }
      nodesToProcess = figma.currentPage.selection.slice();
      scopeDescription = `selection (${nodesToProcess.length} node${nodesToProcess.length > 1 ? 's' : ''})`;
      framesScanned = nodesToProcess.length;
    }

    const extractor = new TokenExtractor();

    for (const node of nodesToProcess) {
      extractor.extractRecursive(node, includeChildren);
    }

    const firstNode = nodesToProcess[0];
    const tokens = extractor.getTokens(firstNode.id, firstNode.name, startTime);

    // Extract existing styles if requested
    if (includeStyles) {
      existingStyles = await extractExistingStyles();
    }

    // Analyze brand color candidates
    const candidates = tokens.colors.brandCandidates;
    let brandColorAnalysis: {
      autoSelected: string | null;
      needsUserPrompt: boolean;
      reason: string;
      candidates: typeof candidates;
    };

    if (candidates.length === 0) {
      // No chromatic colors - fall back to darkest gray
      const darkGray = tokens.colors.grayScale[tokens.colors.grayScale.length - 1] || '#171717';
      brandColorAnalysis = {
        autoSelected: darkGray,
        needsUserPrompt: false,
        reason: 'No chromatic colors found, using darkest gray',
        candidates: [],
      };
    } else if (candidates.length === 1) {
      // Only one chromatic color - auto-select
      brandColorAnalysis = {
        autoSelected: candidates[0].hex,
        needsUserPrompt: false,
        reason: 'Single chromatic color found',
        candidates,
      };
    } else if (candidates[0].count > candidates[1].count * 2) {
      // First color is >2x more frequent than second - auto-select
      brandColorAnalysis = {
        autoSelected: candidates[0].hex,
        needsUserPrompt: false,
        reason: `Dominant color (${candidates[0].percentage.toFixed(1)}% usage, >2x next)`,
        candidates,
      };
    } else {
      // Multiple colors with similar frequency - need user prompt
      brandColorAnalysis = {
        autoSelected: null,
        needsUserPrompt: true,
        reason: `Multiple prominent colors (top: ${candidates[0].percentage.toFixed(1)}%, 2nd: ${candidates[1].percentage.toFixed(1)}%)`,
        candidates,
      };
    }

    // Build summary
    const summary = {
      scope,
      scopeDescription,
      pagesScanned,
      framesScanned,
      nodesScanned: tokens.meta.nodesScanned,
      colors: tokens.colors.all.length,
      chromaticColors: tokens.colors.brandScale.length,
      grayColors: tokens.colors.grayScale.length,
      brandColorAnalysis,
      typography: {
        fontFamily: tokens.typography.fontFamily.length,
        fontSize: tokens.typography.fontSize.length,
        fontWeight: tokens.typography.fontWeight.length,
        lineHeight: tokens.typography.lineHeight.length,
        letterSpacing: tokens.typography.letterSpacing.length,
      },
      numbers: {
        spacing: tokens.numbers.spacing.length,
        borderWidth: tokens.numbers.borderWidth.length,
        borderRadius: tokens.numbers.borderRadius.length,
        opacity: tokens.numbers.opacity.length,
      },
      effects: {
        shadows: tokens.effects.shadows.length,
        transitionDuration: tokens.effects.transitions.duration.length,
        transitionEasing: tokens.effects.transitions.easing.length,
      },
      existingStyles: existingStyles ? {
        textStyles: existingStyles.textStyles.length,
        effectStyles: existingStyles.effectStyles.length,
        gridStyles: existingStyles.gridStyles.length,
      } : null,
      total:
        tokens.colors.all.length +
        tokens.typography.fontFamily.length +
        tokens.typography.fontSize.length +
        tokens.typography.fontWeight.length +
        tokens.typography.lineHeight.length +
        tokens.typography.letterSpacing.length +
        tokens.numbers.spacing.length +
        tokens.numbers.borderWidth.length +
        tokens.numbers.borderRadius.length +
        tokens.numbers.opacity.length +
        tokens.effects.shadows.length +
        tokens.effects.transitions.duration.length +
        tokens.effects.transitions.easing.length,
      extractionTime: tokens.meta.extractionTime,
    };

    return successResult(command.id, {
      data: {
        tokens,
        summary,
        existingStyles,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, 'Failed to extract design tokens: ' + message);
  }
}
