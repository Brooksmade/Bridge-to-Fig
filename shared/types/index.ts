// Paint types for fills and strokes
export interface SolidPaint {
  type: 'SOLID';
  color: { r: number; g: number; b: number };
  opacity?: number;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: Array<{
    position: number;
    color: { r: number; g: number; b: number; a: number };
  }>;
}

// Image / Video fills (2025-2026 API). See prompts/api-2026-additions.md.
export interface ImagePaint {
  type: 'IMAGE';
  imageHash: string | null;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  scalingFactor?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
}

export interface VideoPaint {
  type: 'VIDEO';
  videoHash: string | null;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  scalingFactor?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
}

// Pattern fill — tiles a source node (2025-2026 API).
export interface PatternPaint {
  type: 'PATTERN';
  sourceNodeId: string;
  tileType?: 'RECTANGULAR' | 'HORIZONTAL_HEXAGONAL' | 'VERTICAL_HEXAGONAL';
  scalingFactor?: number;
  spacing?: { x: number; y: number } | number;
  horizontalAlignment?: 'START' | 'CENTER' | 'END';
  opacity?: number;
  visible?: boolean;
}

// Shader fill — applied via the applyShaderFill command (June 2026 API).
export interface ShaderPaint {
  type: 'SHADER';
  id: string;
  properties?: Record<string, unknown>;
  opacity?: number;
  visible?: boolean;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint | VideoPaint | PatternPaint | ShaderPaint;

// Effect types (2025-2026 API). Shadows/blur plus noise, texture, glass, and shaders.
export interface ShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color?: string; // "#rrggbbaa"
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  spread?: number;
  visible?: boolean;
}

export interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  blurType?: 'NORMAL' | 'PROGRESSIVE';
  radius?: number;
  startRadius?: number; // progressive only
  startOffset?: { x: number; y: number };
  endOffset?: { x: number; y: number };
  visible?: boolean;
}

export interface NoiseEffect {
  type: 'NOISE';
  noiseType?: 'MONOTONE' | 'DUOTONE' | 'MULTITONE';
  color?: string;
  secondaryColor?: string; // duotone
  opacity?: number; // multitone
  noiseSize?: number;
  density?: number;
  visible?: boolean;
}

export interface TextureEffect {
  type: 'TEXTURE';
  noiseSize?: number;
  radius?: number;
  clipToShape?: boolean;
  visible?: boolean;
}

export interface GlassEffect {
  type: 'GLASS';
  lightIntensity?: number;
  lightAngle?: number;
  refraction?: number;
  depth?: number;
  dispersion?: number;
  radius?: number;
  visible?: boolean;
}

export interface ShaderEffect {
  type: 'SHADER';
  id: string;
  properties?: Record<string, unknown>;
  visible?: boolean;
}

export type Effect =
  | ShadowEffect
  | BlurEffect
  | NoiseEffect
  | TextureEffect
  | GlassEffect
  | ShaderEffect;

// A single grid track (row or column) sizing spec.
export interface GridTrackSize {
  type: 'FLEX' | 'FIXED' | 'HUG';
  value?: number;
}

// Node properties that can be applied to any node
export interface NodeProperties {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  effects?: Effect[];
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  // Text-specific
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  letterSpacing?: { value: number; unit: 'PIXELS' | 'PERCENT' };
  // Layout-specific (Auto Layout — GRID added in the 2025-2026 API; use the setGridLayout command)
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  // Grid auto-layout (see setGridLayout / setGridChildPosition commands)
  gridRowCount?: number;
  gridColumnCount?: number;
  gridRowGap?: number;
  gridColumnGap?: number;
  gridRowSizes?: GridTrackSize[];
  gridColumnSizes?: GridTrackSize[];
  gridAutoTracks?: 'NONE' | 'ROWS';
  gridItemsPositioning?: 'MANUAL' | 'ROW_AUTO_FLOW';
  // Constraints
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };
}

// Node types that can be created
export type NodeType =
  | 'FRAME'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'POLYGON'
  | 'STAR'
  | 'VECTOR'
  | 'COMPONENT'
  | 'GROUP';

// Payload for create commands
export interface CreatePayload {
  nodeType: NodeType;
  properties: NodeProperties;
  parent?: string; // Parent node ID, defaults to current page
  children?: CreatePayload[]; // Nested creation
}

// Payload for modify commands
export interface ModifyPayload {
  properties: NodeProperties;
}

// Payload for delete commands
export interface DeletePayload {
  // No additional properties needed, target is in the command
}

// Payload for query commands
export interface QueryPayload {
  queryType: 'node' | 'selection' | 'page' | 'children' | 'find' | 'deep' | 'describe' | 'findByType' | 'pages';
  properties?: string[]; // Which properties to return
  query?: string; // Search string for 'find' queryType
  depth?: number; // Traversal depth for 'deep' queryType
  nodeTypes?: string[]; // Node types to search for in 'findByType'
  parentId?: string; // Parent node ID for 'findByType'
  maxDepth?: number; // Max depth for 'findByType'
  includeDetails?: boolean; // Include detailed info in 'findByType'
}

// Payload for style commands
export interface StylePayload {
  styleType: 'paint' | 'text' | 'effect';
  styleName: string;
  apply?: boolean; // Apply existing style vs create new
}

// Union type for all payloads
export type CommandPayload =
  | CreatePayload
  | ModifyPayload
  | DeletePayload
  | QueryPayload
  | StylePayload;

// Command types
export type CommandType = 'create' | 'modify' | 'delete' | 'query' | 'style' | 'ping';

// Main command interface
export interface FigmaCommand {
  id: string;
  type: CommandType;
  target?: string; // Node ID for modify/delete/query
  payload: CommandPayload;
  timestamp: number;
}

// Result of command execution
export interface CommandResult {
  commandId: string;
  success: boolean;
  nodeId?: string; // Created/modified node ID
  nodeIds?: string[]; // Multiple node IDs (for batch operations)
  error?: string;
  data?: unknown; // Query results or additional data
  timestamp: number;
}

// Status update for WebSocket
export interface StatusUpdate {
  type: 'command_received' | 'command_executing' | 'result_available' | 'error' | 'connected';
  commandId?: string;
  message?: string;
  timestamp: number;
}

// Plugin connection status
export interface PluginStatus {
  connected: boolean;
  lastPoll?: number;
  pendingCommands: number;
}

// === EXTRACTED DESIGN TOKENS ===
// Used by extractDesignTokens command and createDesignSystem with conditional boilerplate

export interface ExtractedShadow {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  cssValue: string;
}

export interface ExtractedDesignTokens {
  // === COLOR ===
  colors: {
    all: string[];            // All unique hex colors
    grayScale: string[];      // Detected grays
    brandScale: string[];     // Primary brand colors
    secondaryScale: string[]; // Secondary colors
    tertiaryScale: string[];  // Tertiary colors
    system: string[];         // White, black, status colors
  };

  // === TYPOGRAPHY ===
  typography: {
    fontFamily: string[];     // Unique font families
    fontFamilies?: string[];  // Alias for fontFamily (used by website extraction)
    fontSize: number[];       // Unique font sizes
    fontWeight: number[];     // Unique font weights
    lineHeight: number[];     // Unique line heights (as multipliers)
    letterSpacing: number[];  // Unique letter spacing values
    fontSizeNodes?: Record<number, string[]>; // Node IDs per font size
    fontFamilyMap?: Record<number, string>;   // Most-used font family per font size
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

// === ORGANIZING PRINCIPLES ===
// Used by createDesignSystem command to determine variable structure

/**
 * Available organizing principles for design system variable collections
 */
export type OrganizingPrincipleName =
  | 'four-level'       // Default: Primitive → Semantic → Tokens → Theme
  | 'three-level'      // Simplified: Primitives → Tokens → Theme
  | 'two-level'        // Flat: Primitives → Tokens
  | 'material-design'  // Google M3: Reference → System → Component
  | 'tailwind'         // Utility-first: Colors → Semantic
  | 'spectrum';        // Adobe Spectrum: Global → Alias → Component → System

// === TEXT MEASUREMENT ===
// Used by measureText command for accurate box sizing in FigJam workflows

/**
 * Payload for the measureText command
 */
export interface MeasureTextPayload {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
}

/**
 * Result from the measureText command
 */
export interface MeasureTextResult {
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
}

// === WEBSITE LAYOUT EXTRACTION ===
export type {
  ElementStyles,
  LayoutElement,
  PageSection,
  ImageReference,
  LayoutExtractionOptions,
  LayoutExtractionResult,
} from './layout.js';

export { PROTOCOL_VERSION, MIN_PROTOCOL_VERSION, APP_VERSION } from './version.js';
