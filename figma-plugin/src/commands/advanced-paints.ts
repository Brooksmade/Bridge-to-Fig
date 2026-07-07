// Builders for the newer Paint and Effect types added to Figma's API in 2025-2026:
//   Fills:   IMAGE, VIDEO, PATTERN   (SHADER fills are applied via shaders.ts — they need an async import)
//   Effects: NOISE (mono/duo/multitone), TEXTURE, GLASS, and PROGRESSIVE blur
//
// These are consumed as a fallback by handleSetFills / handleSetEffects in properties.ts:
// the existing inline SOLID/GRADIENT and DROP_SHADOW/BLUR branches run first; anything else
// falls through to buildAdvancedPaint / buildAdvancedEffect here.

/** Parse "#rrggbb" or "#rrggbbaa" (with or without leading #) into an RGBA object (0-1 channels). */
export function hexToRgba(hex: string | undefined, defaultAlpha: number): { r: number; g: number; b: number; a: number } {
  var h = (hex || '#000000').replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: h.length >= 8 ? parseInt(h.substring(6, 8), 16) / 255 : defaultAlpha,
  };
}

export interface AdvancedPaintInput {
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: BlendMode;
  // IMAGE / VIDEO
  imageHash?: string | null;
  videoHash?: string | null;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  scalingFactor?: number;
  rotation?: number;
  // PATTERN
  sourceNodeId?: string;
  tileType?: 'RECTANGULAR' | 'HORIZONTAL_HEXAGONAL' | 'VERTICAL_HEXAGONAL';
  spacing?: { x: number; y: number } | number;
  horizontalAlignment?: 'START' | 'CENTER' | 'END';
}

/**
 * Build a Paint for the newer fill types (IMAGE, VIDEO, PATTERN). Returns null for types this
 * helper does not handle so callers can fall back to their own logic.
 */
export function buildAdvancedPaint(f: AdvancedPaintInput): Paint | null {
  var common = {
    visible: f.visible !== false,
    opacity: f.opacity !== undefined ? f.opacity : 1,
    blendMode: (f.blendMode || 'NORMAL') as BlendMode,
  };

  if (f.type === 'IMAGE') {
    var image: ImagePaint = {
      type: 'IMAGE',
      scaleMode: f.scaleMode || 'FILL',
      imageHash: f.imageHash !== undefined ? f.imageHash : null,
      visible: common.visible,
      opacity: common.opacity,
      blendMode: common.blendMode,
    };
    if (f.scaleMode === 'TILE' && f.scalingFactor !== undefined) {
      (image as any).scalingFactor = f.scalingFactor;
    }
    if (f.rotation !== undefined) (image as any).rotation = f.rotation;
    return image;
  }

  if (f.type === 'VIDEO') {
    var video: VideoPaint = {
      type: 'VIDEO',
      scaleMode: f.scaleMode || 'FILL',
      videoHash: f.videoHash !== undefined ? f.videoHash : null,
      visible: common.visible,
      opacity: common.opacity,
      blendMode: common.blendMode,
    };
    if (f.scaleMode === 'TILE' && f.scalingFactor !== undefined) {
      (video as any).scalingFactor = f.scalingFactor;
    }
    if (f.rotation !== undefined) (video as any).rotation = f.rotation;
    return video;
  }

  if (f.type === 'PATTERN') {
    if (!f.sourceNodeId) return null; // pattern requires a source node
    var spacingVec =
      typeof f.spacing === 'number'
        ? { x: f.spacing, y: f.spacing }
        : f.spacing || { x: 0, y: 0 };
    var pattern: PatternPaint = {
      type: 'PATTERN',
      sourceNodeId: f.sourceNodeId,
      tileType: f.tileType || 'RECTANGULAR',
      scalingFactor: f.scalingFactor !== undefined ? f.scalingFactor : 1,
      spacing: spacingVec,
      horizontalAlignment: f.horizontalAlignment || 'CENTER',
      visible: common.visible,
      opacity: common.opacity,
      blendMode: common.blendMode,
    };
    return pattern;
  }

  return null;
}

export interface AdvancedEffectInput {
  type: string;
  visible?: boolean;
  blendMode?: BlendMode;
  radius?: number;
  // NOISE
  noiseType?: 'MONOTONE' | 'DUOTONE' | 'MULTITONE';
  color?: string;
  secondaryColor?: string;
  opacity?: number;
  noiseSize?: number;
  density?: number;
  // TEXTURE
  clipToShape?: boolean;
  // GLASS
  lightIntensity?: number;
  lightAngle?: number;
  refraction?: number;
  depth?: number;
  dispersion?: number;
  // PROGRESSIVE blur
  blurType?: 'NORMAL' | 'PROGRESSIVE';
  startRadius?: number;
  startOffset?: { x: number; y: number };
  endOffset?: { x: number; y: number };
}

/**
 * Build an Effect for the newer effect types (NOISE, TEXTURE, GLASS, and PROGRESSIVE blur).
 * Returns null for types this helper does not handle.
 */
export function buildAdvancedEffect(e: AdvancedEffectInput): Effect | null {
  if (e.type === 'NOISE') {
    var noiseType = e.noiseType || 'MONOTONE';
    // blendMode is only included when the caller explicitly provides it — older Figma clients
    // reject it as an unrecognized key on noise effects, so we don't default it.
    var base: any = {
      type: 'NOISE',
      color: hexToRgba(e.color, 1),
      visible: e.visible !== false,
      noiseSize: e.noiseSize !== undefined ? e.noiseSize : 4,
      density: e.density !== undefined ? e.density : 0.5,
    };
    if (e.blendMode) base.blendMode = e.blendMode;
    if (noiseType === 'DUOTONE') {
      return {
        ...base,
        noiseType: 'DUOTONE',
        secondaryColor: hexToRgba(e.secondaryColor, 1),
      } as Effect;
    }
    if (noiseType === 'MULTITONE') {
      return {
        ...base,
        noiseType: 'MULTITONE',
        opacity: e.opacity !== undefined ? e.opacity : 1,
      } as Effect;
    }
    return { ...base, noiseType: 'MONOTONE' } as Effect;
  }

  if (e.type === 'TEXTURE') {
    var texture: TextureEffect = {
      type: 'TEXTURE',
      visible: e.visible !== false,
      noiseSize: e.noiseSize !== undefined ? e.noiseSize : 10,
      radius: e.radius !== undefined ? e.radius : 20,
      clipToShape: e.clipToShape !== false,
    };
    return texture;
  }

  if (e.type === 'GLASS') {
    var glass: GlassEffect = {
      type: 'GLASS',
      visible: e.visible !== false,
      lightIntensity: e.lightIntensity !== undefined ? e.lightIntensity : 0.5,
      lightAngle: e.lightAngle !== undefined ? e.lightAngle : 135,
      refraction: e.refraction !== undefined ? e.refraction : 0.2,
      depth: e.depth !== undefined ? e.depth : 1,
      dispersion: e.dispersion !== undefined ? e.dispersion : 0,
      radius: e.radius !== undefined ? e.radius : 10,
    };
    return glass;
  }

  // Progressive blur — a LAYER_BLUR/BACKGROUND_BLUR with blurType === 'PROGRESSIVE'
  if (
    (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') &&
    e.blurType === 'PROGRESSIVE'
  ) {
    var progressive: BlurEffect = {
      type: e.type,
      blurType: 'PROGRESSIVE',
      radius: e.radius !== undefined ? e.radius : 10,
      startRadius: e.startRadius !== undefined ? e.startRadius : 0,
      startOffset: e.startOffset || { x: 0, y: 0 },
      endOffset: e.endOffset || { x: 0, y: 1 },
      visible: e.visible !== false,
    };
    return progressive;
  }

  return null;
}
