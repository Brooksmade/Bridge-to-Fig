import { vi } from 'vitest';

let nodeIdCounter = 0;

export interface MockNodeOptions {
  id?: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: any[];
  strokes?: any[];
  guides?: any[];
  annotations?: any[];
  reactions?: any[];
  vectorNetwork?: any;
  vectorPaths?: any[];
  [key: string]: any;
}

export function createMockNode(options: MockNodeOptions = {}): any {
  nodeIdCounter++;
  const node: any = {
    id: options.id || `mock-node-${nodeIdCounter}`,
    name: options.name || `Node ${nodeIdCounter}`,
    type: options.type || 'FRAME',
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 100,
    height: options.height ?? 100,
    fills: options.fills ?? [],
    strokes: options.strokes ?? [],
    opacity: 1,
    visible: true,
    locked: false,
    appendChild: vi.fn(),
    resize: vi.fn(function (w: number, h: number) {
      node.width = w;
      node.height = h;
    }),
    remove: vi.fn(),
  };

  // Add guides support for PAGE/FRAME
  if (options.type === 'PAGE' || options.type === 'FRAME' || !options.type) {
    node.guides = options.guides ?? [];
  }

  // Add annotations support
  if (options.annotations !== undefined || options.type !== 'PAGE') {
    node.annotations = options.annotations ?? [];
  }

  // Add reactions support
  if (options.reactions !== undefined) {
    node.reactions = options.reactions;
    node.setReactionsAsync = vi.fn();
  }

  // Add vector support
  if (options.type === 'VECTOR') {
    node.vectorNetwork = options.vectorNetwork ?? { vertices: [], segments: [], regions: [] };
    node.vectorPaths = options.vectorPaths ?? [];
  }

  // Add overlay support for frames
  if (options.type === 'FRAME' || options.type === 'COMPONENT') {
    node.overlayPositionType = options.overlayPositionType ?? 'CENTER';
    node.overlayBackground = options.overlayBackground ?? { type: 'NONE' };
    node.overlayBackgroundInteraction = options.overlayBackgroundInteraction ?? 'NONE';
  }

  // Spread any additional properties
  for (const [key, value] of Object.entries(options)) {
    if (!(key in node)) {
      node[key] = value;
    }
  }

  return node;
}

export function createMockFigma(nodeRegistry?: Map<string, any>): any {
  const registry = nodeRegistry || new Map<string, any>();

  const currentPage = createMockNode({
    id: 'page-1',
    name: 'Page 1',
    type: 'PAGE',
    guides: [],
  });

  const mockFigma: any = {
    currentPage,

    getNodeByIdAsync: vi.fn(async (id: string) => {
      return registry.get(id) || null;
    }),

    // Frame/Node creation
    createFrame: vi.fn(() => {
      const frame = createMockNode({ type: 'FRAME' });
      return frame;
    }),

    createConnector: vi.fn(() => {
      const connector = createMockNode({ type: 'CONNECTOR' });
      connector.connectorStart = {};
      connector.connectorEnd = {};
      connector.connectorLineType = 'ELBOWED';
      return connector;
    }),

    // FigJam creation
    createSticky: vi.fn(() => {
      const sticky = createMockNode({ type: 'STICKY', name: 'Sticky' });
      sticky.text = { fontName: { family: 'Inter', style: 'Regular' }, characters: '' };
      sticky.authorVisible = true;
      return sticky;
    }),

    createHighlight: vi.fn(() => {
      return createMockNode({ type: 'HIGHLIGHT', name: 'Highlight' });
    }),

    createStamp: vi.fn(() => {
      return createMockNode({ type: 'STAMP', name: 'Stamp' });
    }),

    createWashiTape: vi.fn(() => {
      const tape = createMockNode({ type: 'WASHI_TAPE', name: 'Washi Tape' });
      tape.connectorStart = {};
      tape.connectorEnd = {};
      return tape;
    }),

    createEmbedAsync: vi.fn(async (url: string) => {
      return createMockNode({ type: 'EMBED', name: 'Embed' });
    }),

    // Font loading
    loadFontAsync: vi.fn(),

    // Annotation categories
    getAnnotationCategoriesAsync: vi.fn(async () => []),
    getAnnotationCategoryByIdAsync: vi.fn(async () => null),
  };

  // Helper to register nodes in the registry
  mockFigma._registerNode = (node: any) => {
    registry.set(node.id, node);
  };

  return mockFigma;
}

export function registerNode(node: any): void {
  const figmaGlobal = (globalThis as any).figma;
  if (figmaGlobal && figmaGlobal._registerNode) {
    figmaGlobal._registerNode(node);
  }
}

export function resetNodeCounter(): void {
  nodeIdCounter = 0;
}
