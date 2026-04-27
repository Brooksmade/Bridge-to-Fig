import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
// Sticky color map - FigJam sticky colors with their RGB values
const STICKY_COLORS = {
  'YELLOW': { r: 1, g: 0.85, b: 0.4 },
  'BLUE': { r: 0.53, g: 0.77, b: 1 },
  'VIOLET': { r: 0.83, g: 0.67, b: 1 },
  'GREEN': { r: 0.6, g: 0.95, b: 0.6 },
  'RED': { r: 1, g: 0.6, b: 0.6 },
  'LIGHT_GRAY': { r: 0.9, g: 0.9, b: 0.9 },
  'ORANGE': { r: 1, g: 0.75, b: 0.5 },
  'PINK': { r: 1, g: 0.7, b: 0.85 },
};

// Create a node from SVG string
export async function handleCreateFromSvg(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    svg: string;
    name?: string;
    x?: number;
    y?: number;
    parent?: string;
  };

  if (!payload.svg) {
    return errorResult(command.id, 'SVG string is required');
  }

  try {
    var node = figma.createNodeFromSvg(payload.svg);

    if (payload.name) {
      node.name = payload.name;
    }

    if (payload.x !== undefined) node.x = payload.x;
    if (payload.y !== undefined) node.y = payload.y;

    // Move to parent if specified
    if (payload.parent) {
      var parentNode = await figma.getNodeByIdAsync(payload.parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(node);
      }
    }

    return successResult(command.id, {
      data: {
        id: node.id,
        name: node.name,
        type: node.type,
        width: node.width,
        height: node.height,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create from SVG: ' + message);
  }
}

// Create a section
export async function handleCreateSection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
  };

  try {
    var section = figma.createSection();

    if (payload && typeof payload.name === 'string') {
      section.name = payload.name;
    }

    if (payload && payload.x !== undefined) section.x = payload.x;
    if (payload && payload.y !== undefined) section.y = payload.y;

    if (payload && payload.width && payload.height) {
      section.resizeWithoutConstraints(payload.width, payload.height);
    }

    // Set fill color if provided
    if (payload && payload.fillColor) {
      var hex = payload.fillColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;

      section.fills = [{
        type: 'SOLID',
        color: { r: r, g: g, b: b },
      }];
    }

    return successResult(command.id, {
      data: {
        id: section.id,
        name: section.name,
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create section: ' + message);
  }
}

// Wrap existing nodes in a Section — mirrors Figma's "Section from selection".
// Creates a section, reparents the given node IDs into it, and lets Figma
// auto-fit the section bounds to enclose the children.
export async function handleWrapInSection(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeIds?: string[];
    name?: string;
    fillColor?: string;
  };

  if (!payload || !payload.nodeIds || !Array.isArray(payload.nodeIds) || payload.nodeIds.length === 0) {
    return errorResult(command.id, 'wrapInSection requires payload.nodeIds: string[] (one or more node IDs)');
  }

  try {
    // Resolve all nodes up front; bail if any are missing so we never create
    // a half-empty section. Must use the async API — manifest declares
    // documentAccess: dynamic-page, where sync getNodeById throws.
    var nodes: SceneNode[] = [];
    var missing: string[] = [];
    for (var i = 0; i < payload.nodeIds.length; i++) {
      var n = await figma.getNodeByIdAsync(payload.nodeIds[i]);
      if (n && 'parent' in n) {
        nodes.push(n as SceneNode);
      } else {
        missing.push(payload.nodeIds[i]);
      }
    }
    if (missing.length > 0) {
      return errorResult(command.id, 'wrapInSection: node(s) not found: ' + missing.join(', '));
    }

    // Sections must live on a page — find the page that owns the first node
    // and create the section there. Children that live on a different page
    // would be invalid input; reject early rather than silently moving them.
    var firstParent = nodes[0].parent;
    while (firstParent && firstParent.type !== 'PAGE') {
      firstParent = (firstParent as BaseNode & ChildrenMixin).parent;
    }
    if (!firstParent || firstParent.type !== 'PAGE') {
      return errorResult(command.id, 'wrapInSection: could not resolve a page for the given nodes');
    }
    var page = firstParent as PageNode;

    var section = figma.createSection();
    if (typeof payload.name === 'string') section.name = payload.name;

    // Place the section on the page first so appendChild reparents correctly.
    page.appendChild(section);

    // Reparent each node — Figma auto-resizes the section to contain children.
    for (var j = 0; j < nodes.length; j++) {
      section.appendChild(nodes[j]);
    }

    if (payload.fillColor) {
      var hex = payload.fillColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;
      section.fills = [{ type: 'SOLID', color: { r: r, g: g, b: b } }];
    }

    return successResult(command.id, {
      data: {
        id: section.id,
        name: section.name,
        x: section.x,
        y: section.y,
        width: section.width,
        height: section.height,
        wrappedNodeIds: payload.nodeIds,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to wrap in section: ' + message);
  }
}

// Create a slice (for exports)
export async function handleCreateSlice(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };

  try {
    var slice = figma.createSlice();

    if (payload && payload.name) {
      slice.name = payload.name;
    }

    if (payload && payload.x !== undefined) slice.x = payload.x;
    if (payload && payload.y !== undefined) slice.y = payload.y;

    if (payload && payload.width && payload.height) {
      slice.resize(payload.width, payload.height);
    }

    return successResult(command.id, {
      data: {
        id: slice.id,
        name: slice.name,
        x: slice.x,
        y: slice.y,
        width: slice.width,
        height: slice.height,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create slice: ' + message);
  }
}

// Helper to parse hex color
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  var cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) / 255,
    g: parseInt(cleanHex.substring(2, 4), 16) / 255,
    b: parseInt(cleanHex.substring(4, 6), 16) / 255,
  };
}

// Helper to check if color needs light text (is dark background)
function needsLightText(r: number, g: number, b: number): boolean {
  // Using relative luminance formula (WCAG)
  var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.5;
}

// Helper to set cell text color for contrast
async function setCellTextColor(cell: TableCellNode, fillRgb: { r: number; g: number; b: number }) {
  // Must load font before modifying text fills
  await figma.loadFontAsync(cell.text.fontName as FontName);

  if (needsLightText(fillRgb.r, fillRgb.g, fillRgb.b)) {
    cell.text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White text
  } else {
    cell.text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]; // Dark text
  }
}

// Create a table (FigJam)
export async function handleCreateTable(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    rows?: number;
    columns?: number;
    x?: number;
    y?: number;
    cellData?: string[][];           // Optional initial cell data as 2D array
    headerRowColor?: string;         // Fill color for header row (row 0)
    featureColumnColor?: string;     // Fill color for first column (column 0)
    rowColors?: { [row: number]: string }; // Fill colors for specific rows
  };

  try {
    var rows = (payload && payload.rows) || 3;
    var columns = (payload && payload.columns) || 3;

    var table = figma.createTable(rows, columns);

    if (payload && payload.x !== undefined) table.x = payload.x;
    if (payload && payload.y !== undefined) table.y = payload.y;

    // Load the font first (using the default font from first cell)
    await figma.loadFontAsync(table.cellAt(0, 0).text.fontName as FontName);

    // Populate cells with initial data if provided
    if (payload && payload.cellData && payload.cellData.length > 0) {
      for (var r = 0; r < payload.cellData.length && r < rows; r++) {
        var rowData = payload.cellData[r];
        for (var c = 0; c < rowData.length && c < columns; c++) {
          table.cellAt(r, c).text.characters = rowData[c];
        }
      }
    }

    // Apply header row color with auto text contrast
    if (payload && payload.headerRowColor) {
      var headerRgb = hexToRgb(payload.headerRowColor);
      var headerFill: Paint = { type: 'SOLID', color: headerRgb };
      for (var col = 0; col < columns; col++) {
        var cell = table.cellAt(0, col);
        cell.fills = [headerFill];
        await setCellTextColor(cell, headerRgb);
      }
    }

    // Apply feature column color with auto text contrast (skip header row if headerRowColor is set)
    if (payload && payload.featureColumnColor) {
      var featureRgb = hexToRgb(payload.featureColumnColor);
      var featureFill: Paint = { type: 'SOLID', color: featureRgb };
      var startRow = payload.headerRowColor ? 1 : 0;
      for (var row = startRow; row < rows; row++) {
        var cell = table.cellAt(row, 0);
        cell.fills = [featureFill];
        await setCellTextColor(cell, featureRgb);
      }
    }

    // Apply specific row colors with auto text contrast
    if (payload && payload.rowColors) {
      for (var rowIndexStr in payload.rowColors) {
        var rowIndex = parseInt(rowIndexStr);
        if (rowIndex >= 0 && rowIndex < rows) {
          var rowRgb = hexToRgb(payload.rowColors[rowIndex]);
          var rowFill: Paint = { type: 'SOLID', color: rowRgb };
          for (var col = 0; col < columns; col++) {
            var cell = table.cellAt(rowIndex, col);
            cell.fills = [rowFill];
            await setCellTextColor(cell, rowRgb);
          }
        }
      }
    }

    return successResult(command.id, {
      data: {
        id: table.id,
        name: table.name,
        numRows: table.numRows,
        numColumns: table.numColumns,
        x: table.x,
        y: table.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create table: ' + message);
  }
}

// Set text content of a table cell
export async function handleSetTableCell(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    tableId: string;
    row: number;
    column: number;
    text: string;
  };

  if (!payload || !payload.tableId) {
    return errorResult(command.id, 'Table ID is required');
  }
  if (payload.row === undefined || payload.column === undefined) {
    return errorResult(command.id, 'Row and column indices are required');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.tableId);
    if (!node || node.type !== 'TABLE') {
      return errorResult(command.id, 'Node is not a table');
    }

    var table = node as TableNode;

    if (payload.row < 0 || payload.row >= table.numRows) {
      return errorResult(command.id, `Row index ${payload.row} out of bounds (0-${table.numRows - 1})`);
    }
    if (payload.column < 0 || payload.column >= table.numColumns) {
      return errorResult(command.id, `Column index ${payload.column} out of bounds (0-${table.numColumns - 1})`);
    }

    var cell = table.cellAt(payload.row, payload.column);

    // Load font before setting text
    await figma.loadFontAsync(cell.text.fontName as FontName);
    cell.text.characters = payload.text || '';

    return successResult(command.id, {
      data: {
        tableId: table.id,
        row: payload.row,
        column: payload.column,
        text: cell.text.characters,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set table cell: ' + message);
  }
}

// Style a table row (set fill color for all cells in a row)
export async function handleStyleTableRow(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    tableId: string;
    row: number;
    fillColor: string;
  };

  if (!payload || !payload.tableId) {
    return errorResult(command.id, 'Table ID is required');
  }
  if (payload.row === undefined) {
    return errorResult(command.id, 'Row index is required');
  }
  if (!payload.fillColor) {
    return errorResult(command.id, 'Fill color is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.tableId);
    if (!node || node.type !== 'TABLE') {
      return errorResult(command.id, 'Node is not a table');
    }

    var table = node as TableNode;

    if (payload.row < 0 || payload.row >= table.numRows) {
      return errorResult(command.id, `Row index ${payload.row} out of bounds (0-${table.numRows - 1})`);
    }

    // Parse hex color
    var hex = payload.fillColor.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;

    var fill: Paint = {
      type: 'SOLID',
      color: { r, g, b },
    };

    // Load font for text color changes
    await figma.loadFontAsync(table.cellAt(payload.row, 0).text.fontName as FontName);

    // Apply fill and auto text contrast to all cells in the row
    for (var col = 0; col < table.numColumns; col++) {
      var cell = table.cellAt(payload.row, col);
      cell.fills = [fill];
      await setCellTextColor(cell, { r, g, b });
    }

    return successResult(command.id, {
      data: {
        tableId: table.id,
        row: payload.row,
        fillColor: payload.fillColor,
        cellsStyled: table.numColumns,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to style table row: ' + message);
  }
}

// Style a table cell (set fill color)
export async function handleStyleTableCell(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    tableId: string;
    row: number;
    column: number;
    fillColor: string;
  };

  if (!payload || !payload.tableId) {
    return errorResult(command.id, 'Table ID is required');
  }
  if (payload.row === undefined || payload.column === undefined) {
    return errorResult(command.id, 'Row and column indices are required');
  }
  if (!payload.fillColor) {
    return errorResult(command.id, 'Fill color is required');
  }

  try {
    var node = await figma.getNodeByIdAsync(payload.tableId);
    if (!node || node.type !== 'TABLE') {
      return errorResult(command.id, 'Node is not a table');
    }

    var table = node as TableNode;

    if (payload.row < 0 || payload.row >= table.numRows) {
      return errorResult(command.id, `Row index ${payload.row} out of bounds (0-${table.numRows - 1})`);
    }
    if (payload.column < 0 || payload.column >= table.numColumns) {
      return errorResult(command.id, `Column index ${payload.column} out of bounds (0-${table.numColumns - 1})`);
    }

    // Parse hex color
    var hex = payload.fillColor.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16) / 255;
    var g = parseInt(hex.substring(2, 4), 16) / 255;
    var b = parseInt(hex.substring(4, 6), 16) / 255;

    var cell = table.cellAt(payload.row, payload.column);

    // Load font for text color changes
    await figma.loadFontAsync(cell.text.fontName as FontName);

    cell.fills = [{
      type: 'SOLID',
      color: { r, g, b },
    }];

    // Auto text contrast
    await setCellTextColor(cell, { r, g, b });

    return successResult(command.id, {
      data: {
        tableId: table.id,
        row: payload.row,
        column: payload.column,
        fillColor: payload.fillColor,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to style table cell: ' + message);
  }
}

// Create a sticky note (FigJam)
export async function handleCreateSticky(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    text?: string;
    x?: number;
    y?: number;
    color?: 'YELLOW' | 'BLUE' | 'VIOLET' | 'GREEN' | 'RED' | 'LIGHT_GRAY' | 'ORANGE' | 'PINK';
    fillColor?: string; // Alternative: hex color
  };

  try {
    var sticky = figma.createSticky();

    if (payload && payload.text) {
      await figma.loadFontAsync(sticky.text.fontName as FontName);
      sticky.text.characters = payload.text;
    }

    if (payload && payload.x !== undefined) sticky.x = payload.x;
    if (payload && payload.y !== undefined) sticky.y = payload.y;

    // Set sticky color using fills (StickyNode uses MinimalFillsMixin)
    if (payload && payload.color && STICKY_COLORS[payload.color]) {
      var stickyColor = STICKY_COLORS[payload.color];
      sticky.fills = [{
        type: 'SOLID',
        color: stickyColor,
      }];
      sticky.authorVisible = false;
    } else if (payload && payload.fillColor) {
      // Support hex color as alternative
      var hex = payload.fillColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;
      sticky.fills = [{
        type: 'SOLID',
        color: { r: r, g: g, b: b },
      }];
      sticky.authorVisible = false;
    }

    return successResult(command.id, {
      data: {
        id: sticky.id,
        name: sticky.name,
        text: sticky.text.characters,
        x: sticky.x,
        y: sticky.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create sticky: ' + message);
  }
}

// Create a connector (FigJam)
export async function handleCreateConnector(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    startNodeId?: string;
    endNodeId?: string;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    startMagnet?: 'AUTO' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
    endMagnet?: 'AUTO' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
    strokeColor?: string;
    connectorLineType?: 'ELBOWED' | 'STRAIGHT' | 'CURVED';
    connectorStartStrokeCap?: 'NONE' | 'ARROW_EQUILATERAL' | 'ARROW_LINES' | 'TRIANGLE_FILLED' | 'DIAMOND_FILLED' | 'CIRCLE_FILLED';
    connectorEndStrokeCap?: 'NONE' | 'ARROW_EQUILATERAL' | 'ARROW_LINES' | 'TRIANGLE_FILLED' | 'DIAMOND_FILLED' | 'CIRCLE_FILLED';
  };

  try {
    var connector = figma.createConnector();

    // Set connector line type (ELBOWED, STRAIGHT, CURVED)
    if (payload && payload.connectorLineType) {
      connector.connectorLineType = payload.connectorLineType;
    }

    // Determine magnet positions (default to AUTO)
    var startMagnet = (payload && payload.startMagnet) || 'AUTO';
    var endMagnet = (payload && payload.endMagnet) || 'AUTO';

    // Connect to nodes if specified
    if (payload && payload.startNodeId) {
      var startNode = await figma.getNodeByIdAsync(payload.startNodeId);
      if (startNode && 'x' in startNode) {
        connector.connectorStart = {
          endpointNodeId: startNode.id,
          magnet: startMagnet,
        };
      }
    } else if (payload && payload.startX !== undefined && payload.startY !== undefined) {
      connector.connectorStart = {
        position: { x: payload.startX, y: payload.startY },
      };
    }

    if (payload && payload.endNodeId) {
      var endNode = await figma.getNodeByIdAsync(payload.endNodeId);
      if (endNode && 'x' in endNode) {
        connector.connectorEnd = {
          endpointNodeId: endNode.id,
          magnet: endMagnet,
        };
      }
    } else if (payload && payload.endX !== undefined && payload.endY !== undefined) {
      connector.connectorEnd = {
        position: { x: payload.endX, y: payload.endY },
      };
    }

    // Set stroke caps (arrow styles)
    if (payload && payload.connectorStartStrokeCap) {
      connector.connectorStartStrokeCap = payload.connectorStartStrokeCap;
    }
    if (payload && payload.connectorEndStrokeCap) {
      connector.connectorEndStrokeCap = payload.connectorEndStrokeCap;
    }

    // Set stroke color if provided
    if (payload && payload.strokeColor) {
      var hex = payload.strokeColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;

      connector.strokes = [{
        type: 'SOLID',
        color: { r: r, g: g, b: b },
      }];
    }

    return successResult(command.id, {
      data: {
        id: connector.id,
        name: connector.name,
        connectorLineType: connector.connectorLineType,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create connector: ' + message);
  }
}

// Helper function to parse hex color to RGB
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  var cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) / 255,
    g: parseInt(cleanHex.substring(2, 4), 16) / 255,
    b: parseInt(cleanHex.substring(4, 6), 16) / 255,
  };
}

// Helper function to determine if a color is dark (for auto text color)
function isColorDark(r: number, g: number, b: number): boolean {
  // Using relative luminance formula
  var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 0.5;
}

// Create a shape with text (FigJam)
export async function handleCreateShapeWithText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    text?: string;
    shapeType?: 'SQUARE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE' | 'DIAMOND' | 'TRIANGLE_UP' | 'TRIANGLE_DOWN' | 'PARALLELOGRAM_RIGHT' | 'PARALLELOGRAM_LEFT' | 'ENG_DATABASE' | 'ENG_QUEUE' | 'ENG_FILE' | 'ENG_FOLDER';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    textColor?: string;      // Hex color for text, or 'auto' for automatic contrast
    fontSize?: number;       // Font size in pixels
    strokeColor?: string;    // Hex color for stroke/outline
    strokeWeight?: number;   // Stroke width (default: 0 = no stroke)
  };

  try {
    var shape = figma.createShapeWithText();

    if (payload && payload.shapeType) {
      shape.shapeType = payload.shapeType;
    }

    if (payload && payload.text) {
      await figma.loadFontAsync(shape.text.fontName as FontName);
      shape.text.characters = payload.text;
    }

    if (payload && payload.x !== undefined) shape.x = payload.x;
    if (payload && payload.y !== undefined) shape.y = payload.y;

    // Resize if width and height are provided
    if (payload && payload.width !== undefined && payload.height !== undefined) {
      shape.resize(payload.width, payload.height);
    }

    // Set fill color if provided
    var fillRgb = { r: 1, g: 1, b: 1 }; // Default white
    if (payload && payload.fillColor) {
      fillRgb = parseHexColor(payload.fillColor);
      shape.fills = [{
        type: 'SOLID',
        color: fillRgb,
      }];
    }

    // Set text color (auto-contrast or explicit)
    if (payload && payload.text) {
      if (payload.textColor === 'auto' || (!payload.textColor && payload.fillColor)) {
        // Auto-select contrasting text color based on fill
        var textRgb = isColorDark(fillRgb.r, fillRgb.g, fillRgb.b)
          ? { r: 1, g: 1, b: 1 }      // White text on dark background
          : { r: 0.2, g: 0.2, b: 0.2 }; // Dark gray text on light background
        shape.text.fills = [{ type: 'SOLID', color: textRgb }];
      } else if (payload.textColor) {
        var textRgb = parseHexColor(payload.textColor);
        shape.text.fills = [{ type: 'SOLID', color: textRgb }];
      }
    }

    // Set font size if provided
    if (payload && payload.fontSize && payload.text) {
      shape.text.fontSize = payload.fontSize;
    }

    // Set stroke if provided (only add stroke if explicitly requested)
    if (payload && payload.strokeColor) {
      var strokeRgb = parseHexColor(payload.strokeColor);
      shape.strokes = [{
        type: 'SOLID',
        color: strokeRgb,
      }];
      shape.strokeWeight = payload.strokeWeight || 1;
    } else {
      // No stroke by default
      shape.strokes = [];
    }

    return successResult(command.id, {
      data: {
        id: shape.id,
        name: shape.name,
        text: shape.text.characters,
        shapeType: shape.shapeType,
        x: shape.x,
        y: shape.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create shape with text: ' + message);
  }
}

// Create a code block (Dev Mode)
export async function handleCreateCodeBlock(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    code?: string;
    language?: string;
    x?: number;
    y?: number;
  };

  try {
    var codeBlock = figma.createCodeBlock();

    if (payload && payload.code) {
      codeBlock.code = payload.code;
    }

    if (payload && payload.language) {
      codeBlock.codeLanguage = payload.language as typeof codeBlock.codeLanguage;
    }

    if (payload && payload.x !== undefined) codeBlock.x = payload.x;
    if (payload && payload.y !== undefined) codeBlock.y = payload.y;

    return successResult(command.id, {
      data: {
        id: codeBlock.id,
        name: codeBlock.name,
        code: codeBlock.code,
        language: codeBlock.codeLanguage,
        x: codeBlock.x,
        y: codeBlock.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create code block: ' + message);
  }
}

// Measure text dimensions before creating shapes
export async function handleMeasureText(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    text: string;
    fontSize?: number;
    fontFamily?: string;
    fontStyle?: string;
  };

  if (!payload || !payload.text) {
    return errorResult(command.id, 'Text is required for measurement');
  }

  try {
    var fontFamily = payload.fontFamily || 'Inter';
    var fontStyle = payload.fontStyle || 'Regular';
    var fontSize = payload.fontSize || 14;

    // Load the font first
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

    // Create a temporary text node for measurement
    var tempText = figma.createText();
    tempText.fontName = { family: fontFamily, style: fontStyle };
    tempText.fontSize = fontSize;
    tempText.characters = payload.text;

    // Get the measured dimensions
    var width = tempText.width;
    var height = tempText.height;

    // Clean up the temporary node
    tempText.remove();

    return successResult(command.id, {
      data: {
        width: width,
        height: height,
        text: payload.text,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontStyle: fontStyle,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to measure text: ' + message);
  }
}

// Create a highlight (FigJam)
export async function handleCreateHighlight(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    x?: number;
    y?: number;
    parent?: string;
  };

  try {
    if (typeof (figma as any).createHighlight !== 'function') {
      return errorResult(command.id, 'createHighlight is not available in this Figma version (FigJam only)');
    }

    var highlight = (figma as any).createHighlight();

    if (payload) {
      if (payload.x !== undefined) highlight.x = payload.x;
      if (payload.y !== undefined) highlight.y = payload.y;

      if (payload.parent) {
        var parentNode = await figma.getNodeByIdAsync(payload.parent);
        if (parentNode && 'appendChild' in parentNode) {
          (parentNode as FrameNode).appendChild(highlight);
        }
      }
    }

    return successResult(command.id, {
      data: {
        id: highlight.id,
        name: highlight.name,
        x: highlight.x,
        y: highlight.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create highlight: ' + message);
  }
}

// Create a stamp (FigJam)
export async function handleCreateStamp(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    stampType?: string;
    x?: number;
    y?: number;
    parent?: string;
  };

  try {
    if (typeof (figma as any).createStamp !== 'function') {
      return errorResult(command.id, 'createStamp is not available in this Figma version (FigJam only)');
    }

    var stamp = (figma as any).createStamp();

    if (payload) {
      if (payload.x !== undefined) stamp.x = payload.x;
      if (payload.y !== undefined) stamp.y = payload.y;

      if (payload.parent) {
        var parentNode = await figma.getNodeByIdAsync(payload.parent);
        if (parentNode && 'appendChild' in parentNode) {
          (parentNode as FrameNode).appendChild(stamp);
        }
      }
    }

    return successResult(command.id, {
      data: {
        id: stamp.id,
        name: stamp.name,
        x: stamp.x,
        y: stamp.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create stamp: ' + message);
  }
}

// Create washi tape (FigJam decorative connector)
export async function handleCreateWashiTape(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    connectorStartNodeId?: string;
    connectorEndNodeId?: string;
    startMagnet?: 'AUTO' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
    endMagnet?: 'AUTO' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  };

  try {
    if (typeof (figma as any).createWashiTape !== 'function') {
      return errorResult(command.id, 'createWashiTape is not available in this Figma version (FigJam only)');
    }

    var washiTape = (figma as any).createWashiTape();

    if (payload) {
      var startMagnet = (payload.startMagnet) || 'AUTO';
      var endMagnet = (payload.endMagnet) || 'AUTO';

      if (payload.connectorStartNodeId) {
        var startNode = await figma.getNodeByIdAsync(payload.connectorStartNodeId);
        if (startNode && 'x' in startNode) {
          washiTape.connectorStart = {
            endpointNodeId: startNode.id,
            magnet: startMagnet,
          };
        }
      }

      if (payload.connectorEndNodeId) {
        var endNode = await figma.getNodeByIdAsync(payload.connectorEndNodeId);
        if (endNode && 'x' in endNode) {
          washiTape.connectorEnd = {
            endpointNodeId: endNode.id,
            magnet: endMagnet,
          };
        }
      }
    }

    return successResult(command.id, {
      data: {
        id: washiTape.id,
        name: washiTape.name,
        x: washiTape.x,
        y: washiTape.y,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create washi tape: ' + message);
  }
}

// Create an embed (URL embed in FigJam)
export async function handleCreateEmbed(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    url: string;
    x?: number;
    y?: number;
    parent?: string;
  };

  if (!payload || !payload.url) {
    return errorResult(command.id, 'url is required');
  }

  try {
    if (typeof (figma as any).createEmbedAsync !== 'function') {
      return errorResult(command.id, 'createEmbedAsync is not available in this Figma version (FigJam only)');
    }

    var embed = await (figma as any).createEmbedAsync(payload.url);

    if (payload.x !== undefined) embed.x = payload.x;
    if (payload.y !== undefined) embed.y = payload.y;

    if (payload.parent) {
      var parentNode = await figma.getNodeByIdAsync(payload.parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(embed);
      }
    }

    return successResult(command.id, {
      data: {
        id: embed.id,
        name: embed.name,
        type: embed.type,
        x: embed.x,
        y: embed.y,
        width: embed.width,
        height: embed.height,
        url: payload.url,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create embed: ' + message);
  }
}

