import { describe, it, expect } from 'vitest';
import { resolveLayout } from '../engine/resolver';
import { adSpec } from '../engine/spec';
import { surfaces } from '../engine/surfaces';

describe('Layout Resolver', () => {
  it('Test 1: Same ad spec + mobile portrait → valid layout', () => {
    const surface = surfaces['mobile-portrait'];
    const layout = resolveLayout(adSpec, surface);

    expect(layout.valid).toBe(true);
    expect(layout.visibleCount).toBeGreaterThan(0);
    expect(layout.elements.length).toBe(adSpec.elements.length);
  });

  it('Test 2: Same ad spec + mobile landscape → meaningfully different layout', () => {
    const portraitSurface = surfaces['mobile-portrait'];
    const landscapeSurface = surfaces['mobile-landscape'];

    const portraitLayout = resolveLayout(adSpec, portraitSurface);
    const landscapeLayout = resolveLayout(adSpec, landscapeSurface);

    expect(portraitLayout.valid).toBe(true);
    expect(landscapeLayout.valid).toBe(true);

    // The layouts should be different due to different aspect ratios
    const portraitPositions = portraitLayout.elements.map(e => ({ x: e.x, y: e.y }));
    const landscapePositions = landscapeLayout.elements.map(e => ({ x: e.x, y: e.y }));

    expect(portraitPositions).not.toEqual(landscapePositions);
  });

  it('Test 3: Same ad spec + square kiosk → valid layout', () => {
    const surface = surfaces['square-kiosk'];
    const layout = resolveLayout(adSpec, surface);

    expect(layout.valid).toBe(true);
    expect(layout.visibleCount).toBeGreaterThan(0);
    expect(layout.elements.length).toBe(adSpec.elements.length);
  });

  it('Test 4: Same ad spec + broadcast → wide layout', () => {
    const surface = surfaces['broadcast-lower-third'];
    const layout = resolveLayout(adSpec, surface);

    expect(layout.valid).toBe(true);
    expect(layout.visibleCount).toBeGreaterThan(0);
    expect(layout.surface.width).toBeGreaterThan(layout.surface.height);
  });

  it('Test 5: Constrained surface → lower-priority element is dropped/reduced', () => {
    const surface = surfaces['constrained'];
    const layout = resolveLayout(adSpec, surface);

    // In constrained space, some elements should be dropped
    expect(layout.droppedCount).toBeGreaterThan(0);

    // Check that the system degrades gracefully by showing visible/dropped counts
    expect(layout.visibleCount).toBeGreaterThan(0);
    expect(layout.visibleCount).toBeLessThan(layout.elements.length);
  });

  it('Test 6: No resolved element overlaps another element', () => {
    const surface = surfaces['mobile-portrait'];
    const layout = resolveLayout(adSpec, surface);

    const visibleElements = layout.elements.filter(e => e.visible);

    for (let i = 0; i < visibleElements.length; i++) {
      for (let j = i + 1; j < visibleElements.length; j++) {
        const a = visibleElements[i];
        const b = visibleElements[j];

        const overlap = !(
          a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y
        );

        expect(overlap).toBe(false);
      }
    }
  });

  it('Test 7: No resolved element exceeds surface bounds', () => {
    const surface = surfaces['mobile-portrait'];
    const layout = resolveLayout(adSpec, surface);

    layout.elements.forEach(element => {
      if (element.visible) {
        expect(element.x).toBeGreaterThanOrEqual(0);
        expect(element.y).toBeGreaterThanOrEqual(0);
        expect(element.x + element.width).toBeLessThanOrEqual(surface.width);
        expect(element.y + element.height).toBeLessThanOrEqual(surface.height);
      }
    });
  });

  it('Test 8: Minimum tap target is respected', () => {
    const surface = surfaces['mobile-portrait'];
    const layout = resolveLayout(adSpec, surface);

    const minTapTarget = surface.minTapTarget || 44;

    layout.elements.forEach(element => {
      if (element.visible) {
        const specElement = adSpec.elements.find(e => e.id === element.id);
        if (specElement?.type === 'button') {
          expect(element.width).toBeGreaterThanOrEqual(minTapTarget);
          expect(element.height).toBeGreaterThanOrEqual(minTapTarget);
        }
      }
    });
  });
});