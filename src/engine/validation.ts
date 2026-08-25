import type {
  AdSpecification,
  SurfaceProfile,
  ResolutionError,
} from './types';

export function validateAdSpec(spec: AdSpecification): ResolutionError[] {
  const errors: ResolutionError[] = [];

  // Ad must contain at least one element
  if (!spec.elements || spec.elements.length === 0) {
    errors.push({
      field: 'elements',
      message: 'Ad specification must have at least one element',
    });

    return errors;
  }

  const ids = new Set<string>();

  for (const element of spec.elements) {
    // Validate ID
    if (!element.id || element.id.trim() === '') {
      errors.push({
        field: 'element.id',
        message: 'Each element must have a non-empty id',
      });
    }

    // Check duplicate IDs
    if (ids.has(element.id)) {
      errors.push({
        field: 'element.id',
        message: `Duplicate element id: ${element.id}`,
      });
    }

    ids.add(element.id);

    // Priority can be 1-5
    if (
      element.priority !== 1 &&
      element.priority !== 2 &&
      element.priority !== 3 &&
      element.priority !== 4 &&
      element.priority !== 5
    ) {
      errors.push({
        field: 'element.priority',
        message: `Invalid priority for element ${element.id}: must be 1, 2, 3, 4, or 5`,
      });
    }

    // Validate element type
    if (
      element.type !== 'text' &&
      element.type !== 'image' &&
      element.type !== 'button'
    ) {
      errors.push({
        field: 'element.type',
        message: `Invalid type for element ${element.id}`,
      });
    }

    // Validate role
    if (
      element.role !== 'primary' &&
      element.role !== 'hero' &&
      element.role !== 'action' &&
      element.role !== 'secondary' &&
      element.role !== 'branding'
    ) {
      errors.push({
        field: 'element.role',
        message: `Invalid role for element ${element.id}`,
      });
    }

    // Content should exist
    if (!element.content || element.content.trim() === '') {
      errors.push({
        field: 'element.content',
        message: `Element ${element.id} must have content`,
      });
    }
  }

  return errors;
}

export function validateSurface(
  surface: SurfaceProfile
): ResolutionError[] {
  const errors: ResolutionError[] = [];

  // Dimensions
  if (surface.width <= 0) {
    errors.push({
      field: 'surface.width',
      message: 'Surface width must be positive',
    });
  }

  if (surface.height <= 0) {
    errors.push({
      field: 'surface.height',
      message: 'Surface height must be positive',
    });
  }

  // Safe area
  if (surface.safeArea.top < 0) {
    errors.push({
      field: 'surface.safeArea.top',
      message: 'Safe area top cannot be negative',
    });
  }

  if (surface.safeArea.right < 0) {
    errors.push({
      field: 'surface.safeArea.right',
      message: 'Safe area right cannot be negative',
    });
  }

  if (surface.safeArea.bottom < 0) {
    errors.push({
      field: 'surface.safeArea.bottom',
      message: 'Safe area bottom cannot be negative',
    });
  }

  if (surface.safeArea.left < 0) {
    errors.push({
      field: 'surface.safeArea.left',
      message: 'Safe area left cannot be negative',
    });
  }

  // Make sure safe area does not consume the whole surface
  const usableWidth =
    surface.width -
    surface.safeArea.left -
    surface.safeArea.right;

  const usableHeight =
    surface.height -
    surface.safeArea.top -
    surface.safeArea.bottom;

  if (usableWidth <= 0) {
    errors.push({
      field: 'surface.safeArea',
      message: 'Safe area leaves no usable width',
    });
  }

  if (usableHeight <= 0) {
    errors.push({
      field: 'surface.safeArea',
      message: 'Safe area leaves no usable height',
    });
  }

  // Minimum tap target
  if (
    surface.minTapTarget !== undefined &&
    surface.minTapTarget < 0
  ) {
    errors.push({
      field: 'surface.minTapTarget',
      message: 'Minimum tap target cannot be negative',
    });
  }

  // Minimum text size
  if (
    surface.minTextSize !== undefined &&
    surface.minTextSize < 0
  ) {
    errors.push({
      field: 'surface.minTextSize',
      message: 'Minimum text size cannot be negative',
    });
  }

  return errors;
}