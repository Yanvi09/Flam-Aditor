export type ElementType = 'text' | 'image' | 'button';

export type ElementRole =
  | 'primary'
  | 'hero'
  | 'action'
  | 'secondary'
  | 'branding';

export type Priority = 1 | 2 | 3 | 4 | 5;

/*
 * Declares the composition family required by a surface.
 *
 * This is intentionally separate from width/height. The resolver
 * selects a composition from this typed strategy instead of checking
 * hard-coded surface dimensions.
 */
export type LayoutStrategy =
  | 'portrait'
  | 'landscape'
  | 'broadcast'
  | 'square'
  | 'constrained';

export interface AdElement {
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: Priority;
  content: string;
}

export interface AdSpecification {
  elements: AdElement[];
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SurfaceProfile {
  width: number;
  height: number;
  safeArea: SafeArea;

  /*
   * Composition family used by the constraint resolver.
   * This avoids identifying a surface from hard-coded dimensions.
   */
  layoutStrategy: LayoutStrategy;

  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: 'near' | 'far';
  touchOnly?: boolean;
}

export interface ResolutionDecision {
  strategy: string;
  attempts: number;
  resized: boolean;
  repositioned: boolean;
  compositionChanged: boolean;
}

export interface ResolvedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  reason?: string;
  decisions?: ResolutionDecision;
}

export interface ResolvedLayout {
  surface: SurfaceProfile;
  elements: ResolvedElement[];
  valid: boolean;
  visibleCount: number;
  droppedCount: number;
}

export interface ResolutionError {
  field: string;
  message: string;
}