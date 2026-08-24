import type { AdSpecification, SurfaceProfile, ResolvedElement, ResolvedLayout, AdElement, ResolutionDecision } from './types';
import { validateAdSpec, validateSurface } from './validation';

interface AvailableSpace {
  width: number;
  height: number;
  startX: number;
  startY: number;
}

interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElementSizeConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  aspectRatio?: number;
}

export function resolveLayout(spec: AdSpecification, surface: SurfaceProfile): ResolvedLayout {
  const specErrors = validateAdSpec(spec);
  const surfaceErrors = validateSurface(surface);

  if (specErrors.length > 0 || surfaceErrors.length > 0) {
    return {
      surface,
      elements: [],
      valid: false,
      visibleCount: 0,
      droppedCount: spec.elements.length,
    };
  }

  const usableWidth = surface.width - surface.safeArea.left - surface.safeArea.right;
  const usableHeight = surface.height - surface.safeArea.top - surface.safeArea.bottom;

  const sortedElements = [...spec.elements].sort((a, b) => a.priority - b.priority);

  const aspectRatio = usableWidth / usableHeight;
  const composition = determineComposition(aspectRatio, surface);

  const availableSpace: AvailableSpace = {
    width: usableWidth,
    height: usableHeight,
    startX: surface.safeArea.left,
    startY: surface.safeArea.top,
  };

  const resolvedElements: ResolvedElement[] = [];
  const occupiedBounds: ElementBounds[] = [];

  for (const element of sortedElements) {
    const result = placeElementWithStrategies(
      element,
      surface,
      availableSpace,
      occupiedBounds,
      composition,
      resolvedElements.length,
      sortedElements.length
    );

    if (result.success && result.position && result.size) {
      resolvedElements.push({
        id: element.id,
        x: result.position.x,
        y: result.position.y,
        width: result.size.width,
        height: result.size.height,
        visible: true,
        decisions: result.decision,
      });

      occupiedBounds.push({
        x: result.position.x,
        y: result.position.y,
        width: result.size.width,
        height: result.size.height,
      });

      updateAvailableSpace(availableSpace, result.position, result.size, composition);
    } else {
      resolvedElements.push({
        id: element.id,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
        reason: result.reason,
        decisions: result.decision,
      });
    }
  }

  const visibleCount = resolvedElements.filter((el) => el.visible).length;
  const droppedCount = resolvedElements.length - visibleCount;

  return {
    surface,
    elements: resolvedElements,
    valid: visibleCount > 0,
    visibleCount,
    droppedCount,
  };
}

type Composition = 'vertical' | 'horizontal' | 'balanced' | 'compact';

function determineComposition(aspectRatio: number, surface: SurfaceProfile): Composition {
  // Very short surfaces (like broadcast lower-third) need compact horizontal
  if (surface.height <= 250 && aspectRatio > 3) {
    return 'compact';
  }
  // Tall surfaces prefer vertical
  if (aspectRatio < 0.75) {
    return 'vertical';
  }
  // Wide surfaces prefer horizontal
  if (aspectRatio > 1.33) {
    return 'horizontal';
  }
  // Square surfaces use balanced
  return 'balanced';
}

function getElementConstraints(element: AdElement, surface: SurfaceProfile, availableSpace: AvailableSpace): ElementSizeConstraints {
  const minTapTarget = surface.minTapTarget || 44;
  const minTextSize = surface.minTextSize || 12;

  switch (element.type) {
    case 'text':
      if (element.role === 'primary') {
        const fontSize = Math.max(minTextSize, Math.min(availableSpace.width * 0.15, 48));
        const maxTextWidth = Math.min(availableSpace.width * 0.9, 400);
        const minTextWidth = Math.max(minTextSize * 4, availableSpace.width * 0.3);
        return {
          minWidth: minTextWidth,
          maxWidth: maxTextWidth,
          minHeight: fontSize * 1.2,
          maxHeight: fontSize * 2.5, // Allow for wrapping
        };
      } else if (element.role === 'secondary') {
        const fontSize = Math.max(minTextSize, Math.min(availableSpace.width * 0.08, 24));
        return {
          minWidth: Math.max(minTextSize * 3, 40),
          maxWidth: Math.min(availableSpace.width * 0.4, 120),
          minHeight: fontSize * 1.2,
          maxHeight: fontSize * 1.5,
        };
      }
      break;

    case 'image':
      if (element.role === 'hero') {
        const maxSize = Math.min(availableSpace.width, availableSpace.height) * 0.6;
        const minSize = Math.max(minTapTarget, Math.min(availableSpace.width, availableSpace.height) * 0.2);
        return {
          minWidth: minSize,
          maxWidth: maxSize,
          minHeight: minSize * 1.2,
          maxHeight: maxSize * 1.5,
          aspectRatio: 1.2, // Product aspect ratio
        };
      } else if (element.role === 'branding') {
        return {
          minWidth: 30,
          maxWidth: Math.min(availableSpace.width * 0.25, 100),
          minHeight: 15,
          maxHeight: Math.min(availableSpace.height * 0.15, 40),
        };
      }
      break;

    case 'button':
      return {
        minWidth: minTapTarget,
        maxWidth: Math.max(minTapTarget, Math.min(availableSpace.width * 0.4, 160)),
        minHeight: minTapTarget,
        maxHeight: Math.max(minTapTarget, Math.min(availableSpace.height * 0.2, 60)),
      };
  }

  return {
    minWidth: 20,
    maxWidth: 100,
    minHeight: 20,
    maxHeight: 100,
  };
}

function calculateElementSize(
  element: AdElement,
  surface: SurfaceProfile,
  availableSpace: AvailableSpace,
  constraints: ElementSizeConstraints,
  scaleFactor: number = 1.0
): { width: number; height: number } | null {
  const scaledMinWidth = constraints.minWidth * scaleFactor;
  const scaledMaxWidth = constraints.maxWidth * scaleFactor;
  const scaledMinHeight = constraints.minHeight * scaleFactor;
  const scaledMaxHeight = constraints.maxHeight * scaleFactor;

  // Start with preferred size
  let width = Math.min(scaledMaxWidth, availableSpace.width);
  let height = Math.min(scaledMaxHeight, availableSpace.height);

  // Apply aspect ratio if specified
  if (constraints.aspectRatio) {
    if (width / height > constraints.aspectRatio) {
      width = height * constraints.aspectRatio;
    } else {
      height = width / constraints.aspectRatio;
    }
  }

  // Ensure minimums
  width = Math.max(width, scaledMinWidth);
  height = Math.max(height, scaledMinHeight);

  // Check if it fits
  if (width > availableSpace.width || height > availableSpace.height) {
    return null;
  }

  return { width, height };
}

interface PlacementResult {
  success: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  reason?: string;
  decision: ResolutionDecision;
}

function placeElementWithStrategies(
  element: AdElement,
  surface: SurfaceProfile,
  availableSpace: AvailableSpace,
  occupiedBounds: ElementBounds[],
  composition: Composition,
  elementIndex: number,
  totalElements: number
): PlacementResult {
  const originalWidth = surface.width;
  const originalHeight = surface.height;
  const constraints = getElementConstraints(element, surface, availableSpace);
  
  // Strategy 1: Try normal size with current composition
  let decision: ResolutionDecision = {
    strategy: 'normal',
    attempts: 1,
    resized: false,
    repositioned: false,
    compositionChanged: false,
  };

  let size = calculateElementSize(element, surface, availableSpace, constraints, 1.0);
  if (size) {
    let position = findValidPosition(
      size,
      availableSpace,
      occupiedBounds,
      composition,
      elementIndex,
      totalElements,
      originalWidth,
      originalHeight
    );
    if (position) {
      return { success: true, position, size, decision };
    }
  }

  // Strategy 2: Try reduced size
  decision.attempts++;
  decision.resized = true;
  size = calculateElementSize(element, surface, availableSpace, constraints, 0.7);
  if (size) {
    let position = findValidPosition(
      size,
      availableSpace,
      occupiedBounds,
      composition,
      elementIndex,
      totalElements,
      originalWidth,
      originalHeight
    );
    if (position) {
      return { success: true, position, size, decision };
    }
  }

  // Strategy 3: Try even smaller size
  decision.attempts++;
  size = calculateElementSize(element, surface, availableSpace, constraints, 0.5);
  if (size) {
    let position = findValidPosition(
      size,
      availableSpace,
      occupiedBounds,
      composition,
      elementIndex,
      totalElements,
      originalWidth,
      originalHeight
    );
    if (position) {
      return { success: true, position, size, decision };
    }
  }

  // Strategy 4: Try different composition
  decision.attempts++;
  decision.compositionChanged = true;
  const alternativeCompositions: Composition[] = ['vertical', 'horizontal', 'balanced', 'compact'];
  for (const altComp of alternativeCompositions) {
    if (altComp === composition) continue;
    
    size = calculateElementSize(element, surface, availableSpace, constraints, 0.7);
    if (size) {
      let position = findValidPosition(
        size,
        availableSpace,
        occupiedBounds,
        altComp,
        elementIndex,
        totalElements,
        originalWidth,
        originalHeight
      );
      if (position) {
        decision.strategy = `composition-change-to-${altComp}`;
        return { success: true, position, size, decision };
      }
    }
  }

  // Strategy 5: Try minimal size with flexible positioning
  decision.attempts++;
  decision.repositioned = true;
  size = calculateElementSize(element, surface, availableSpace, constraints, 0.4);
  if (size) {
    let position = findFlexiblePosition(
      size,
      availableSpace,
      occupiedBounds,
      originalWidth,
      originalHeight
    );
    if (position) {
      decision.strategy = 'flexible-positioning';
      return { success: true, position, size, decision };
    }
  }

  // All strategies failed
  return {
    success: false,
    reason: `Could not place element after ${decision.attempts} attempts. Tried: normal size, reduced sizes, alternative compositions, and flexible positioning.`,
    decision,
  };
}

function findValidPosition(
  elementSize: { width: number; height: number },
  availableSpace: AvailableSpace,
  occupiedBounds: ElementBounds[],
  composition: Composition,
  elementIndex: number,
  totalElements: number,
  surfaceWidth: number,
  surfaceHeight: number
): { x: number; y: number } | null {
  const { width, height } = elementSize;

  if (width > availableSpace.width || height > availableSpace.height) {
    return null;
  }

  let x = availableSpace.startX;
  let y = availableSpace.startY;

  if (composition === 'vertical') {
    // Stack vertically with centered alignment
    const totalHeight = occupiedBounds.reduce((sum, b) => sum + b.height + 8, 0);
    y = availableSpace.startY + totalHeight;
    x = availableSpace.startX + (availableSpace.width - width) / 2;
  } else if (composition === 'horizontal') {
    // Arrange horizontally with centered vertical alignment
    const totalWidth = occupiedBounds.reduce((sum, b) => sum + b.width + 8, 0);
    x = availableSpace.startX + totalWidth;
    y = availableSpace.startY + (availableSpace.height - height) / 2;
  } else if (composition === 'compact') {
    // Compact horizontal for broadcast-style surfaces
    const slotWidth = availableSpace.width / (totalElements - elementIndex);
    x = availableSpace.startX + (elementIndex * slotWidth) + (slotWidth - width) / 2;
    y = availableSpace.startY + (availableSpace.height - height) / 2;
  } else {
    // Balanced grid for square surfaces
    const rows = Math.ceil(Math.sqrt(totalElements));
    const cols = Math.ceil(totalElements / rows);
    const col = elementIndex % cols;
    const row = Math.floor(elementIndex / cols);
    
    const cellWidth = availableSpace.width / cols;
    const cellHeight = availableSpace.height / rows;
    
    x = availableSpace.startX + (col * cellWidth) + (cellWidth - width) / 2;
    y = availableSpace.startY + (row * cellHeight) + (cellHeight - height) / 2;
  }

  // Ensure the position stays within actual surface bounds
  x = Math.max(0, Math.min(x, surfaceWidth - width));
  y = Math.max(0, Math.min(y, surfaceHeight - height));

  const candidateBounds: ElementBounds = { x, y, width, height };

  if (checkOverlap(candidateBounds, occupiedBounds)) {
    return null;
  }

  if (!isWithinBounds(candidateBounds, availableSpace)) {
    return null;
  }

  return { x, y };
}

function findFlexiblePosition(
  elementSize: { width: number; height: number },
  availableSpace: AvailableSpace,
  occupiedBounds: ElementBounds[],
  surfaceWidth: number,
  surfaceHeight: number
): { x: number; y: number } | null {
  const { width, height } = elementSize;

  if (width > availableSpace.width || height > availableSpace.height) {
    return null;
  }

  // Try to find any valid position by scanning
  const step = 8;
  for (let y = availableSpace.startY; y <= availableSpace.startY + availableSpace.height - height; y += step) {
    for (let x = availableSpace.startX; x <= availableSpace.startX + availableSpace.width - width; x += step) {
      // Ensure position stays within actual surface bounds
      const clampedX = Math.max(0, Math.min(x, surfaceWidth - width));
      const clampedY = Math.max(0, Math.min(y, surfaceHeight - height));
      
      const candidateBounds: ElementBounds = { x: clampedX, y: clampedY, width, height };
      if (!checkOverlap(candidateBounds, occupiedBounds) && isWithinBounds(candidateBounds, availableSpace)) {
        return { x: clampedX, y: clampedY };
      }
    }
  }

  return null;
}

function checkOverlap(bounds: ElementBounds, occupied: ElementBounds[]): boolean {
  for (const other of occupied) {
    if (
      bounds.x < other.x + other.width &&
      bounds.x + bounds.width > other.x &&
      bounds.y < other.y + other.height &&
      bounds.y + bounds.height > other.y
    ) {
      return true;
    }
  }
  return false;
}

function isWithinBounds(bounds: ElementBounds, space: AvailableSpace): boolean {
  return (
    bounds.x >= space.startX &&
    bounds.y >= space.startY &&
    bounds.x + bounds.width <= space.startX + space.width &&
    bounds.y + bounds.height <= space.startY + space.height &&
    bounds.x >= 0 &&
    bounds.y >= 0
  );
}

function updateAvailableSpace(
  space: AvailableSpace,
  position: { x: number; y: number },
  size: { width: number; height: number },
  composition: Composition
): void {
  const spacing = 8; // Consistent spacing

  if (composition === 'vertical') {
    space.startY = position.y + size.height + spacing;
    space.height -= size.height + spacing;
  } else if (composition === 'horizontal' || composition === 'compact') {
    space.startX = position.x + size.width + spacing;
    space.width -= size.width + spacing;
  } else {
    // For balanced, reduce the remaining space
    space.height -= size.height + spacing;
    space.startY = position.y + size.height + spacing;
  }
}