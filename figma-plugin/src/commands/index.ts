// Export all command types
export * from './types';

// Export command handlers
export { handleCreate, handleBatchCreate, handleCreateInstance } from './create';
export {
  handleModify,
  handleBatchModify,
  handleMove,
  handleResize,
  handleReparent,
} from './modify';
export {
  handleDelete,
  handleBatchDelete,
  handleDeleteChildren,
  handleDeleteSelection,
} from './delete';
export {
  handleQuery,
  handleGetFrames,
  handleGetViewport,
  handleSetViewport,
  handleSelect,
  handleSetPage,
} from './query';
export {
  handleGroup,
  handleUngroup,
  handleFlatten,
  handleClone,
  handleBooleanOperation,
} from './group';
export {
  handleCreateVariableCollection,
  handleEditVariableCollection,
  handleDeleteVariableCollection,
  handleCreateVariable,
  handleEditVariable,
  handleBatchEditVariable,
  handleDeleteVariable,
  handleBindVariable,
  handleBindFillVariable,
  handleBindStrokeVariable,
  handleInspectFills,
  handleUnbindVariable,
  handleGetVariables,
  handleExportTokens,
  handleImportTokens,
  handleCreateBoilerplate,
  handleBindMatchingColors,
  handleReplaceColorsByMapping,
  handleRebindVariables,
  handleAutoBindByRole,
  handleBindByExtractedUsage,
  handleAutoBindSpacing,
} from './variables';
export {
  handleCreatePaintStyle,
  handleCreateTextStyle,
  handleCreateTextStyleWithVariables,
  handleBindTextStyleVariable,
  handleCreateEffectStyle,
  handleEditStyle,
  handleDeleteStyle,
  handleApplyStyle,
  handleDetachStyle,
  handleGetStyles,
  handleApplyMatchingTextStyles,
  handleApplyMatchingEffectStyles,
  handleDeleteStyles,
  handleCheckStyleConflicts,
} from './styles';
export {
  handleCreateComponent,
  handleCreateComponentSet,
  handleAddVariant,
  handleEditComponentProperties,
  handleSetComponentPropertyReferences,
  handleGetComponentPropertyDefinitions,
  handleGetComponents,
} from './components';
export {
  handleEditInstanceText,
  handleOverrideInstanceFills,
  handleOverrideInstanceStrokes,
  handleOverrideInstanceEffects,
  handleResetOverrides,
  handleSwapInstance,
  handleDetachInstance,
} from './instances';
export {
  handleGetNodeColors,
  handleAnalyzeColors,
} from './colors';
export {
  handleExtractDesignTokens,
} from './extract-tokens';
export {
  handleCreateDesignSystem,
  handleValidateDesignSystem,
  handleGetDesignSystemStatus,
  handleGetOrganizingPrinciples,
  handleBindDocumentationVariables,
  handleCreateTypographyStyles,
  handleCreateStateCollection,
  handleCreateComponentSizeCollection,
  handleCreateScreenSizeCollection,
} from './design-system';
export {
  handleCreatePage,
  handleDeletePage,
  handleRenamePage,
  handleDuplicatePage,
  handleLoadAllPages,
} from './pages';
export {
  handleListFonts,
  handleLoadFont,
  handleCheckMissingFonts,
  handleGetUsedFonts,
} from './fonts';
export {
  handleCreateImage,
  handleCreateImageFromUrl,
  handleGetImageData,
  handleReplaceImage,
} from './images';
export {
  handleExportNode,
  handleBatchExport,
  handleGetExportSettings,
  handleSetExportSettings,
} from './export';
export {
  handleNotify,
  handleCommitUndo,
  handleTriggerUndo,
  handleSaveVersion,
  handleGetCurrentUser,
  handleGetActiveUsers,
  handleGetFileInfo,
  handleOpenExternal,
  handleGetFileThumbnail,
  handleSetFileThumbnail,
  handleBase64Encode,
  handleBase64Decode,
} from './utilities';
export {
  handleCreateFromSvg,
  handleCreateSection,
  handleWrapInSection,
  handleCreateSlice,
  handleCreateTable,
  handleSetTableCell,
  handleStyleTableRow,
  handleStyleTableCell,
  handleCreateSticky,
  handleCreateConnector,
  handleCreateShapeWithText,
  handleCreateCodeBlock,
  handleMeasureText,
  handleCreateHighlight,
  handleCreateStamp,
  handleCreateWashiTape,
  handleCreateEmbed,
} from './advanced-nodes';
export {
  handleCreateGridStyle,
  handleGetGridStyles,
  handleApplyGridStyle,
} from './styles';
export {
  handleSetAutoLayout,
  handleGetAutoLayout,
  handleSetLayoutChild,
  handleSetConstraints,
  handleGetConstraints,
  handleSetSizeConstraints,
  handleInferAutoLayout,
} from './layout';
export {
  handleSetRangeFont,
  handleSetRangeFontSize,
  handleSetRangeColor,
  handleSetRangeTextDecoration,
  handleSetRangeTextCase,
  handleSetRangeLineHeight,
  handleSetRangeLetterSpacing,
  handleInsertText,
  handleDeleteText,
  handleGetRangeStyles,
  handleSetTextHyperlink,
} from './text-operations';
export {
  handleSetBlendMode,
  handleSetOpacity,
  handleSetVisible,
  handleSetLocked,
  handleSetClipsContent,
  handleSetCornerRadius,
  handleSetMask,
  handleSetEffects,
  handleSetRotation,
  handleSetFills,
  handleSetStrokes,
  handleSetPluginData,
  handleGetPluginData,
  handleRenameNode,
} from './properties';


// Import operations (library imports)
export {
  handleImportComponentByKey,
  handleImportComponentSetByKey,
  handleImportStyleByKey,
  handleImportVariableByKey,
  handleGetLibraryVariableCollections,
  handleGetVariablesInLibraryCollection,
} from './import-operations';

// Find operations
export {
  handleFindChildren,
  handleFindChild,
  handleFindAll,
  handleFindOne,
  handleFindAllByType,
  handleFindText,
  handleFindWidgetNodesByWidgetId,
} from './find-operations';

// Media operations
export {
  handleCreateVideo,
  handleCreateImageAsync,
  handleCreateLinkPreview,
  handleCreateGif,
  handleCreatePageDivider,
  handleCreateSlide,
  handleCreateSlideRow,
  handleGetSlideGrid,
  handleCreateCanvasRow,
  handleGetCanvasGrid,
} from './media-operations';

// Extended query operations
export {
  handleGetSelectionColors,
  handleGetCss,
  handleGetPublishStatus,
  handleGetTopLevelFrame,
  handleGetMeasurements,
  handleGetMeasurementsForNode,
  handleGetAnnotationCategories,
  handleGetAnnotationCategoryById,
  handleGetComponentInstances,
  handleGetMainComponent,
  handleGetStyleConsumers,
  handleGetVectorNetwork,
  handleGetVectorPaths,
} from './query-extended';

// Dev resources and advanced operations
export {
  handleGetDevResources,
  handleSetDevResourcePreview,
  handleGetSharedPluginData,
  handleSetSharedPluginData,
  handleGetSharedPluginDataKeys,
  handleSetRelaunchData,
  handleGetRelaunchData,
  handleSetFillStyleIdAsync,
  handleSetStrokeStyleIdAsync,
  handleSetEffectStyleIdAsync,
  handleSetGridStyleIdAsync,
  handleSetTextStyleIdAsync,
  handleSetReactions,
  handleSetInstanceProperties,
  handleSetVectorNetwork,
} from './dev-resources';

// Prototyping operations
export {
  handleGetReactions,
  handleCreateOverlay,
  handleSetOverlaySettings,
  handleSetTransition,
} from './prototyping';

// Annotation operations
export {
  handleAddAnnotation,
  handleEditAnnotation,
  handleDeleteAnnotation,
} from './annotations';

// Guide operations
export {
  handleAddGuide,
  handleGetGuides,
  handleRemoveGuide,
} from './guides';

// Variable aliases and bindings
export {
  handleCreateVariableAlias,
  handleCreateVariableAliasByIdAsync,
  handleSetBoundVariableForPaint,
  handleSetBoundVariableForEffect,
  handleSetBoundVariableForLayoutGrid,
  handleSetNodeBoundVariable,
  handleGetVariableById,
  handleGetVariableCollectionById,
  handleSetVariableCodeSyntax,
  handleSetExplicitVariableMode,
} from './variable-aliases';

// Extended text operations
export {
  handleGetRangeFontWeight,
  handleGetRangeAllFontNames,
  handleGetRangeFills,
  handleSetRangeFills,
  handleGetRangeTextStyleId,
  handleSetRangeTextStyleIdAsync,
  handleGetRangeListOptions,
  handleSetRangeListOptions,
  handleGetRangeIndentation,
  handleSetRangeIndentation,
  handleGetRangeParagraphSpacing,
  handleSetRangeParagraphSpacing,
  handleGetRangeParagraphIndent,
  handleSetRangeParagraphIndent,
  handleGetRangeFontName,
  handleSetRangeFontName,
} from './text-extended';

import type { FigmaCommand, CommandResult } from './types';
import { successResult, errorResult } from './types';
import { handleCreate, handleBatchCreate, handleCreateInstance } from './create';
import { handleModify, handleBatchModify, handleMove, handleResize, handleReparent } from './modify';
import { handleDelete, handleBatchDelete, handleDeleteChildren, handleDeleteSelection } from './delete';
import { handleQuery, handleGetFrames, handleGetViewport, handleSetViewport, handleSelect, handleSetPage } from './query';
import { handleGroup, handleUngroup, handleFlatten, handleClone, handleBooleanOperation } from './group';
import {
  handleCreateVariableCollection,
  handleEditVariableCollection,
  handleDeleteVariableCollection,
  handleCreateVariable,
  handleEditVariable,
  handleBatchEditVariable,
  handleDeleteVariable,
  handleBindVariable,
  handleBindFillVariable,
  handleBindStrokeVariable,
  handleInspectFills,
  handleUnbindVariable,
  handleGetVariables,
  handleExportTokens,
  handleImportTokens,
  handleCreateBoilerplate,
  handleBindMatchingColors,
  handleReplaceColorsByMapping,
  handleRebindVariables,
  handleAutoBindByRole,
  handleBindByExtractedUsage,
  handleAutoBindSpacing,
} from './variables';
import {
  handleCreatePaintStyle,
  handleCreateTextStyle,
  handleCreateTextStyleWithVariables,
  handleBindTextStyleVariable,
  handleCreateEffectStyle,
  handleEditStyle,
  handleDeleteStyle,
  handleApplyStyle,
  handleDetachStyle,
  handleGetStyles,
  handleApplyMatchingTextStyles,
  handleApplyMatchingEffectStyles,
  handleDeleteStyles,
  handleCheckStyleConflicts,
} from './styles';
import {
  handleCreateComponent,
  handleCreateComponentSet,
  handleAddVariant,
  handleEditComponentProperties,
  handleSetComponentPropertyReferences,
  handleGetComponentPropertyDefinitions,
  handleGetComponents,
} from './components';
import {
  handleEditInstanceText,
  handleOverrideInstanceFills,
  handleOverrideInstanceStrokes,
  handleOverrideInstanceEffects,
  handleResetOverrides,
  handleSwapInstance,
  handleDetachInstance,
} from './instances';
import {
  handleGetNodeColors,
  handleAnalyzeColors,
} from './colors';
import {
  handleExtractDesignTokens,
} from './extract-tokens';
import {
  handleCreateDesignSystem,
  handleValidateDesignSystem,
  handleGetDesignSystemStatus,
  handleGetOrganizingPrinciples,
  handleBindDocumentationVariables,
  handleCreateTypographyStyles,
  handleCreateStateCollection,
  handleCreateComponentSizeCollection,
  handleCreateScreenSizeCollection,
} from './design-system';
import {
  handleCreatePage,
  handleDeletePage,
  handleRenamePage,
  handleDuplicatePage,
  handleLoadAllPages,
} from './pages';
import {
  handleListFonts,
  handleLoadFont,
  handleCheckMissingFonts,
  handleGetUsedFonts,
} from './fonts';
import {
  handleCreateImage,
  handleCreateImageFromUrl,
  handleGetImageData,
  handleReplaceImage,
} from './images';
import {
  handleExportNode,
  handleBatchExport,
  handleGetExportSettings,
  handleSetExportSettings,
} from './export';
import {
  handleNotify,
  handleCommitUndo,
  handleTriggerUndo,
  handleSaveVersion,
  handleGetCurrentUser,
  handleGetActiveUsers,
  handleGetFileInfo,
  handleOpenExternal,
  handleGetFileThumbnail,
  handleSetFileThumbnail,
  handleBase64Encode,
  handleBase64Decode,
} from './utilities';
import {
  handleCreateFromSvg,
  handleCreateSection,
  handleWrapInSection,
  handleCreateSlice,
  handleCreateTable,
  handleSetTableCell,
  handleStyleTableRow,
  handleStyleTableCell,
  handleCreateSticky,
  handleCreateConnector,
  handleCreateShapeWithText,
  handleCreateCodeBlock,
  handleMeasureText,
  handleCreateHighlight,
  handleCreateStamp,
  handleCreateWashiTape,
  handleCreateEmbed,
} from './advanced-nodes';
import {
  handleCreateGridStyle,
  handleGetGridStyles,
  handleApplyGridStyle,
} from './styles';
import {
  handleSetAutoLayout,
  handleGetAutoLayout,
  handleSetLayoutChild,
  handleSetConstraints,
  handleGetConstraints,
  handleSetSizeConstraints,
  handleInferAutoLayout,
} from './layout';
import {
  handleSetRangeFont,
  handleSetRangeFontSize,
  handleSetRangeColor,
  handleSetRangeTextDecoration,
  handleSetRangeTextCase,
  handleSetRangeLineHeight,
  handleSetRangeLetterSpacing,
  handleInsertText,
  handleDeleteText,
  handleGetRangeStyles,
  handleSetTextHyperlink,
} from './text-operations';
import {
  handleSetBlendMode,
  handleSetOpacity,
  handleSetVisible,
  handleSetLocked,
  handleSetClipsContent,
  handleSetCornerRadius,
  handleSetMask,
  handleSetEffects,
  handleSetRotation,
  handleSetFills,
  handleSetStrokes,
  handleSetPluginData,
  handleGetPluginData,
  handleRenameNode,
} from './properties';


import {
  handleImportComponentByKey,
  handleImportComponentSetByKey,
  handleImportStyleByKey,
  handleImportVariableByKey,
  handleGetLibraryVariableCollections,
  handleGetVariablesInLibraryCollection,
} from './import-operations';
import {
  handleFindChildren,
  handleFindChild,
  handleFindAll,
  handleFindOne,
  handleFindAllByType,
  handleFindText,
  handleFindWidgetNodesByWidgetId,
} from './find-operations';
import {
  handleCreateVideo,
  handleCreateImageAsync,
  handleCreateLinkPreview,
  handleCreateGif,
  handleCreatePageDivider,
  handleCreateSlide,
  handleCreateSlideRow,
  handleGetSlideGrid,
  handleCreateCanvasRow,
  handleGetCanvasGrid,
} from './media-operations';
import {
  handleGetSelectionColors,
  handleGetCss,
  handleGetPublishStatus,
  handleGetTopLevelFrame,
  handleGetMeasurements,
  handleGetMeasurementsForNode,
  handleGetAnnotationCategories,
  handleGetAnnotationCategoryById,
  handleGetComponentInstances,
  handleGetMainComponent,
  handleGetStyleConsumers,
  handleGetVectorNetwork,
  handleGetVectorPaths,
} from './query-extended';
import {
  handleGetDevResources,
  handleSetDevResourcePreview,
  handleGetSharedPluginData,
  handleSetSharedPluginData,
  handleGetSharedPluginDataKeys,
  handleSetRelaunchData,
  handleGetRelaunchData,
  handleSetFillStyleIdAsync,
  handleSetStrokeStyleIdAsync,
  handleSetEffectStyleIdAsync,
  handleSetGridStyleIdAsync,
  handleSetTextStyleIdAsync,
  handleSetReactions,
  handleSetInstanceProperties,
  handleSetVectorNetwork,
} from './dev-resources';
import {
  handleCreateVariableAlias,
  handleCreateVariableAliasByIdAsync,
  handleSetBoundVariableForPaint,
  handleSetBoundVariableForEffect,
  handleSetBoundVariableForLayoutGrid,
  handleSetNodeBoundVariable,
  handleGetVariableById,
  handleGetVariableCollectionById,
  handleSetVariableCodeSyntax,
  handleSetExplicitVariableMode,
} from './variable-aliases';
import {
  handleGetRangeFontWeight,
  handleGetRangeAllFontNames,
  handleGetRangeFills,
  handleSetRangeFills,
  handleGetRangeTextStyleId,
  handleSetRangeTextStyleIdAsync,
  handleGetRangeListOptions,
  handleSetRangeListOptions,
  handleGetRangeIndentation,
  handleSetRangeIndentation,
  handleGetRangeParagraphSpacing,
  handleSetRangeParagraphSpacing,
  handleGetRangeParagraphIndent,
  handleSetRangeParagraphIndent,
  handleGetRangeFontName,
  handleSetRangeFontName,
} from './text-extended';
import {
  handleGetReactions,
  handleCreateOverlay,
  handleSetOverlaySettings,
  handleSetTransition,
} from './prototyping';
import {
  handleAddAnnotation,
  handleEditAnnotation,
  handleDeleteAnnotation,
} from './annotations';
import {
  handleAddGuide,
  handleGetGuides,
  handleRemoveGuide,
} from './guides';

// Main command router
export async function executeCommand(command: FigmaCommand): Promise<CommandResult> {
  const commandType = command.type;
  const subType = (command.payload && command.payload.subType) as string | undefined;

  try {
    switch (commandType) {
      // Ping/pong for testing
      case 'ping':
        return successResult(command.id, {
          data: { pong: true, timestamp: Date.now() },
        });

      // Create commands
      case 'create':
        return handleCreate(command);

      case 'batchCreate':
        return handleBatchCreate(command);

      case 'createInstance':
        return handleCreateInstance(command);

      // Modify commands
      case 'modify':
        return handleModify(command);

      case 'batchModify':
        return handleBatchModify(command);

      case 'move':
        return handleMove(command);

      case 'resize':
        return handleResize(command);

      case 'reparent':
        return handleReparent(command);

      // Delete commands
      case 'delete':
        return handleDelete(command);

      case 'batchDelete':
        return handleBatchDelete(command);

      case 'deleteChildren':
        return handleDeleteChildren(command);

      case 'deleteSelection':
        return handleDeleteSelection(command);

      // Query commands
      case 'query':
        return handleQuery(command);

      case 'getFrames':
        return handleGetFrames(command);

      case 'getViewport':
        return handleGetViewport(command);

      case 'setViewport':
        return handleSetViewport(command);

      case 'select':
        return handleSelect(command);

      case 'setPage':
        return handleSetPage(command);

      // Group commands
      case 'group':
        return handleGroup(command);

      case 'ungroup':
        return handleUngroup(command);

      case 'flatten':
        return handleFlatten(command);

      case 'clone':
        return handleClone(command);

      case 'boolean':
        return handleBooleanOperation(command);

      // Variable commands
      case 'createVariableCollection':
        return handleCreateVariableCollection(command);

      case 'editVariableCollection':
        return handleEditVariableCollection(command);

      case 'deleteVariableCollection':
        return handleDeleteVariableCollection(command);

      case 'createVariable':
        return handleCreateVariable(command);

      case 'editVariable':
        return handleEditVariable(command);

      case 'batchEditVariable':
        return handleBatchEditVariable(command);

      case 'deleteVariable':
        return handleDeleteVariable(command);

      case 'bindVariable':
        return handleBindVariable(command);

      case 'bindFillVariable':
        return handleBindFillVariable(command);

      case 'bindStrokeVariable':
        return handleBindStrokeVariable(command);

      case 'inspectFills':
        return handleInspectFills(command);

      case 'unbindVariable':
        return handleUnbindVariable(command);

      case 'getVariables':
        return handleGetVariables(command);

      case 'exportTokens':
        return handleExportTokens(command);

      case 'importTokens':
        return handleImportTokens(command);

      case 'bindMatchingColors':
        return handleBindMatchingColors(command);

      case 'replaceColorsByMapping':
        return handleReplaceColorsByMapping(command);

      case 'rebindVariables':
        return handleRebindVariables(command);

      case 'autoBindByRole':
        return handleAutoBindByRole(command);

      case 'bindByExtractedUsage':
        return handleBindByExtractedUsage(command);

      case 'autoBindSpacing':
        return handleAutoBindSpacing(command);

      case 'createBoilerplate':
        return handleCreateBoilerplate(command);

      // Style commands
      case 'createPaintStyle':
        return handleCreatePaintStyle(command);

      case 'createTextStyle':
        return handleCreateTextStyle(command);

      case 'createTextStyleWithVariables':
        return handleCreateTextStyleWithVariables(command);

      case 'bindTextStyleVariable':
        return handleBindTextStyleVariable(command);

      case 'createEffectStyle':
        return handleCreateEffectStyle(command);

      case 'editStyle':
        return handleEditStyle(command);

      case 'deleteStyle':
        return handleDeleteStyle(command);

      case 'applyStyle':
        return handleApplyStyle(command);

      case 'detachStyle':
        return handleDetachStyle(command);

      case 'getStyles':
        return handleGetStyles(command);

      case 'applyMatchingTextStyles':
        return handleApplyMatchingTextStyles(command);

      case 'applyMatchingEffectStyles':
        return handleApplyMatchingEffectStyles(command);

      case 'deleteStyles':
        return handleDeleteStyles(command);

      case 'checkStyleConflicts':
        return handleCheckStyleConflicts(command);

      // Component commands
      case 'createComponent':
        return handleCreateComponent(command);

      case 'createComponentSet':
        return handleCreateComponentSet(command);

      case 'addVariant':
        return handleAddVariant(command);

      case 'editComponentProperties':
        return handleEditComponentProperties(command);

      case 'setComponentPropertyReferences':
        return handleSetComponentPropertyReferences(command);

      case 'getComponentPropertyDefinitions':
        return handleGetComponentPropertyDefinitions(command);

      case 'getComponents':
        return handleGetComponents(command);

      // Instance commands
      case 'editInstanceText':
        return handleEditInstanceText(command);

      case 'overrideInstanceFills':
        return handleOverrideInstanceFills(command);

      case 'overrideInstanceStrokes':
        return handleOverrideInstanceStrokes(command);

      case 'overrideInstanceEffects':
        return handleOverrideInstanceEffects(command);

      case 'resetOverrides':
        return handleResetOverrides(command);

      case 'swapInstance':
        return handleSwapInstance(command);

      case 'detachInstance':
        return handleDetachInstance(command);

      // Color commands
      case 'getNodeColors':
        return handleGetNodeColors(command);

      case 'analyzeColors':
        return handleAnalyzeColors(command);

      // Token extraction
      case 'extractDesignTokens':
        return handleExtractDesignTokens(command);

      // Design System commands
      case 'createDesignSystem':
        return handleCreateDesignSystem(command);

      case 'validateDesignSystem':
        return handleValidateDesignSystem(command);

      case 'getDesignSystemStatus':
        return handleGetDesignSystemStatus(command);

      case 'getOrganizingPrinciples':
        return handleGetOrganizingPrinciples(command);

      case 'bindDocumentationVariables':
        return handleBindDocumentationVariables(command);

      case 'createTypographyStyles':
        return handleCreateTypographyStyles(command);

      case 'createStateCollection':
        return handleCreateStateCollection(command);

      case 'createComponentSizeCollection':
        return handleCreateComponentSizeCollection(command);

      case 'createScreenSizeCollection':
        return handleCreateScreenSizeCollection(command);

      // Page commands
      case 'createPage':
        return handleCreatePage(command);

      case 'deletePage':
        return handleDeletePage(command);

      case 'renamePage':
        return handleRenamePage(command);

      case 'duplicatePage':
        return handleDuplicatePage(command);

      case 'loadAllPages':
        return handleLoadAllPages(command);

      // Font commands
      case 'listFonts':
        return handleListFonts(command);

      case 'loadFont':
        return handleLoadFont(command);

      case 'checkMissingFonts':
        return handleCheckMissingFonts(command);

      case 'getUsedFonts':
        return handleGetUsedFonts(command);

      // Image commands
      case 'createImage':
        return handleCreateImage(command);

      case 'createImageFromUrl':
        return handleCreateImageFromUrl(command);

      case 'getImageData':
        return handleGetImageData(command);

      case 'replaceImage':
        return handleReplaceImage(command);

      // Export commands
      case 'exportNode':
        return handleExportNode(command);

      case 'batchExport':
        return handleBatchExport(command);

      case 'getExportSettings':
        return handleGetExportSettings(command);

      case 'setExportSettings':
        return handleSetExportSettings(command);

      // Utility commands
      case 'notify':
        return handleNotify(command);

      case 'commitUndo':
        return handleCommitUndo(command);

      case 'triggerUndo':
        return handleTriggerUndo(command);

      case 'saveVersion':
        return handleSaveVersion(command);

      case 'getCurrentUser':
        return handleGetCurrentUser(command);

      case 'getActiveUsers':
        return handleGetActiveUsers(command);

      case 'getFileInfo':
        return handleGetFileInfo(command);

      case 'openExternal':
        return handleOpenExternal(command);

      case 'getFileThumbnail':
        return handleGetFileThumbnail(command);

      case 'setFileThumbnail':
        return handleSetFileThumbnail(command);

      case 'base64Encode':
        return handleBase64Encode(command);

      case 'base64Decode':
        return handleBase64Decode(command);

      // Advanced node commands
      case 'createFromSvg':
        return handleCreateFromSvg(command);

      case 'createSection':
        return handleCreateSection(command);

      case 'wrapInSection':
        return handleWrapInSection(command);

      case 'createSlice':
        return handleCreateSlice(command);

      case 'createTable':
        return handleCreateTable(command);

      case 'setTableCell':
        return handleSetTableCell(command);

      case 'styleTableRow':
        return handleStyleTableRow(command);

      case 'styleTableCell':
        return handleStyleTableCell(command);

      case 'createSticky':
        return handleCreateSticky(command);

      case 'createConnector':
        return handleCreateConnector(command);

      case 'createShapeWithText':
        return handleCreateShapeWithText(command);

      case 'createCodeBlock':
        return handleCreateCodeBlock(command);

      case 'measureText':
        return handleMeasureText(command);

      // Grid style commands
      case 'createGridStyle':
        return handleCreateGridStyle(command);

      case 'getGridStyles':
        return handleGetGridStyles(command);

      case 'applyGridStyle':
        return handleApplyGridStyle(command);

      // Layout commands
      case 'setAutoLayout':
        return handleSetAutoLayout(command);

      case 'getAutoLayout':
        return handleGetAutoLayout(command);

      case 'setLayoutChild':
        return handleSetLayoutChild(command);

      case 'setConstraints':
        return handleSetConstraints(command);

      case 'getConstraints':
        return handleGetConstraints(command);

      case 'setSizeConstraints':
        return handleSetSizeConstraints(command);

      case 'inferAutoLayout':
        return handleInferAutoLayout(command);

      // Text operation commands
      case 'setRangeFont':
        return handleSetRangeFont(command);

      case 'setRangeFontSize':
        return handleSetRangeFontSize(command);

      case 'setRangeColor':
        return handleSetRangeColor(command);

      case 'setRangeTextDecoration':
        return handleSetRangeTextDecoration(command);

      case 'setRangeTextCase':
        return handleSetRangeTextCase(command);

      case 'setRangeLineHeight':
        return handleSetRangeLineHeight(command);

      case 'setRangeLetterSpacing':
        return handleSetRangeLetterSpacing(command);

      case 'insertText':
        return handleInsertText(command);

      case 'deleteText':
        return handleDeleteText(command);

      case 'getRangeStyles':
        return handleGetRangeStyles(command);

      case 'setTextHyperlink':
        return handleSetTextHyperlink(command);

      // Property commands
      case 'setBlendMode':
        return handleSetBlendMode(command);

      case 'setOpacity':
        return handleSetOpacity(command);

      case 'setVisible':
        return handleSetVisible(command);

      case 'setLocked':
        return handleSetLocked(command);

      case 'setClipsContent':
        return handleSetClipsContent(command);

      case 'setCornerRadius':
        return handleSetCornerRadius(command);

      case 'setMask':
        return handleSetMask(command);

      case 'setEffects':
        return handleSetEffects(command);

      case 'setRotation':
        return handleSetRotation(command);

      case 'setFills':
        return handleSetFills(command);

      case 'setStrokes':
        return handleSetStrokes(command);

      case 'setPluginData':
        return handleSetPluginData(command);

      case 'getPluginData':
        return handleGetPluginData(command);

      case 'renameNode':
        return handleRenameNode(command);


      // Import operations
      case 'importComponentByKey':
        return handleImportComponentByKey(command);

      case 'importComponentSetByKey':
        return handleImportComponentSetByKey(command);

      case 'importStyleByKey':
        return handleImportStyleByKey(command);

      case 'importVariableByKey':
        return handleImportVariableByKey(command);

      case 'getLibraryVariableCollections':
        return handleGetLibraryVariableCollections(command);

      case 'getVariablesInLibraryCollection':
        return handleGetVariablesInLibraryCollection(command);

      // Find operations
      case 'findChildren':
        return handleFindChildren(command);

      case 'findChild':
        return handleFindChild(command);

      case 'findAll':
        return handleFindAll(command);

      case 'findOne':
        return handleFindOne(command);

      case 'findAllByType':
        return handleFindAllByType(command);

      case 'findText':
        return handleFindText(command);

      case 'findWidgetNodesByWidgetId':
        return handleFindWidgetNodesByWidgetId(command);

      // Media operations
      case 'createVideo':
        return handleCreateVideo(command);

      case 'createImageAsync':
        return handleCreateImageAsync(command);

      case 'createLinkPreview':
        return handleCreateLinkPreview(command);

      case 'createGif':
        return handleCreateGif(command);

      case 'createPageDivider':
        return handleCreatePageDivider(command);

      case 'createSlide':
        return handleCreateSlide(command);

      case 'createSlideRow':
        return handleCreateSlideRow(command);

      case 'getSlideGrid':
        return handleGetSlideGrid(command);

      case 'createCanvasRow':
        return handleCreateCanvasRow(command);

      case 'getCanvasGrid':
        return handleGetCanvasGrid(command);

      // Extended query operations
      case 'getSelectionColors':
        return handleGetSelectionColors(command);

      case 'getCss':
        return handleGetCss(command);

      case 'getPublishStatus':
        return handleGetPublishStatus(command);

      case 'getTopLevelFrame':
        return handleGetTopLevelFrame(command);

      case 'getMeasurements':
        return handleGetMeasurements(command);

      case 'getMeasurementsForNode':
        return handleGetMeasurementsForNode(command);

      case 'getAnnotationCategories':
        return handleGetAnnotationCategories(command);

      case 'getAnnotationCategoryById':
        return handleGetAnnotationCategoryById(command);

      case 'getComponentInstances':
        return handleGetComponentInstances(command);

      case 'getMainComponent':
        return handleGetMainComponent(command);

      case 'getStyleConsumers':
        return handleGetStyleConsumers(command);

      // Dev resources operations
      case 'getDevResources':
        return handleGetDevResources(command);

      case 'setDevResourcePreview':
        return handleSetDevResourcePreview(command);

      case 'getSharedPluginData':
        return handleGetSharedPluginData(command);

      case 'setSharedPluginData':
        return handleSetSharedPluginData(command);

      case 'getSharedPluginDataKeys':
        return handleGetSharedPluginDataKeys(command);

      case 'setRelaunchData':
        return handleSetRelaunchData(command);

      case 'getRelaunchData':
        return handleGetRelaunchData(command);

      case 'setFillStyleIdAsync':
        return handleSetFillStyleIdAsync(command);

      case 'setStrokeStyleIdAsync':
        return handleSetStrokeStyleIdAsync(command);

      case 'setEffectStyleIdAsync':
        return handleSetEffectStyleIdAsync(command);

      case 'setGridStyleIdAsync':
        return handleSetGridStyleIdAsync(command);

      case 'setTextStyleIdAsync':
        return handleSetTextStyleIdAsync(command);

      case 'setReactions':
        return handleSetReactions(command);

      case 'setInstanceProperties':
        return handleSetInstanceProperties(command);

      case 'setVectorNetwork':
        return handleSetVectorNetwork(command);

      // Variable aliases operations
      case 'createVariableAlias':
        return handleCreateVariableAlias(command);

      case 'createVariableAliasByIdAsync':
        return handleCreateVariableAliasByIdAsync(command);

      case 'setBoundVariableForPaint':
        return handleSetBoundVariableForPaint(command);

      case 'setBoundVariableForEffect':
        return handleSetBoundVariableForEffect(command);

      case 'setBoundVariableForLayoutGrid':
        return handleSetBoundVariableForLayoutGrid(command);

      case 'setNodeBoundVariable':
        return handleSetNodeBoundVariable(command);

      case 'getVariableById':
        return handleGetVariableById(command);

      case 'getVariableCollectionById':
        return handleGetVariableCollectionById(command);

      case 'setVariableCodeSyntax':
        return handleSetVariableCodeSyntax(command);

      case 'setExplicitVariableMode':
        return handleSetExplicitVariableMode(command);

      // Extended text operations
      case 'getRangeFontWeight':
        return handleGetRangeFontWeight(command);

      case 'getRangeAllFontNames':
        return handleGetRangeAllFontNames(command);

      case 'getRangeFills':
        return handleGetRangeFills(command);

      case 'setRangeFills':
        return handleSetRangeFills(command);

      case 'getRangeTextStyleId':
        return handleGetRangeTextStyleId(command);

      case 'setRangeTextStyleIdAsync':
        return handleSetRangeTextStyleIdAsync(command);

      case 'getRangeListOptions':
        return handleGetRangeListOptions(command);

      case 'setRangeListOptions':
        return handleSetRangeListOptions(command);

      case 'getRangeIndentation':
        return handleGetRangeIndentation(command);

      case 'setRangeIndentation':
        return handleSetRangeIndentation(command);

      case 'getRangeParagraphSpacing':
        return handleGetRangeParagraphSpacing(command);

      case 'setRangeParagraphSpacing':
        return handleSetRangeParagraphSpacing(command);

      case 'getRangeParagraphIndent':
        return handleGetRangeParagraphIndent(command);

      case 'setRangeParagraphIndent':
        return handleSetRangeParagraphIndent(command);

      case 'getRangeFontName':
        return handleGetRangeFontName(command);

      case 'setRangeFontName':
        return handleSetRangeFontName(command);

      // Prototyping commands
      case 'getReactions':
        return handleGetReactions(command);

      case 'createOverlay':
        return handleCreateOverlay(command);

      case 'setOverlaySettings':
        return handleSetOverlaySettings(command);

      case 'setTransition':
        return handleSetTransition(command);

      // Annotation commands
      case 'addAnnotation':
        return handleAddAnnotation(command);

      case 'editAnnotation':
        return handleEditAnnotation(command);

      case 'deleteAnnotation':
        return handleDeleteAnnotation(command);

      // Guide commands
      case 'addGuide':
        return handleAddGuide(command);

      case 'getGuides':
        return handleGetGuides(command);

      case 'removeGuide':
        return handleRemoveGuide(command);

      // FigJam commands
      case 'createHighlight':
        return handleCreateHighlight(command);

      case 'createStamp':
        return handleCreateStamp(command);

      case 'createWashiTape':
        return handleCreateWashiTape(command);

      case 'createEmbed':
        return handleCreateEmbed(command);

      // Vector query commands
      case 'getVectorNetwork':
        return handleGetVectorNetwork(command);

      case 'getVectorPaths':
        return handleGetVectorPaths(command);

      default:
        return errorResult(command.id, `Unknown command type: ${commandType}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(command.id, `Command execution failed: ${message}`);
  }
}
