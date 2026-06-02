import type { NodeType, NodeProperties, Paint, Effect } from '../commands/types';

// Cache of loaded fonts
const loadedFonts = new Set<string>();

// Default fonts to preload
const DEFAULT_FONTS = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Inter', style: 'Bold' },
];

// Preload common fonts
export async function preloadFonts(): Promise<void> {
  for (const font of DEFAULT_FONTS) {
    try {
      await loadFont(font);
    } catch (e) {
      console.warn(`Could not preload font: ${font.family} ${font.style}`);
    }
  }
}

// Load a specific font
export async function loadFont(fontName: { family: string; style: string }): Promise<void> {
  const key = `${fontName.family}-${fontName.style}`;
  if (loadedFonts.has(key)) return;

  await figma.loadFontAsync(fontName);
  loadedFonts.add(key);
}

// Create a node of the specified type
export function createNode(nodeType: NodeType): SceneNode {
  switch (nodeType) {
    case 'FRAME':
      return figma.createFrame();
    case 'RECTANGLE':
      return figma.createRectangle();
    case 'ELLIPSE':
      return figma.createEllipse();
    case 'TEXT':
      return figma.createText();
    case 'LINE':
      return figma.createLine();
    case 'POLYGON':
      return figma.createPolygon();
    case 'STAR':
      return figma.createStar();
    case 'VECTOR':
      return figma.createVector();
    case 'COMPONENT':
      return figma.createComponent();
    case 'SLICE':
      return figma.createSlice();
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

// Apply properties to a node
export async function applyProperties(node: SceneNode, properties: NodeProperties): Promise<void> {
  // Basic properties
  if (properties.name !== undefined) {
    node.name = properties.name;
  }

  if (properties.x !== undefined) {
    node.x = properties.x;
  }

  if (properties.y !== undefined) {
    node.y = properties.y;
  }

  if (properties.visible !== undefined) {
    node.visible = properties.visible;
  }

  if (properties.locked !== undefined) {
    node.locked = properties.locked;
  }

  // Rotation
  if (properties.rotation !== undefined && 'rotation' in node) {
    (node as any).rotation = properties.rotation;
  }

  // Dimensions - use resize for nodes that support it
  if ((properties.width !== undefined || properties.height !== undefined) && 'resize' in node) {
    const resizable = node as FrameNode | RectangleNode | EllipseNode | TextNode;
    const width = properties.width !== undefined ? properties.width : resizable.width;
    const height = properties.height !== undefined ? properties.height : resizable.height;
    resizable.resize(width, height);
  }

  // Opacity
  if (properties.opacity !== undefined && 'opacity' in node) {
    (node as BlendMixin).opacity = properties.opacity;
  }

  // Blend mode
  if (properties.blendMode !== undefined && 'blendMode' in node) {
    (node as BlendMixin).blendMode = properties.blendMode;
  }

  // Fills
  if (properties.fills !== undefined && 'fills' in node) {
    (node as any).fills = convertPaints(properties.fills);
  }

  // Strokes
  if (properties.strokes !== undefined && 'strokes' in node) {
    (node as any).strokes = convertPaints(properties.strokes);
  }

  if (properties.strokeWeight !== undefined && 'strokeWeight' in node) {
    (node as GeometryMixin).strokeWeight = properties.strokeWeight;
  }

  if (properties.strokeAlign !== undefined && 'strokeAlign' in node) {
    (node as GeometryMixin).strokeAlign = properties.strokeAlign;
  }

  if (properties.strokeCap !== undefined && 'strokeCap' in node) {
    (node as any).strokeCap = properties.strokeCap;
  }

  if (properties.strokeJoin !== undefined && 'strokeJoin' in node) {
    (node as any).strokeJoin = properties.strokeJoin;
  }

  if (properties.dashPattern !== undefined && 'dashPattern' in node) {
    (node as GeometryMixin).dashPattern = properties.dashPattern;
  }

  // Corner radius
  applyCornerRadius(node, properties);

  // Effects
  if (properties.effects !== undefined && 'effects' in node) {
    (node as any).effects = convertEffects(properties.effects);
  }

  // Clipping
  if (properties.clipsContent !== undefined && 'clipsContent' in node) {
    (node as FrameNode).clipsContent = properties.clipsContent;
  }

  // Constraints
  if (properties.constraints !== undefined && 'constraints' in node) {
    (node as ConstraintMixin).constraints = properties.constraints;
  }

  // Text-specific properties
  if (node.type === 'TEXT') {
    await applyTextProperties(node as TextNode, properties);
  }

  // Auto Layout properties (for frames and components)
  if (node.type === 'FRAME' || node.type === 'COMPONENT') {
    applyAutoLayoutProperties(node as FrameNode | ComponentNode, properties);
  }

  // Note: child layout properties (layoutSizingHorizontal, layoutGrow, etc.)
  // are applied separately via applyChildLayoutProperties() AFTER the node
  // is appended to its parent, since they require an auto-layout parent.
}

// Apply child layout properties - must be called AFTER node is in an auto-layout parent
export function applyChildLayoutProperties(node: SceneNode, properties: NodeProperties): void {
  try {
    if (properties.layoutAlign !== undefined && 'layoutAlign' in node) {
      (node as any).layoutAlign = properties.layoutAlign;
    }
    if (properties.layoutGrow !== undefined && 'layoutGrow' in node) {
      (node as any).layoutGrow = properties.layoutGrow;
    }
    if (properties.layoutSizingHorizontal !== undefined && 'layoutSizingHorizontal' in node) {
      (node as any).layoutSizingHorizontal = properties.layoutSizingHorizontal;
    }
    if (properties.layoutSizingVertical !== undefined && 'layoutSizingVertical' in node) {
      (node as any).layoutSizingVertical = properties.layoutSizingVertical;
    }
    if (properties.layoutPositioning !== undefined && 'layoutPositioning' in node) {
      (node as any).layoutPositioning = properties.layoutPositioning;
    }
  } catch (e) {
    // Silently ignore if node is not in an auto-layout context
    console.warn('[applyChildLayoutProperties]', e);
  }
}

// Apply corner radius properties
function applyCornerRadius(node: SceneNode, properties: NodeProperties): void {
  if (!('cornerRadius' in node)) return;

  const rectLike = node as RectangleNode | FrameNode | ComponentNode;

  // Individual corners take precedence
  if (
    properties.topLeftRadius !== undefined ||
    properties.topRightRadius !== undefined ||
    properties.bottomLeftRadius !== undefined ||
    properties.bottomRightRadius !== undefined
  ) {
    rectLike.topLeftRadius = properties.topLeftRadius !== undefined ? properties.topLeftRadius : 0;
    rectLike.topRightRadius = properties.topRightRadius !== undefined ? properties.topRightRadius : 0;
    rectLike.bottomLeftRadius = properties.bottomLeftRadius !== undefined ? properties.bottomLeftRadius : 0;
    rectLike.bottomRightRadius = properties.bottomRightRadius !== undefined ? properties.bottomRightRadius : 0;
  } else if (properties.cornerRadius !== undefined) {
    rectLike.cornerRadius = properties.cornerRadius;
  }
}

// Apply text-specific properties
async function applyTextProperties(node: TextNode, properties: NodeProperties): Promise<void> {
  // Load font — only change fontName if explicitly provided
  if (properties.fontName) {
    await loadFont(properties.fontName);
    node.fontName = properties.fontName;
  } else if (properties.characters !== undefined || properties.fontSize !== undefined) {
    // Need to load the existing font before modifying characters or fontSize
    const existingFont = node.fontName as FontName;
    await loadFont(existingFont);
  }

  // Set characters
  if (properties.characters !== undefined) {
    node.characters = properties.characters;
  }

  // Font size
  if (properties.fontSize !== undefined) {
    node.fontSize = properties.fontSize;
  }

  // Text alignment
  if (properties.textAlignHorizontal !== undefined) {
    node.textAlignHorizontal = properties.textAlignHorizontal;
  }

  if (properties.textAlignVertical !== undefined) {
    node.textAlignVertical = properties.textAlignVertical;
  }

  // Line height
  if (properties.lineHeight !== undefined) {
    if (properties.lineHeight === 'AUTO') {
      node.lineHeight = { unit: 'AUTO' };
    } else {
      node.lineHeight = properties.lineHeight;
    }
  }

  // Letter spacing
  if (properties.letterSpacing !== undefined) {
    node.letterSpacing = properties.letterSpacing;
  }

  // Text case
  if (properties.textCase !== undefined) {
    node.textCase = properties.textCase;
  }

  // Text decoration
  if (properties.textDecoration !== undefined) {
    node.textDecoration = properties.textDecoration;
  }
}

// Apply Auto Layout properties
function applyAutoLayoutProperties(
  node: FrameNode | ComponentNode,
  properties: NodeProperties
): void {
  // Layout mode must be set first
  if (properties.layoutMode !== undefined) {
    node.layoutMode = properties.layoutMode;
  }

  // Only apply other properties if layout mode is not NONE
  if (node.layoutMode === 'NONE') return;

  if (properties.layoutWrap !== undefined) {
    node.layoutWrap = properties.layoutWrap;
  }

  if (properties.primaryAxisAlignItems !== undefined) {
    node.primaryAxisAlignItems = properties.primaryAxisAlignItems;
  }

  if (properties.counterAxisAlignItems !== undefined) {
    node.counterAxisAlignItems = properties.counterAxisAlignItems;
  }

  if (properties.primaryAxisSizingMode !== undefined) {
    node.primaryAxisSizingMode = properties.primaryAxisSizingMode;
  }

  if (properties.counterAxisSizingMode !== undefined) {
    node.counterAxisSizingMode = properties.counterAxisSizingMode;
  }

  if (properties.itemSpacing !== undefined) {
    node.itemSpacing = properties.itemSpacing;
  }

  if (properties.counterAxisSpacing !== undefined) {
    node.counterAxisSpacing = properties.counterAxisSpacing;
  }

  // Padding - shorthand or individual
  if (properties.padding !== undefined) {
    node.paddingLeft = properties.padding;
    node.paddingRight = properties.padding;
    node.paddingTop = properties.padding;
    node.paddingBottom = properties.padding;
  } else {
    if (properties.paddingLeft !== undefined) node.paddingLeft = properties.paddingLeft;
    if (properties.paddingRight !== undefined) node.paddingRight = properties.paddingRight;
    if (properties.paddingTop !== undefined) node.paddingTop = properties.paddingTop;
    if (properties.paddingBottom !== undefined) node.paddingBottom = properties.paddingBottom;
  }
}

// Convert our paint format to Figma's format
function convertPaints(paints: Paint[]): Paint[] {
  return paints.map((paint) => {
    if (paint.type === 'SOLID') {
      return {
        type: 'SOLID',
        color: paint.color,
        opacity: paint.opacity !== undefined ? paint.opacity : 1,
      } as SolidPaint;
    }
    // Gradient paints pass through
    return paint;
  });
}

// Convert our effect format to Figma's format
function convertEffects(effects: Effect[]): Effect[] {
  return effects.map((effect) => {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      return {
        type: effect.type,
        visible: effect.visible !== undefined ? effect.visible : true,
        color: effect.color || { r: 0, g: 0, b: 0, a: 0.25 },
        offset: effect.offset || { x: 0, y: 4 },
        radius: effect.radius !== undefined ? effect.radius : 4,
        spread: effect.spread !== undefined ? effect.spread : 0,
      };
    }

    if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      return {
        type: effect.type,
        visible: effect.visible !== undefined ? effect.visible : true,
        radius: effect.radius !== undefined ? effect.radius : 4,
      };
    }

    return effect;
  });
}

// Get the parent node, defaulting to current page
export async function getParentNode(parentId?: string): Promise<(BaseNode & ChildrenMixin) | null> {
  if (!parentId) {
    return figma.currentPage;
  }

  const node = await figma.getNodeByIdAsync(parentId);
  if (!node) {
    return null;
  }

  if (!('children' in node)) {
    return null;
  }

  return node as BaseNode & ChildrenMixin;
}

// Serialize a node for query results
export function serializeNode(node: SceneNode, includeChildren = false): object {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    visible: node.visible,
    locked: node.locked,
  };

  if ('width' in node) base.width = node.width;
  if ('height' in node) base.height = node.height;
  if ('opacity' in node) base.opacity = (node as BlendMixin).opacity;
  if ('rotation' in node) base.rotation = (node as any).rotation;

  if ('fills' in node) {
    base.fills = (node as GeometryMixin).fills;
  }

  if ('effects' in node) {
    base.effects = (node as any).effects;
  }

  if ('strokes' in node) {
    base.strokes = (node as GeometryMixin).strokes;
    if ('strokeWeight' in node) base.strokeWeight = (node as any).strokeWeight;
  }

  if ('cornerRadius' in node) {
    const rectLike = node as RectangleNode;
    if (typeof rectLike.cornerRadius === 'number') {
      base.cornerRadius = rectLike.cornerRadius;
    } else {
      base.topLeftRadius = rectLike.topLeftRadius;
      base.topRightRadius = rectLike.topRightRadius;
      base.bottomLeftRadius = rectLike.bottomLeftRadius;
      base.bottomRightRadius = rectLike.bottomRightRadius;
    }
  }

  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    base.characters = textNode.characters;
    base.fontSize = textNode.fontSize;
    base.fontName = textNode.fontName;
  }

  if ((node.type === 'FRAME' || node.type === 'COMPONENT') && 'layoutMode' in node) {
    const frame = node as FrameNode;
    base.layoutMode = frame.layoutMode;
    if (frame.layoutMode !== 'NONE') {
      base.itemSpacing = frame.itemSpacing;
      base.paddingLeft = frame.paddingLeft;
      base.paddingRight = frame.paddingRight;
      base.paddingTop = frame.paddingTop;
      base.paddingBottom = frame.paddingBottom;
    }
  }

  if (includeChildren && 'children' in node) {
    base.children = (node as FrameNode).children.map((child) => ({
      id: child.id,
      name: child.name,
      type: child.type,
    }));
  }

  return base;
}

// Recursively serialize node with full structure details
export function serializeNodeDeep(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): object {
  var result: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Add dimensions
  if ('width' in node) {
    result.width = Math.round(node.width);
    result.height = Math.round(node.height);
  }

  // Add text content for TEXT nodes
  if (node.type === 'TEXT') {
    var textNode = node as TextNode;
    result.characters = textNode.characters.substring(0, 100);
    if (textNode.characters.length > 100) {
      result.characters += '...';
    }
  }

  // Add layout info for frames
  if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 'layoutMode' in node) {
    var frame = node as FrameNode;
    if (frame.layoutMode !== 'NONE') {
      result.layout = frame.layoutMode;
    }
  }

  // Recursively add children
  if (currentDepth < maxDepth && 'children' in node) {
    var parent = node as FrameNode;
    result.children = [];
    for (var i = 0; i < parent.children.length; i++) {
      result.children.push(serializeNodeDeep(parent.children[i], maxDepth, currentDepth + 1));
    }
  } else if ('children' in node) {
    result.childCount = (node as FrameNode).children.length;
  }

  return result;
}

// Generate a structural summary of a block
export function describeBlockStructure(node: SceneNode): object {
  var elements: string[] = [];
  var layout = 'unknown';

  if ((node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') && 'layoutMode' in node) {
    var frame = node as FrameNode;
    layout = frame.layoutMode === 'NONE' ? 'absolute' : frame.layoutMode.toLowerCase();
  }

  function collectElements(n: SceneNode, depth: number): void {
    if (depth > 4) return;

    if (n.type === 'TEXT') {
      var text = (n as TextNode).characters;
      if (text.length < 20) {
        elements.push('text("' + text.substring(0, 15) + '")');
      } else if (n.name.toLowerCase().includes('heading') || n.name.toLowerCase().includes('title')) {
        elements.push('heading');
      } else if (n.name.toLowerCase().includes('body') || n.name.toLowerCase().includes('description')) {
        elements.push('body-text');
      } else {
        elements.push('text');
      }
    } else if (n.type === 'RECTANGLE' || n.type === 'ELLIPSE') {
      if (n.name.toLowerCase().includes('image') || n.name.toLowerCase().includes('placeholder')) {
        elements.push('image-placeholder');
      } else {
        elements.push('shape');
      }
    } else if (n.type === 'INSTANCE') {
      var instanceName = n.name.toLowerCase();
      if (instanceName.includes('button') || instanceName.includes('btn') || instanceName.includes('cta')) {
        elements.push('button');
      } else if (instanceName.includes('icon')) {
        elements.push('icon');
      } else if (instanceName.includes('logo')) {
        elements.push('logo');
      } else if (instanceName.includes('card')) {
        elements.push('card');
      } else if (instanceName.includes('image') || instanceName.includes('img')) {
        elements.push('image');
      } else {
        elements.push('component(' + n.name.substring(0, 20) + ')');
      }
    } else if (n.type === 'FRAME' || n.type === 'GROUP') {
      var frameName = n.name.toLowerCase();
      if (frameName.includes('image') || frameName.includes('img') || frameName.includes('photo')) {
        elements.push('image-container');
      } else if (frameName.includes('card')) {
        elements.push('card');
      } else if ('children' in n) {
        var children = (n as FrameNode).children;
        for (var i = 0; i < children.length; i++) {
          collectElements(children[i], depth + 1);
        }
      }
    }
  }

  if ('children' in node) {
    var topChildren = (node as FrameNode).children;
    for (var j = 0; j < topChildren.length; j++) {
      collectElements(topChildren[j], 0);
    }
  }

  // Deduplicate and limit
  var seen: Record<string, number> = {};
  var uniqueElements: string[] = [];
  for (var k = 0; k < elements.length; k++) {
    var el = elements[k];
    if (!seen[el]) {
      seen[el] = 1;
      uniqueElements.push(el);
    } else {
      seen[el]++;
    }
  }

  // Build summary with counts
  var summary: string[] = [];
  for (var m = 0; m < uniqueElements.length; m++) {
    var elem = uniqueElements[m];
    if (seen[elem] > 1) {
      summary.push(elem + ' x' + seen[elem]);
    } else {
      summary.push(elem);
    }
  }

  return {
    id: node.id,
    name: node.name,
    layout: layout,
    dimensions: ('width' in node) ? Math.round(node.width) + 'x' + Math.round(node.height) : 'unknown',
    elements: summary.slice(0, 15),
  };
}
