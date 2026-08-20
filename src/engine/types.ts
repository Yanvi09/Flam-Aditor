// Core type definitions for the adaptive layout engine

export type ElementType = 'text' | 'image' | 'button';

export type ElementRole = 'primary' | 'hero' | 'action' | 'secondary' | 'branding';

export type Priority = 1 | 2 | 3;

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
  minTapTarget?: number;
  minTextSize?: number;
  viewingDistance?: 'near' | 'far';
  touchOnly?: boolean;
}

export interface ResolvedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  reason?: string;
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