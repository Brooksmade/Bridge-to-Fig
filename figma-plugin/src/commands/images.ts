import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Create an image from base64 data
export async function handleCreateImage(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    data: string; // base64 encoded image data
    name?: string;
    x?: number;
    y?: number;
    parent?: string;
  };

  if (!payload.data) {
    return errorResult(command.id, 'Image data (base64) is required');
  }

  try {
    // Decode base64 to Uint8Array
    var bytes: Uint8Array;
    if (typeof figma.base64Decode === 'function') {
      var decoded = figma.base64Decode(payload.data);
      // figma.base64Decode returns Uint8Array in modern API
      if (decoded instanceof Uint8Array) {
        bytes = decoded;
      } else {
        // Fallback: treat as string
        var str = decoded as unknown as string;
        bytes = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
          bytes[i] = str.charCodeAt(i);
        }
      }
    } else {
      // Fallback using standard atob
      var binaryString = atob(payload.data);
      bytes = new Uint8Array(binaryString.length);
      for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    }

    // Create the image
    var image = figma.createImage(bytes);

    // Create a rectangle to hold the image
    var rect = figma.createRectangle();
    rect.name = payload.name || 'Image';

    // Get image dimensions
    var size = await image.getSizeAsync();
    rect.resize(size.width, size.height);

    // Set position
    if (payload.x !== undefined) rect.x = payload.x;
    if (payload.y !== undefined) rect.y = payload.y;

    // Apply image as fill
    rect.fills = [{
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FILL',
    }];

    // Move to parent if specified
    if (payload.parent) {
      var parentNode = await figma.getNodeByIdAsync(payload.parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(rect);
      }
    }

    return successResult(command.id, {
      data: {
        id: rect.id,
        name: rect.name,
        width: size.width,
        height: size.height,
        imageHash: image.hash,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create image: ' + message);
  }
}

// Create image from URL
export async function handleCreateImageFromUrl(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    url: string;
    name?: string;
    x?: number;
    y?: number;
    parent?: string;
  };

  if (!payload.url) {
    return errorResult(command.id, 'Image URL is required');
  }

  try {
    // Fetch the image
    var response = await fetch(payload.url);
    if (!response.ok) {
      return errorResult(command.id, 'Failed to fetch image: ' + response.status);
    }

    var arrayBuffer = await response.arrayBuffer();
    var bytes = new Uint8Array(arrayBuffer);

    // Create the image
    var image = figma.createImage(bytes);

    // Create a rectangle to hold the image
    var rect = figma.createRectangle();
    rect.name = payload.name || 'Image';

    // Get image dimensions
    var size = await image.getSizeAsync();
    rect.resize(size.width, size.height);

    // Set position
    if (payload.x !== undefined) rect.x = payload.x;
    if (payload.y !== undefined) rect.y = payload.y;

    // Apply image as fill
    rect.fills = [{
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FILL',
    }];

    // Move to parent if specified
    if (payload.parent) {
      var parentNode = await figma.getNodeByIdAsync(payload.parent);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as FrameNode).appendChild(rect);
      }
    }

    return successResult(command.id, {
      data: {
        id: rect.id,
        name: rect.name,
        width: size.width,
        height: size.height,
        imageHash: image.hash,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to create image from URL: ' + message);
  }
}

// Get image data from a node
export async function handleGetImageData(command: FigmaCommand): Promise<CommandResult> {
  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('fills' in node)) {
    return errorResult(command.id, 'Node does not support fills');
  }

  var fills = (node as GeometryMixin).fills;
  if (fills === figma.mixed) {
    return errorResult(command.id, 'Node has mixed fills');
  }

  var images: object[] = [];

  for (var i = 0; i < fills.length; i++) {
    var fill = fills[i];
    if (fill.type === 'IMAGE' && fill.imageHash) {
      var image = figma.getImageByHash(fill.imageHash);
      if (image) {
        var size = await image.getSizeAsync();
        var bytes = await image.getBytesAsync();
        var base64 = figma.base64Encode(bytes);

        images.push({
          hash: fill.imageHash,
          width: size.width,
          height: size.height,
          scaleMode: fill.scaleMode,
          base64: base64,
        });
      }
    }
  }

  return successResult(command.id, {
    data: {
      nodeId: node.id,
      imageCount: images.length,
      images: images,
    },
  });
}

// Replace image in a node
export async function handleReplaceImage(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    data?: string; // base64
    url?: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.data && !payload.url) {
    return errorResult(command.id, 'Either data (base64) or url is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (!('fills' in node)) {
    return errorResult(command.id, 'Node does not support fills');
  }

  try {
    var bytes: Uint8Array;

    if (payload.url) {
      var response = await fetch(payload.url);
      if (!response.ok) {
        return errorResult(command.id, 'Failed to fetch image: ' + response.status);
      }
      var arrayBuffer = await response.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
    } else {
      if (typeof figma.base64Decode === 'function') {
        var decoded = figma.base64Decode(payload.data!);
        if (decoded instanceof Uint8Array) {
          bytes = decoded;
        } else {
          var str = decoded as unknown as string;
          bytes = new Uint8Array(str.length);
          for (var j2 = 0; j2 < str.length; j2++) {
            bytes[j2] = str.charCodeAt(j2);
          }
        }
      } else {
        var binaryString = atob(payload.data!);
        bytes = new Uint8Array(binaryString.length);
        for (var j2 = 0; j2 < binaryString.length; j2++) {
          bytes[j2] = binaryString.charCodeAt(j2);
        }
      }
    }

    var image = figma.createImage(bytes);
    var sceneNode = node as SceneNode & GeometryMixin;

    // Replace image fills
    var fills = sceneNode.fills;
    if (fills !== figma.mixed) {
      var newFills: Paint[] = [];
      for (var j = 0; j < fills.length; j++) {
        var fill = fills[j];
        if (fill.type === 'IMAGE') {
          newFills.push({
            type: 'IMAGE',
            imageHash: image.hash,
            scaleMode: fill.scaleMode,
            visible: fill.visible,
            opacity: fill.opacity,
          } as ImagePaint);
        } else {
          newFills.push(fill);
        }
      }
      sceneNode.fills = newFills;
    }

    return successResult(command.id, {
      data: {
        nodeId: node.id,
        imageHash: image.hash,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to replace image: ' + message);
  }
}
