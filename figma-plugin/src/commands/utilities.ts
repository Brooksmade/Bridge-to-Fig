import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Show a notification
export async function handleNotify(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    message: string;
    timeout?: number;
    error?: boolean;
  };

  if (!payload.message) {
    return errorResult(command.id, 'Message is required');
  }

  var options: NotificationOptions = {};

  if (payload.timeout !== undefined) {
    options.timeout = payload.timeout;
  }

  if (payload.error) {
    options.error = true;
  }

  figma.notify(payload.message, options);

  return successResult(command.id, {
    data: {
      notified: true,
      message: payload.message,
    },
  });
}

// Commit undo state
export async function handleCommitUndo(command: FigmaCommand): Promise<CommandResult> {
  figma.commitUndo();

  return successResult(command.id, {
    data: {
      committed: true,
    },
  });
}

// Trigger undo
export async function handleTriggerUndo(command: FigmaCommand): Promise<CommandResult> {
  figma.triggerUndo();

  return successResult(command.id, {
    data: {
      undone: true,
    },
  });
}

// Save to version history.
// `figma.saveVersionHistoryAsync` is a private-plugin API. The Community build cannot set
// `enablePrivatePluginApi`, so the call is unavailable there — fail with a clear message instead of
// a confusing runtime TypeError. See docs/community-build.md.
export async function handleSaveVersion(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    title?: string;
    description?: string;
  };

  if (typeof (figma as { saveVersionHistoryAsync?: unknown }).saveVersionHistoryAsync !== 'function') {
    return errorResult(
      command.id,
      'saveVersion is unavailable in the published plugin. Figma restricts version-history writes to plugins published privately inside an organization. Save a version manually, or run Bridge to Fig as a local development plugin.'
    );
  }

  try {
    await figma.saveVersionHistoryAsync(
      (payload && payload.title) || '',
      payload && payload.description ? payload.description : undefined
    );

    return successResult(command.id, {
      data: {
        saved: true,
        title: payload && payload.title,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to save version: ' + message);
  }
}

// Get current user info
export async function handleGetCurrentUser(command: FigmaCommand): Promise<CommandResult> {
  var user = figma.currentUser;

  if (!user) {
    return successResult(command.id, {
      data: {
        user: null,
      },
    });
  }

  return successResult(command.id, {
    data: {
      user: {
        id: user.id,
        name: user.name,
        photoUrl: user.photoUrl,
        color: user.color,
        sessionId: user.sessionId,
      },
    },
  });
}

// Get active users in the file
export async function handleGetActiveUsers(command: FigmaCommand): Promise<CommandResult> {
  var users = figma.activeUsers;

  var userList: object[] = [];
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    userList.push({
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      color: user.color,
      sessionId: user.sessionId,
    });
  }

  return successResult(command.id, {
    data: {
      count: userList.length,
      users: userList,
    },
  });
}

// Get file info.
// `figma.fileKey` is a private-plugin API and is undefined in the published Community build, by
// design — Figma treats the file key as sensitive. `fileKeyAvailable` lets callers tell "no key"
// apart from "key is null", so an agent can ask the user to paste the file link instead of
// silently assuming it is in the wrong file.
export async function handleGetFileInfo(command: FigmaCommand): Promise<CommandResult> {
  var fileKey = (figma as { fileKey?: string }).fileKey ?? null;

  return successResult(command.id, {
    data: {
      fileKey: fileKey,
      fileKeyAvailable: fileKey !== null,
      editorType: figma.editorType,
      apiVersion: figma.apiVersion,
      pluginId: figma.pluginId,
      mode: figma.mode,
    },
  });
}

// Open external URL (will prompt user)
export async function handleOpenExternal(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    url: string;
  };

  if (!payload.url) {
    return errorResult(command.id, 'URL is required');
  }

  try {
    await figma.openExternal(payload.url);

    return successResult(command.id, {
      data: {
        opened: true,
        url: payload.url,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to open URL: ' + message);
  }
}

// Get/Set file thumbnail.
// Both thumbnail APIs are private-plugin APIs, unavailable in the published Community build.
// See docs/community-build.md.
var THUMBNAIL_UNAVAILABLE =
  'File thumbnail commands are unavailable in the published plugin. Figma restricts them to plugins published privately inside an organization. Set the thumbnail manually (right-click a frame › Set as thumbnail), or run Bridge to Fig as a local development plugin.';

export async function handleGetFileThumbnail(command: FigmaCommand): Promise<CommandResult> {
  if (typeof (figma as { getFileThumbnailNodeAsync?: unknown }).getFileThumbnailNodeAsync !== 'function') {
    return errorResult(command.id, THUMBNAIL_UNAVAILABLE);
  }

  try {
    var thumbnailNode = await figma.getFileThumbnailNodeAsync();

    if (!thumbnailNode) {
      return successResult(command.id, {
        data: {
          hasThumbnail: false,
          nodeId: null,
        },
      });
    }

    return successResult(command.id, {
      data: {
        hasThumbnail: true,
        nodeId: thumbnailNode.id,
        nodeName: thumbnailNode.name,
        nodeType: thumbnailNode.type,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to get thumbnail: ' + message);
  }
}

export async function handleSetFileThumbnail(command: FigmaCommand): Promise<CommandResult> {
  if (typeof (figma as { setFileThumbnailNodeAsync?: unknown }).setFileThumbnailNodeAsync !== 'function') {
    return errorResult(command.id, THUMBNAIL_UNAVAILABLE);
  }

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found');
  }

  if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
    return errorResult(command.id, 'Cannot use document or page as thumbnail');
  }

  try {
    await figma.setFileThumbnailNodeAsync(node as FrameNode | ComponentNode | ComponentSetNode | SectionNode);

    return successResult(command.id, {
      data: {
        set: true,
        nodeId: node.id,
        nodeName: node.name,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to set thumbnail: ' + message);
  }
}

// Base64 encode/decode utilities
export async function handleBase64Encode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    data: string;
  };

  if (!payload.data) {
    return errorResult(command.id, 'Data is required');
  }

  var encoded = figma.base64Encode(payload.data as unknown as Uint8Array);

  return successResult(command.id, {
    data: {
      encoded: encoded,
    },
  });
}

export async function handleBase64Decode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    data: string;
  };

  if (!payload.data) {
    return errorResult(command.id, 'Data is required');
  }

  try {
    var decoded = figma.base64Decode(payload.data);

    return successResult(command.id, {
      data: {
        decoded: decoded,
      },
    });
  } catch (err) {
    var message = err instanceof Error ? err.message : String(err);
    return errorResult(command.id, 'Failed to decode: ' + message);
  }
}
