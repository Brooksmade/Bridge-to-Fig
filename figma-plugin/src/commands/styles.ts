// Style command handlers for paint, text, and effect styles

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import {
  serializePaintStyle,
  serializeTextStyle,
  serializeEffectStyle,
  createSolidPaint,
  createGradientPaint,
  createDropShadow,
  createInnerShadow,
  createBlurEffect,
  getAllLocalStyles,
  findPaintStyleByName,
  findTextStyleByName,
  findEffectStyleByName,
  validateStyleName,
} from '../utils/style-factory';
import { parseColor } from '../utils/variable-factory';

// Payload interfaces
interface CreatePaintStylePayload {
  name: string;
  color?: string;
  colors?: string[];
  gradient?: {
    type: 'linear' | 'radial' | 'angular' | 'diamond';
    stops: Array<{ position: number; color: string }>;
  };
  opacity?: number;
  description?: string;
}

interface CreateTextStylePayload {
  name: string;
  fontFamily: string;
  fontStyle?: string;
  fontSize: number;
  letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' } | 'AUTO';
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  description?: string;
}

interface CreateEffectStylePayload {
  name: string;
  effects: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    color?: string;
    offsetX?: number;
    offsetY?: number;
    radius: number;
    spread?: number;
  }>;
  description?: string;
}

interface EditStylePayload {
  styleId: string;
  name?: string;
  description?: string;
  color?: string;
  colors?: string[];
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  effects?: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    color?: string;
    offsetX?: number;
    offsetY?: number;
    radius: number;
    spread?: number;
  }>;
}

interface ApplyStylePayload {
  nodeId: string;
  styleId: string;
  property?: 'fills' | 'strokes' | 'effects' | 'text';
}

interface DetachStylePayload {
  nodeId: string;
  property: 'fills' | 'strokes' | 'effects' | 'text';
}

// Create a paint (color/fill) style
export async function handleCreatePaintStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as CreatePaintStylePayload;

  if (!payload.name) {
    return errorResult(command.id, 'Missing style name');
  }

  var validation = validateStyleName(payload.name);
  if (!validation.valid) {
    return errorResult(command.id, validation.error || 'Invalid style name');
  }

  try {
    var style = figma.createPaintStyle();
    style.name = payload.name;

    if (payload.description) {
      style.description = payload.description;
    }

    // Create paints
    var paints: Paint[] = [];

    if (payload.gradient) {
      var gradientType: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
      if (payload.gradient.type === 'linear') {
        gradientType = 'GRADIENT_LINEAR';
      } else if (payload.gradient.type === 'radial') {
        gradientType = 'GRADIENT_RADIAL';
      } else if (payload.gradient.type === 'angular') {
        gradientType = 'GRADIENT_ANGULAR';
      } else {
        gradientType = 'GRADIENT_DIAMOND';
      }
      paints.push(createGradientPaint(gradientType, payload.gradient.stops));
    } else if (payload.colors && payload.colors.length > 0) {
      for (var i = 0; i < payload.colors.length; i++) {
        paints.push(createSolidPaint(payload.colors[i], payload.opacity));
      }
    } else if (payload.color) {
      paints.push(createSolidPaint(payload.color, payload.opacity));
    } else {
      // Default to black
      paints.push(createSolidPaint('#000000'));
    }

    style.paints = paints;

    return successResult(command.id, {
      styleId: style.id,
      data: serializePaintStyle(style),
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create a text style
export async function handleCreateTextStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as CreateTextStylePayload;

  if (!payload.name) {
    return errorResult(command.id, 'Missing style name');
  }

  if (!payload.fontFamily || payload.fontSize === undefined) {
    return errorResult(command.id, 'Missing fontFamily or fontSize');
  }

  var validation = validateStyleName(payload.name);
  if (!validation.valid) {
    return errorResult(command.id, validation.error || 'Invalid style name');
  }

  try {
    var style = figma.createTextStyle();
    style.name = payload.name;

    if (payload.description) {
      style.description = payload.description;
    }

    // Load and set font
    var fontStyle = payload.fontStyle ? payload.fontStyle : 'Regular';
    var fontName: FontName = { family: payload.fontFamily, style: fontStyle };

    await figma.loadFontAsync(fontName);
    style.fontName = fontName;
    style.fontSize = payload.fontSize;

    // Optional text properties
    if (payload.letterSpacing !== undefined) {
      if (typeof payload.letterSpacing === 'number') {
        style.letterSpacing = { value: payload.letterSpacing, unit: 'PIXELS' };
      } else {
        style.letterSpacing = payload.letterSpacing;
      }
    }

    if (payload.lineHeight !== undefined) {
      if (payload.lineHeight === 'AUTO') {
        style.lineHeight = { unit: 'AUTO' };
      } else if (typeof payload.lineHeight === 'number') {
        style.lineHeight = { value: payload.lineHeight, unit: 'PIXELS' };
      } else {
        style.lineHeight = payload.lineHeight;
      }
    }

    if (payload.paragraphIndent !== undefined) {
      style.paragraphIndent = payload.paragraphIndent;
    }

    if (payload.paragraphSpacing !== undefined) {
      style.paragraphSpacing = payload.paragraphSpacing;
    }

    if (payload.textCase) {
      style.textCase = payload.textCase;
    }

    if (payload.textDecoration) {
      style.textDecoration = payload.textDecoration;
    }

    return successResult(command.id, {
      styleId: style.id,
      data: serializeTextStyle(style),
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create an effect style
export async function handleCreateEffectStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as CreateEffectStylePayload;

  if (!payload.name) {
    return errorResult(command.id, 'Missing style name');
  }

  if (!payload.effects || payload.effects.length === 0) {
    return errorResult(command.id, 'Missing effects array');
  }

  var validation = validateStyleName(payload.name);
  if (!validation.valid) {
    return errorResult(command.id, validation.error || 'Invalid style name');
  }

  try {
    var style = figma.createEffectStyle();
    style.name = payload.name;

    if (payload.description) {
      style.description = payload.description;
    }

    var effects: Effect[] = [];

    for (var i = 0; i < payload.effects.length; i++) {
      var eff = payload.effects[i];
      if (eff.type === 'DROP_SHADOW') {
        effects.push(createDropShadow(
          eff.color || '#00000040',
          eff.offsetX !== undefined ? eff.offsetX : 0,
          eff.offsetY !== undefined ? eff.offsetY : 4,
          eff.radius,
          eff.spread
        ));
      } else if (eff.type === 'INNER_SHADOW') {
        effects.push(createInnerShadow(
          eff.color || '#00000040',
          eff.offsetX !== undefined ? eff.offsetX : 0,
          eff.offsetY !== undefined ? eff.offsetY : 2,
          eff.radius,
          eff.spread
        ));
      } else if (eff.type === 'LAYER_BLUR' || eff.type === 'BACKGROUND_BLUR') {
        effects.push(createBlurEffect(eff.type, eff.radius));
      }
    }

    style.effects = effects;

    return successResult(command.id, {
      styleId: style.id,
      data: serializeEffectStyle(style),
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Edit an existing style
export async function handleEditStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as EditStylePayload;

  if (!payload.styleId) {
    return errorResult(command.id, 'Missing styleId');
  }

  try {
    var style = await figma.getStyleByIdAsync(payload.styleId);

    if (!style) {
      return errorResult(command.id, 'Style not found: ' + payload.styleId);
    }

    // Update common properties
    if (payload.name) {
      style.name = payload.name;
    }

    if (payload.description !== undefined) {
      style.description = payload.description;
    }

    // Handle paint style specific updates
    if (style.type === 'PAINT') {
      var paintStyle = style as PaintStyle;

      if (payload.color) {
        paintStyle.paints = [createSolidPaint(payload.color)];
      } else if (payload.colors && payload.colors.length > 0) {
        var newPaints: Paint[] = [];
        for (var i = 0; i < payload.colors.length; i++) {
          newPaints.push(createSolidPaint(payload.colors[i]));
        }
        paintStyle.paints = newPaints;
      }

      return successResult(command.id, {
        styleId: style.id,
        data: serializePaintStyle(paintStyle),
      });
    }

    // Handle text style specific updates
    if (style.type === 'TEXT') {
      var textStyle = style as TextStyle;

      if (payload.fontFamily || payload.fontStyle) {
        var family = payload.fontFamily ? payload.fontFamily : textStyle.fontName.family;
        var fStyle = payload.fontStyle ? payload.fontStyle : textStyle.fontName.style;
        var font: FontName = { family: family, style: fStyle };
        await figma.loadFontAsync(font);
        textStyle.fontName = font;
      }

      if (payload.fontSize !== undefined) {
        textStyle.fontSize = payload.fontSize;
      }

      return successResult(command.id, {
        styleId: style.id,
        data: serializeTextStyle(textStyle),
      });
    }

    // Handle effect style specific updates
    if (style.type === 'EFFECT') {
      var effectStyle = style as EffectStyle;

      if (payload.effects && payload.effects.length > 0) {
        var newEffects: Effect[] = [];
        for (var j = 0; j < payload.effects.length; j++) {
          var eff = payload.effects[j];
          if (eff.type === 'DROP_SHADOW') {
            newEffects.push(createDropShadow(
              eff.color || '#00000040',
              eff.offsetX !== undefined ? eff.offsetX : 0,
              eff.offsetY !== undefined ? eff.offsetY : 4,
              eff.radius,
              eff.spread
            ));
          } else if (eff.type === 'INNER_SHADOW') {
            newEffects.push(createInnerShadow(
              eff.color || '#00000040',
              eff.offsetX !== undefined ? eff.offsetX : 0,
              eff.offsetY !== undefined ? eff.offsetY : 2,
              eff.radius,
              eff.spread
            ));
          } else if (eff.type === 'LAYER_BLUR' || eff.type === 'BACKGROUND_BLUR') {
            newEffects.push(createBlurEffect(eff.type, eff.radius));
          }
        }
        effectStyle.effects = newEffects;
      }

      return successResult(command.id, {
        styleId: style.id,
        data: serializeEffectStyle(effectStyle),
      });
    }

    return successResult(command.id, {
      styleId: style.id,
      data: { id: style.id, name: style.name },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Delete a style
export async function handleDeleteStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { styleId: string };

  if (!payload.styleId) {
    return errorResult(command.id, 'Missing styleId');
  }

  try {
    var style = await figma.getStyleByIdAsync(payload.styleId);

    if (!style) {
      return errorResult(command.id, 'Style not found: ' + payload.styleId);
    }

    var styleName = style.name;
    style.remove();

    return successResult(command.id, {
      data: {
        deleted: true,
        name: styleName,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Apply a style to a node
export async function handleApplyStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as ApplyStylePayload;

  if (!payload.nodeId || !payload.styleId) {
    return errorResult(command.id, 'Missing nodeId or styleId');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.nodeId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    var style = await figma.getStyleByIdAsync(payload.styleId);

    if (!style) {
      return errorResult(command.id, 'Style not found: ' + payload.styleId);
    }

    var property = payload.property;

    // Auto-detect property based on style type if not specified
    if (!property) {
      if (style.type === 'PAINT') {
        property = 'fills';
      } else if (style.type === 'TEXT') {
        property = 'text';
      } else if (style.type === 'EFFECT') {
        property = 'effects';
      }
    }

    // Apply the style based on type and property
    if (style.type === 'PAINT') {
      if (property === 'fills' && 'fillStyleId' in node) {
        (node as GeometryMixin).fillStyleId = style.id;
      } else if (property === 'strokes' && 'strokeStyleId' in node) {
        (node as GeometryMixin).strokeStyleId = style.id;
      } else {
        return errorResult(command.id, 'Cannot apply paint style to this node property');
      }
    } else if (style.type === 'TEXT') {
      if ('textStyleId' in node) {
        await (node as TextNode).setTextStyleIdAsync(style.id);
      } else {
        return errorResult(command.id, 'Cannot apply text style to non-text node');
      }
    } else if (style.type === 'EFFECT') {
      if ('effectStyleId' in node) {
        (node as BlendMixin).effectStyleId = style.id;
      } else {
        return errorResult(command.id, 'Cannot apply effect style to this node');
      }
    }

    return successResult(command.id, {
      data: {
        applied: true,
        nodeId: payload.nodeId,
        styleId: payload.styleId,
        property: property,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Detach a style from a node
export async function handleDetachStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as DetachStylePayload;

  if (!payload.nodeId || !payload.property) {
    return errorResult(command.id, 'Missing nodeId or property');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.nodeId);

    if (!node) {
      return errorResult(command.id, 'Node not found: ' + payload.nodeId);
    }

    var property = payload.property;

    if (property === 'fills' && 'fillStyleId' in node) {
      (node as GeometryMixin).fillStyleId = '';
    } else if (property === 'strokes' && 'strokeStyleId' in node) {
      (node as GeometryMixin).strokeStyleId = '';
    } else if (property === 'text' && 'textStyleId' in node) {
      (node as TextNode).textStyleId = '';
    } else if (property === 'effects' && 'effectStyleId' in node) {
      (node as BlendMixin).effectStyleId = '';
    } else {
      return errorResult(command.id, 'Cannot detach style from this property: ' + property);
    }

    return successResult(command.id, {
      data: {
        detached: true,
        nodeId: payload.nodeId,
        property: property,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Get all local styles
export async function handleGetStyles(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as { type?: 'paint' | 'text' | 'effect' | 'all' };
  var styleType = (payload && payload.type) ? payload.type : 'all';

  try {
    var result: Record<string, any> = {};

    if (styleType === 'all' || styleType === 'paint') {
      var paintStyles = await figma.getLocalPaintStylesAsync();
      result.paintStyles = paintStyles.map(function (s) {
        return serializePaintStyle(s);
      });
    }

    if (styleType === 'all' || styleType === 'text') {
      var textStyles = await figma.getLocalTextStylesAsync();
      result.textStyles = textStyles.map(function (s) {
        return serializeTextStyle(s);
      });
    }

    if (styleType === 'all' || styleType === 'effect') {
      var effectStyles = await figma.getLocalEffectStylesAsync();
      result.effectStyles = effectStyles.map(function (s) {
        return serializeEffectStyle(s);
      });
    }

    return successResult(command.id, {
      data: result,
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Bind a variable to a text style property
export async function handleBindTextStyleVariable(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    styleId: string;
    field: 'fontSize' | 'lineHeight' | 'letterSpacing' | 'paragraphSpacing' | 'paragraphIndent' | 'fontFamily' | 'fontStyle';
    variableId: string;
  };

  if (!payload.styleId) {
    return errorResult(command.id, 'Missing styleId');
  }
  if (!payload.field) {
    return errorResult(command.id, 'Missing field');
  }
  if (!payload.variableId) {
    return errorResult(command.id, 'Missing variableId');
  }

  var numericFields = ['fontSize', 'lineHeight', 'letterSpacing', 'paragraphSpacing', 'paragraphIndent'];
  var stringFields = ['fontFamily', 'fontStyle'];
  var validFields = numericFields.concat(stringFields);

  if (validFields.indexOf(payload.field) === -1) {
    return errorResult(command.id, 'Invalid field. Must be one of: ' + validFields.join(', '));
  }

  try {
    // Get the text style
    var style = await figma.getStyleByIdAsync(payload.styleId) as TextStyle | null;
    if (!style || style.type !== 'TEXT') {
      return errorResult(command.id, 'Text style not found: ' + payload.styleId);
    }

    // Get the variable
    var variable = await figma.variables.getVariableByIdAsync(payload.variableId);
    if (!variable) {
      return errorResult(command.id, 'Variable not found: ' + payload.variableId);
    }

    // Verify variable type matches field type
    var isStringField = stringFields.indexOf(payload.field) !== -1;
    if (isStringField) {
      if (variable.resolvedType !== 'STRING') {
        return errorResult(command.id, 'Variable must be STRING type for fontFamily/fontStyle properties');
      }
    } else {
      if (variable.resolvedType !== 'FLOAT') {
        return errorResult(command.id, 'Variable must be FLOAT type for numeric text style properties');
      }
    }

    // Bind the variable to the text style field
    style.setBoundVariable(payload.field as VariableBindableTextField, variable);

    return successResult(command.id, {
      styleId: style.id,
      data: {
        styleName: style.name,
        field: payload.field,
        variableId: variable.id,
        variableName: variable.name,
        message: 'Variable bound to text style successfully',
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create text style with optional variable bindings
export async function handleCreateTextStyleWithVariables(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name: string;
    fontFamily: string;
    fontStyle?: string;
    fontSize: number;
    letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
    lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' } | 'AUTO';
    paragraphIndent?: number;
    paragraphSpacing?: number;
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    description?: string;
    variableBindings?: {
      fontSize?: string;       // variable ID (FLOAT)
      lineHeight?: string;     // variable ID (FLOAT)
      letterSpacing?: string;  // variable ID (FLOAT)
      paragraphSpacing?: string; // variable ID (FLOAT)
      paragraphIndent?: string;  // variable ID (FLOAT)
      fontFamily?: string;     // variable ID (STRING)
      fontStyle?: string;      // variable ID (STRING)
    };
  };

  if (!payload.name) {
    return errorResult(command.id, 'Missing style name');
  }

  if (!payload.fontFamily || payload.fontSize === undefined) {
    return errorResult(command.id, 'Missing fontFamily or fontSize');
  }

  var validation = validateStyleName(payload.name);
  if (!validation.valid) {
    return errorResult(command.id, validation.error || 'Invalid style name');
  }

  try {
    var style = figma.createTextStyle();
    style.name = payload.name;

    if (payload.description) {
      style.description = payload.description;
    }

    // Load and set font
    var fontStyle = payload.fontStyle ? payload.fontStyle : 'Regular';
    var fontName: FontName = { family: payload.fontFamily, style: fontStyle };

    await figma.loadFontAsync(fontName);
    style.fontName = fontName;
    style.fontSize = payload.fontSize;

    // Optional text properties
    if (payload.letterSpacing !== undefined) {
      if (typeof payload.letterSpacing === 'number') {
        style.letterSpacing = { value: payload.letterSpacing, unit: 'PIXELS' };
      } else {
        style.letterSpacing = payload.letterSpacing;
      }
    }

    if (payload.lineHeight !== undefined) {
      if (payload.lineHeight === 'AUTO') {
        style.lineHeight = { unit: 'AUTO' };
      } else if (typeof payload.lineHeight === 'number') {
        style.lineHeight = { value: payload.lineHeight, unit: 'PIXELS' };
      } else {
        style.lineHeight = payload.lineHeight;
      }
    }

    if (payload.paragraphIndent !== undefined) {
      style.paragraphIndent = payload.paragraphIndent;
    }

    if (payload.paragraphSpacing !== undefined) {
      style.paragraphSpacing = payload.paragraphSpacing;
    }

    if (payload.textCase) {
      style.textCase = payload.textCase;
    }

    if (payload.textDecoration) {
      style.textDecoration = payload.textDecoration;
    }

    // Apply variable bindings if provided
    var boundVariables: Record<string, string> = {};
    if (payload.variableBindings) {
      var bindings = payload.variableBindings;

      if (bindings.fontSize) {
        var fontSizeVar = await figma.variables.getVariableByIdAsync(bindings.fontSize);
        if (fontSizeVar && fontSizeVar.resolvedType === 'FLOAT') {
          style.setBoundVariable('fontSize', fontSizeVar);
          boundVariables.fontSize = fontSizeVar.name;
        }
      }

      if (bindings.lineHeight) {
        var lineHeightVar = await figma.variables.getVariableByIdAsync(bindings.lineHeight);
        if (lineHeightVar && lineHeightVar.resolvedType === 'FLOAT') {
          style.setBoundVariable('lineHeight', lineHeightVar);
          boundVariables.lineHeight = lineHeightVar.name;
        }
      }

      if (bindings.letterSpacing) {
        var letterSpacingVar = await figma.variables.getVariableByIdAsync(bindings.letterSpacing);
        if (letterSpacingVar && letterSpacingVar.resolvedType === 'FLOAT') {
          style.setBoundVariable('letterSpacing', letterSpacingVar);
          boundVariables.letterSpacing = letterSpacingVar.name;
        }
      }

      if (bindings.paragraphSpacing) {
        var paragraphSpacingVar = await figma.variables.getVariableByIdAsync(bindings.paragraphSpacing);
        if (paragraphSpacingVar && paragraphSpacingVar.resolvedType === 'FLOAT') {
          style.setBoundVariable('paragraphSpacing', paragraphSpacingVar);
          boundVariables.paragraphSpacing = paragraphSpacingVar.name;
        }
      }

      if (bindings.paragraphIndent) {
        var paragraphIndentVar = await figma.variables.getVariableByIdAsync(bindings.paragraphIndent);
        if (paragraphIndentVar && paragraphIndentVar.resolvedType === 'FLOAT') {
          style.setBoundVariable('paragraphIndent', paragraphIndentVar);
          boundVariables.paragraphIndent = paragraphIndentVar.name;
        }
      }

      if (bindings.fontFamily) {
        var fontFamilyVar = await figma.variables.getVariableByIdAsync(bindings.fontFamily);
        if (fontFamilyVar && fontFamilyVar.resolvedType === 'STRING') {
          style.setBoundVariable('fontFamily', fontFamilyVar);
          boundVariables.fontFamily = fontFamilyVar.name;
        }
      }

      if (bindings.fontStyle) {
        var fontStyleVar = await figma.variables.getVariableByIdAsync(bindings.fontStyle);
        if (fontStyleVar && fontStyleVar.resolvedType === 'STRING') {
          style.setBoundVariable('fontStyle', fontStyleVar);
          boundVariables.fontStyle = fontStyleVar.name;
        }
      }
    }

    return successResult(command.id, {
      styleId: style.id,
      data: { ...serializeTextStyle(style), boundVariables: boundVariables },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Create a grid style
export async function handleCreateGridStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name: string;
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
    description?: string;
  };

  if (!payload.name) {
    return errorResult(command.id, 'Grid style name is required');
  }

  if (!payload.grids || payload.grids.length === 0) {
    return errorResult(command.id, 'At least one grid definition is required');
  }

  try {
    var gridStyle = figma.createGridStyle();
    gridStyle.name = payload.name;

    if (payload.description) {
      gridStyle.description = payload.description;
    }

    var layoutGrids: LayoutGrid[] = [];

    for (var i = 0; i < payload.grids.length; i++) {
      var gridDef = payload.grids[i];
      var grid: LayoutGrid;

      // Parse color
      var gridColor = { r: 1, g: 0, b: 0, a: 0.1 }; // Default red with 10% opacity
      if (gridDef.color) {
        var hex = gridDef.color.replace('#', '');
        gridColor.r = parseInt(hex.substring(0, 2), 16) / 255;
        gridColor.g = parseInt(hex.substring(2, 4), 16) / 255;
        gridColor.b = parseInt(hex.substring(4, 6), 16) / 255;
        if (hex.length === 8) {
          gridColor.a = parseInt(hex.substring(6, 8), 16) / 255;
        }
      }

      if (gridDef.pattern === 'GRID') {
        // Simple square grid
        grid = {
          pattern: 'GRID',
          sectionSize: gridDef.sectionSize || 10,
          visible: gridDef.visible !== false,
          color: gridColor,
        };
      } else {
        // COLUMNS or ROWS pattern - use STRETCH alignment (most compatible)
        // Note: MIN/MAX/CENTER alignments have stricter validation requirements
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

    return successResult(command.id, {
      data: {
        id: gridStyle.id,
        name: gridStyle.name,
        description: gridStyle.description,
        grids: gridStyle.layoutGrids,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Get all grid styles
export async function handleGetGridStyles(command: FigmaCommand): Promise<CommandResult> {
  try {
    var gridStyles = await figma.getLocalGridStylesAsync();

    var styles = gridStyles.map(function(style) {
      return {
        id: style.id,
        name: style.name,
        description: style.description,
        grids: style.layoutGrids,
      };
    });

    return successResult(command.id, {
      data: {
        count: styles.length,
        gridStyles: styles,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Apply grid style to a frame
export async function handleApplyGridStyle(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId: string;
    styleId: string;
  };

  if (!payload.nodeId || !payload.styleId) {
    return errorResult(command.id, 'nodeId and styleId are required');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.nodeId);
    if (!node) {
      return errorResult(command.id, 'Node not found');
    }

    if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
      return errorResult(command.id, 'Node must be a frame, component, or instance');
    }

    var style = await figma.getStyleByIdAsync(payload.styleId);
    if (!style || style.type !== 'GRID') {
      return errorResult(command.id, 'Grid style not found');
    }

    var frameNode = node as FrameNode;
    frameNode.gridStyleId = style.id;

    return successResult(command.id, {
      data: {
        applied: true,
        nodeId: frameNode.id,
        styleId: style.id,
        styleName: style.name,
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Apply matching text styles to all text nodes based on font size
export async function handleApplyMatchingTextStyles(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    scope?: 'selection' | 'page' | 'file';
    maxNodes?: number;
    dryRun?: boolean;
    validStyleIds?: string[]; // Only keep bindings to these styles - rebind if bound to other styles
    forceRestyle?: boolean; // Force restyle ALL nodes, ignoring existing style bindings entirely
    snapToNearest?: boolean; // If true, always match to closest style (no size limit). Default: true
  };

  const scope = payload.scope || 'page';
  const maxNodes = payload.maxNodes || 10000;
  const dryRun = payload.dryRun || false;
  const validStyleIds = payload.validStyleIds ? new Set(payload.validStyleIds) : null;
  const forceRestyle = payload.forceRestyle || false;
  const snapToNearest = payload.snapToNearest !== false; // Default to true - always find closest style

  try {
    // Performance optimization: skip invisible instance children
    figma.skipInvisibleInstanceChildren = true;

    // Step 1: Get all text styles and build a sorted list by font size + font family + font style
    const textStyles = await figma.getLocalTextStylesAsync();
    const styleList: Array<{ size: number; fontFamily: string; fontStyle: string; style: TextStyle }> = [];

    // Track by size+fontFamily+fontStyle key to allow multiple weights at the same size
    const seenKeys = new Set<string>();
    for (const style of textStyles) {
      const size = Math.round(style.fontSize);
      const fontFamily = style.fontName.family;
      const fontStyle = style.fontName.style;
      const key = `${fontFamily}:${fontStyle}:${size}`;

      // Skip exact duplicates (same font+style+size)
      if (seenKeys.has(key)) continue;

      seenKeys.add(key);
      styleList.push({ size, fontFamily, fontStyle, style });
    }

    // Sort by size for nearest-match finding
    styleList.sort((a, b) => a.size - b.size);

    // Helper to find nearest matching style
    // Matches by font family + font style + font size
    // Priority: 1) exact family+style+size, 2) exact family+style nearest size, 3) exact family nearest size, 4) any font nearest size
    // Normalize font style for comparison: "Extra Bold" -> "extrabold", "Regular Italic" -> "regularitalic"
    const normalizeStyle = (s: string) => s.replace(/\s+/g, '').toLowerCase();

    function findNearestStyle(targetSize: number, targetFontFamily: string, snapToNearest: boolean, targetFontStyle?: string): { style: TextStyle; diff: number } | null {
      let bestMatch: TextStyle | null = null;
      let bestDiff = snapToNearest ? Infinity : 3;
      const targetStyleNorm = targetFontStyle ? normalizeStyle(targetFontStyle) : undefined;

      // First pass: match by font family + font style + size (exact combo)
      if (targetStyleNorm) {
        for (const { size, fontFamily, fontStyle, style } of styleList) {
          if (fontFamily !== targetFontFamily || normalizeStyle(fontStyle) !== targetStyleNorm) continue;
          const diff = Math.abs(size - targetSize);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestMatch = style;
          }
        }
        if (bestMatch && bestDiff === 0) return { style: bestMatch, diff: bestDiff };
      }

      // Second pass: match by font family + size (any style within same family)
      if (!bestMatch || bestDiff > 0) {
        let familyBest: TextStyle | null = null;
        let familyBestDiff = snapToNearest ? Infinity : 3;
        for (const { size, fontFamily, style } of styleList) {
          if (fontFamily !== targetFontFamily) continue;
          const diff = Math.abs(size - targetSize);
          if (diff < familyBestDiff) {
            familyBestDiff = diff;
            familyBest = style;
          }
        }
        // Only use family match if it's better than style match, or no style match found
        if (!bestMatch || (familyBest && familyBestDiff < bestDiff)) {
          bestMatch = familyBest;
          bestDiff = familyBestDiff;
        }
      }

      // Third pass: fall back to any font if no family match found
      if (!bestMatch) {
        bestDiff = snapToNearest ? Infinity : 3;
        for (const { size, style } of styleList) {
          const diff = Math.abs(size - targetSize);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestMatch = style;
          }
        }
      }

      return bestMatch ? { style: bestMatch, diff: bestDiff } : null;
    }

    if (styleList.length === 0) {
      return successResult(command.id, {
        data: {
          message: 'No text styles found',
          applied: 0,
          skipped: 0,
        },
      });
    }

    // Step 2: Get nodes to process based on scope
    let nodesToProcess: SceneNode[] = [];

    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else {
      // file scope - load all pages in PARALLEL for performance
      await Promise.all(figma.root.children.map(page => page.loadAsync()));
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children);
      }
    }

    // Step 3: Collect all text nodes (with depth limit)
    const textNodes: TextNode[] = [];
    const MAX_DEPTH = 20; // Prevent stack overflow on deeply nested files

    function collectTextNodes(nodes: readonly SceneNode[], depth = 0) {
      if (depth > MAX_DEPTH || textNodes.length >= maxNodes) return;

      for (const node of nodes) {
        if (textNodes.length >= maxNodes) return;

        if (node.type === 'TEXT') {
          textNodes.push(node);
        }

        if ('children' in node) {
          collectTextNodes((node as FrameNode | GroupNode).children, depth + 1);
        }
      }
    }

    collectTextNodes(nodesToProcess, 0);

    // Sort text nodes by parent type: nodes in COMPONENT parents first, then INSTANCE parents
    // This ensures main components are updated before their instances
    textNodes.sort((a, b) => {
      const getParentTypeOrder = (node: SceneNode): number => {
        let current: BaseNode | null = node.parent;
        while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
          if (current.type === 'COMPONENT') return 0;
          if (current.type === 'COMPONENT_SET') return 1;
          if (current.type === 'INSTANCE') return 3;
          current = current.parent;
        }
        return 2;
      };
      return getParentTypeOrder(a) - getParentTypeOrder(b);
    });

    // Step 4: Apply matching styles to text nodes
    const bindings: Array<{
      nodeId: string;
      nodeName: string;
      styleId: string;
      styleName: string;
      fontSize: number;
      snappedFrom?: number; // Original size if snapped to different size
      styleFontSize: number; // The style's actual font size
    }> = [];
    let alreadyStyled = 0;

    // Track skip reasons for diagnostics
    let skippedMixedFontSize = 0;
    let skippedNoMatchingStyle = 0;
    let skippedApplyError = 0;
    const unmatchedSizes = new Map<number, number>(); // fontSize -> count
    const applyErrors: Array<{ nodeId: string; nodeName: string; fontSize: number; error: string }> = [];
    const snappedBindings = new Map<string, number>(); // "40px→36px" -> count

    let _yieldCounter = 0;
    for (const node of textNodes) {
      // Yield every 200 nodes so the plugin thread stays cooperative on large files
      if ((++_yieldCounter % 200) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Skip if already has a text style that actually exists AND is in valid set
      // Skip this check entirely if forceRestyle is true
      if (!forceRestyle && node.textStyleId && typeof node.textStyleId === 'string' && node.textStyleId !== '') {
        // Check if the style actually exists - if not, we should apply a new one
        try {
          const existingStyle = await figma.getStyleByIdAsync(node.textStyleId);
          if (existingStyle) {
            // If validStyleIds is specified, check if style is in the valid set
            if (validStyleIds && !validStyleIds.has(node.textStyleId)) {
              // Style is from an old/invalid set - fall through to rebind
            } else {
              alreadyStyled++;
              continue;
            }
          }
          // Style doesn't exist - fall through to apply a new style
        } catch {
          // Error getting style - fall through to apply a new style
        }
      }

      // Get font size, font family, and font style (handle mixed fonts by using first character)
      let fontSize: number;
      let fontFamily: string;
      let fontStyle: string | undefined;
      try {
        fontSize = typeof node.fontSize === 'number'
          ? Math.round(node.fontSize)
          : Math.round(node.getRangeFontSize(0, 1) as number);
        const nodeFontName = typeof node.fontName === 'object' && 'family' in node.fontName
          ? node.fontName
          : node.getRangeFontName(0, 1) as FontName;
        fontFamily = nodeFontName.family;
        fontStyle = nodeFontName.style;
      } catch {
        skippedMixedFontSize++;
        continue;
      }

      const match = findNearestStyle(fontSize, fontFamily, snapToNearest, fontStyle);

      if (!match) {
        skippedNoMatchingStyle++;
        unmatchedSizes.set(fontSize, (unmatchedSizes.get(fontSize) || 0) + 1);
        continue;
      }

      const { style: matchingStyle, diff: sizeDiff } = match;

      if (!dryRun) {
        try {
          // Must use async API with documentAccess: dynamic-page
          await node.setTextStyleIdAsync(matchingStyle.id);
        } catch (err) {
          skippedApplyError++;
          if (applyErrors.length < 20) {
            applyErrors.push({
              nodeId: node.id,
              nodeName: node.name,
              fontSize,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          continue;
        }
      }

      const styleFontSize = Math.round(matchingStyle.fontSize);

      // Track snapped bindings for summary
      if (sizeDiff > 0) {
        const snapKey = `${fontSize}px→${styleFontSize}px`;
        snappedBindings.set(snapKey, (snappedBindings.get(snapKey) || 0) + 1);
      }

      bindings.push({
        nodeId: node.id,
        nodeName: node.name,
        styleId: matchingStyle.id,
        styleName: matchingStyle.name,
        fontSize,
        snappedFrom: sizeDiff > 0 ? fontSize : undefined, // Track if snapped from different size
        styleFontSize,
      });
    }

    const skipped = skippedMixedFontSize + skippedNoMatchingStyle + skippedApplyError;

    // Build summary by style
    const summary = Array.from(
      bindings.reduce((acc, b) => {
        const key = b.styleName;
        acc.set(key, (acc.get(key) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).map(([styleName, count]) => ({ styleName, count }))
    .sort((a, b) => b.count - a.count);

    // Build unmatched sizes summary (top 10 by count)
    const unmatchedSizesSummary = Array.from(unmatchedSizes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([size, count]) => ({ fontSize: size, count }));

    // Build snapped bindings summary (top 15 by count)
    const snappedSummary = Array.from(snappedBindings.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([snap, count]) => ({ snap, count }));

    const exactMatches = bindings.filter(b => !b.snappedFrom).length;
    const snappedMatches = bindings.filter(b => b.snappedFrom).length;

    return successResult(command.id, {
      data: {
        message: dryRun
          ? `Would apply ${bindings.length} text styles (${exactMatches} exact, ${snappedMatches} snapped)`
          : `Applied ${bindings.length} text styles (${exactMatches} exact, ${snappedMatches} snapped)`,
        scope,
        snapToNearest,
        nodesScanned: textNodes.length,
        applied: bindings.length,
        exactMatches,
        snappedMatches,
        alreadyStyled,
        skipped,
        skipReasons: {
          mixedFontSize: skippedMixedFontSize,
          noMatchingStyle: skippedNoMatchingStyle,
          applyError: skippedApplyError,
        },
        snappedSizes: snappedSummary.length > 0 ? snappedSummary : undefined,
        unmatchedSizes: unmatchedSizesSummary.length > 0 ? unmatchedSizesSummary : undefined,
        applyErrors: applyErrors.length > 0 ? applyErrors : undefined,
        stylesAvailable: styleList.length,
        availableSizes: styleList.map(s => s.size).sort((a, b) => a - b),
        summary,
        bindings: bindings.slice(0, 100), // Limit to first 100 for response size
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Apply matching effect styles to all nodes with effects based on shadow properties
export async function handleApplyMatchingEffectStyles(command: FigmaCommand): Promise<CommandResult> {
  const payload = command.payload as {
    scope?: 'selection' | 'page' | 'file';
    maxNodes?: number;
    dryRun?: boolean;
    validStyleIds?: string[]; // Only keep bindings to these styles - rebind if bound to other styles
    forceRestyle?: boolean; // Force restyle ALL nodes, ignoring existing style bindings entirely
  };

  const scope = payload.scope || 'page';
  const maxNodes = payload.maxNodes || 10000;
  const dryRun = payload.dryRun || false;
  const validStyleIds = payload.validStyleIds ? new Set(payload.validStyleIds) : null;
  const forceRestyle = payload.forceRestyle || false;

  try {
    // Performance optimization: skip invisible instance children
    figma.skipInvisibleInstanceChildren = true;

    // Step 1: Get all effect styles
    const effectStyles = await figma.getLocalEffectStylesAsync();

    if (effectStyles.length === 0) {
      return successResult(command.id, {
        data: {
          message: 'No effect styles found',
          applied: 0,
          skipped: 0,
        },
      });
    }

    // Build signature map for effect matching
    // Signature: type_offsetY_blur (rounded)
    const styleBySignature = new Map<string, EffectStyle>();

    for (const style of effectStyles) {
      if (style.effects.length === 0) continue;

      // Use first effect for signature
      const effect = style.effects[0];
      if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') continue;

      const shadow = effect as DropShadowEffect | InnerShadowEffect;
      const signature = `${shadow.type}_${Math.round(shadow.offset.y)}_${Math.round(shadow.radius)}`;

      // Prefer non-Extracted styles
      const existing = styleBySignature.get(signature);
      if (existing && !existing.name.startsWith('Extracted/') && style.name.startsWith('Extracted/')) continue;

      styleBySignature.set(signature, style);
    }

    // Step 2: Get nodes to process
    let nodesToProcess: SceneNode[] = [];

    if (scope === 'selection') {
      nodesToProcess = [...figma.currentPage.selection];
    } else if (scope === 'page') {
      nodesToProcess = [...figma.currentPage.children];
    } else {
      // file scope - load all pages in PARALLEL for performance
      await Promise.all(figma.root.children.map(page => page.loadAsync()));
      for (const page of figma.root.children) {
        nodesToProcess.push(...page.children);
      }
    }

    // Step 3: Collect all nodes with effects (with depth limit)
    const effectNodes: SceneNode[] = [];
    const MAX_DEPTH = 20; // Prevent stack overflow on deeply nested files

    function collectEffectNodes(nodes: readonly SceneNode[], depth = 0) {
      if (depth > MAX_DEPTH || effectNodes.length >= maxNodes) return;

      for (const node of nodes) {
        if (effectNodes.length >= maxNodes) return;

        if ('effects' in node && (node as BlendMixin).effects.length > 0) {
          effectNodes.push(node);
        }

        if ('children' in node) {
          collectEffectNodes((node as FrameNode | GroupNode).children, depth + 1);
        }
      }
    }

    collectEffectNodes(nodesToProcess, 0);

    // Sort effect nodes by parent type: nodes in COMPONENT parents first, then INSTANCE parents
    effectNodes.sort((a, b) => {
      const getParentTypeOrder = (node: SceneNode): number => {
        let current: BaseNode | null = node.parent;
        while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
          if (current.type === 'COMPONENT') return 0;
          if (current.type === 'COMPONENT_SET') return 1;
          if (current.type === 'INSTANCE') return 3;
          current = current.parent;
        }
        return 2;
      };
      return getParentTypeOrder(a) - getParentTypeOrder(b);
    });

    // Step 4: Apply matching styles
    const bindings: Array<{
      nodeId: string;
      nodeName: string;
      styleId: string;
      styleName: string;
    }> = [];
    let skipped = 0;
    let alreadyStyled = 0;

    let _yieldCounter = 0;
    for (const node of effectNodes) {
      // Yield every 200 nodes so the plugin thread stays cooperative on large files
      if ((++_yieldCounter % 200) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const blendNode = node as BlendMixin;

      // Skip if already has an effect style that actually exists AND is in valid set
      // Skip this check entirely if forceRestyle is true
      if (!forceRestyle && blendNode.effectStyleId && typeof blendNode.effectStyleId === 'string' && blendNode.effectStyleId !== '') {
        // Check if the style actually exists - if not, we should apply a new one
        try {
          const existingStyle = await figma.getStyleByIdAsync(blendNode.effectStyleId);
          if (existingStyle) {
            // If validStyleIds is specified, check if style is in the valid set
            if (validStyleIds && !validStyleIds.has(blendNode.effectStyleId)) {
              // Style is from an old/invalid set - fall through to rebind
            } else {
              alreadyStyled++;
              continue;
            }
          }
          // Style doesn't exist - fall through to apply a new style
        } catch {
          // Error getting style - fall through to apply a new style
        }
      }

      // Get first shadow effect for matching
      const effects = blendNode.effects;
      const shadowEffect = effects.find(e => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW');

      if (!shadowEffect) {
        skipped++;
        continue;
      }

      const shadow = shadowEffect as DropShadowEffect | InnerShadowEffect;
      const signature = `${shadow.type}_${Math.round(shadow.offset.y)}_${Math.round(shadow.radius)}`;

      const matchingStyle = styleBySignature.get(signature);

      if (!matchingStyle) {
        skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          // Must use async API with documentAccess: dynamic-page
          await blendNode.setEffectStyleIdAsync(matchingStyle.id);
        } catch (err) {
          skipped++;
          continue;
        }
      }

      bindings.push({
        nodeId: node.id,
        nodeName: node.name,
        styleId: matchingStyle.id,
        styleName: matchingStyle.name,
      });
    }

    // Build summary
    const summary = Array.from(
      bindings.reduce((acc, b) => {
        const key = b.styleName;
        acc.set(key, (acc.get(key) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).map(([styleName, count]) => ({ styleName, count }))
    .sort((a, b) => b.count - a.count);

    return successResult(command.id, {
      data: {
        message: dryRun
          ? `Would apply ${bindings.length} effect styles`
          : `Applied ${bindings.length} effect styles`,
        scope,
        nodesScanned: effectNodes.length,
        applied: bindings.length,
        alreadyStyled,
        skipped,
        stylesAvailable: styleBySignature.size,
        summary,
        bindings: bindings.slice(0, 100),
      },
    });
  } catch (error) {
    var message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

// Delete styles by type
interface DeleteStylesPayload {
  styleType: 'PAINT' | 'TEXT' | 'EFFECT' | 'GRID' | 'ALL';
  namePattern?: string; // Optional regex pattern to match style names
}

export async function handleDeleteStyles(command: FigmaCommand): Promise<CommandResult> {
  try {
    const payload = command.payload as DeleteStylesPayload;
    const { styleType, namePattern } = payload;

    if (!styleType) {
      return errorResult(command.id, 'Missing styleType. Use PAINT, TEXT, EFFECT, GRID, or ALL');
    }

    const deleted: Array<{ id: string; name: string; type: string }> = [];
    const failed: Array<{ id: string; name: string; error: string }> = [];
    const regex = namePattern ? new RegExp(namePattern) : null;

    // Helper to check if name matches pattern
    const matchesPattern = (name: string): boolean => {
      if (!regex) return true;
      return regex.test(name);
    };

    // Delete paint styles
    if (styleType === 'PAINT' || styleType === 'ALL') {
      const paintStyles = await figma.getLocalPaintStylesAsync();
      for (const style of paintStyles) {
        if (matchesPattern(style.name)) {
          try {
            style.remove();
            deleted.push({ id: style.id, name: style.name, type: 'PAINT' });
          } catch (err) {
            failed.push({ id: style.id, name: style.name, error: err instanceof Error ? err.message : String(err) });
          }
        }
      }
    }

    // Delete text styles
    if (styleType === 'TEXT' || styleType === 'ALL') {
      const textStyles = await figma.getLocalTextStylesAsync();
      for (const style of textStyles) {
        try {
          const styleName = style.name;
          const styleId = style.id;
          if (matchesPattern(styleName)) {
            style.remove();
            deleted.push({ id: styleId, name: styleName, type: 'TEXT' });
          }
        } catch (err) {
          // Style may have been deleted or become invalid - skip it
          failed.push({ id: style.id || 'unknown', name: 'unknown', error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    // Delete effect styles
    if (styleType === 'EFFECT' || styleType === 'ALL') {
      const effectStyles = await figma.getLocalEffectStylesAsync();
      for (const style of effectStyles) {
        try {
          const styleName = style.name;
          const styleId = style.id;
          if (matchesPattern(styleName)) {
            style.remove();
            deleted.push({ id: styleId, name: styleName, type: 'EFFECT' });
          }
        } catch (err) {
          failed.push({ id: style.id || 'unknown', name: 'unknown', error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    // Delete grid styles
    if (styleType === 'GRID' || styleType === 'ALL') {
      const gridStyles = await figma.getLocalGridStylesAsync();
      for (const style of gridStyles) {
        try {
          const styleName = style.name;
          const styleId = style.id;
          if (matchesPattern(styleName)) {
            style.remove();
            deleted.push({ id: styleId, name: styleName, type: 'GRID' });
          }
        } catch (err) {
          failed.push({ id: style.id || 'unknown', name: 'unknown', error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    return successResult(command.id, {
      data: {
        message: `Deleted ${deleted.length} styles${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        styleType,
        namePattern: namePattern || null,
        deleted,
        failed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}

/**
 * Check for conflicts between existing styles and extracted tokens
 * Returns information about styles that would conflict with design system creation
 */
interface CheckStyleConflictsPayload {
  extractedFontSizes?: number[];
  extractedShadows?: Array<{
    type: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
  }>;
}

export async function handleCheckStyleConflicts(command: FigmaCommand): Promise<CommandResult> {
  try {
    const payload = command.payload as CheckStyleConflictsPayload;
    const extractedFontSizes = payload.extractedFontSizes || [];

    // Get existing text styles
    const existingTextStyles = await figma.getLocalTextStylesAsync();
    const existingEffectStyles = await figma.getLocalEffectStylesAsync();

    // Analyze text style conflicts
    const textStyleAnalysis = {
      total: existingTextStyles.length,
      matching: [] as Array<{ name: string; fontSize: number; id: string }>,
      nonMatching: [] as Array<{ name: string; fontSize: number; id: string }>,
    };

    for (const style of existingTextStyles) {
      const styleInfo = {
        name: style.name,
        fontSize: style.fontSize,
        id: style.id,
      };

      if (extractedFontSizes.includes(style.fontSize)) {
        textStyleAnalysis.matching.push(styleInfo);
      } else {
        textStyleAnalysis.nonMatching.push(styleInfo);
      }
    }

    // Analyze effect style conflicts (simpler - just count)
    const effectStyleAnalysis = {
      total: existingEffectStyles.length,
      styles: existingEffectStyles.map(s => ({
        name: s.name,
        id: s.id,
        effectCount: s.effects.length,
      })),
    };

    // Determine recommendations
    const hasTextConflicts = textStyleAnalysis.nonMatching.length > 0 && extractedFontSizes.length > 0;
    const hasExistingTextStyles = existingTextStyles.length > 0;
    const hasExistingEffectStyles = existingEffectStyles.length > 0;

    return successResult(command.id, {
      data: {
        textStyles: textStyleAnalysis,
        effectStyles: effectStyleAnalysis,
        extractedFontSizes,
        recommendations: {
          deleteTextStyles: hasTextConflicts,
          deleteEffectStyles: false, // Effect styles can coexist more easily
          reason: hasTextConflicts
            ? `Found ${textStyleAnalysis.nonMatching.length} text styles with font sizes not in extracted tokens. These may conflict with new styles.`
            : hasExistingTextStyles
            ? `Found ${existingTextStyles.length} existing text styles. Some may have matching names but different properties.`
            : 'No existing text styles found.',
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, message);
  }
}
