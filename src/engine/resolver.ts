import { AdSpecification, SurfaceProfile, ResolvedElement, ResolvedLayout, AdElement } from './types';
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
  const composition = determineComposition(aspectRatio);

  const availableSpace: AvailableSpace = {
    width: usableWidth,
    height: usableHeight,
    startX: surface.safeArea.left,
    startY: surface.safeArea.top,
  };

  const resolvedElements: ResolvedElement[] = [];
  const occupiedBounds: ElementBounds[] = [];

  for (const element of sortedElements) {
    const elementSize = calculateElementSize(element, surface, availableSpace, composition);

    if (!elementSize) {
      resolvedElements.push({
        id: element.id,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
        reason: 'Insufficient space for element',
      });
      continue;
    }

    const position = findValidPosition(
      elementSize,
      availableSpace,
      occupiedBounds,
      composition,
      resolvedElements.length,
      sortedElements.length
    );

    if (!position) {
      resolvedElements.push({
        id: element.id,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: false,
        reason: 'Could not place element without overlap',
      });
      continue;
    }

    resolvedElements.push({
      id: element.id,
      x: position.x,
      y: position.y,
      width: elementSize.width,
      height: elementSize.height,
      visible: true,
    });

    occupiedBounds.push({
      x: position.x,
      y: position.y,
      width: elementSize.width,
      height: elementSize.height,
    });

    updateAvailableSpace(availableSpace, position, elementSize, composition);
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

type Composition = 'vertical' | 'horizontal' | 'balanced';

function determineComposition(aspectRatio: number): Composition {
  if (aspectRatio < 0.75) {
    return 'vertical';
  } else if (aspectRatio > 1.33) {
    return 'horizontal';
  } else {
    return 'balanced';
  }
}

function calculateElementSize(
  element: AdElement,
  surface: SurfaceProfile,
  availableSpace: AvailableSpace,
  composition: Composition
): { width: number; height: number } | null {
  const minTapTarget = surface.minTapTarget || 44;
  const minTextSize = surface.minTextSize || 12;

  switch (element.type) {
    case 'text':
      if (element.role === 'primary') {
        const fontSize = Math.max(minTextSize, Math.min(availableSpace.width * 0.1, 48));
        const textWidth = Math.min(availableSpace.width * 0.8, 300);
        return {
          width: textWidth,
          height: fontSize * 1.5,
        };
      } else if (element.role === 'secondary') {
        const fontSize = Math.max(minTextSize, Math.min(availableSpace.width * 0.05, 24));
        return {
          width: Math.min(availableSpace.width * 0.3, 100),
          height: fontSize * 1.5,
        };
      }
      break;

    case 'image':
      if (element.role === 'hero') {
        const maxSize = Math.min(availableSpace.width, availableSpace.height) * 0.5;
        return {
          width: maxSize,
          height: maxSize * 1.5,
        };
      } else if (element.role === 'branding') {
        return {
          width: Math.min(availableSpace.width * 0.2, 80),
          height: Math.min(availableSpace.height * 0.1, 30),
        };
      }
      break;

    case 'button':
      const buttonWidth = Math.max(minTapTarget, Math.min(availableSpace.width * 0.3, 120));
      const buttonHeight = Math.max(minTapTarget, Math.min(availableSpace.height * 0.15, 50));
      return {
        width: buttonWidth,
        height: buttonHeight,
      };
  }

  return null;
}

function findValidPosition(
  elementSize: { width: number; height: number },
  availableSpace: AvailableSpace,
  occupiedBounds: ElementBounds[],
  composition: Composition,
  elementIndex: number,
  totalElements: number
): { x: number; y: number } | null {
  const { width, height } = elementSize;

  if (width > availableSpace.width || height > availableSpace.height) {
    return null;
  }

  let x = availableSpace.startX;
  let y = availableSpace.startY;

  if (composition === 'vertical') {
    const verticalSpacing = availableSpace.height / (totalElements - elementIndex + 1);
    y = availableSpace.startY + (elementIndex * verticalSpacing) - (height / 2);
    x = availableSpace.startX + (availableSpace.width - width) / 2;
  } else if (composition === 'horizontal') {
    const horizontalSpacing = availableSpace.width / (totalElements - elementIndex + 1);
    x = availableSpace.startX + (elementIndex * horizontalSpacing) - (width / 2);
    y = availableSpace.startY + (availableSpace.height - height) / 2;
  } else {
    const rows = Math.ceil(Math.sqrt(totalElements));
    const cols = Math.ceil(totalElements / rows);
    const col = elementIndex % cols;
    const row = Math.floor(elementIndex / cols);
    
    const cellWidth = availableSpace.width / cols;
    const cellHeight = availableSpace.height / rows;
    
    x = availableSpace.startX + (col * cellWidth) + (cellWidth - width) / 2;
    y = availableSpace.startY + (row * cellHeight) + (cellHeight - height) / 2;
  }

  const candidateBounds: ElementBounds = { x, y, width, height };

  if (checkOverlap(candidateBounds, occupiedBounds)) {
    return null;
  }

  if (!isWithinBounds(candidateBounds, availableSpace)) {
    return null;
  }

  return { x, y };
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
    bounds.y + bounds.height <= space.startY + space.height
  );
}

function updateAvailableSpace(
  space: AvailableSpace,
  position: { x: number; y: number },
  size: { width: number; height: number },
  composition: Composition
): void {
  if (composition === 'vertical') {
    space.startY = position.y + size.height + 10;
    space.height -= size.height + 10;
  } else if (composition === 'horizontal') {
    space.startX = position.x + size.width + 10;
    space.width -= size.width + 10;
  } else {
    space.height -= size.height + 10;
    space.startY = position.y + size.height + 10;
  }
}