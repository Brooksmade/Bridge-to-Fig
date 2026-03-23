# Library Best Practices

Authoritative reference for managing Figma shared libraries — publishing, versioning, organization, and team workflows. Based on [Figma's official library guide](https://help.figma.com/hc/en-us/articles/360041051154-Guide-to-libraries-in-Figma) and [publishing guide](https://help.figma.com/hc/en-us/articles/360025508373-Publish-a-library).

Referenced by: `component-library-orchestrator`, `component-qa`, `style-manager`, `design-system-orchestrator`

---

## Library Architecture

### Single-File vs Multi-File Strategy

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **Single file** | Small team, one product, < 50 components | `Design System.fig` |
| **Multi-file** | Large team, multiple products, 50+ components | Foundation + Components + Icons |
| **Per-product** | Multiple products sharing a foundation | Shared Foundation → Product A → Product B |

### Recommended Multi-File Structure

```
📁 Foundation Library
   ├── Variables (colors, typography, spacing, effects)
   ├── Color styles (gradients, multi-fill)
   ├── Text styles (typography presets)
   ├── Effect styles (shadows, blurs)
   └── Grid styles (layout grids)

📁 Component Library
   ├── Atoms (icons, badges, avatars, dividers)
   ├── Molecules (buttons, inputs, toggles, chips)
   ├── Organisms (cards, headers, forms, tables)
   └── Templates (page layouts, grid systems)

📁 Icon Library (optional, for large icon sets)
   ├── Navigation icons
   ├── Action icons
   ├── Status icons
   └── Social icons
```

**Why separate files:**
- Foundation changes are rare and high-impact; component changes are frequent
- Different publishing cadences and review processes
- Smaller files load faster and are easier to navigate
- Teams can subscribe to only what they need

### Library Dependencies

```
Foundation Library (variables, styles)
       ↓ consumed by
Component Library (uses Foundation tokens)
       ↓ consumed by
Product Files (use Components + Foundation)
```

**Critical rule:** Components in the Component Library should bind to variables from the Foundation Library. When the Foundation updates, components inherit the change automatically.

---

## What to Publish

### Publishable Assets

| Asset Type | Published Via | Notes |
|------------|--------------|-------|
| Components | Library modal | Main components only; instances are not published |
| Variables | Library modal | Collections and their modes |
| Color styles | Library modal | Solid fills, gradients, multi-fills |
| Text styles | Library modal | Typography presets |
| Effect styles | Library modal | Shadows, blurs |
| Grid styles | Library modal | Layout grids |

### What NOT to Publish

- **Base/private components** (prefix with `.` or `_` to auto-hide)
- **WIP or experimental components** (prefix with `_WIP/`)
- **Test instances** and playground frames
- **Documentation frames** (keep in file but don't publish as components)

### Hiding Assets from Publishing

Two methods:
1. **Name prefix**: `.ComponentName` or `_ComponentName` — auto-hidden from assets panel and library
2. **Manual hide**: Right-click asset in library modal → "Hide when publishing"

---

## Styles vs Variables: Decision Framework

### When to Use Variables

- **Single values** that change across modes: colors, spacing, radius, opacity
- **Theming**: Light/dark mode, brand themes, density
- **Aliasing/token chains**: Primitive → Semantic → Token → Theme
- **Number values**: Spacing, sizing, border-radius, font-size
- **Boolean values**: Feature flags in prototypes

### When to Use Styles

- **Composite values**: Multiple fills, gradients, complex shadows
- **Typography presets**: Font family + size + weight + line-height + letter-spacing
- **Multi-effect combinations**: Drop shadow + inner shadow
- **Grid systems**: Column count + gutter + margin

### Using Both Together

The modern best practice is **variables for tokens, styles for composites**:

```
Variable: Color/Primary/500 = #3366FF          ← single value, supports modes
Style:    Shadow/MD = 0 4px 8px rgba(0,0,0,0.1) ← composite value

Text Style: Heading/H1
  ├── fontFamily → bound to variable Font/Sans
  ├── fontSize → bound to variable Size/H1
  ├── lineHeight → bound to variable LineHeight/H1
  └── fontWeight → Bold (static)
```

Styles CAN reference variables — this is the recommended approach for maximum flexibility.

---

## Publishing Workflow

### Before Publishing

1. **Review all changes** in the library modal
2. **Test components** in a playground page with real content
3. **Verify token binding** — no raw hex values in published components
4. **Check naming** — no generic names, consistent hierarchy
5. **Run QA** — use `component-qa` agent for automated quality checks
6. **Test in both modes** — light and dark mode should work correctly

### Publishing Process

```
1. Open library source file
2. Assets panel → Libraries icon → "This file" → Publish
3. Review added/modified/removed assets
4. Deselect anything not ready for publishing
5. Write a change description (MANDATORY)
6. Click Publish
```

### Change Descriptions

Every publish MUST include a description. This is the primary communication channel between library maintainers and consumers.

**Good descriptions:**
```
Added: Button/Ghost variant with transparent background
Updated: Card component — increased default padding from 12px to 16px
Fixed: Input/Error state now uses correct Error/500 color token
Deprecated: Badge/Legacy — use Badge/Default instead (will remove in v3.0)
```

**Bad descriptions:**
```
Updated stuff
Fixed things
v2
```

### After Publishing

- **Notify consumers** about breaking changes (Slack, email, changelog)
- **Monitor adoption** — check if teams are accepting updates
- **Update documentation** — changelog page in the library file

---

## Versioning Strategy

### Semantic Versioning for Libraries

Figma doesn't have built-in versioning, but adopt a convention:

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| **Patch** (bug fix, token value change) | v1.0.x | Fix Button hover color |
| **Minor** (new component, new variant) | v1.x.0 | Add Ghost button variant |
| **Major** (breaking changes, restructuring) | vX.0.0 | Rename component hierarchy |

### Tracking Versions

- **Changelog page** in the library file: Table with version, date, changes
- **File version history**: Figma's built-in history tied to publish descriptions
- **Cover page**: Show current version number on the file thumbnail

### Branching for Major Changes

Use Figma's **branching** feature for major version work:
1. Create a branch from the library file
2. Make breaking changes on the branch
3. Review with the team
4. Merge the branch
5. Publish with a major version description

---

## Consuming Libraries

### For Library Consumers

1. **Enable libraries**: Assets panel → Libraries icon → Toggle on team libraries
2. **Accept updates**: Blue badge appears on library icon when updates available
3. **Review changes**: Read the publisher's description before accepting
4. **Accept selectively**: You can accept some changes and defer others
5. **Swap libraries**: Right-click → "Swap library" to migrate between library versions

### Instance Management

| Action | When | Effect |
|--------|------|--------|
| **Override** | Customize content | Preserves link, receives structural updates |
| **Reset** | Remove overrides | Returns to main component defaults |
| **Detach** | Need full independence | Breaks link permanently — avoid when possible |
| **Swap** | Replace with different component | Preserves overrides where properties match |

**Rule:** Prefer overrides over detaching. Detaching is irreversible and breaks update flow.

---

## Deprecation

### Deprecation Process

1. **Mark deprecated**: Rename with `_Deprecated/` prefix (auto-hides from assets)
2. **Add description**: Explain what to use instead
3. **Set timeline**: Give consumers 2-4 weeks to migrate
4. **Notify**: Communicate via publish description and team channels
5. **Remove**: Delete the component after the deprecation period

### Deprecation Naming

```
Before: Button/Outline
After:  _Deprecated/Button/Outline

Description: "Deprecated — use Button/type=ghost instead. Will be removed 2026-04-15."
```

### Migration Support

- Provide a **swap mapping**: "Old Component → New Component"
- If properties changed, document the mapping
- Consider a **migration page** in the library showing before/after

---

## Library Organization

### File Structure

```
📄 Cover                    ← Thumbnail, version, last updated
📄 Getting Started          ← How to enable, configure, use
📄 Changelog                ← Version history with dates
📄 Components / Atoms       ← Published components
📄 Components / Molecules
📄 Components / Organisms
📄 Components / Templates
📄 _Private / Base          ← Hidden base components
📄 _Private / Helpers       ← Hidden utility components
📄 Playground               ← Test instances, example layouts
```

### Page Naming for Libraries

- Use **emoji or number prefix** for sort order: `01 Cover`, `02 Getting Started`
- Or use **section prefixes**: `📄 Cover`, `🧩 Components`, `🔧 Private`
- Keep page count manageable — combine related atoms on one page

### Component Placement

- Place the **main component** on its component page
- Place a **documentation instance** on the Playground page
- Use **sections** within pages to sub-group (e.g., Buttons section, Inputs section)

---

## Team Workflows

### Roles

| Role | Permissions | Responsibilities |
|------|-------------|------------------|
| **Library Owner** | Editor + publish access | Architecture decisions, publish authority |
| **Contributor** | Editor access | Create/modify components, submit for review |
| **Consumer** | Viewer access to library | Use components, report issues |

### Contribution Workflow

```
1. Contributor creates/modifies component on a branch
2. Contributor requests review from Library Owner
3. Library Owner reviews naming, structure, tokens, QA
4. Library Owner merges branch and publishes
5. Consumers accept the update
```

### Review Checklist for Library Owners

- [ ] Component follows naming conventions (`prompts/component-best-practices.md`)
- [ ] All color/spacing/radius values bound to variables
- [ ] All states present (default, hover, active, disabled, focus)
- [ ] Component description and property descriptions filled in
- [ ] Tested in light and dark mode
- [ ] No raw hex values or magic numbers
- [ ] Private helpers are prefixed with `.` or `_`
- [ ] Playground instance created showing real content
- [ ] Change description written for publish

---

## Library Analytics

### What to Track

- **Component usage**: Which components are used most/least across files
- **Update adoption**: How quickly teams accept library updates
- **Detachment rate**: High detachment signals the component isn't flexible enough
- **Override patterns**: Common overrides suggest missing variants or properties

### Responding to Analytics

| Signal | Meaning | Action |
|--------|---------|--------|
| High detachment | Component too rigid | Add properties or variants |
| Low usage | Component undiscoverable or unneeded | Improve naming or deprecate |
| Frequent same override | Missing variant | Add the variant officially |
| Slow update adoption | Trust issue or breaking changes | Improve change descriptions |

---

## Common Anti-Patterns

| Anti-Pattern | Why It's Bad | Better Approach |
|--------------|--------------|-----------------|
| Publishing everything | Cluttered assets panel, overwhelming | Hide internal helpers with `.` prefix |
| No change descriptions | Consumers don't know what changed or why | Always describe changes |
| Publishing from drafts | Can't share as team library | Always use team project files |
| One giant library file | Slow to load, hard to navigate | Split by domain (foundation/components/icons) |
| No branching for breaking changes | Breaks consumer files unexpectedly | Use branches + communicate |
| Copy-pasting between files | Breaks library link | Always use library instances |
| No deprecation period | Consumers have no time to migrate | Give 2-4 weeks notice |
| Styles AND variables for same thing | Confusing, double maintenance | Variables for tokens, styles for composites |

---

## Bridge to Fig Commands for Library Workflows

### Pre-Publish QA

```bash
# Get all components in file
curl -X POST http://localhost:4001/commands -d '{"type": "getComponents"}'

# Get all variables
curl -X POST http://localhost:4001/commands -d '{"type": "getVariables", "payload": {"includeValues": true}}'

# Get all styles
curl -X POST http://localhost:4001/commands -d '{"type": "getStyles"}'

# Validate design system
curl -X POST http://localhost:4001/commands -d '{"type": "validateDesignSystem"}'

# Check design system status
curl -X POST http://localhost:4001/commands -d '{"type": "getDesignSystemStatus"}'
```

### Naming Audit

```bash
# Get all frames for naming audit
curl -X POST http://localhost:4001/commands -d '{"type": "getFrames"}'

# Bulk rename
curl -X POST http://localhost:4001/commands -d '{
  "type": "batchModify",
  "payload": {
    "modifications": [
      {"target": "id1", "properties": {"name": ".Base/Button"}},
      {"target": "id2", "properties": {"name": "_Deprecated/OldCard"}}
    ]
  }
}'
```

---

## Related References

- **Component discipline**: `prompts/component-best-practices.md`
- **Variable hierarchy**: `prompts/figma-variables.md`
- **Variable binding**: `prompts/bind-variables.md`
- **Style management**: `.claude/agents/style-manager.md`
- **Design system validation**: `.claude/agents/design-system-validator.md`
- **Component QA**: `.claude/agents/component-qa.md`
