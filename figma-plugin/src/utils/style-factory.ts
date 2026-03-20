// Style factory utilities for managing Figma styles

import { ColorValue, colorToHex, parseColor } from './variable-factory';

// Serialize a paint style for API response
export function serializePaintStyle(style: PaintStyle): object {
  return {
    id: style.id,
    name: style.name,
    type: 'PAINT',
    description: style.description,
    paints: style.paints.map(function (paint) {
      return serializePaint(paint);
    }),
  };
}

// Serialize a text style for API response
export function serializeTextStyle(style: TextStyle): object {
  return {
    id: style.id,
    name: style.name,
    type: 'TEXT',
    description: style.description,
    fontName: style.fontName,
    fontSize: style.fontSize,
    fontWeight: (style as any).fontWeight,
    letterSpacing: style.letterSpacing,
    lineHeight: style.lineHeight,
    paragraphIndent: style.paragraphIndent,
    paragraphSpacing: style.paragraphSpacing,
    textCase: style.textCase,
    textDecoration: style.textDecoration,
  };
}

// Serialize an effect style for API response
export function serializeEffectStyle(style: EffectStyle): object {
  return {
    id: style.id,
    name: style.name,
    type: 'EFFECT',
    description: style.description,
    effects: style.effects.map(function (effect) {
      return serializeEffect(effect);
    }),
  };
}

// Serialize a single paint object
export function serializePaint(paint: Paint): object {
  var result: Record<string, any> = {
    type: paint.type,
    visible: paint.visible,
    opacity: paint.opacity,
    blendMode: paint.blendMode,
  };

  if (paint.type === 'SOLID') {
    var solid = paint as SolidPaint;
    result.color = colorToHex(solid.color as ColorValue);
  } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL' || paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
    var gradient = paint as GradientPaint;
    result.gradientStops = gradient.gradientStops.map(function (stop) {
      return {
        position: stop.position,
        color: colorToHex(stop.color as ColorValue),
      };
    });
    result.gradientTransform = gradient.gradientTransform;
  } else if (paint.type === 'IMAGE') {
    var image = paint as ImagePaint;
    result.scaleMode = image.scaleMode;
    result.imageHash = image.imageHash;
  }

  return result;
}

// Serialize a single effect object
export function serializeEffect(effect: Effect): object {
  var result: Record<string, any> = {
    type: effect.type,
    visible: effect.visible,
  };

  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    var shadow = effect as DropShadowEffect | InnerShadowEffect;
    result.color = colorToHex(shadow.color as ColorValue);
    result.offset = shadow.offset;
    result.radius = shadow.radius;
    result.spread = shadow.spread;
    result.blendMode = shadow.blendMode;
  } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    var blur = effect as BlurEffect;
    result.radius = blur.radius;
  }

  return result;
}

// Create a solid paint from color input
export function createSolidPaint(color: string | ColorValue, opacity?: number): SolidPaint {
  var parsed = parseColor(color);
  var paint: SolidPaint = {
    type: 'SOLID',
    color: { r: parsed.r, g: parsed.g, b: parsed.b },
    opacity: opacity !== undefined ? opacity : parsed.a,
  };
  return paint;
}

// Create gradient paint
export function createGradientPaint(
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND',
  stops: Array<{ position: number; color: string | ColorValue }>
): GradientPaint {
  var gradientStops = stops.map(function (stop) {
    var parsed = parseColor(stop.color);
    return {
      position: stop.position,
      color: { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a },
    };
  });

  var paint: GradientPaint = {
    type: type,
    gradientStops: gradientStops,
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
  };

  return paint;
}

// Create a drop shadow effect
export function createDropShadow(
  color: string | ColorValue,
  offsetX: number,
  offsetY: number,
  radius: number,
  spread?: number
): DropShadowEffect {
  var parsed = parseColor(color);
  return {
    type: 'DROP_SHADOW',
    color: { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a },
    offset: { x: offsetX, y: offsetY },
    radius: radius,
    spread: spread !== undefined ? spread : 0,
    visible: true,
    blendMode: 'NORMAL',
  };
}

// Create an inner shadow effect
export function createInnerShadow(
  color: string | ColorValue,
  offsetX: number,
  offsetY: number,
  radius: number,
  spread?: number
): InnerShadowEffect {
  var parsed = parseColor(color);
  return {
    type: 'INNER_SHADOW',
    color: { r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a },
    offset: { x: offsetX, y: offsetY },
    radius: radius,
    spread: spread !== undefined ? spread : 0,
    visible: true,
    blendMode: 'NORMAL',
  };
}

// Create a blur effect
export function createBlurEffect(
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR',
  radius: number
): BlurEffect {
  return {
    type: type,
    radius: radius,
    visible: true,
    blurType: 'NORMAL' as const,
  };
}

// Find style by name (case insensitive)
export async function findPaintStyleByName(name: string): Promise<PaintStyle | null> {
  var styles = await figma.getLocalPaintStylesAsync();
  var lowerName = name.toLowerCase();
  for (var i = 0; i < styles.length; i++) {
    if (styles[i].name.toLowerCase() === lowerName) {
      return styles[i];
    }
  }
  return null;
}

export async function findTextStyleByName(name: string): Promise<TextStyle | null> {
  var styles = await figma.getLocalTextStylesAsync();
  var lowerName = name.toLowerCase();
  for (var i = 0; i < styles.length; i++) {
    if (styles[i].name.toLowerCase() === lowerName) {
      return styles[i];
    }
  }
  return null;
}

export async function findEffectStyleByName(name: string): Promise<EffectStyle | null> {
  var styles = await figma.getLocalEffectStylesAsync();
  var lowerName = name.toLowerCase();
  for (var i = 0; i < styles.length; i++) {
    if (styles[i].name.toLowerCase() === lowerName) {
      return styles[i];
    }
  }
  return null;
}

// Get all local styles
export async function getAllLocalStyles(): Promise<{
  paintStyles: object[];
  textStyles: object[];
  effectStyles: object[];
}> {
  var paintStyles = await figma.getLocalPaintStylesAsync();
  var textStyles = await figma.getLocalTextStylesAsync();
  var effectStyles = await figma.getLocalEffectStylesAsync();
  return {
    paintStyles: paintStyles.map(function (s) {
      return serializePaintStyle(s);
    }),
    textStyles: textStyles.map(function (s) {
      return serializeTextStyle(s);
    }),
    effectStyles: effectStyles.map(function (s) {
      return serializeEffectStyle(s);
    }),
  };
}

// Parse font weight string to numeric value
export function parseFontWeight(weight: string | number): number {
  if (typeof weight === 'number') {
    return weight;
  }
  var weightMap: Record<string, number> = {
    thin: 100,
    hairline: 100,
    extralight: 200,
    ultralight: 200,
    light: 300,
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    demibold: 600,
    bold: 700,
    extrabold: 800,
    ultrabold: 800,
    black: 900,
    heavy: 900,
  };
  var key = weight.toLowerCase().replace(/[\s-]/g, '');
  return weightMap[key] !== undefined ? weightMap[key] : 400;
}

// Validate style name follows convention
export function validateStyleName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Style name cannot be empty' };
  }
  if (name.startsWith('/') || name.endsWith('/')) {
    return { valid: false, error: 'Style name cannot start or end with /' };
  }
  return { valid: true };
}
