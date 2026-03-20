# Figma Plugin API Coverage Analysis

**Last Updated:** March 2026

## Current Implementation: 255 Commands

253 plugin commands + 2 server-side commands across 32 categories.

---

### Node Creation (3 commands)
- ✅ create (rectangle, ellipse, line, polygon, star, vector, text, frame)
- ✅ batchCreate
- ✅ createInstance

### Advanced Node Creation (16 commands)
- ✅ createFromSvg
- ✅ createSection
- ✅ createSlice
- ✅ createTable
- ✅ setTableCell
- ✅ styleTableRow
- ✅ styleTableCell
- ✅ createSticky
- ✅ createConnector
- ✅ createShapeWithText
- ✅ createCodeBlock
- ✅ measureText
- ✅ createHighlight (FigJam only)
- ✅ createStamp (FigJam only)
- ✅ createWashiTape (FigJam only)
- ✅ createEmbed (FigJam only, async)

### Media & Slides (10 commands)
- ✅ createVideo
- ✅ createImageAsync
- ✅ createLinkPreview
- ✅ createGif
- ✅ createPageDivider
- ✅ createSlide
- ✅ createSlideRow
- ✅ getSlideGrid
- ✅ createCanvasRow
- ✅ getCanvasGrid

### Node Modification (5 commands)
- ✅ modify (properties)
- ✅ batchModify
- ✅ move
- ✅ resize
- ✅ reparent

### Node Deletion (4 commands)
- ✅ delete
- ✅ batchDelete
- ✅ deleteChildren
- ✅ deleteSelection

### Query & Selection (6 commands)
- ✅ query (selection, page, node, children, find, deep, describe, findByType, pages)
- ✅ getFrames
- ✅ getViewport
- ✅ setViewport
- ✅ select
- ✅ setPage

### Find Operations (7 commands)
- ✅ findChildren
- ✅ findChild
- ✅ findAll
- ✅ findOne
- ✅ findAllByType
- ✅ findText
- ✅ findWidgetNodesByWidgetId

### Group Operations (5 commands)
- ✅ group
- ✅ ungroup
- ✅ flatten
- ✅ clone
- ✅ boolean (union, subtract, intersect, exclude)

### Variables (22 commands)
- ✅ createVariableCollection
- ✅ editVariableCollection
- ✅ deleteVariableCollection
- ✅ createVariable
- ✅ editVariable
- ✅ batchEditVariable
- ✅ deleteVariable
- ✅ bindVariable
- ✅ bindFillVariable
- ✅ bindStrokeVariable
- ✅ inspectFills
- ✅ unbindVariable
- ✅ getVariables
- ✅ exportTokens
- ✅ importTokens
- ✅ bindMatchingColors
- ✅ replaceColorsByMapping
- ✅ rebindVariables
- ✅ autoBindByRole
- ✅ bindByExtractedUsage
- ✅ autoBindSpacing
- ✅ createBoilerplate

### Variable Aliases (10 commands)
- ✅ createVariableAlias
- ✅ createVariableAliasByIdAsync
- ✅ setBoundVariableForPaint
- ✅ setBoundVariableForEffect
- ✅ setBoundVariableForLayoutGrid
- ✅ setNodeBoundVariable
- ✅ getVariableById
- ✅ getVariableCollectionById
- ✅ setVariableCodeSyntax
- ✅ setExplicitVariableMode

### Styles (14 commands)
- ✅ createPaintStyle
- ✅ createTextStyle
- ✅ createTextStyleWithVariables
- ✅ bindTextStyleVariable
- ✅ createEffectStyle
- ✅ editStyle
- ✅ deleteStyle
- ✅ deleteStyles
- ✅ applyStyle
- ✅ detachStyle
- ✅ getStyles
- ✅ applyMatchingTextStyles
- ✅ applyMatchingEffectStyles
- ✅ checkStyleConflicts

### Grid Styles (3 commands)
- ✅ createGridStyle
- ✅ getGridStyles
- ✅ applyGridStyle

### Components (7 commands)
- ✅ createComponent
- ✅ createComponentSet
- ✅ addVariant
- ✅ editComponentProperties
- ✅ setComponentPropertyReferences
- ✅ getComponentPropertyDefinitions
- ✅ getComponents

### Instances (7 commands)
- ✅ editInstanceText
- ✅ overrideInstanceFills
- ✅ overrideInstanceStrokes
- ✅ overrideInstanceEffects
- ✅ resetOverrides
- ✅ swapInstance
- ✅ detachInstance

### Design System (9 commands)
- ✅ createDesignSystem — Idempotent composite command that creates complete 4-level hierarchy
- ✅ validateDesignSystem — Validates completeness and identifies issues
- ✅ getDesignSystemStatus — Quick status check for design system readiness
- ✅ getOrganizingPrinciples — Returns available organizing principles (4-level, 3-level, Material Design 3, Tailwind, etc.)
- ✅ bindDocumentationVariables — Binds variables to documentation frames
- ✅ createTypographyStyles — Creates typography styles from design tokens
- ✅ createStateCollection — Creates state variable collection (hover, pressed, disabled, etc.)
- ✅ createComponentSizeCollection — Creates component size variable collection (sm, md, lg, etc.)
- ✅ createScreenSizeCollection — Creates screen size variable collection (mobile, tablet, desktop, etc.)

### Colors & Token Extraction (3 commands)
- ✅ getNodeColors
- ✅ analyzeColors
- ✅ extractDesignTokens — Extracts colors, typography, spacing, shadows with node ID maps

### Pages (5 commands)
- ✅ createPage
- ✅ deletePage
- ✅ renamePage
- ✅ duplicatePage
- ✅ loadAllPages

### Fonts (4 commands)
- ✅ listFonts
- ✅ loadFont
- ✅ checkMissingFonts
- ✅ getUsedFonts

### Images (4 commands)
- ✅ createImage
- ✅ createImageFromUrl
- ✅ getImageData
- ✅ replaceImage

### Export (4 commands)
- ✅ exportNode
- ✅ batchExport
- ✅ getExportSettings
- ✅ setExportSettings

### Auto Layout & Constraints (7 commands)
- ✅ setAutoLayout
- ✅ getAutoLayout
- ✅ setLayoutChild
- ✅ setConstraints
- ✅ getConstraints
- ✅ setSizeConstraints
- ✅ inferAutoLayout

### Text Range Operations (11 commands)
- ✅ setRangeFont
- ✅ setRangeFontSize
- ✅ setRangeColor
- ✅ setRangeTextDecoration
- ✅ setRangeTextCase
- ✅ setRangeLineHeight
- ✅ setRangeLetterSpacing
- ✅ insertText
- ✅ deleteText
- ✅ getRangeStyles
- ✅ setTextHyperlink

### Extended Text Operations (16 commands)
- ✅ getRangeFontWeight
- ✅ getRangeAllFontNames
- ✅ getRangeFills
- ✅ setRangeFills
- ✅ getRangeTextStyleId
- ✅ setRangeTextStyleIdAsync
- ✅ getRangeListOptions
- ✅ setRangeListOptions
- ✅ getRangeIndentation
- ✅ setRangeIndentation
- ✅ getRangeParagraphSpacing
- ✅ setRangeParagraphSpacing
- ✅ getRangeParagraphIndent
- ✅ setRangeParagraphIndent
- ✅ getRangeFontName
- ✅ setRangeFontName

### Node Properties (14 commands)
- ✅ setBlendMode
- ✅ setOpacity
- ✅ setVisible
- ✅ setLocked
- ✅ setClipsContent
- ✅ setCornerRadius
- ✅ setMask
- ✅ setEffects
- ✅ setRotation
- ✅ setFills
- ✅ setStrokes
- ✅ setPluginData
- ✅ getPluginData
- ✅ renameNode

### Import & Library (6 commands)
- ✅ importComponentByKey
- ✅ importComponentSetByKey
- ✅ importStyleByKey
- ✅ importVariableByKey
- ✅ getLibraryVariableCollections
- ✅ getVariablesInLibraryCollection

### Extended Query (13 commands)
- ✅ getSelectionColors
- ✅ getCss
- ✅ getPublishStatus
- ✅ getTopLevelFrame
- ✅ getMeasurements
- ✅ getMeasurementsForNode
- ✅ getAnnotationCategories
- ✅ getAnnotationCategoryById
- ✅ getComponentInstances
- ✅ getMainComponent
- ✅ getStyleConsumers
- ✅ getVectorNetwork — Returns vertices, segments, regions from a vector node
- ✅ getVectorPaths — Returns SVG path data from a vector node

### Dev Resources & Advanced (15 commands)
- ✅ getDevResources
- ✅ setDevResourcePreview
- ✅ getSharedPluginData
- ✅ setSharedPluginData
- ✅ getSharedPluginDataKeys
- ✅ setRelaunchData
- ✅ getRelaunchData
- ✅ setFillStyleIdAsync
- ✅ setStrokeStyleIdAsync
- ✅ setEffectStyleIdAsync
- ✅ setGridStyleIdAsync
- ✅ setTextStyleIdAsync
- ✅ setReactions
- ✅ setInstanceProperties
- ✅ setVectorNetwork

### Utilities (13 commands)
- ✅ ping
- ✅ notify
- ✅ commitUndo
- ✅ triggerUndo
- ✅ saveVersion
- ✅ getCurrentUser
- ✅ getActiveUsers
- ✅ getFileInfo
- ✅ openExternal
- ✅ getFileThumbnail
- ✅ setFileThumbnail
- ✅ base64Encode
- ✅ base64Decode

### Prototyping (4 commands)
- ✅ getReactions — Get all prototype interactions from a node
- ✅ createOverlay — Create a frame configured for overlay use
- ✅ setOverlaySettings — Set overlay position, background, and interaction on a frame
- ✅ setTransition — Modify transition properties on an existing reaction

### Annotations (3 commands)
- ✅ addAnnotation — Add an annotation to a node (label, description, category)
- ✅ editAnnotation — Edit an existing annotation by index
- ✅ deleteAnnotation — Delete an annotation by index

### Guides (3 commands)
- ✅ addGuide — Add a horizontal or vertical guide to a page or frame
- ✅ getGuides — Get all guides from a page or frame
- ✅ removeGuide — Remove a guide by index or by axis+offset match

### Server-Side (2 commands)
Handled by the bridge server (Puppeteer headless browser), not forwarded to the Figma plugin.
- ✅ extractWebsiteCSS — Extracts computed colors, typography, spacing, radius, shadows from live websites
- ✅ extractWebsiteLayout — Extracts page layout structure with optional per-section screenshots

---

## Command Count Summary

| Category | Count |
|----------|-------|
| Node Creation | 3 |
| Advanced Node Creation | 16 |
| Media & Slides | 10 |
| Node Modification | 5 |
| Node Deletion | 4 |
| Query & Selection | 6 |
| Find Operations | 7 |
| Group Operations | 5 |
| Variables | 22 |
| Variable Aliases | 10 |
| Styles | 14 |
| Grid Styles | 3 |
| Components | 7 |
| Instances | 7 |
| Design System | 9 |
| Colors & Token Extraction | 3 |
| Pages | 5 |
| Fonts | 4 |
| Images | 4 |
| Export | 4 |
| Auto Layout & Constraints | 7 |
| Text Range Operations | 11 |
| Extended Text Operations | 16 |
| Node Properties | 14 |
| Import & Library | 6 |
| Extended Query | 13 |
| Dev Resources & Advanced | 15 |
| Prototyping | 4 |
| Annotations | 3 |
| Guides | 3 |
| Utilities | 13 |
| Server-Side | 2 |
| **Total** | **255** |
