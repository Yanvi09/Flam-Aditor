import { SurfaceProfile } from './types';

export const surfaces: Record<string, SurfaceProfile> = {
  'mobile-portrait': {
    width: 320,
    height: 480,
    safeArea: { top: 20, right: 10, bottom: 20, left: 10 },
    minTapTarget: 44,
    viewingDistance: 'near',
  },
  'mobile-landscape': {
    width: 640,
    height: 360,
    safeArea: { top: 15, right: 20, bottom: 15, left: 20 },
    minTapTarget: 44,
    viewingDistance: 'near',
  },
  'broadcast-lower-third': {
    width: 1920,
    height: 250,
    safeArea: { top: 20, right: 40, bottom: 20, left: 40 },
    minTextSize: 32,
    viewingDistance: 'far',
  },
  'square-kiosk': {
    width: 1080,
    height: 1080,
    safeArea: { top: 40, right: 40, bottom: 40, left: 40 },
    minTapTarget: 60,
    touchOnly: true,
    viewingDistance: 'near',
  },
  'constrained': {
    width: 150,
    height: 150,
    safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
    minTapTarget: 44,
    viewingDistance: 'near',
  },
};

export function getSurfaceByName(name: string): SurfaceProfile | undefined {
  return surfaces[name];
}

export function getAllSurfaceNames(): string[] {
  return Object.keys(surfaces);
}