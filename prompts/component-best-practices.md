# Component Best Practices

Authoritative reference for building production-ready Figma components. Based on [Figma's official best practices](https://www.figma.com/best-practices/components-styles-and-shared-libraries/) and [component naming guide](https://help.figma.com/hc/en-us/articles/360038663994-Name-and-organize-components).

Referenced by: `component-creator`, `component-qa`, `component-library-orchestrator`, `nomenclature-enforcer`

---

## Primary Workflow: Convert, Don't Rebuild

Components should be **converted from existing design frames**, not built from scratch. Designs come from Figma Make, imports, or designer work — the component workflow preserves them.

```
1. DISCOVER  — Identify elements to componentize in the design frame
2. CONVERT   — createComponent with nodeId (converts frame in place)
3. VARIANT   — addVariant + modify for each state (hover, disabled, focus...)
4. COMBINE   — createComponentSet to group variants
5. ORGANIZE  — reparent master to Components page
6. INSTANCE  — createInstance back in the design frame
7. BIND      — Bind design system variables on the MASTER component
```

See `.claude/agents/component-creator.md` for full command details.

---

## When to Create a Component

Create a component when an element:
- **Repeats** across 2+ screens or contexts
- **Has states** (hover, active, disabled, focus, loading)
- **Needs consistency** — a change should propagate everywhere
- **Will be shared** via a team library

Do NOT create a component for:
- One-off illustrations or unique layouts
- Elements still in active exploration (convert after design is settled)
- Simple shapes with no reuse intent

**Rule of thumb:** If you copy-paste it, it should be a component.

---

## Component Architecture

### Atomic Design Hierarchy

| Level | Type | Description | Examples |
|-------|------|-------------|----------|
| 1 | **Atoms** | Indivisible building blocks | Icon, Badge, Avatar, Divider, Spacer |
| 2 | **Molecules** | Simple groups of atoms | Button, Input, Chip, Tag, Toggle |
| 3 | **Organisms** | Complex groups of molecules | Card, Header, Form, Table Row, Nav Bar |
| 4 | **Templates** | Page-level layout containers | Page Header, Content Grid, Sidebar Layout |

### Base Components (Private)

Base components are internal building blocks not meant for direct use:

- **Prefix with `.` or `_`** to hide from the assets panel and library publishing
- Example: `.Button/Base`, `_Icon/Base`
- Base components define shared structure that variants or other components extend
- Use them for: shared padding, shared icon slots, shared text styles

```
.Button/Base          ← hidden, defines shared structure
Button/Primary        ← published, inherits from base
Button/Secondary      ← published, inherits from base
```

### Nested Components

- Build complex components from simpler ones (molecules from atoms)
- Use **instance swap properties** for swappable sub-components (icons, avatars)
- Prefer nesting over flattening — changes to the atom propagate through all molecules
- Keep nesting to **3 levels max** to avoid performance issues and confusion

---

## Naming Conventions

### Slash-Separated Hierarchy

Use `/` to create groups in the assets panel and instance swap menu:

```
Category / Subcategory / Name
Button / Primary / Large
Icon / Navigation / Arrow Right
Form / Input / Text Field
```

**Rules:**
- Use **Title Case** for all segments
- Each `/` creates a level in the assets panel hierarchy
- Components sharing a prefix group together in swap menus
- Keep to **3 levels max** for readability

### Variant Naming

Use `property=value` format within component sets:

```
size=small, type=primary, state=default
size=medium, type=secondary, state=hover
```

**Rules:**
- Property names: **lowercase**
- Value names: **lowercase**
- Separate properties with `, ` (comma + space)
- Figma uses the **top-left variant** as the default in the assets panel

### Hidden / Private Components

| Prefix | Effect | Use Case |
|--------|--------|----------|
| `.` (dot) | Hidden from assets panel + library | Base components, internal helpers |
| `_` (underscore) | Hidden from assets panel + library | Deprecated components, WIP |

Private components are still usable inside the file — they just don't appear in the assets panel or get published to the library.

### What NOT to Name

Avoid:
- Generic names: `Frame 1`, `Rectangle 2`, `Group 3`
- Version suffixes: `Button-v2-final-FINAL`
- Appearance-based names: `Blue Rectangle`, `Big Text`
- Abbreviations without context: `Btn`, `Inp`, `Hdr`

Instead, name by **purpose**: `bg.primary`, `icon.chevron-right`, `text.heading`

---

## Variants

### When to Use Variants vs Properties

| Mechanism | Use When | Example |
|-----------|----------|---------|
| **Variant property** | Visual structure changes between options | `type=primary` vs `type=outlined` |
| **Boolean property** | Show/hide a sub-element | `showIcon=true/false` |
| **Instance swap** | Swappable nested component | `icon=chevron-right` |
| **Text property** | Editable text content | `label="Submit"` |

**Key principle:** Use variants for **structural differences**, properties for **content differences**.

### Variant Matrix

Define variants as a matrix of properties:

```
Component: Button
├── size: small, medium, large
├── type: primary, secondary, tertiary, ghost
├── state: default, hover, active, disabled, focus
└── Total: 3 × 4 × 5 = 60 variants
```

**Optimization:** You don't need every combination. Skip nonsensical combinations (e.g., `ghost + disabled` may not exist in your design language).

### Variant Organization in Figma

- Arrange variants in a **grid** within the component set frame
- Rows = one property (e.g., type), Columns = another (e.g., state)
- The **top-left variant** is the default shown in the assets panel
- Make the most common variant (usually `medium + primary + default`) the top-left

### State Variants

Every interactive component should include:

| State | Required | Description |
|-------|----------|-------------|
| Default | Yes | Resting state |
| Hover | Yes | Mouse over (desktop) |
| Active/Pressed | Yes | During click/tap |
| Disabled | Yes | Non-interactive |
| Focus | Yes | Keyboard focus (accessibility) |
| Loading | Optional | Async operation in progress |
| Error | Optional | Validation failure |

---

## Component Properties

### Property Types

| Type | Purpose | Default Value |
|------|---------|---------------|
| **Variant** | Switch between visual variants | First value in the list |
| **Boolean** | Show/hide layers | `true` or `false` |
| **Instance Swap** | Swap nested instances | Component node ID |
| **Text** | Expose editable text | Current text content |

### Property Naming

- Use **camelCase** or **Title Case** consistently
- Be descriptive: `showLeftIcon` not `icon1`
- Group related properties: `leftIcon`, `rightIcon`
- Boolean properties should read as questions: `hasAvatar`, `showBadge`, `isLoading`

### Property Best Practices

1. **Expose only what consumers need** — don't expose internal structural layers
2. **Set sensible defaults** — the default variant should be the most common use case
3. **Add descriptions** to every property explaining its purpose
4. **Limit property count** — more than 6-8 properties suggests the component should be split
5. **Use instance swap** instead of creating icon variants — much more scalable

---

## Auto Layout

Every component should use auto layout. Manual positioning breaks when content changes.

### Sizing Modes

| Mode | When to Use | Example |
|------|-------------|---------|
| **Hug** | Content determines size | Button width hugs label text |
| **Fixed** | Known, specific dimension | Icon containers (24×24) |
| **Fill** | Stretch to parent | Full-width input in a form |

### Auto Layout Rules for Components

1. **Root frame**: Usually `Hug` on both axes (content-driven)
2. **Text layers**: `Fill` horizontally (stretch with component), `Hug` vertically
3. **Icon containers**: `Fixed` (consistent hit target)
4. **Spacing**: Use design system spacing tokens (4, 8, 12, 16, 24, 32)
5. **Padding**: Use design system spacing tokens, bind to variables when possible

### Responsive Behavior

- Test components at multiple widths
- Use **min-width** and **max-width** constraints for fluid components
- Ensure text truncates gracefully (ellipsis) rather than breaking layout
- Stack elements vertically at narrow widths using nested auto layout frames

---

## Token Binding

### What to Bind

| Property | Variable Source | Priority |
|----------|----------------|----------|
| Fill colors | Token > Semantic > Primitive | Always bind |
| Stroke colors | Token > Semantic > Primitive | Always bind |
| Text colors | Token > Semantic > Primitive | Always bind |
| Corner radius | Number tokens | Bind when in system |
| Padding | Spacing tokens | Bind when in system |
| Gap/Item spacing | Spacing tokens | Bind when in system |
| Font size | Number tokens | Bind when in system |

### Binding Rules

1. **Prefer Token-level variables** — they carry the most semantic meaning
2. **Never use raw hex values** in published components — always bind to a variable
3. **Bind both light and dark mode** values — test in both modes
4. **Use semantic names**: `Surface/Primary` not `Gray-100`
5. **Check alias chains** resolve correctly across modes

---

## Documentation

### Component Descriptions

Every published component should have:

1. **Component set description**: What the component is and when to use it
2. **Variant descriptions**: What makes each variant unique
3. **Property descriptions**: What each property controls

Example:
```
Component: Button
Description: Primary action trigger. Use for the most important action on a page.
Limit to one primary button per section.

Variant: type=primary
Description: High-emphasis button for primary actions.

Property: showLeftIcon
Description: Toggles visibility of the icon before the label text.
```

### Component Page Organization

Organize component pages in the source file:

```
📄 Cover                    ← File thumbnail, version info
📄 Getting Started          ← Usage guidelines
📄 Components / Atoms       ← Icons, badges, avatars
📄 Components / Molecules   ← Buttons, inputs, toggles
📄 Components / Organisms   ← Cards, headers, forms
📄 Patterns                 ← Common layout patterns
📄 Playground               ← Examples and test instances
📄 Changelog                ← Version history
```

---

## Accessibility

### Minimum Requirements

| Check | Standard | Notes |
|-------|----------|-------|
| Touch target | 44×44px minimum | iOS HIG; Android recommends 48×48 |
| Color contrast | WCAG AA (4.5:1 text, 3:1 large text) | Test in both light and dark mode |
| Focus indicator | Visible focus ring on all interactive elements | 2px offset, high-contrast color |
| State distinction | States must differ by more than color alone | Add border, opacity, or icon change |

### Accessibility in Variants

- **Always include a focus state** — keyboard users rely on it
- **Disabled state**: Use reduced opacity (0.38-0.5), never just color change
- **Error state**: Include an error icon, not just red color (color-blind users)
- **Loading state**: Provide visual feedback beyond color (spinner, skeleton)

---

## Quality Checklist

Before publishing a component:

- [ ] **Structure**: Proper layer hierarchy, no generic names
- [ ] **Auto Layout**: Applied on root and all children, responds to content
- [ ] **Variants**: All required states exist (default, hover, active, disabled, focus)
- [ ] **Properties**: Key properties exposed with descriptions and sensible defaults
- [ ] **Tokens**: All colors, spacing, and radius values bound to variables
- [ ] **Accessibility**: Touch targets, contrast, focus state, state distinction
- [ ] **Documentation**: Description on component set, variants, and properties
- [ ] **Testing**: Verified at multiple sizes, in light and dark mode, with edge-case content
- [ ] **Naming**: Follows `/` hierarchy, `property=value` variants, no generic names
- [ ] **Private helpers**: Base components prefixed with `.` or `_`

---

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Better Approach |
|--------------|--------------|-----------------|
| One variant per icon | 100 icons = 100 variants | Use instance swap property |
| Detaching instances to customize | Breaks the link, won't receive updates | Use overrides or add a property |
| Deeply nested components (5+ levels) | Performance, hard to debug | Flatten to 3 levels max |
| Hard-coded colors | Won't respond to mode/theme changes | Bind to variables |
| No focus state | Fails keyboard accessibility | Always add focus variant |
| "v2" in component name | Version info belongs in library changelog | Use branches for major changes |
| Giant component sets (50+ variants) | Slow to load, hard to navigate | Split into sub-components |

---

## Related References

- **Library management**: `prompts/library-best-practices.md`
- **Variable hierarchy**: `prompts/figma-variables.md`
- **Layout patterns**: `prompts/figma-layout.md`
- **Naming enforcement**: `.claude/agents/nomenclature-enforcer.md`
- **Component QA**: `.claude/agents/component-qa.md`
- **Style management**: `.claude/agents/style-manager.md`
