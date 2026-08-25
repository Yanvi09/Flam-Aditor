# Flam-Aditor — Adaptive Layout Engine

Flam-Aditor is an adaptive layout engine that resolves one declarative ad
specification across multiple surfaces with different dimensions and
constraints.

The engine re-composes the layout for each surface instead of relying on
uniform scaling or CSS media-query breakpoints.

## Setup

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

##Run the Demo

Start the development server:

```npm run dev```

Open the Vite URL shown in the terminal.

**Use the Surface Controls panel to switch between:

**Mobile Portrait
**Mobile Landscape
**Broadcast Lower Third
**Square Kiosk
**Constrained

The same ad specification is resolved again for each selected surface.

##Run Tests
```npm test
```
The test suite verifies layout validity, different surface compositions,
priority/degradation, overlap prevention, surface bounds, minimum tap
targets, and resolution decision metadata.

##Resolution Flow
Ad Spec + Surface Profile
        ↓
Constraint Resolver
        ↓
Resolved Layout
        ↓
Renderer

The Ad Spec defines the advertisement elements, roles, priorities, and
content.

The Surface Profile defines the target dimensions and constraints.

The Constraint Resolver converts these inputs into resolved positions,
sizes, and visibility decisions.

The Renderer displays the resolved layout.

Layout Algorithm

The resolver works in the following steps:

Validate the ad specification and surface constraints.
Calculate the usable safe-area rectangle.
Determine the composition strategy from the surface profile.
Generate candidate positions and sizes for the elements.
Resolve higher-priority elements first.
Check candidates against surface bounds and safe-area constraints.
Check for overlap with already resolved elements.
Enforce minimum tap-target requirements for interactive elements.
Resize or reposition elements when a valid alternative is available.
Degrade lower-priority elements when available space is insufficient.
Drop an element when no valid placement remains.
Validate the final layout and record resolution decisions.

Priority and Degradation

Each element has a priority from 1 (highest) to 5 (lowest).

Higher-priority elements are preserved first when space is limited.

Lower-priority elements can be:

repositioned
resized
dropped when no valid placement remains

This allows the engine to create a different composition for each surface
instead of simply shrinking the complete advertisement.

TypeScript Design

The core layout model uses strongly typed TypeScript interfaces and types.

Important types include:

AdElement
AdSpecification
SurfaceProfile
SafeArea
ResolutionDecision
ResolvedElement
ResolvedLayout
ResolutionError
LayoutStrategy

AdSpecification defines what the advertisement contains.

SurfaceProfile defines the dimensions and constraints of the target
surface.

ResolvedLayout defines the final geometry and visibility decisions.

Keeping these models separate allows the resolver to work with typed
specifications and surface constraints while preventing invalid data shapes
from being passed between the layout stages.

Validation

The resolver validates:

Surface bounds
Safe-area constraints
Element overlap
Minimum tap-target requirements
Visible element count
Dropped element count
Resolution decisions

The Layout Inspector exposes the resolved positions, sizes, visibility, and
resolution decisions for individual elements.

Supported Surfaces

Mobile Portrait
320 × 480 — 44px minimum tap target

Mobile Landscape
640 × 360 — 44px minimum tap target

Broadcast Lower Third
1920 × 250 — 32px minimum text size

Square Kiosk
1080 × 1080 — 60px minimum tap target

Constrained
150 × 150 — 44px minimum tap target

Known Limitations
Supported element types are currently limited to text, image, and button.
Text layout uses geometry-based font-size estimation rather than actual
browser text measurement.
Rendering is currently DOM/React based; there is no Canvas backend.
Composition strategies are predefined.
Advanced print constraints such as bleed and trim are not implemented.
Contrast-aware branding placement is not currently a dedicated resolver
constraint.

Project Structure
```
src/
├── components/
│   ├── AdPreview.tsx
│   ├── Inspector.tsx
│   ├── SurfacePicker.tsx
│   ├── ExplainLayout.tsx
│   └── ResolutionFlow.tsx
│
├── data/
│   └── ad.ts
│
├── engine/
│   ├── resolver.ts
│   ├── spec.ts
│   ├── surfaces.ts
│   ├── types.ts
│   └── validation.ts
│
└── test/
    └── resolver.test.ts
    ```

Time Spent

Approximately:5 days
