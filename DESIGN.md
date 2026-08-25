# Design Decisions

## Why I Chose This Project

I chose the **Adaptive Layout Engine for Multi-Surface Ads** because it
provides the best opportunity to demonstrate frontend problem-solving beyond
basic UI implementation.

The project combines:

- TypeScript architecture
- Constraint-based layout logic
- Responsive composition
- Priority and degradation handling
- Interactive React UI
- Multiple surface types

I also liked that the same ad specification has to work across very different
surfaces. This makes the problem more interesting than simply creating a
responsive page with CSS breakpoints.

## Main Design Goal

The main goal was to make the layout **adapt to the available surface**
instead of uniformly scaling the complete advertisement.

The resolver therefore decides the position, size, and visibility of each
element for the selected surface.

## Key Design Decisions

### 1. Declarative Ad Specification

The advertisement content is kept separate from layout decisions.

The specification contains elements, roles, priorities, and content, while
the resolver decides where and how those elements should appear.

This makes the same specification reusable across different surfaces.

### 2. Typed Surface Profiles

Each surface is represented by a `SurfaceProfile` containing dimensions,
safe-area information, and optional constraints such as minimum tap target or
minimum text size.

Using TypeScript types keeps the input and output of the layout engine
consistent.

### 3. TypeScript Resolver Instead of CSS Breakpoints

The main layout decisions are made by the TypeScript resolver.

CSS is used for rendering and presentation, but it is not responsible for
deciding the adaptive composition.

This keeps the layout logic centralized and testable.

### 4. Priority-Based Degradation

Not every element has the same importance.

Elements have a priority from 1 to 5. Higher-priority elements are preserved
first when space becomes limited.

Lower-priority elements can be resized, repositioned, or dropped when no valid
placement remains.

### 5. Candidate-Based Placement

The resolver tries valid candidate positions and sizes rather than assuming
one fixed position for every element.

Each candidate is checked against:

- Safe area
- Surface bounds
- Existing elements
- Minimum interaction constraints

This helps prevent overlapping or clipped elements.

### 6. Separate Resolver and Renderer

The resolver produces a `ResolvedLayout`.

The React renderer only displays that resolved layout.

This separation makes it possible to change the rendering layer later without
rewriting the core layout algorithm.

### 7. Layout Inspector

I added the Layout Inspector to make the resolution process visible.

It shows the resolved position, size, visibility, and resolution information
for individual elements.

This makes the engine easier to understand and debug during the demo.

## Design Trade-offs

I kept the implementation focused on the requirements of the assignment rather
than adding unnecessary features.

The current version uses a DOM/React renderer and geometry-based text sizing.
More advanced features such as Canvas rendering and browser-based text
measurement can be added later without changing the main resolver interface.

## Result

The final design allows one ad specification to produce different layouts for
mobile portrait, mobile landscape, broadcast, square kiosk, and constrained
surfaces while keeping the core specification and rendering layers separate.
