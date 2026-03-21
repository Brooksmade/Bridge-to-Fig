// Color scale generation utilities for design systems

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  let r: number, g: number, b: number;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.slice(0, 2), 16);
    g = parseInt(cleanHex.slice(2, 4), 16);
    b = parseInt(cleanHex.slice(4, 6), 16);
  } else {
    throw new Error('Invalid hex color: ' + hex);
  }

  return { r, g, b };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Convert hex to HSL
 */
export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

/**
 * Convert HSL to hex
 */
export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * Color scale steps - matching Tailwind CSS scale
 */
export const COLOR_SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/**
 * Generate a full color scale from a base hex color
 * The base color is placed at the 500 level
 * Lighter shades (50-400) increase lightness
 * Darker shades (600-950) decrease lightness
 */
export function generateColorScale(baseHex: string, scaleName: string): Record<string, string> {
  const baseHsl = hexToHsl(baseHex);
  const scale: Record<string, string> = {};

  // Lightness targets for each step (approximate Tailwind values)
  const lightnessTargets: Record<number, number> = {
    50: 97,   // Very light
    100: 94,
    200: 86,
    300: 77,
    400: 66,
    500: baseHsl.l,  // Base color lightness
    600: 45,
    700: 37,
    800: 27,
    900: 18,
    950: 10,  // Very dark
  };

  // Adjust saturation slightly for extreme light/dark values
  const saturationAdjust: Record<number, number> = {
    50: -15,
    100: -10,
    200: -5,
    300: 0,
    400: 0,
    500: 0,
    600: 0,
    700: 0,
    800: -5,
    900: -10,
    950: -15,
  };

  for (var i = 0; i < COLOR_SCALE_STEPS.length; i++) {
    var step = COLOR_SCALE_STEPS[i];
    let targetL: number;
    let targetS: number;

    if (step === 500) {
      // Keep base color as-is
      targetL = baseHsl.l;
      targetS = baseHsl.s;
    } else if (step < 500) {
      // Lighter shades - interpolate between base and target
      const ratio = (500 - step) / 450; // 0 at 500, 1 at 50
      const targetLight = lightnessTargets[step];
      targetL = baseHsl.l + (targetLight - baseHsl.l) * ratio;
      targetS = Math.max(0, baseHsl.s + saturationAdjust[step]);
    } else {
      // Darker shades - interpolate between base and target
      const ratio = (step - 500) / 450; // 0 at 500, 1 at 950
      const targetDark = lightnessTargets[step];
      targetL = baseHsl.l - (baseHsl.l - targetDark) * ratio;
      targetS = Math.max(0, baseHsl.s + saturationAdjust[step]);
    }

    // Clamp values
    targetL = Math.max(0, Math.min(100, targetL));
    targetS = Math.max(0, Math.min(100, targetS));

    const hex = hslToHex({
      h: baseHsl.h,
      s: targetS,
      l: targetL,
    });

    scale[`${scaleName}-${step}`] = hex;
  }

  return scale;
}

/**
 * Generate a neutral gray scale (no saturation)
 */
export function generateGrayScale(): Record<string, string> {
  const scale: Record<string, string> = {};

  const lightnessMap: Record<number, number> = {
    50: 98,
    100: 96,
    200: 90,
    300: 83,
    400: 64,
    500: 45,
    600: 32,
    700: 25,
    800: 15,
    900: 10,
    950: 4,
  };

  for (var i = 0; i < COLOR_SCALE_STEPS.length; i++) {
    var step = COLOR_SCALE_STEPS[i];
    scale[`Gray-${step}`] = hslToHex({
      h: 0,
      s: 0,
      l: lightnessMap[step],
    });
  }

  return scale;
}

/**
 * Generate a warm gray scale (slight yellow/orange tint)
 */
export function generateWarmGrayScale(): Record<string, string> {
  const scale: Record<string, string> = {};

  const lightnessMap: Record<number, number> = {
    50: 98,
    100: 96,
    200: 90,
    300: 83,
    400: 64,
    500: 45,
    600: 32,
    700: 25,
    800: 15,
    900: 10,
    950: 4,
  };

  for (var i = 0; i < COLOR_SCALE_STEPS.length; i++) {
    var step = COLOR_SCALE_STEPS[i];
    scale[`Gray-${step}`] = hslToHex({
      h: 30,  // Warm hue
      s: step < 500 ? 10 : 5,  // Slight saturation
      l: lightnessMap[step],
    });
  }

  return scale;
}

/**
 * Generate a cool gray scale (slight blue tint)
 */
export function generateCoolGrayScale(): Record<string, string> {
  const scale: Record<string, string> = {};

  const lightnessMap: Record<number, number> = {
    50: 98,
    100: 96,
    200: 90,
    300: 83,
    400: 64,
    500: 45,
    600: 32,
    700: 25,
    800: 15,
    900: 10,
    950: 4,
  };

  for (var i = 0; i < COLOR_SCALE_STEPS.length; i++) {
    var step = COLOR_SCALE_STEPS[i];
    scale[`Gray-${step}`] = hslToHex({
      h: 220,  // Cool blue hue
      s: step < 500 ? 10 : 5,  // Slight saturation
      l: lightnessMap[step],
    });
  }

  return scale;
}

/**
 * Spectrum-style color scale steps (14 steps, 100-1400)
 * Higher index = higher contrast with background
 * In light themes: higher = darker. In dark themes: higher = lighter.
 */
export const SPECTRUM_COLOR_SCALE_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400] as const;

/**
 * Generate a Spectrum-style 14-step color scale from a base hex color.
 * Unlike the Tailwind scale (lightness-based), this is contrast-ratio oriented:
 * - 100 = lowest contrast (lightest tint in light theme context)
 * - 1400 = highest contrast (darkest shade)
 * - The base color is placed near the 800-900 range (primary action level)
 *
 * Uses flat lowercase-dash naming: blue-100, blue-200, etc.
 */
export function generateSpectrumColorScale(baseHex: string, scaleName: string): Record<string, string> {
  const baseHsl = hexToHsl(baseHex);
  const scale: Record<string, string> = {};
  const lowerName = scaleName.toLowerCase();

  // Lightness targets for each step (Spectrum-style: contrast-driven)
  // 100 = very light, 1400 = very dark
  const lightnessTargets: Record<number, number> = {
    100: 97,
    200: 93,
    300: 87,
    400: 78,
    500: 68,
    600: 58,
    700: 48,
    800: baseHsl.l, // Base color placed at primary action level
    900: 35,
    1000: 28,
    1100: 22,
    1200: 16,
    1300: 10,
    1400: 5,
  };

  // Saturation adjustments — reduce at extremes for visual comfort
  const saturationAdjust: Record<number, number> = {
    100: -20,
    200: -12,
    300: -6,
    400: -2,
    500: 0,
    600: 0,
    700: 0,
    800: 0,
    900: 0,
    1000: -3,
    1100: -6,
    1200: -10,
    1300: -15,
    1400: -20,
  };

  for (var i = 0; i < SPECTRUM_COLOR_SCALE_STEPS.length; i++) {
    var step = SPECTRUM_COLOR_SCALE_STEPS[i];
    let targetL: number;
    let targetS: number;

    if (step === 800) {
      targetL = baseHsl.l;
      targetS = baseHsl.s;
    } else if (step < 800) {
      const ratio = (800 - step) / 700;
      const target = lightnessTargets[step];
      targetL = baseHsl.l + (target - baseHsl.l) * ratio;
      targetS = Math.max(0, baseHsl.s + saturationAdjust[step]);
    } else {
      const ratio = (step - 800) / 600;
      const target = lightnessTargets[step];
      targetL = baseHsl.l - (baseHsl.l - target) * ratio;
      targetS = Math.max(0, baseHsl.s + saturationAdjust[step]);
    }

    targetL = Math.max(0, Math.min(100, targetL));
    targetS = Math.max(0, Math.min(100, targetS));

    scale[`${lowerName}-${step}`] = hslToHex({
      h: baseHsl.h,
      s: targetS,
      l: targetL,
    });
  }

  return scale;
}

/**
 * Generate a Spectrum-style gray scale (11 steps, desaturated)
 * Uses flat naming: gray-100, gray-200, ..., gray-1100
 */
export function generateSpectrumGrayScale(): Record<string, string> {
  const scale: Record<string, string> = {};

  // 11 gray steps matching Spectrum's approach
  const graySteps = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100];
  const lightnessMap: Record<number, number> = {
    100: 97,   // Near-white (light theme default background)
    200: 92,
    300: 83,
    400: 72,
    500: 55,
    600: 42,
    700: 32,
    800: 23,
    900: 15,
    1000: 10,
    1100: 5,   // Near-black (darkest theme background)
  };

  for (var i = 0; i < graySteps.length; i++) {
    var step = graySteps[i];
    scale[`gray-${step}`] = hslToHex({
      h: 0,
      s: 0,
      l: lightnessMap[step],
    });
  }

  return scale;
}

/**
 * Spectrum semantic feedback/status colors
 * These are the 5 Spectrum semantic roles
 */
export const SPECTRUM_SEMANTIC_COLORS: Record<string, string> = {
  informative: '#2680eb',  // Blue — information
  positive: '#2d9d78',     // Green — success
  notice: '#e68619',       // Orange — warning
  negative: '#e34850',     // Red — error/destructive
};

/**
 * System colors that don't change with theme
 */
export const SYSTEM_COLORS = {
  White: '#ffffff',
  Black: '#000000',
  Transparent: 'transparent',
};

/**
 * Default feedback/system colors
 */
export const FEEDBACK_COLORS = {
  Success: '#22c55e',  // Green-500
  Warning: '#eab308',  // Yellow-500
  Error: '#ef4444',    // Red-500
  Info: '#3b82f6',     // Blue-500
};

// ─── Apple HIG Color Scales ─────────────────────────────────────────────────

/**
 * Apple's 12 system colors (light appearance defaults)
 * Reference: Apple Human Interface Guidelines
 */
export const APPLE_SYSTEM_COLORS: Record<string, string> = {
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemGreen: '#34C759',
  systemMint: '#00C7BE',
  systemTeal: '#30B0C7',
  systemCyan: '#32ADE6',
  systemBlue: '#007AFF',
  systemIndigo: '#5856D6',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D55',
  systemBrown: '#A2845E',
};

/**
 * Apple's 6 named system grays with light and dark appearance values
 * Reference: Apple Human Interface Guidelines
 */
export const APPLE_SYSTEM_GRAYS: Record<string, { light: string; dark: string }> = {
  systemGray: { light: '#8E8E93', dark: '#8E8E93' },
  systemGray2: { light: '#AEAEB2', dark: '#636366' },
  systemGray3: { light: '#C7C7CC', dark: '#48484A' },
  systemGray4: { light: '#D1D1D6', dark: '#3A3A3C' },
  systemGray5: { light: '#E5E5EA', dark: '#2C2C2E' },
  systemGray6: { light: '#F2F2F7', dark: '#1C1C1E' },
};

/**
 * Generate an Apple HIG-style 14-step tonal scale from a base hex color.
 * Similar approach to generateSpectrumColorScale but with Apple's slightly
 * warmer lightness distribution. The base color lands around the 700-800 position.
 *
 * Uses flat lowercase-dash naming: {scaleName}-100 through {scaleName}-1400.
 */
export function generateAppleColorScale(baseHex: string, scaleName: string): Record<string, string> {
  const baseHsl = hexToHsl(baseHex);
  const scale: Record<string, string> = {};
  const lowerName = scaleName.toLowerCase();

  // Lightness targets (Apple colors tend to be slightly more vivid than Spectrum)
  const lightnessSteps = [
    { step: 100, l: 97 },
    { step: 200, l: 93 },
    { step: 300, l: 86 },
    { step: 400, l: 76 },
    { step: 500, l: 65 },
    { step: 600, l: 55 },
    { step: 700, l: 48 },
    { step: 800, l: 42 },
    { step: 900, l: 36 },
    { step: 1000, l: 30 },
    { step: 1100, l: 24 },
    { step: 1200, l: 18 },
    { step: 1300, l: 12 },
    { step: 1400, l: 6 },
  ];

  for (const { step, l } of lightnessSteps) {
    // Saturation: boost slightly in mid-tones, reduce in very light/dark
    let satAdj = baseHsl.s;
    if (l > 90) satAdj = Math.max(baseHsl.s * 0.3, 10);
    else if (l > 75) satAdj = baseHsl.s * 0.65;
    else if (l < 15) satAdj = baseHsl.s * 0.6;
    else if (l < 25) satAdj = baseHsl.s * 0.75;

    const hex = hslToHex({ h: baseHsl.h, s: Math.min(satAdj, 100), l });
    scale[`${lowerName}-${step}`] = hex;
  }

  return scale;
}

/**
 * Generate an Apple HIG-style 11-step gray ramp for use as primitives.
 * Values match Apple's named system grays across both light and dark appearances.
 */
export function generateAppleGrayScale(): Record<string, string> {
  return {
    'gray-100': '#F2F2F7',   // Lightest (matches systemGray6 light)
    'gray-200': '#E5E5EA',   // matches systemGray5 light
    'gray-300': '#D1D1D6',   // matches systemGray4 light
    'gray-400': '#C7C7CC',   // matches systemGray3 light
    'gray-500': '#AEAEB2',   // matches systemGray2 light
    'gray-600': '#8E8E93',   // matches systemGray light
    'gray-700': '#636366',   // matches systemGray2 dark
    'gray-800': '#48484A',   // matches systemGray3 dark
    'gray-900': '#3A3A3C',   // matches systemGray4 dark
    'gray-1000': '#2C2C2E',  // matches systemGray5 dark
    'gray-1100': '#1C1C1E',  // matches systemGray6 dark
  };
}
