// State recovery commands for run_id tagging, orphan cleanup, and node validation

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';

// Plugin data keys used for state recovery
const PLUGIN_DATA_KEYS = {
  RUN_ID: 'btf_run_id',
  STEP: 'btf_step',
  PHASE: 'btf_phase',
  STATUS: 'btf_status',
  CREATED_AT: 'btf_created_at',
} as const;

// Tag a node with run_id metadata
export async function handleTagNode(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    runId: string;
    step?: string;
    phase?: string;
    status?: string;
  };

  if (!command.target) {
    return errorResult(command.id, 'Target node ID is required');
  }

  if (!payload.runId) {
    return errorResult(command.id, 'runId is required');
  }

  var node = await figma.getNodeByIdAsync(command.target);
  if (!node) {
    return errorResult(command.id, 'Node not found: ' + command.target);
  }

  node.setPluginData(PLUGIN_DATA_KEYS.RUN_ID, payload.runId);
  node.setPluginData(PLUGIN_DATA_KEYS.CREATED_AT, new Date().toISOString());

  if (payload.step) {
    node.setPluginData(PLUGIN_DATA_KEYS.STEP, payload.step);
  }
  if (payload.phase) {
    node.setPluginData(PLUGIN_DATA_KEYS.PHASE, payload.phase);
  }
  if (payload.status) {
    node.setPluginData(PLUGIN_DATA_KEYS.STATUS, payload.status);
  }

  return successResult(command.id, {
    data: {
      nodeId: node.id,
      runId: payload.runId,
      tagged: true,
    },
  });
}

// Batch tag multiple nodes with the same run_id
export async function handleBatchTagNodes(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    nodeIds: string[];
    runId: string;
    phase?: string;
    status?: string;
  };

  if (!payload.nodeIds || !Array.isArray(payload.nodeIds) || payload.nodeIds.length === 0) {
    return errorResult(command.id, 'nodeIds array is required');
  }

  if (!payload.runId) {
    return errorResult(command.id, 'runId is required');
  }

  var tagged: string[] = [];
  var failed: string[] = [];
  var timestamp = new Date().toISOString();

  for (var i = 0; i < payload.nodeIds.length; i++) {
    var nodeId = payload.nodeIds[i];
    var node = await figma.getNodeByIdAsync(nodeId);
    if (node) {
      node.setPluginData(PLUGIN_DATA_KEYS.RUN_ID, payload.runId);
      node.setPluginData(PLUGIN_DATA_KEYS.CREATED_AT, timestamp);
      if (payload.phase) {
        node.setPluginData(PLUGIN_DATA_KEYS.PHASE, payload.phase);
      }
      if (payload.status) {
        node.setPluginData(PLUGIN_DATA_KEYS.STATUS, payload.status || 'completed');
      }
      tagged.push(nodeId);
    } else {
      failed.push(nodeId);
    }
  }

  return successResult(command.id, {
    data: {
      tagged: tagged,
      failed: failed,
      runId: payload.runId,
      count: tagged.length,
    },
  });
}

// Find all nodes tagged with a specific run_id
export async function handleFindByPluginData(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    key: string;
    value: string;
    pageOnly?: boolean;
  };

  if (!payload.key) {
    return errorResult(command.id, 'key is required');
  }

  if (!payload.value) {
    return errorResult(command.id, 'value is required');
  }

  var searchRoot: DocumentNode | PageNode = payload.pageOnly
    ? figma.currentPage
    : figma.root;

  var found: Array<{
    nodeId: string;
    name: string;
    type: string;
    pluginData: { [key: string]: string };
  }> = [];

  // Walk all pages - must load them first when searching the full document
  if (searchRoot.type === 'DOCUMENT') {
    await figma.loadAllPagesAsync();
  }
  var pages = searchRoot.type === 'DOCUMENT' ? searchRoot.children : [searchRoot];

  for (var p = 0; p < pages.length; p++) {
    var page = pages[p] as PageNode;

    var matchingNodes = page.findAll((node: SceneNode) => {
      return node.getPluginData(payload.key) === payload.value;
    });

    for (var i = 0; i < matchingNodes.length; i++) {
      var node = matchingNodes[i];
      var keys = node.getPluginDataKeys();
      var data: { [key: string]: string } = {};
      for (var k = 0; k < keys.length; k++) {
        data[keys[k]] = node.getPluginData(keys[k]);
      }
      found.push({
        nodeId: node.id,
        name: node.name,
        type: node.type,
        pluginData: data,
      });
    }
  }

  return successResult(command.id, {
    data: {
      key: payload.key,
      value: payload.value,
      found: found,
      count: found.length,
    },
  });
}

// Rehydrate state — find all nodes for a run_id and reconstruct operation state
export async function handleRehydrateState(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    runId: string;
  };

  if (!payload.runId) {
    return errorResult(command.id, 'runId is required');
  }

  // Find all nodes tagged with this run_id
  var phases: { [phase: string]: Array<{ nodeId: string; name: string; step: string; status: string; createdAt: string }> } = {};
  var allNodeIds: string[] = [];

  await figma.loadAllPagesAsync();
  var pages = figma.root.children;
  for (var p = 0; p < pages.length; p++) {
    var page = pages[p] as PageNode;
    var matchingNodes = page.findAll((node: SceneNode) => {
      return node.getPluginData(PLUGIN_DATA_KEYS.RUN_ID) === payload.runId;
    });

    for (var i = 0; i < matchingNodes.length; i++) {
      var node = matchingNodes[i];
      var phase = node.getPluginData(PLUGIN_DATA_KEYS.PHASE) || 'unknown';
      var step = node.getPluginData(PLUGIN_DATA_KEYS.STEP) || '0';
      var status = node.getPluginData(PLUGIN_DATA_KEYS.STATUS) || 'unknown';
      var createdAt = node.getPluginData(PLUGIN_DATA_KEYS.CREATED_AT) || '';

      if (!phases[phase]) {
        phases[phase] = [];
      }

      phases[phase].push({
        nodeId: node.id,
        name: node.name,
        step: step,
        status: status,
        createdAt: createdAt,
      });

      allNodeIds.push(node.id);
    }
  }

  // Determine resume point
  var resumePhase: string | null = null;
  var resumeStep: string | null = null;

  var phaseNames = Object.keys(phases);
  for (var j = 0; j < phaseNames.length; j++) {
    var phaseName = phaseNames[j];
    var steps = phases[phaseName];
    for (var s = 0; s < steps.length; s++) {
      if (steps[s].status === 'in_progress' || steps[s].status === 'failed') {
        resumePhase = phaseName;
        resumeStep = steps[s].step;
        break;
      }
    }
    if (resumePhase) break;
  }

  return successResult(command.id, {
    data: {
      runId: payload.runId,
      totalNodes: allNodeIds.length,
      nodeIds: allNodeIds,
      phases: phases,
      resumePoint: resumePhase ? { phase: resumePhase, step: resumeStep } : null,
      status: allNodeIds.length === 0
        ? 'not_found'
        : resumePhase
          ? 'incomplete'
          : 'completed',
    },
  });
}

// Cleanup orphaned nodes from a failed run
export async function handleCleanupOrphans(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    runId: string;
    dryRun?: boolean;
  };

  if (!payload.runId) {
    return errorResult(command.id, 'runId is required');
  }

  var toDelete: Array<{ nodeId: string; name: string; type: string }> = [];

  await figma.loadAllPagesAsync();
  var pages = figma.root.children;
  for (var p = 0; p < pages.length; p++) {
    var page = pages[p] as PageNode;
    var matchingNodes = page.findAll((node: SceneNode) => {
      return node.getPluginData(PLUGIN_DATA_KEYS.RUN_ID) === payload.runId;
    });

    for (var i = 0; i < matchingNodes.length; i++) {
      var node = matchingNodes[i];
      toDelete.push({
        nodeId: node.id,
        name: node.name,
        type: node.type,
      });
    }
  }

  if (payload.dryRun) {
    return successResult(command.id, {
      data: {
        runId: payload.runId,
        dryRun: true,
        wouldDelete: toDelete,
        count: toDelete.length,
      },
    });
  }

  // Actually delete
  var deleted: string[] = [];
  var deleteFailed: string[] = [];

  for (var d = 0; d < toDelete.length; d++) {
    var nodeToDelete = await figma.getNodeByIdAsync(toDelete[d].nodeId);
    if (nodeToDelete && nodeToDelete.type !== 'DOCUMENT' && nodeToDelete.type !== 'PAGE') {
      try {
        (nodeToDelete as SceneNode).remove();
        deleted.push(toDelete[d].nodeId);
      } catch (_e) {
        deleteFailed.push(toDelete[d].nodeId);
      }
    }
  }

  return successResult(command.id, {
    data: {
      runId: payload.runId,
      deleted: deleted,
      failed: deleteFailed,
      count: deleted.length,
    },
  });
}

// Validate that nodes exist and match expected properties
export async function handleValidateNodes(command: FigmaCommand): Promise<CommandResult> {
  var payload = command.payload as {
    expectations: Array<{
      nodeId: string;
      name?: string;
      type?: string;
      childCount?: number;
      hasAutoLayout?: boolean;
      hasFills?: boolean;
      hasBoundVariables?: boolean;
    }>;
  };

  if (!payload.expectations || !Array.isArray(payload.expectations) || payload.expectations.length === 0) {
    return errorResult(command.id, 'expectations array is required');
  }

  var results: Array<{
    nodeId: string;
    exists: boolean;
    passed: boolean;
    failures: string[];
    actual: { [key: string]: unknown };
  }> = [];

  var allPassed = true;

  for (var i = 0; i < payload.expectations.length; i++) {
    var expect = payload.expectations[i];
    var node = await figma.getNodeByIdAsync(expect.nodeId);

    if (!node) {
      results.push({
        nodeId: expect.nodeId,
        exists: false,
        passed: false,
        failures: ['Node does not exist'],
        actual: {},
      });
      allPassed = false;
      continue;
    }

    var failures: string[] = [];
    var actual: { [key: string]: unknown } = {
      name: node.name,
      type: node.type,
    };

    if (expect.name && node.name !== expect.name) {
      failures.push('Name mismatch: expected "' + expect.name + '", got "' + node.name + '"');
    }

    if (expect.type && node.type !== expect.type) {
      failures.push('Type mismatch: expected "' + expect.type + '", got "' + node.type + '"');
    }

    if (expect.childCount !== undefined && 'children' in node) {
      var childNode = node as SceneNode & ChildrenMixin;
      actual.childCount = childNode.children.length;
      if (childNode.children.length !== expect.childCount) {
        failures.push('Child count mismatch: expected ' + expect.childCount + ', got ' + childNode.children.length);
      }
    }

    if (expect.hasAutoLayout && 'layoutMode' in node) {
      var layoutNode = node as FrameNode;
      actual.layoutMode = layoutNode.layoutMode;
      if (layoutNode.layoutMode === 'NONE') {
        failures.push('Expected auto-layout but layoutMode is NONE');
      }
    }

    if (expect.hasFills && 'fills' in node) {
      var fillNode = node as SceneNode & GeometryMixin;
      var fills = fillNode.fills as readonly Paint[];
      actual.fillCount = fills.length;
      if (fills.length === 0) {
        failures.push('Expected fills but node has none');
      }
    }

    if (expect.hasBoundVariables && 'boundVariables' in node) {
      var bvNode = node as SceneNode & { boundVariables: { [key: string]: unknown } };
      var boundKeys = Object.keys(bvNode.boundVariables || {});
      actual.boundVariableCount = boundKeys.length;
      if (boundKeys.length === 0) {
        failures.push('Expected bound variables but node has none');
      }
    }

    if (failures.length > 0) allPassed = false;

    results.push({
      nodeId: expect.nodeId,
      exists: true,
      passed: failures.length === 0,
      failures: failures,
      actual: actual,
    });
  }

  return successResult(command.id, {
    data: {
      allPassed: allPassed,
      totalChecked: results.length,
      totalPassed: results.filter(function (r) { return r.passed; }).length,
      totalFailed: results.filter(function (r) { return !r.passed; }).length,
      results: results,
    },
  });
}
