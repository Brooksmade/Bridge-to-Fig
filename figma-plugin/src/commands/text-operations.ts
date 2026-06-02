// Text range and advanced text operations

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Set font for a text range
export async function handleSetRangeFont(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    fontFamily: string;
    fontStyle?: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.fontFamily) {
    return errorResult(command.id, 'fontFamily is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;
  var style = payload.fontStyle || 'Regular';

  try {
    await figma.loadFontAsync({ family: payload.fontFamily, style: style });
    textNode.setRangeFontName(start, end, { family: payload.fontFamily, style: style });

    return successResult(command.id, {
      data: {
        nodeId: textNode.id,
        start: start,
        end: end,
        fontFamily: payload.fontFamily,
        fontStyle: style,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set font: ' + message);
  }
}

// Set font size for a text range
export async function handleSetRangeFontSize(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    fontSize: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.fontSize) {
    return errorResult(command.id, 'fontSize is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  // Load font first
  var fontName = textNode.getRangeFontName(start, end);
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
  }

  textNode.setRangeFontSize(start, end, payload.fontSize);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      fontSize: payload.fontSize,
    },
  });
}

// Set text color for a range
export async function handleSetRangeColor(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    color: string;
    opacity?: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.color) {
    return errorResult(command.id, 'color is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  // Parse color
  var hex = payload.color.replace('#', '');
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;

  var fill: SolidPaint = {
    type: 'SOLID',
    color: { r: r, g: g, b: b },
    opacity: payload.opacity !== undefined ? payload.opacity : 1,
  };

  textNode.setRangeFills(start, end, [fill]);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      color: payload.color,
    },
  });
}

// Set text decoration for a range
export async function handleSetRangeTextDecoration(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    decoration: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  textNode.setRangeTextDecoration(start, end, payload.decoration || 'NONE');

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      decoration: payload.decoration,
    },
  });
}

// Set text case for a range
export async function handleSetRangeTextCase(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    textCase: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  textNode.setRangeTextCase(start, end, payload.textCase || 'ORIGINAL');

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      textCase: payload.textCase,
    },
  });
}

// Set line height for a range
export async function handleSetRangeLineHeight(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    lineHeight: number | { value: number; unit: 'PIXELS' | 'PERCENT' } | 'AUTO';
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  var lineHeight: LineHeight;
  if (payload.lineHeight === 'AUTO') {
    lineHeight = { unit: 'AUTO' };
  } else if (typeof payload.lineHeight === 'number') {
    lineHeight = { unit: 'PIXELS', value: payload.lineHeight };
  } else {
    lineHeight = { unit: payload.lineHeight.unit, value: payload.lineHeight.value };
  }

  textNode.setRangeLineHeight(start, end, lineHeight);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      lineHeight: lineHeight,
    },
  });
}

// Set letter spacing for a range
export async function handleSetRangeLetterSpacing(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    letterSpacing: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  var letterSpacing: LetterSpacing;
  if (typeof payload.letterSpacing === 'number') {
    letterSpacing = { unit: 'PIXELS', value: payload.letterSpacing };
  } else {
    letterSpacing = { unit: payload.letterSpacing.unit, value: payload.letterSpacing.value };
  }

  textNode.setRangeLetterSpacing(start, end, letterSpacing);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      letterSpacing: letterSpacing,
    },
  });
}

// Insert text at a position
export async function handleInsertText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    text: string;
    position?: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.text) {
    return errorResult(command.id, 'text is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var position = payload.position !== undefined ? payload.position : textNode.characters.length;

  // Load font
  var fontName = textNode.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
  }

  textNode.insertCharacters(position, payload.text);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      insertedAt: position,
      text: payload.text,
      newLength: textNode.characters.length,
    },
  });
}

// Delete text in a range
export async function handleDeleteText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start: number;
    end: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (payload.start === undefined || payload.end === undefined) {
    return errorResult(command.id, 'start and end are required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;

  // Load font
  var fontName = textNode.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
  }

  textNode.deleteCharacters(payload.start, payload.end);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      deletedFrom: payload.start,
      deletedTo: payload.end,
      newLength: textNode.characters.length,
    },
  });
}

// Get text range styles
export async function handleGetRangeStyles(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  var fontName = textNode.getRangeFontName(start, end);
  var fontSize = textNode.getRangeFontSize(start, end);
  var fontWeight = textNode.getRangeFontWeight(start, end);
  var textDecoration = textNode.getRangeTextDecoration(start, end);
  var textCase = textNode.getRangeTextCase(start, end);
  var lineHeight = textNode.getRangeLineHeight(start, end);
  var letterSpacing = textNode.getRangeLetterSpacing(start, end);
  var fills = textNode.getRangeFills(start, end);

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      characters: textNode.characters.substring(start, end),
      fontName: fontName !== figma.mixed ? fontName : 'mixed',
      fontSize: fontSize !== figma.mixed ? fontSize : 'mixed',
      fontWeight: fontWeight !== figma.mixed ? fontWeight : 'mixed',
      textDecoration: textDecoration !== figma.mixed ? textDecoration : 'mixed',
      textCase: textCase !== figma.mixed ? textCase : 'mixed',
      lineHeight: lineHeight !== figma.mixed ? lineHeight : 'mixed',
      letterSpacing: letterSpacing !== figma.mixed ? letterSpacing : 'mixed',
      fills: fills !== figma.mixed ? fills : 'mixed',
    },
  });
}

// Set a hyperlink on a text range.
// The destination can be an external URL (payload.url) OR another node in the
// same file (payload.nodeId), which makes it an in-file navigation link. The
// text node to operate on comes from command.target. Dispatched as both
// `setTextHyperlink` and `setRangeHyperlink`.
export async function handleSetTextHyperlink(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    start?: number;
    end?: number;
    url?: string;
    nodeId?: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node || node.type !== 'TEXT') {
    return errorResult(command.id, 'Node must be a TEXT node');
  }

  if (!payload || (!payload.url && !payload.nodeId)) {
    return errorResult(command.id, 'Either url or nodeId (link destination) is required');
  }

  var textNode = node as TextNode;
  var start = payload.start || 0;
  var end = payload.end !== undefined ? payload.end : textNode.characters.length;

  var hyperlink: HyperlinkTarget | null = null;

  if (payload.url) {
    hyperlink = { type: 'URL', value: payload.url };
  } else if (payload.nodeId) {
    hyperlink = { type: 'NODE', value: payload.nodeId };
  }

  try {
    // Setting a hyperlink writes to the range's styling, so every font used in
    // the range must be loaded first or Figma throws "font is not loaded".
    var fonts = textNode.getRangeAllFontNames(start, end);
    for (var i = 0; i < fonts.length; i++) {
      await figma.loadFontAsync(fonts[i]);
    }

    textNode.setRangeHyperlink(start, end, hyperlink);
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set hyperlink: ' + message);
  }

  return successResult(command.id, {
    data: {
      nodeId: textNode.id,
      start: start,
      end: end,
      hyperlink: hyperlink,
    },
  });
}
