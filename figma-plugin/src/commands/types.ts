// Command and result types for the plugin

export interface FigmaCommand {
  id: string;
  type: string;
  target?: string;
  payload: any;
  timestamp: number;
  /** Epoch ms after which the plugin must NOT start this command (the sender's wait already gave
   *  up). Prevents stale bursts when a queue drains after a long-running command or reconnect. */
  expiresAt?: number;
}

export interface CommandResult {
  commandId: string;
  success: boolean;
  nodeId?: string;
  nodeIds?: string[];
  styleId?: string;
  error?: string;
  data?: unknown;
  timestamp: number;
}

export interface CreatePayload {
  nodeType: NodeType;
  properties: NodeProperties;
  parent?: string;
  children?: CreatePayload[];
}

export interface ModifyPayload {
  properties: NodeProperties;
}

export interface QueryPayload {
  queryType: 'node' | 'selection' | 'page' | 'children' | 'find' | 'deep' | 'describe' | 'findByType' | 'pages';
  properties?: string[];
  query?: string; // For find queries (by name)
  depth?: number; // Traversal depth for 'deep' queryType
  nodeTypes?: string[]; // Node types to search for in 'findByType'
  parentId?: string; // Parent node ID for 'findByType'
  maxDepth?: number; // Max depth for 'findByType'
  includeDetails?: boolean; // Include detailed info in 'findByType'
}

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
  | 'GROUP'
  | 'SLICE';

export interface SolidPaint {
  type: 'SOLID';
  color: { r: number; g: number; b: number };
  opacity?: number;
}

export interface GradientStop {
  position: number;
  color: { r: number; g: number; b: number; a: number };
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: GradientStop[];
}

export type Paint = SolidPaint | GradientPaint;

export interface NodeProperties {
  // Basic properties
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;

  // Appearance
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL';
  strokeJoin?: 'MITER' | 'BEVEL' | 'ROUND';
  dashPattern?: number[];

  // Corner radius
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;

  // Effects
  effects?: Effect[];

  // Text-specific
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' } | 'AUTO';
  letterSpacing?: { value: number; unit: 'PIXELS' | 'PERCENT' };
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';

  // Auto Layout
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  padding?: number; // Shorthand for all sides

  // Auto Layout - Child Properties (how a child behaves in parent's auto-layout)
  layoutAlign?: 'STRETCH' | 'INHERIT';
  layoutGrow?: number;
  layoutPositioning?: 'AUTO' | 'ABSOLUTE';
  layoutSizingHorizontal?: 'FILL' | 'FIXED' | 'HUG';
  layoutSizingVertical?: 'FILL' | 'FIXED' | 'HUG';

  // Constraints
  constraints?: {
    horizontal: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
    vertical: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';
  };

  // Clipping
  clipsContent?: boolean;

  // Blend mode
  blendMode?: BlendMode;
}

export interface Effect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius?: number;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  spread?: number;
}

export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

// Helper to create a success result
export function successResult(commandId: string, data?: Partial<CommandResult>): CommandResult {
  const base: CommandResult = {
    commandId,
    success: true,
    timestamp: Date.now(),
  };
  if (data) {
    if (data.nodeId !== undefined) base.nodeId = data.nodeId;
    if (data.nodeIds !== undefined) base.nodeIds = data.nodeIds;
    if (data.styleId !== undefined) base.styleId = data.styleId;
    if (data.error !== undefined) base.error = data.error;
    if (data.data !== undefined) base.data = data.data;
  }
  return base;
}

// Helper to create an error result
export function errorResult(commandId: string, error: string): CommandResult {
  return {
    commandId,
    success: false,
    error,
    timestamp: Date.now(),
  };
}
