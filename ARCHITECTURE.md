# Architecture

Flam-Aditor separates the adaptive layout engine from the React presentation
layer. The resolver is responsible for layout decisions, while React is
responsible for rendering and interaction.

## Component Architecture

```text
src/
├── components/
│   ├── AdPreview.tsx
│   ├── SurfacePicker.tsx
│   ├── Inspector.tsx
│   ├── ExplainLayout.tsx
│   └── ResolutionFlow.tsx
│
├── engine/
│   ├── types.ts
│   ├── spec.ts
│   ├── surfaces.ts
│   ├── resolver.ts
│   └── validation.ts
│
├── data/
│   └── ad.ts
│
├── test/
│   ├── setup.ts
│   └── resolver.test.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

### Responsibilities

**components/**  
React components for surface selection, ad preview, layout inspection, and
resolution explanations.

**engine/**  
Framework-independent TypeScript code containing the specification model,
surface constraints, resolver, and validation logic.

**data/**  
Advertisement content and image assets.

**test/**  
Automated tests for the layout resolver.

---

## Engine Architecture

The engine follows this flow:

```text
Ad Specification + Surface Profile
                ↓
       Constraint Resolver
                ↓
        Resolved Layout
                ↓
            Renderer
```

The resolver does not depend on React or the DOM. It receives typed data and
returns a `ResolvedLayout` containing element positions, sizes, visibility,
and resolution decisions.

### Core Modules

### `types.ts`

Defines the core TypeScript models:

- `AdElement`
- `AdSpecification`
- `SurfaceProfile`
- `SafeArea`
- `ResolutionDecision`
- `ResolvedElement`
- `ResolvedLayout`
- `ResolutionError`

These types define the contracts between the specification, surface
constraints, resolver, and renderer.

### `spec.ts`

Contains the declarative advertisement specification.

The specification describes the elements using their type, role, priority,
and content. It does not contain surface-specific coordinates.

### `surfaces.ts`

Contains the supported surface profiles and their constraints.

Current surfaces include:

- Mobile Portrait — 320 × 480
- Mobile Landscape — 640 × 360
- Broadcast Lower Third — 1920 × 250
- Square Kiosk — 1080 × 1080
- Constrained — 150 × 150

### `resolver.ts`

Contains the core adaptive layout algorithm.

The resolver:

- Validates inputs
- Calculates the usable safe area
- Determines an appropriate composition
- Processes elements according to priority
- Generates candidate positions and sizes
- Checks bounds and safe-area constraints
- Prevents overlap
- Enforces minimum tap targets
- Repositions or resizes elements when possible
- Degrades lower-priority elements when necessary
- Records resolution decisions
- Validates the final layout

### `validation.ts`

Provides validation for advertisement specifications, surface profiles, and
resolved layouts.

---

## Data Flow

```text
User selects a surface
        ↓
SurfacePicker
        ↓
App retrieves SurfaceProfile
        ↓
resolveLayout(adSpec, surface)
        ↓
ResolvedLayout
        ↓
AdPreview renders the result
        ↓
Inspector displays resolution information
```

When the selected surface changes, the same advertisement specification is
resolved again against the new surface profile.

---

## Resolution Flow

The resolver follows these main stages:

1. Validate the advertisement specification and surface.
2. Calculate the usable safe-area rectangle.
3. Determine the composition appropriate for the surface dimensions and
   constraints.
4. Process elements according to priority.
5. Generate candidate sizes and positions.
6. Reject candidates that violate surface bounds or safe-area constraints.
7. Reject candidates that overlap already resolved elements.
8. Check interactive elements against minimum tap-target requirements.
9. Try alternative sizes or positions when the first candidate cannot be used.
10. Degrade lower-priority elements when no valid placement remains.
11. Mark unresolved elements as dropped.
12. Validate the final composition.
13. Store resolution decisions for inspection.

The result is a composed layout rather than a uniformly scaled version of the
original advertisement.

---

## Priority and Degradation

Each element has a priority from `1` to `5`.

```text
1 = highest priority
5 = lowest priority
```

Higher-priority elements are resolved first.

When space becomes insufficient, the resolver attempts to preserve important
content before lower-priority content.

Depending on the available space, an element may be:

1. Placed normally
2. Resized
3. Repositioned
4. Dropped if no valid placement remains

This allows constrained surfaces to contain the most important content without
allowing elements to overlap or leave the valid surface area.

---

## TypeScript Design

The engine uses strongly typed TypeScript models for its inputs and outputs.

For example:

```text
AdSpecification
      ↓
SurfaceProfile
      ↓
resolveLayout()
      ↓
ResolvedLayout
```

`AdElement` restricts valid element types, roles, priorities, and content.

`SurfaceProfile` defines dimensions and optional constraints such as safe areas,
minimum tap targets, and minimum text size.

`ResolvedElement` defines the geometry and visibility produced by the resolver.

Keeping these models separate prevents rendering code from becoming
responsible for layout decisions and keeps the core engine testable.

---

## Rendering Separation

### Resolver

`resolver.ts` is responsible for:

- Position
- Size
- Visibility
- Constraint checking
- Priority/degradation
- Resolution decisions

It returns data rather than manipulating the DOM.

### Renderer

`AdPreview.tsx` is responsible for:

- Rendering the resolved rectangles
- Displaying text, images, and buttons
- Applying visual styling
- Handling element selection and interaction

The renderer does not calculate the adaptive layout.

This separation means the resolver can be tested independently of React and
could support another rendering backend in the future.

---

## Adding a New Surface

A new surface can be added by providing another `SurfaceProfile` in
`surfaces.ts`.

Example:

```typescript
'new-surface': {
  width: 800,
  height: 600,
  safeArea: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  minTapTarget: 44,
  viewingDistance: 'near',
},
```

The resolver uses the surface's dimensions and constraints when calculating
the layout. No CSS media-query breakpoint is required for the engine to make
the layout decision.

---

## Extensibility

The architecture can be extended with:

- New element types
- New surface profiles
- Additional surface constraints
- Additional composition strategies
- Additional rendering backends

The existing `ResolvedLayout` interface provides a common boundary between
layout resolution and rendering.

---

## Testing Strategy

The resolver is the main focus of automated testing because it contains the
core layout logic.

The test suite verifies:

- Valid layouts
- Different compositions across surfaces
- Priority and degradation behavior
- No element overlap
- Surface-bound compliance
- Minimum tap-target compliance
- Resolution decision metadata
- Dropped-element decisions

The React interface can also be checked manually by running the local demo
and switching between the supported surfaces.
