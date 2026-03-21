# Bridge to Fig — Demo Video Storyboard

**Target length:** 3–4 minutes
**Tone:** Fast-paced, visual, minimal narration. Let the speed speak for itself.
**Music:** Upbeat electronic/lo-fi — something that says "the future is now"

---

## Act 1: The Problem (0:00–0:30)

### Shot 1 — The Pain (0:00–0:15)
**Type:** Screen recording (sped up 4×)
**What to show:** A designer manually creating variables in Figma.
- Open Variables panel
- Type a variable name, pick a color, click create
- Repeat… and repeat… and repeat
- Show the clock — this takes *forever*

**Text overlay:** `"Creating a design system by hand?"`
**Text overlay:** `"200+ variables. 551+ clicks. 8–12 hours."`

### Shot 2 — The Promise (0:15–0:30)
**Type:** Title card / motion graphic
**Visual:** Bridge to Fig logo animates in. Terminal cursor blinks.

**Text overlay:**
```
What if one command could do all of it?
```

**Cut to black → Bridge to Fig logo**

---

## Act 2: The Demos (0:30–3:00)

> Each demo follows the same rhythm:
> 1. Show the **empty Figma canvas** (1–2 sec)
> 2. Show the **command being typed** in the terminal (2–3 sec)
> 3. Show the **result appearing in Figma** (3–5 sec)
> 4. Quick zoom into the details (2–3 sec)

---

### Demo 1 — Design System in One Command (0:30–1:10)

**The hero demo. This is the one that makes people stop scrolling.**

#### Shot 3 — Empty Canvas (0:30–0:32)
**Type:** Screen recording
**What to show:** A blank Figma file. Nothing in it. Variables panel is empty.

#### Shot 4 — The Command (0:32–0:38)
**Type:** Screen recording (terminal beside Figma, side-by-side)
**What to show:** Type the slash command in Claude Code:
```
/design-system
```
Claude asks a couple quick questions — you answer "use brand color #FF6D38" and "include boilerplate."

**Text overlay:** `"One command. One brand color."`

#### Shot 5 — It Builds (0:38–0:55)
**Type:** Screen recording (Figma window focused)
**What to show:** The Variables panel *explodes* with content:
- Primitive collection appears (175+ color, spacing, type variables)
- Semantic collection appears (brand aliases)
- Token collection appears (Surface, Text, Border, Icon tokens)
- Theme collection appears (Light/Dark mode ready)

Show the variable panel scrolling — it's FULL.

**Text overlay:** `"200+ variables. 4 collections. Light & Dark modes."`
**Text overlay:** `"Time: 47 seconds."`

#### Shot 6 — Zoom In (0:55–1:10)
**Type:** Screen recording with zooms
**What to show:**
- Click into Primitive collection → show the 50–950 color scales (11 steps per color)
- Switch to Token collection → show Light Mode / Dark Mode columns
- Toggle between modes — values change

**Text overlay:** `"Complete token hierarchy. Production-ready."`

---

### Demo 2 — Website to Design System (1:10–1:50)

**Show that you can steal any website's design system.**

#### Shot 7 — Pick a Target (1:10–1:15)
**Type:** Screen recording (browser)
**What to show:** Navigate to a visually polished website (e.g., Linear, Vercel, Stripe).
Pause on the homepage — let the viewer see the design.

#### Shot 8 — Extract It (1:15–1:25)
**Type:** Screen recording (terminal)
**What to show:**
```
/design-system-website
```
Enter the URL. Claude runs `extractWebsiteCSS` — the terminal shows:
- Colors found (with usage counts)
- Typography detected
- Spacing values
- Border radius
- Shadows

**Text overlay:** `"Headless browser extracts every computed style."`

#### Shot 9 — It Appears in Figma (1:25–1:40)
**Type:** Screen recording (Figma)
**What to show:** Variables panel fills up — but this time with the *website's actual values*.
- Primary color matches the website
- Font sizes match
- Spacing matches

**Text overlay:** `"Not approximations. Computed values from live CSS."`

#### Shot 10 — Side-by-Side (1:40–1:50)
**Type:** Split screen — website on left, Figma variables on right
**What to show:** Color-match between the website's hero section and the Figma primitives.

**Text overlay:** `"Any website. Any CSS methodology. Every token."`

---

### Demo 3 — Website Captured into Figma (1:50–2:15)

**The "wow" demo — an entire website appears as Figma frames.**

#### Shot 11 — Empty Canvas Again (1:50–1:52)
**Type:** Screen recording

#### Shot 12 — Capture Command (1:52–1:58)
**Type:** Screen recording (terminal)
**What to show:**
```
/website-to-figma
```
Enter a URL. Claude uses MCP to screenshot and capture the site.

#### Shot 13 — Frames Appear (1:58–2:10)
**Type:** Screen recording (Figma, zoomed out)
**What to show:** Full-page frames appear — hero, features, pricing, footer — all as editable Figma layers. Zoom in to show it's not just a flat screenshot — it's structured frames.

**Text overlay:** `"Full website → editable Figma frames. 5 minutes."`

#### Shot 14 — Optional Upgrade (2:10–2:15)
**Type:** Quick screen flash
**What to show:** Running `/design-system-website` on top of the captured frames — now the capture has a full variable system bound to it.

**Text overlay:** `"Add a design system on top? One more command."`

---

### Demo 4 — Variable Binding (2:15–2:35)

**Show the automation of the most tedious task in design systems.**

#### Shot 15 — The Problem (2:15–2:20)
**Type:** Screen recording
**What to show:** A frame with 50+ elements. Each one needs its fill/stroke/text color bound to a variable. Show the manual process: click element → open fill → click variable icon → search → select → repeat.

**Text overlay:** `"551 elements. 551 clicks. Per. Frame."`

#### Shot 16 — The Fix (2:20–2:30)
**Type:** Screen recording (terminal + Figma side by side)
**What to show:**
```
/bind-variables
```
Claude scans the frame, matches colors to variables by role (Surface, Text, Border), binds them all.

**Text overlay:** `"All bound. Every element. 30 seconds."`

#### Shot 17 — Proof (2:30–2:35)
**Type:** Screen recording
**What to show:** Click on any element → the fill shows a variable bound (the hex badge with the variable name). Click another — also bound. They're all bound.

---

### Demo 5 — FigJam Diagrams (2:35–2:50)

**Show that it's not just design systems — it does FigJam too.**

#### Shot 18 — Describe a Flow (2:35–2:40)
**Type:** Screen recording (terminal)
**What to show:**
```
/figjam-workflow
```
Describe a user flow: "User signs up, verifies email, completes onboarding, reaches dashboard."

#### Shot 19 — Diagram Appears (2:40–2:50)
**Type:** Screen recording (FigJam board)
**What to show:** Sections, shapes with labels, and connectors appear — a professional flow diagram, properly laid out with correct spacing.

**Text overlay:** `"Describe it. It draws it."`

---

### Demo 6 — Engineering Handoff (2:50–3:05)

**Show the bridge from design to code.**

#### Shot 20 — Select a Component (2:50–2:55)
**Type:** Screen recording (Figma)
**What to show:** Select a card component or a button set.

#### Shot 21 — Generate Handoff (2:55–3:00)
**Type:** Screen recording (terminal)
**What to show:**
```
/engineering-handoff
```
Claude analyzes the selection and generates: CSS, design tokens, spacing specs, color references, accessibility notes.

#### Shot 22 — The Output (3:00–3:05)
**Type:** Screen recording (code editor / terminal output)
**What to show:** Scroll through the generated spec — clean CSS with variable references, responsive breakpoints, token mappings.

**Text overlay:** `"From Figma to code. No guessing."`

---

## Act 3: The Closer (3:05–3:30)

### Shot 23 — The Numbers (3:05–3:15)
**Type:** Motion graphic / title cards (quick cuts, 2 sec each)

| Card | Text |
|------|------|
| 1 | `Design System from scratch → 5 min (not 12 hours)` |
| 2 | `Design System from any website → 15 min (not 3 days)` |
| 3 | `Variable binding → 30 sec (not 551 clicks)` |
| 4 | `Website to Figma → 5 min (not 2 weeks)` |

### Shot 24 — Architecture Flash (3:15–3:20)
**Type:** Motion graphic
**What to show:** The architecture diagram:
```
Claude Code ←→ Bridge Server ←→ Figma Plugin
```
Simple. Three boxes. Arrows. Done.

**Text overlay:** `"Open source. Runs locally. Your data stays yours."`

### Shot 25 — Call to Action (3:20–3:30)
**Type:** Title card
**Visual:** Bridge to Fig logo, GitHub URL, terminal prompt blinking.

**Text:**
```
Bridge to Fig
github.com/Brooksmade/Bridge-to-Fig

One command. Complete design systems.
```

---

## Production Notes

### Screen Recording Setup
- **Resolution:** 1920×1080 minimum, 4K preferred
- **Figma:** Use a clean file, dark UI theme for contrast
- **Terminal:** Use a clean terminal with large font (16pt+), dark theme
- **Layout:** Side-by-side (terminal left 40%, Figma right 60%) for command → result shots
- **Cursor:** Make cursor large and visible; consider a cursor highlighter tool

### Screenshots Needed (for thumbnails / social)
1. **Before/After split** — empty Variables panel vs. full Variables panel
2. **Side-by-side** — website screenshot next to Figma variables extracted from it
3. **The command** — clean terminal showing `/design-system` with the result summary
4. **Variable binding proof** — element selected showing bound variable in the fill panel
5. **Architecture diagram** — clean version of the Claude ↔ Server ↔ Plugin flow
6. **Time comparison** — the pipeline table from the README, styled as a graphic

### Screencasts to Record (raw footage)
| # | What | Duration | Notes |
|---|------|----------|-------|
| 1 | Manual variable creation (pain shot) | 30 sec | Speed up 4× in edit |
| 2 | `/design-system` full run | 2–3 min | Real-time, speed up to ~45 sec |
| 3 | `/design-system-website` with a public site | 3–5 min | Real-time, speed up to ~30 sec |
| 4 | `/website-to-figma` capture | 3–5 min | Real-time, speed up to ~20 sec |
| 5 | `/bind-variables` on a multi-element frame | 1–2 min | Real-time, speed up to ~15 sec |
| 6 | `/figjam-workflow` diagram creation | 2–3 min | Real-time, speed up to ~15 sec |
| 7 | `/engineering-handoff` on a component | 1–2 min | Real-time, speed up to ~10 sec |
| 8 | Variables panel walkthrough (zoom-ins) | 1 min | Slow, detailed |
| 9 | Mode switching (Light/Dark toggle) | 30 sec | Show values changing |

### Suggested Websites for Demo 2
Pick one that's visually distinctive so the color extraction is obviously correct:
- **Linear.app** — purple/violet brand, clean design
- **Vercel.com** — black/white with blue accents
- **Stripe.com** — purple gradients, distinctive palette
- **Notion.so** — warm neutrals, recognizable
- **Raycast.com** — vibrant gradients

### Software Needed
- **Screen recorder:** OBS Studio (free) or ScreenFlow (Mac)
- **Video editor:** DaVinci Resolve (free) or Premiere Pro
- **Motion graphics:** After Effects or Motion (for title cards)
- **Cursor highlight:** Presentify (Mac) or CursorFX (Windows)
- **Terminal beautifier:** Consider recording in VS Code integrated terminal for cleaner look

### Music Sources (royalty-free)
- Epidemic Sound
- Artlist
- YouTube Audio Library (free)
- Search for: "tech product demo," "upbeat minimal electronic," "startup promo"
