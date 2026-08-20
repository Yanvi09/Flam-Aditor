# Architecture

## Component Architecture

```
src/
├── components/          # React UI components
│   ├── AdPreview.tsx   # Renders resolved layout
│   ├── SurfacePicker.tsx  # Surface selection UI
│   ├── Inspector.tsx   # Layout information display
│   ├── ExplainLayout.tsx  # Killer feature: layout explanations
│   └── ResolutionFlow.tsx  # Visual resolution pipeline
│
├── engine/             # Framework-agnostic layout engine
│   ├── types.ts        # TypeScript type definitions
│   ├── spec.ts         # Advertisement specification
│   ├── surfaces.ts     # Surface profile definitions
│   ├── resolver.ts     # Core layout resolution algorithm
│   └── validation.ts   # Input validation
│
├── data/               # Application data
│   └── ad.ts          # Ad content and assets
│
├── test/              # Test suite
│   ├── setup.ts       # Test configuration
│   └── resolver.test.ts  # Resolver tests
│
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles
```

## Engine Architecture

The layout engine is completely independent of React and can be used in any JavaScript/TypeScript environment.

### Core Modules

**types.ts**: Defines all data structures
- `AdElement`: Single ad element with type, role, priority
- `AdSpecification`: Collection of ad elements
- `SurfaceProfile`: Surface constraints and dimensions
- `ResolvedElement`: Output with position, size, visibility
- `ResolvedLayout`: Complete resolved layout with metadata

**spec.ts**: Advertisement content
- Single ad specification for NV Skin Daily Reset
- Five elements: headline, product, CTA, price, logo
- Fixed content used across all surfaces

**surfaces.ts**: Surface constraint profiles
- Mobile Portrait (320×480)
- Mobile Landscape (640×360)
- Broadcast Lower-Third (1920×250)
- Square Kiosk (1080×1080)
- Constrained (150×150) - for testing degradation

**resolver.ts**: Core resolution algorithm
- `resolveLayout()`: Main entry point
- Priority-based element sorting
- Composition selection based on aspect ratio
- Sequential element placement
- Overlap detection and prevention
- Bounds checking
- Priority-based degradation

**validation.ts**: Input validation
- `validateAdSpec()`: Checks element IDs, priorities
- `validateSurface()`: Checks dimensions, constraints

## Data Flow

```
User selects surface
       ↓
SurfacePicker sends surface name to App
       ↓
App retrieves SurfaceProfile from surfaces.ts
       ↓
App calls resolveLayout(adSpec, surfaceProfile)
       ↓
Resolver processes specification + constraints
       ↓
Resolver returns ResolvedLayout
       ↓
App passes ResolvedLayout to components
       ↓
AdPreview renders elements at resolved positions
       ↓
Inspector shows layout information
       ↓
ExplainLayout explains selected element's resolution
```

## Resolver Flow

1. **Validation**: Check spec and surface for errors
2. **Space Calculation**: Determine usable width/height from safe area
3. **Element Sorting**: Sort elements by priority (1 → 2 → 3)
4. **Composition Selection**: Choose layout based on aspect ratio
5. **Element Sizing**: Calculate appropriate sizes for each element
6. **Position Finding**: Find valid position without overlap
7. **Bounds Checking**: Ensure element stays within surface
8. **Space Update**: Update available space for next element
9. **Degradation**: Drop elements that can't fit
10. **Result Assembly**: Return resolved layout with metadata

## Why Resolver Is Framework-Independent

The resolver:
- Uses only plain TypeScript
- Has no React dependencies
- Returns pure data structures
- Can be tested without DOM
- Can be used in Node.js, React, Vue, Angular, etc.
- Makes layout decisions based only on input data

This separation allows:
- Easy testing of core algorithm
- Potential reuse in other contexts
- Clear separation of concerns
- Better interview explanation

## How to Add a New Surface

1. Add surface profile to `src/engine/surfaces.ts`:

```typescript
export const surfaces: Record<string, SurfaceProfile> = {
  // existing surfaces...
  'new-surface': {
    width: 800,
    height: 600,
    safeArea: { top: 20, right: 20, bottom: 20, left: 20 },
    minTapTarget: 44,
    viewingDistance: 'near',
  },
};
```

2. The resolver will automatically handle it because:
- It operates on surface properties, not names
- No hardcoded layout branches per surface
- Composition is derived from aspect ratio
- Same algorithm works for any dimensions

## How to Add a New Element Type

1. Add type to `ElementType` in `src/engine/types.ts`:

```typescript
export type ElementType = 'text' | 'image' | 'button' | 'video';
```

2. Add role to `ElementRole` if needed:

```typescript
export type ElementRole = 'primary' | 'hero' | 'action' | 'secondary' | 'branding' | 'media';
```

3. Update `calculateElementSize()` in `src/engine/resolver.ts` to handle the new type:

```typescript
case 'video':
  return {
    width: availableSpace.width * 0.6,
    height: availableSpace.height * 0.4,
  };
```

4. Update rendering in `src/components/AdPreview.tsx`:

```typescript
case 'video':
  return <video src={specElement.src} style={{ width: '100%', height: '100%' }} />;
```

## How Degradation Works

When space is insufficient:

1. Elements are processed in priority order (1 → 2 → 3)
2. Higher-priority elements are placed first
3. Lower-priority elements are placed next
4. If an element can't fit:
   - Try to reduce its size
   - Try to reposition it
   - Drop it as final fallback
5. The "Explain Layout" feature shows the degradation sequence

Example with constrained surface:
- Priority 1 (headline, product): Always preserved
- Priority 2 (CTA, price): Preserved when possible
- Priority 3 (branding): First to be dropped

## How Rendering Is Separated From Resolution

**Resolution (resolver.ts)**:
- Calculates positions and sizes
- Returns pure data (numbers, booleans)
- No DOM knowledge
- No CSS knowledge
- No React knowledge

**Rendering (AdPreview.tsx)**:
- Receives resolved coordinates
- Applies CSS styling
- Handles user interaction
- Performs visual transitions
- No layout decision logic

This separation ensures:
- Layout algorithm is testable without browser
- Same resolver could work with different renderers
- Clear data flow
- Easier debugging

## Extensibility Points

The architecture supports extension through:

1. **New Element Types**: Add to ElementType and update resolver
2. **New Surface Types**: Add to surfaces object, no resolver changes needed
3. **New Constraints**: Add to SurfaceProfile interface
4. **New Composition Strategies**: Modify determineComposition() function
5. **New Rendering Targets**: Create new renderer using same ResolvedLayout

## Testing Strategy

Tests focus on the resolver because:
- It contains the core engineering logic
- It's framework-independent
- It's the most valuable to verify

Test coverage:
- Valid layout generation for different surfaces
- Layout differences between surfaces
- Constraint degradation behavior
- Overlap prevention
- Bounds checking
- Tap target compliance

React components are tested manually through the live demo since they're primarily visual.