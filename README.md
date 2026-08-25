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

`npm install`

## Run the Demo

Start the development server:

`npm run dev`

Open the Vite URL shown in the terminal.

Use the **Surface Controls** panel to switch between:

- Mobile Portrait
- Mobile Landscape
- Broadcast Lower Third
- Square Kiosk
- Constrained

The same ad specification is resolved again for each selected surface.

## Run Tests

Run the test suite with:

`npm test`

The tests verify:

- Layout validity
- Different compositions across surfaces
- Priority and degradation
- Overlap prevention
- Surface bounds
- Minimum tap targets
- Resolution decision metadata

## Resolution Flow

Ad Spec + Surface Profile → Constraint Resolver → Resolved Layout → Renderer

The **Ad Spec** defines the advertisement elements, roles, priorities, and
content.

The **Surface Profile** defines the target dimensions and constraints.

The **Constraint Resolver** converts these inputs into positions, sizes, and
visibility decisions.

The **Renderer** displays the resolved layout.

## Layout Algorithm

The resolver works in the following steps:

1. Validate the ad specification and surface constraints.
2. Calculate the usable safe area.
3. Determine the composition strategy from the surface profile.
4. Generate candidate positions and sizes.
5. Resolve higher-priority elements first.
6. Check bounds, safe area, and overlap constraints.
7. Enforce minimum tap-target requirements.
8. Resize or reposition elements when possible.
9. Degrade lower-priority elements when space is insufficient.
10. Drop an element when no valid placement remains.
11. Validate the final layout.
12. Record resolution decisions for the Layout Inspector.

### Priority and Degradation

Each element has a priority from **1 (highest)** to **5 (lowest)**.

When space is limited, higher-priority elements are preserved first.

Lower-priority elements may be:

- Repositioned
- Resized
- Dropped when no valid placement remains

This allows the engine to create a different composition for each surface
instead of simply shrinking the complete advertisement.

## TypeScript Design

The layout engine uses strongly typed TypeScript models.

Important types include:

- `AdElement`
- `AdSpecification`
- `SurfaceProfile`
- `SafeArea`
- `ResolutionDecision`
- `ResolvedElement`
- `ResolvedLayout`
- `ResolutionError`
- `LayoutStrategy`

`AdSpecification` defines what the advertisement contains.

`SurfaceProfile` defines the dimensions and constraints of the target
surface.

`ResolvedLayout` defines the final geometry and visibility decisions.

Keeping these models separate prevents the specification, surface
constraints, resolver output, and renderer from being tightly coupled.

The resolver operates on typed data rather than relying on CSS breakpoints.

## Validation

The resolver validates:

- Surface bounds
- Safe-area constraints
- Element overlap
- Minimum tap-target requirements
- Visible element count
- Dropped element count
- Resolution decisions

The Layout Inspector exposes the final position, size, visibility, and
resolution information for each resolved element.

## Supported Surfaces

**Mobile Portrait**  
320 × 480 — 44px minimum tap target

**Mobile Landscape**  
640 × 360 — 44px minimum tap target

**Broadcast Lower Third**  
1920 × 250 — 32px minimum text size

**Square Kiosk**  
1080 × 1080 — 60px minimum tap target

**Constrained**  
150 × 150 — 44px minimum tap target

## Known Limitations

- Supported element types are currently limited to text, image, and button.
- Text layout uses geometry-based font-size estimation rather than actual
  browser text measurement.
- Rendering is currently DOM/React based; there is no Canvas backend.
- Composition strategies are predefined.
- Advanced print constraints such as bleed and trim are not implemented.
- Contrast-aware branding placement is not currently a dedicated resolver
  constraint.

## Project Structure

- `src/components/` — UI, preview, inspector, and resolution flow
- `src/data/` — advertisement data and assets
- `src/engine/` — resolver, specification, surfaces, types, and validation
- `src/test/` — resolver tests

## Time Spent

Approximately: **5 days**



See [`DESIGN.md`](./DESIGN.md) for the design decisions and architecture
behind the implementation.
