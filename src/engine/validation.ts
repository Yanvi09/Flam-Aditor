import type { AdSpecification, SurfaceProfile, ResolutionError } from './types';

export function validateAdSpec(spec: AdSpecification): ResolutionError[] {
  const errors: ResolutionError[] = [];

  if (!spec.elements || spec.elements.length === 0) {
    errors.push({ field: 'elements', message: 'Ad specification must have at least one element' });
  }

  const ids = new Set<string>();
  for (const element of spec.elements) {
    if (!element.id || element.id.trim() === '') {
      errors.push({ field: 'element.id', message: 'Each element must have a non-empty id' });
    }
    if (ids.has(element.id)) {
      errors.push({ field: 'element.id', message: `Duplicate element id: ${element.id}` });
    }
    ids.add(element.id);

    if (element.priority !== 1 && element.priority !== 2 && element.priority !== 3) {
      errors.push({ field: 'element.priority', message: `Invalid priority for element ${element.id}: must be 1, 2, or 3` });
    }
  }

  return errors;
}

export function validateSurface(surface: SurfaceProfile): ResolutionError[] {
  const errors: ResolutionError[] = [];

  if (surface.width <= 0) {
    errors.push({ field: 'surface.width', message: 'Surface width must be positive' });
  }
  if (surface.height <= 0) {
    errors.push({ field: 'surface.height', message: 'Surface height must be positive' });
  }
  if (surface.minTapTarget !== undefined && surface.minTapTarget < 0) {
    errors.push({ field: 'surface.minTapTarget', message: 'Minimum tap target cannot be negative' });
  }
  if (surface.minTextSize !== undefined && surface.minTextSize < 0) {
    errors.push({ field: 'surface.minTextSize', message: 'Minimum text size cannot be negative' });
  }

  return errors;
}