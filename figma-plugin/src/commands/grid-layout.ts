// Grid auto-layout commands (layoutMode: 'GRID').
// Figma added CSS-grid-style auto layout in late 2025 (plugin API v1.120 / v1.126). The legacy
// setAutoLayout only understands HORIZONTAL/VERTICAL, so grid gets its own handlers here.

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

function resolveTargetId(command: FigmaCommand): string | undefined {
  const payload = command.payload as Record<string, any> | undefined;
  return command.target || payload?.nodeId;
}

type GridFrame = FrameNode & {
  gridRowCount: number;
  gridColumnCount: number;
  gridRowGap: number;
  gridColumnGap: number;
  gridRowSizes: Array<{ value?: number; type: 'FLEX' | 'FIXED' | 'HUG' }>;
  gridColumnSizes: Array<{ value?: number; type: 'FLEX' | 'FIXED' | 'HUG' }>;
  gridAutoTracks: 'NONE' | 'ROWS';
  gridItemsPositioning: 'MANUAL' | 'ROW_AUTO_FLOW';
  reorderRows: (o: { fromIndices: number[]; insertionIndex: number }) => ReadonlyArray<{ from: number; to: number }>;
  reorderColumns: (o: { fromIndices: number[]; insertionIndex: number }) => ReadonlyArray<{ from: number; to: number }>;
};

function isGridCapable(node: BaseNode): boolean {
  return 'gridColumnCount' in node;
}

function serializeTracks(tracks: Array<{ value?: number; type: string }>): Array<{ index: number; type: string; value?: number }> {
  var out: Array<{ index: number; type: string; value?: number }> = [];
  for (var i = 0; i < tracks.length; i++) {
    out.push({ index: i, type: tracks[i].type, value: tracks[i].value });
  }
  return out;
}

// Set a frame to grid auto-layout and configure its tracks.
export async function handleSetGridLayout(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    rows?: number; // alias for rowCount
    columns?: number; // alias for columnCount
    rowCount?: number;
    columnCount?: number;
    rowGap?: number;
    columnGap?: number;
    gap?: number; // shorthand for both gaps
    autoTracks?: 'NONE' | 'ROWS';
    itemsPositioning?: 'MANUAL' | 'ROW_AUTO_FLOW';
    // Track sizing: arrays aligned to row/column index. Each: {type:'FLEX'|'FIXED'|'HUG', value?:number}
    rowSizes?: Array<{ type: 'FLEX' | 'FIXED' | 'HUG'; value?: number }>;
    columnSizes?: Array<{ type: 'FLEX' | 'FIXED' | 'HUG'; value?: number }>;
  };

  var targetId = resolveTargetId(command);
  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required (use "target" field or "payload.nodeId")');
  }

  var node = await figma.getNodeByIdAsync(targetId);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    return errorResult(command.id, 'Node must be a frame, component, or instance');
  }
  if (!isGridCapable(node)) {
    return errorResult(
      command.id,
      'Grid auto-layout is not supported by this Figma client version. Update the Figma desktop app.'
    );
  }

  var frame = node as GridFrame;
  frame.layoutMode = 'GRID' as any;

  // Auto tracks must be set before row/column counts (counts throw when the matching axis is auto-managed).
  if (payload.autoTracks !== undefined) frame.gridAutoTracks = payload.autoTracks;

  var rowCount = payload.rowCount ?? payload.rows;
  var columnCount = payload.columnCount ?? payload.columns;
  // Guard: setting gridRowCount throws when gridAutoTracks === 'ROWS'.
  if (columnCount !== undefined) frame.gridColumnCount = columnCount;
  if (rowCount !== undefined && frame.gridAutoTracks !== 'ROWS') frame.gridRowCount = rowCount;

  if (payload.gap !== undefined) {
    frame.gridRowGap = payload.gap;
    frame.gridColumnGap = payload.gap;
  }
  if (payload.rowGap !== undefined) frame.gridRowGap = payload.rowGap;
  if (payload.columnGap !== undefined) frame.gridColumnGap = payload.columnGap;

  if (payload.itemsPositioning !== undefined) frame.gridItemsPositioning = payload.itemsPositioning;

  // Apply track sizes by mutating the GridTrackSize objects the API returns.
  if (payload.rowSizes) {
    for (var r = 0; r < payload.rowSizes.length && r < frame.gridRowSizes.length; r++) {
      frame.gridRowSizes[r].type = payload.rowSizes[r].type;
      if (payload.rowSizes[r].value !== undefined) frame.gridRowSizes[r].value = payload.rowSizes[r].value;
    }
  }
  if (payload.columnSizes) {
    for (var c = 0; c < payload.columnSizes.length && c < frame.gridColumnSizes.length; c++) {
      frame.gridColumnSizes[c].type = payload.columnSizes[c].type;
      if (payload.columnSizes[c].value !== undefined) frame.gridColumnSizes[c].value = payload.columnSizes[c].value;
    }
  }

  return successResult(command.id, {
    data: {
      nodeId: frame.id,
      layoutMode: frame.layoutMode,
      gridRowCount: frame.gridRowCount,
      gridColumnCount: frame.gridColumnCount,
      gridRowGap: frame.gridRowGap,
      gridColumnGap: frame.gridColumnGap,
      gridAutoTracks: frame.gridAutoTracks,
      gridItemsPositioning: frame.gridItemsPositioning,
      rowSizes: serializeTracks(frame.gridRowSizes),
      columnSizes: serializeTracks(frame.gridColumnSizes),
    },
  });
}

// Read grid layout configuration.
export async function handleGetGridLayout(command: FigmaCommand): Promise<CommandResult> {
  var targetId = resolveTargetId(command);
  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required (use "target" field or "payload.nodeId")');
  }
  var node = await figma.getNodeByIdAsync(targetId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (!isGridCapable(node)) {
    return errorResult(command.id, 'Node does not support grid auto-layout');
  }
  var frame = node as GridFrame;
  if (frame.layoutMode !== ('GRID' as any)) {
    return successResult(command.id, {
      data: { nodeId: frame.id, layoutMode: frame.layoutMode, isGrid: false },
    });
  }
  return successResult(command.id, {
    data: {
      nodeId: frame.id,
      isGrid: true,
      gridRowCount: frame.gridRowCount,
      gridColumnCount: frame.gridColumnCount,
      gridRowGap: frame.gridRowGap,
      gridColumnGap: frame.gridColumnGap,
      gridAutoTracks: frame.gridAutoTracks,
      gridItemsPositioning: frame.gridItemsPositioning,
      rowSizes: serializeTracks(frame.gridRowSizes),
      columnSizes: serializeTracks(frame.gridColumnSizes),
    },
  });
}

// Place a child within its parent grid, and set span / alignment.
export async function handleSetGridChildPosition(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    row?: number; // rowIndex
    column?: number; // columnIndex
    rowIndex?: number;
    columnIndex?: number;
    rowSpan?: number;
    columnSpan?: number;
    horizontalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
    verticalAlign?: 'MIN' | 'CENTER' | 'MAX' | 'AUTO';
  };

  var targetId = resolveTargetId(command);
  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required (use "target" field or "payload.nodeId")');
  }
  var node = await figma.getNodeByIdAsync(targetId);
  if (!node) return errorResult(command.id, 'Node not found');

  var child = node as SceneNode & {
    setGridChildPosition?: (r: number, c: number) => void;
    gridRowSpan?: number;
    gridColumnSpan?: number;
    gridChildHorizontalAlign?: string;
    gridChildVerticalAlign?: string;
    gridRowAnchorIndex?: number;
    gridColumnAnchorIndex?: number;
  };

  if (typeof child.setGridChildPosition !== 'function') {
    return errorResult(
      command.id,
      'Node is not a child of a grid frame (or this Figma client lacks grid support)'
    );
  }

  var rowIndex = payload.rowIndex ?? payload.row;
  var columnIndex = payload.columnIndex ?? payload.column;
  if (rowIndex !== undefined && columnIndex !== undefined) {
    child.setGridChildPosition(rowIndex, columnIndex);
  }
  if (payload.rowSpan !== undefined) child.gridRowSpan = payload.rowSpan;
  if (payload.columnSpan !== undefined) child.gridColumnSpan = payload.columnSpan;
  if (payload.horizontalAlign !== undefined) child.gridChildHorizontalAlign = payload.horizontalAlign;
  if (payload.verticalAlign !== undefined) child.gridChildVerticalAlign = payload.verticalAlign;

  return successResult(command.id, {
    data: {
      nodeId: child.id,
      gridRowAnchorIndex: child.gridRowAnchorIndex,
      gridColumnAnchorIndex: child.gridColumnAnchorIndex,
      gridRowSpan: child.gridRowSpan,
      gridColumnSpan: child.gridColumnSpan,
      gridChildHorizontalAlign: child.gridChildHorizontalAlign,
      gridChildVerticalAlign: child.gridChildVerticalAlign,
    },
  });
}

// Reorder grid rows or columns.
export async function handleReorderGridTracks(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeId?: string;
    axis: 'ROWS' | 'COLUMNS';
    fromIndices: number[];
    insertionIndex: number;
  };

  var targetId = resolveTargetId(command);
  if (!targetId) {
    return errorResult(command.id, 'Target node ID is required (use "target" field or "payload.nodeId")');
  }
  if (!payload.axis || !payload.fromIndices || payload.insertionIndex === undefined) {
    return errorResult(command.id, 'axis, fromIndices, and insertionIndex are required');
  }
  var node = await figma.getNodeByIdAsync(targetId);
  if (!node) return errorResult(command.id, 'Node not found');
  if (!isGridCapable(node)) {
    return errorResult(command.id, 'Node does not support grid auto-layout');
  }
  var frame = node as GridFrame;
  var opts = { fromIndices: payload.fromIndices, insertionIndex: payload.insertionIndex };
  var moves =
    payload.axis === 'ROWS' ? frame.reorderRows(opts) : frame.reorderColumns(opts);

  return successResult(command.id, {
    data: { nodeId: frame.id, axis: payload.axis, moves: moves },
  });
}
