# Flam-Aditor

A constraint-based adaptive layout engine for multi-surface advertisements.

## What is Flam-Aditor?

Flam-Aditor is a frontend engineering demonstration that shows how a single advertisement specification can be automatically adapted to different display surfaces using a constraint-based layout resolver. The engine takes declarative content and surface constraints, then produces valid layouts without manual positioning for each surface.

## Problem

In modern advertising, the same content needs to work across fundamentally different surfaces:

- **Mobile Portrait**: Tall, narrow screens (320×480)
- **Mobile Landscape**: Wide, short screens (640×360)  
- **Broadcast Lower-Third**: Very wide displays (1920×250)
- **Square Kiosk**: Large touch displays (1080×1080)

Each surface has different constraints:
- Screen dimensions and aspect ratios
- Safe areas for system UI
- Minimum tap targets for touch
- Minimum text sizes for viewing distance
- Touch-only vs. remote input

Traditional responsive CSS isn't enough because it doesn't handle priority-based degradation when space is insufficient.

## Architecture

```
Ad Spec
   ↓
Surface Profile
   ↓
Constraint Resolver
   ↓
Resolved Layout
   ↓
DOM Renderer
```

The architecture separates concerns:
1. **Ad Specification**: Declarative content with priorities and roles
2. **Surface Profile**: Constraint definitions for each surface type
3. **Resolver**: Framework-agnostic TypeScript algorithm
4. **Resolved Layout**: Typed output with exact positions and sizes
5. **Renderer**: React component that renders the resolved coordinates

## Algorithm

The resolver uses a priority-based greedy algorithm:

### Step 1: Calculate Available Space
- Subtract safe area from surface dimensions
- Determine usable width and height

### Step 2: Sort Elements by Priority
- Priority 1: Headline, hero product (critical)
- Priority 2: CTA, price (important)
- Priority 3: Branding (nice-to-have)

### Step 3: Determine Element Sizes
- Calculate minimum/maximum sizes based on:
  - Surface dimensions
  - Element type (text, image, button)
  - Tap target constraints
  - Minimum text size constraints

### Step 4: Choose Composition
- **Tall surface** (aspect ratio < 0.75): Vertical stacking
- **Wide surface** (aspect ratio > 1.33): Horizontal arrangement
- **Square surface** (0.75–1.33): Balanced grid

### Step 5: Place Elements
- Sequential placement into available regions
- Track occupied space to prevent overlaps
- Ensure elements stay within bounds

### Step 6: Degrade Lower-Priority Elements
When space is insufficient:
1. Reduce lower-priority element sizes
2. Reposition to fit
3. Drop lowest-priority elements as final fallback

### Step 7: Return Resolved Layout
Each element receives:
- Exact position (x, y)
- Dimensions (width, height)
- Visibility status
- Reason if dropped

## Why This Is Not Just Responsive CSS

CSS media queries handle layout based on viewport size, but they don't:

- **Prioritize content**: CSS can't decide which elements to drop first
- **Handle arbitrary constraints**: Can't enforce tap targets or text sizes algorithmically
- **Explain decisions**: CSS doesn't provide reasoning for layout choices
- **Work framework-agnostically**: CSS is tied to the web platform

In Flam-Aditor, the TypeScript resolver makes all layout decisions independently of React. CSS only handles the final rendering of already-calculated positions.

## Priority System

Elements are assigned priorities (1 = highest, 3 = lowest):

- **Priority 1**: Headline, hero product (never compromised)
- **Priority 2**: CTA, price (preserved when possible)
- **Priority 3**: Branding (first to be dropped)

When space is constrained, the resolver protects higher-priority elements first. The "Explain Layout" feature shows exactly why each element was positioned or dropped.

## TypeScript Design

Core types:

```typescript
// Element definition
interface AdElement {
  id: string;
  type: ElementType;        // 'text' | 'image' | 'button'
  role: ElementRole;       // 'primary' | 'hero' | 'action' | 'secondary' | 'branding'
  priority: Priority;     // 1 | 2 | 3
  content: string;
}

// Surface constraints
interface SurfaceProfile {
  width: number;
  height: number;
  safeArea: SafeArea;
  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: 'near' | 'far';
  touchOnly?: boolean;
}

// Resolved output
interface ResolvedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  reason?: string;
}
```

## Running Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

The application will be available at `http://localhost:5173`

## Deployment

The application is deployed and available at: [URL to be added]

## Known Limitations

- Fixed set of supported element types (text, image, button)
- Simplified text measurement (doesn't account for actual text rendering)
- Simplified constraint model (doesn't support complex constraints like alignment)
- DOM renderer only (no native/mobile rendering)
- No full mathematical constraint solver (uses greedy algorithm)
- Limited to rectangular layouts

## Time Spent

Approximately 4-5 hours of development time.

## AI Disclosure

AI tools were used for development assistance, including:
- Code generation and implementation guidance
- Debugging and error resolution
- Documentation and structure suggestions

The final implementation was reviewed, tested, and understood by the developer. All architectural decisions and core algorithms were designed to be explainable in a technical interview setting.

## License

This project was created as a frontend engineering assignment for Flam.