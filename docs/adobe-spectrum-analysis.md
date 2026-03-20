# Adobe Spectrum Design System Analysis

A deep-dive into Adobe Spectrum's design token architecture, methodology, and organizational principles — and how they compare to Bridge to Fig's existing 4-level hierarchy.

---

## Spectrum at a Glance

Adobe Spectrum is Adobe's company-wide design system powering Creative Cloud, Document Cloud, and Experience Cloud products. It provides components, patterns, and design tokens used across dozens of Adobe applications on web, desktop (macOS/Windows), and mobile (iOS/Android).

**Core Principles:**
- **Rational** — Every decision is research-backed and tested
- **Human** — Accessibility-first, high standards for honesty and respect
- **Focused** — Deliver what's needed, nothing superfluous

---

## Spectrum's Token Architecture

### Token Types (3 Primary + Values)

Spectrum defines **three token types** plus raw values:

| Type | Scope | Example | Purpose |
|------|-------|---------|---------|
| **Global** | System-wide | `corner-radius-75` = 2px | Raw, reusable primitives |
| **Alias** | Cross-component | `negative-border-color-default` → `negative-color-900` | Semantic meaning via references |
| **Component-Specific** | Single component | `tooltip-maximum-width` = 160px | Locked to one component |
| **Value** | Terminal | `#323232`, `288px` | The final resolved data |

### CSS Implementation (3-Layer System)

In Spectrum CSS, tokens flow through three layers:

```
Layer 1: Global Design Tokens     --spectrum-global-color-gray-800
         ↓ (referenced by)
Layer 2: Component Tokens          --spectrum-actionbutton-border-color-default
         ↓ (mapped through)
Layer 3: System Tokens             --system-action-button-border-color-default
```

The **System layer** is the bridge that enables theme switching (Spectrum 2, Spectrum 1 Legacy, Express) without duplicating component styles.

### Token Data Categories (8 Groups)

From `spectrum-design-data`, tokens are organized into:

1. **Color Palette** — Raw hex/RGB values (the primitives)
2. **Semantic Color Palette** — Meaning-based colors (`semantic-blue`, `semantic-red`)
3. **Color Aliases** — Usage-based references (`focus`, `overlay`, `accent-background`)
4. **Color Component** — Component-specific color assignments
5. **Icons** — Icon-specific color tokens (primary, hover, down, disabled states)
6. **Layout** — Spacing, dimensions, corner radius, border widths
7. **Layout Component** — Component-level spacing and dimensions
8. **Typography** — Font families, weights, sizes, letter spacing, alignment

---

## Token Naming Methodology

### Three-Part Structure: Context → Common Unit → Clarification

Spectrum uses a **flat, human-readable** naming system (not nested/hierarchical):

| Part | Role | Examples |
|------|------|---------|
| **Context** | Broadest concept | Component name, color category, system constant |
| **Common Unit** | Consistent middle layer | `control-size`, `edge-to-text`, `border-color` |
| **Clarification** | Most specific detail | T-shirt size, numeric index, state |

**Examples:**
- `gray-100` → Context: gray | Clarification: 100
- `checkbox-control-size-small` → Context: checkbox | Common Unit: control-size | Clarification: small
- `action-button-edge-to-hold-icon-large` → Context: action-button | Common Unit: edge-to-hold-icon | Clarification: large

**Key design decisions:**
- Flat naming (no `/` nesting) — prevents prioritizing any one coding paradigm
- Human-readable words over abbreviations — supports non-engineers (designers, PMs)
- Predictable vocabulary — `small/medium/large` for t-shirt sizing, numeric indices for scales

---

## Sizing & Scale System

### T-Shirt Sizing (Linear — 8px increments)

Used for standard components (buttons, text fields, etc.):

| Size | Token | Desktop | Mobile |
|------|-------|---------|--------|
| Small | `component-height-75` | 24px | 30px |
| Medium | `component-height-100` | 32px | 40px |
| Large | `component-height-200` | 40px | 50px |
| XL | `component-height-300` | 48px | 60px |

### Numeric Scale (Non-Linear)

Used for components with many size variants (avatars, thumbnails):
- `avatar-size-50`, `avatar-size-100`, `avatar-size-200` ... `avatar-size-700`

### Platform Scale: 1:1.25 Ratio

Mobile components are 25% larger than desktop equivalents:
- Desktop base: 14px text, cursor-optimized hit areas
- Mobile base: 17px text, 48px minimum touch targets
- Borders stay constant across scales

---

## Color System

### Structure

| Category | Count | Purpose |
|----------|-------|---------|
| **Grays** | 11 tints/shades per theme | Fully desaturated, work alongside any chromatic color |
| **Colors** | 13 hues × 14 tints each | Chromatic palette (182 color values per theme) |
| **Transparent** | 8 values (white + black) | Overlays on colored backgrounds or images |

### Numeric Index System (100–1400)

Higher numbers = more contrast with background:
- **100–600**: Decorative, low-contrast (backgrounds, fills)
- **700–900**: Text, icons, borders (meets WCAG AA)
- **900+**: Strong contrast (critical UI)

Colors are **generated from target contrast ratios** using perceptually uniform color spaces (CAM02). In light themes, higher numbers are darker; in dark themes, higher numbers are lighter.

### Semantic Color Roles

Five defined semantic meanings:
1. **Accent** — Primary brand/action color
2. **Informative** — Information callouts (typically blue)
3. **Positive** — Success states (typically green)
4. **Notice** — Warnings (typically orange/yellow)
5. **Negative** — Errors/destructive actions (typically red)

### Themes

| Theme | Background | Usage |
|-------|-----------|-------|
| **Light** | gray-100 (lightest gray) | Default for light mode |
| **Dark** | gray-100 (dark context) | Optional alternative in light mode |
| **Darkest** | gray-100 (near-black) | Default for dark mode |

**Static colors** maintain the same values across all themes when hue identity is critical (e.g., a red error badge must look red in both light and dark).

---

## Spacing System

12 static values (don't change with platform scale):

| Token | Value | Common Use |
|-------|-------|-----------|
| `spacing-50` | 2px | Hairline gaps |
| `spacing-75` | 4px | Tight spacing |
| `spacing-100` | 8px | Base unit |
| `spacing-200` | 12px | Small gaps |
| `spacing-300` | 16px | Standard spacing |
| `spacing-400` | 24px | Section spacing |
| `spacing-500` | 32px | Large gaps |
| `spacing-600` | 40px | Group spacing |
| `spacing-700` | 48px | Layout spacing |
| `spacing-800` | 64px | Major sections |
| `spacing-900` | 80px | Page-level spacing |
| `spacing-1000` | 96px | Maximum spacing |

---

## Typography System

### Type Scale: 1.125 Major Second Ratio

15 sizes (`font-size-50` through `font-size-1300`):
- Desktop range: 11px–60px (base: 14px)
- Mobile range: 13px–70px (base: 17px)

### Font Families
- **Adobe Clean** — Primary sans-serif
- **Adobe Clean Serif** — Editorial content
- **Adobe Clean Han** — CJK languages
- **Source Code Pro** — Monospace/code

### Text Components (4 types)
1. **Heading** — Hierarchical levels
2. **Body** — Component text and paragraphs
3. **Detail** — Supplementary/caption text
4. **Code** — Code blocks and inline code

### Line Heights
- Headings/Details: 1.3× (Latin), 1.5× (CJK)
- Body/Code: 1.5× (Latin), 1.7× (CJK)

---

## Object Styles

### Border Radius
- **Default**: 4px (desktop) / 5px (mobile) — scales with platform
- **Small**: Connected to border width (checkboxes, etc.)
- **Full**: Pill shape for CTAs (buttons)

### Border Width
- **1px** — Standard borders and small dividers
- **2px** — Emphasized borders, medium dividers, slider tracks
- **4px** — Large dividers only

### Shadows
- Scale with platform (desktop vs mobile)
- Opacity increases in dark/darkest themes
- Used only for transient, dismissible elements (dropdowns, popovers)

---

## Governance & Scaling Model

### Voluntary Adoption (No Design Police)

Spectrum operates as **infrastructure** — teams adopt it because it saves work, not because they're forced to. Key governance practices:

- **Collaborative RFCs** — Standardize component APIs through request-for-comments
- **Per-component versioning** — Teams adopt updates selectively
- **Multi-team implementation** — CSS, React, Web Components, iOS, Android operate semi-independently
- **Content strategist** — Dedicated role shapes naming conventions across platforms
- **Visual regression testing** — Snapshot tests catch unintended visual breaks

### Design-to-Engineering Flow

```
Designers author tokens
    → Design system engineers validate naming
        → Implementation teams (CSS/React/Web Components) consume data
            → Product engineers integrate into applications
```

---

## Comparison: Spectrum vs Bridge to Fig's 4-Level System

### Architecture Mapping

| Spectrum Layer | Bridge to Fig Layer | Notes |
|---------------|-------------------|-------|
| **Global Tokens** (Color Palette, Layout) | **Primitive [Level 1]** | Both store raw values. Spectrum uses flat naming (`gray-800`), Bridge uses grouped naming (`Gray/800`) |
| **Alias Tokens** (Semantic Color Palette, Color Aliases) | **Semantic [Level 2]** | Both map meaning to primitives. Spectrum has more granular categories (separates semantic palette from usage aliases) |
| **Component Tokens** (Color Component, Layout Component) | **Tokens [Level 3]** | Spectrum scopes to components (`actionbutton-border-color`); Bridge scopes to UI roles (`Surface/Page`, `Text/Primary`) |
| **System Tokens** (CSS `--system-` bridge) | **Theme [Level 4]** | Both serve as the theming bridge. Spectrum uses this for multi-brand (S1/S2/Express); Bridge uses it for Light/Dark |
| *(no equivalent)* | *(no equivalent)* | Spectrum has a dedicated **Icons** token category |

### Key Differences

| Aspect | Adobe Spectrum | Bridge to Fig 4-Level |
|--------|---------------|----------------------|
| **Naming** | Flat, human-readable (`accent-background-color-default`) | Hierarchical with `/` groups (`Surface/Page`, `Brand/Primary`) |
| **Color organization** | 4 separate color categories (Palette, Semantic, Aliases, Component) | Colors distributed across all 4 levels |
| **Platform scale** | Built-in 1:1.25 desktop/mobile ratio | Not applicable (Figma-centric) |
| **Theming** | 3 themes (Light, Dark, Darkest) + multi-brand (S2, Legacy, Express) | 2 modes (Light, Dark) |
| **Component tokens** | Explicit component-scoped tokens (`tooltip-max-width`) | UI-role tokens (`Border/Default`) shared across components |
| **Accessibility** | Contrast-ratio-generated color values (CAM02 color space) | Relies on extracted/user-provided values |
| **Token count** | ~1000+ tokens across 8 categories | ~200+ variables across 4 collections |
| **Governance** | Voluntary adoption, RFC process, dedicated content strategist | Automated creation, one-command pipeline |

### Where Spectrum is Stronger

1. **Component-level token isolation** — Each component has its own token namespace, preventing cross-component contamination. When `tooltip-maximum-width` changes, only tooltips are affected.

2. **Platform-aware scaling** — The 1:1.25 ratio and separate desktop/mobile token values are baked into the system, not an afterthought.

3. **Perceptual color generation** — Colors are computed from contrast ratios using CAM02, ensuring WCAG compliance by construction rather than by manual checking.

4. **Multi-brand theming** — The System token layer supports completely different visual languages (Spectrum 2, Legacy, Express) from the same codebase.

5. **Naming maturity** — Years of iteration by a dedicated content strategist. The flat, conversational naming approach is intentional and well-documented.

### Where Bridge to Fig is Stronger

1. **Speed of creation** — Entire 4-level system with 200+ variables in one command vs. Spectrum's months-long collaborative process.

2. **Automatic binding** — Variables bind to their source nodes during creation. Spectrum requires manual integration.

3. **Website extraction pipeline** — Extract CSS from any live site and create a matching design system automatically.

4. **Figma-native integration** — Variables are created directly in Figma with proper collection/mode support, not just JSON tokens.

5. **Simplicity** — 4 levels is easier to understand than 8 token categories with separate naming conventions for each.

---

## Proposed: Spectrum-Style Organizing Principle for Bridge to Fig

Based on this analysis, a new **"spectrum"** organizing principle could work as follows:

### Collection Architecture

```
Collection 1: Global                    (1 mode: "Value")
    Raw primitives — colors, spacing, sizing, radius, border-widths
    Naming: flat numeric scales (gray-100, blue-800, spacing-300, radius-75)

Collection 2: Alias                     (3 modes: "Light", "Dark", "Darkest")
    Semantic references — accent, negative, positive, notice, informative
    + Usage aliases — background, border-color, text-color, icon-color
    Each alias points to a Global token, with different targets per mode

Collection 3: Component                 (3 modes: "Light", "Dark", "Darkest")
    Per-component tokens — button-background, input-border, tooltip-width
    Points to Alias tokens (or Global when no alias exists)
    Scoped to specific component families

Collection 4: System                    (2+ modes: per brand/product)
    Theme bridge — remaps Component tokens for different brands
    Enables: Default brand, Express brand, Custom brand
    Optional layer — skip for single-brand projects
```

### Naming Convention (Spectrum-Style Flat)

```
Global:       gray-800, blue-400, spacing-300, radius-100, font-size-200
Alias:        accent-background-color-default, negative-border-color-hover
Component:    button-background-color-default, input-border-color-focus
System:       system-button-background-color-default (bridge to brand)
```

### Color Generation

- **Grays**: 11 steps per theme, fully desaturated
- **Chromatic**: 14 tints per hue × 13 hues = 182 color values
- **Semantic roles**: accent, informative, positive, notice, negative
- **Contrast-driven**: Higher indices = higher contrast (light theme: darker; dark theme: lighter)

### 3-Theme Support

Unlike the current 2-mode (Light/Dark) approach:
- **Light** — Default for light mode
- **Dark** — Rich dark theme
- **Darkest** — Near-black theme (code editors, media apps)

### Key Distinctions from Current 4-Level

| Current 4-Level | Spectrum-Style |
|-----------------|---------------|
| Grouped names (`Surface/Page`) | Flat names (`page-background-color`) |
| 2 themes (Light/Dark) | 3 themes (Light/Dark/Darkest) |
| UI-role tokens (Level 3) | Component-scoped tokens |
| Theme = alias passthrough | System = brand multiplexer |
| T-shirt sizing implicit | T-shirt sizing explicit (8px linear + non-linear scales) |

---

## Recommendations

### 1. Add as 6th Organizing Principle

Add `'spectrum'` to the `OrganizingPrincipleName` union type alongside the existing five. This would be the **most component-oriented** option, ideal for teams building component libraries.

### 2. Consider Flat Naming as an Option

Spectrum's flat naming (`accent-background-color-default`) vs the current hierarchical naming (`Brand/Primary`) could be offered as a naming strategy toggle across all organizing principles.

### 3. 3-Theme Mode Support

The "Darkest" theme is a real-world need (code editors, media viewers, video editing UIs). Consider supporting 3 modes in the Alias and Component collections.

### 4. Component Token Generation

When used with the `/component-library` workflow, the Spectrum principle could auto-generate component-scoped tokens like `button-background-color-default`, `button-border-color-hover`, etc. based on the component variants being created.

### 5. Contrast-Ratio Color Scales

Consider adopting Spectrum's approach of generating color scales from target contrast ratios rather than simple lightness interpolation. This ensures WCAG compliance by construction.

---

## Sources

- [Spectrum Design Tokens](https://spectrum.adobe.com/page/design-tokens/)
- [Spectrum Color System](https://spectrum.adobe.com/page/color-system/)
- [Spectrum Color Fundamentals](https://spectrum.adobe.com/page/color-fundamentals/)
- [Spectrum Typography](https://spectrum.adobe.com/page/typography/)
- [Spectrum Spacing](https://spectrum.adobe.com/page/spacing/)
- [Spectrum Object Styles](https://spectrum.adobe.com/page/object-styles/)
- [Spectrum Platform Scale](https://spectrum.adobe.com/page/platform-scale/)
- [Spectrum Iconography](https://spectrum.adobe.com/page/iconography/)
- [Spectrum Principles](https://spectrum.adobe.com/page/principles/)
- [Spectrum Inclusive Design](https://spectrum.adobe.com/page/inclusive-design/)
- [Spectrum CSS Architecture (DeepWiki)](https://deepwiki.com/adobe/spectrum-css/2.3-css-architecture)
- [Spectrum Design Data (GitHub)](https://github.com/adobe/spectrum-design-data)
- [Garth Braithwaite on Scaling Spectrum (Knapsack)](https://www.knapsack.cloud/blog/garth-braithwaite-on-design-tokens-governance-and-scaling-spectrum-at-adobe)
- [Spectrum Token Visualizer](https://opensource.adobe.com/spectrum-design-data/tokens/)
