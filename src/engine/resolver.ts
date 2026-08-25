import type {
  AdElement,
  AdSpecification,
  ElementRole,
  ResolutionDecision,
  ResolvedElement,
  ResolvedLayout,
  SurfaceProfile,
} from './types';

import { validateAdSpec, validateSurface } from './validation';

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function inside(rect: Rect, bounds: Rect): boolean {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.width <= bounds.x + bounds.width &&
    rect.y + rect.height <= bounds.y + bounds.height
  );
}

function safeRect(surface: SurfaceProfile): Rect {
  const safe = surface.safeArea;

  return {
    x: safe.left,
    y: safe.top,
    width: surface.width - safe.left - safe.right,
    height: surface.height - safe.top - safe.bottom,
  };
}

/* -------------------------------------------------------------------------- */
/* Composition                                                                */
/*                                                                            */
/* Layout direction is derived from geometry only.                            */
/* No surface names are inspected.                                            */
/* -------------------------------------------------------------------------- */

type Orientation = 'row' | 'column';

function determineOrientation(safe: Rect): Orientation {
  return safe.width >= safe.height ? 'row' : 'column';
}

/* -------------------------------------------------------------------------- */
/* Role-based sizing                                                          */
/*                                                                            */
/* These rules describe content roles, not individual surfaces.               */
/* -------------------------------------------------------------------------- */

interface RoleSizingRule {
  mainAxisFraction: number;
  crossAxisFraction: number;
  minWidth: number;
  minHeight: number;
  shrinkFloor: number;
}

const ROLE_SIZING: Record<ElementRole, RoleSizingRule> = {
  hero: {
    mainAxisFraction: 0.42,
    crossAxisFraction: 0.55,
    minWidth: 60,
    minHeight: 90,
    shrinkFloor: 0.55,
  },

  primary: {
    mainAxisFraction: 0.5,
    crossAxisFraction: 0.22,
    minWidth: 120,
    minHeight: 32,
    shrinkFloor: 0.6,
  },

  action: {
    mainAxisFraction: 0.28,
    crossAxisFraction: 0.18,
    minWidth: 100,
    minHeight: 44,
    shrinkFloor: 0.85,
  },

  secondary: {
    mainAxisFraction: 0.18,
    crossAxisFraction: 0.12,
    minWidth: 50,
    minHeight: 24,
    shrinkFloor: 0.6,
  },

  branding: {
    mainAxisFraction: 0.18,
    crossAxisFraction: 0.1,
    minWidth: 50,
    minHeight: 18,
    shrinkFloor: 0.7,
  },
};

function baseTargetSize(
  role: ElementRole,
  safe: Rect,
  orientation: Orientation
): Size {
  const rule = ROLE_SIZING[role];

  if (orientation === 'row') {
    return {
      width: rule.mainAxisFraction * safe.width,
      height: rule.crossAxisFraction * safe.height,
    };
  }

  return {
    width: rule.crossAxisFraction * safe.width,
    height: rule.mainAxisFraction * safe.height,
  };
}

/* -------------------------------------------------------------------------- */
/* Readability and dominance constraints                                     */
/* -------------------------------------------------------------------------- */

function minReadableTextWidth(
  role: ElementRole,
  surface: SurfaceProfile,
  safe: Rect
): number {
  const fontSize = surface.minTextSize ?? 16;
  const estimatedCharacterWidth = fontSize * 0.6;
  const estimatedReadableWidth = estimatedCharacterWidth * 10;
  const roleMinimum = ROLE_SIZING[role].minWidth;

  return Math.min(
    safe.width,
    Math.max(roleMinimum, estimatedReadableWidth)
  );
}

const MAX_SINGLE_ELEMENT_AREA_FRACTION = 0.5;

function capDominantSize(
  rule: RoleSizingRule,
  size: Size,
  safe: Rect
): Size {
  const maxArea =
    safe.width *
    safe.height *
    MAX_SINGLE_ELEMENT_AREA_FRACTION;

  const area = size.width * size.height;

  if (area <= maxArea || area === 0) {
    return size;
  }

  const scale = Math.sqrt(maxArea / area);

  return {
    width: Math.max(rule.minWidth, size.width * scale),
    height: Math.max(rule.minHeight, size.height * scale),
  };
}

/* -------------------------------------------------------------------------- */
/* Hard constraints                                                           */
/* -------------------------------------------------------------------------- */

function applyHardConstraints(
  element: AdElement,
  size: Size,
  surface: SurfaceProfile,
  safe: Rect
): Size {
  const rule = ROLE_SIZING[element.role];

  let width = Math.max(size.width, rule.minWidth);
  let height = Math.max(size.height, rule.minHeight);

  if (
    element.type === 'button' &&
    surface.minTapTarget !== undefined
  ) {
    width = Math.max(width, surface.minTapTarget);
    height = Math.max(height, surface.minTapTarget);
  }

  if (element.type === 'text') {
    width = Math.max(
      width,
      minReadableTextWidth(element.role, surface, safe)
    );

    if (surface.minTextSize !== undefined) {
      height = Math.max(
        height,
        surface.minTextSize * 1.4
      );
    }
  }

  ({ width, height } = capDominantSize(
    rule,
    { width, height },
    safe
  ));

  width = Math.min(width, safe.width);
  height = Math.min(height, safe.height);

  return {
    width,
    height,
  };
}

function shrinkSize(
  element: AdElement,
  size: Size,
  scale: number,
  surface: SurfaceProfile,
  safe: Rect
): Size {
  return applyHardConstraints(
    element,
    {
      width: size.width * scale,
      height: size.height * scale,
    },
    surface,
    safe
  );
}

/* -------------------------------------------------------------------------- */
/* Candidate placement                                                        */
/*                                                                            */
/* Candidates use normalized anchors.                                         */
/* -------------------------------------------------------------------------- */

type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const ALL_ANCHORS: Anchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const ROLE_PREFERRED_ANCHORS: Record<ElementRole, Anchor[]> = {
  branding: [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top-center',
    'center-left',
    'center-right',
    'bottom-center',
    'center',
  ],

  primary: [
    'top-center',
    'top-left',
    'top-right',
    'center',
    'center-left',
    'center-right',
    'bottom-center',
    'bottom-left',
    'bottom-right',
  ],

  hero: [
    'center-right',
    'center',
    'center-left',
    'top-right',
    'bottom-right',
    'top-center',
    'bottom-center',
    'top-left',
    'bottom-left',
  ],

  action: [
    'bottom-left',
    'bottom-center',
    'center-left',
    'center',
    'bottom-right',
    'top-left',
    'top-center',
    'center-right',
    'top-right',
  ],

  secondary: [
    'bottom-center',
    'bottom-right',
    'bottom-left',
    'center-right',
    'center-left',
    'top-center',
    'top-right',
    'top-left',
    'center',
  ],
};

function edgeMargin(
  safeSpan: number,
  elementSpan: number
): number {
  const desired = Math.max(
    4,
    Math.min(safeSpan, elementSpan) * 0.04
  );

  const available = Math.max(
    0,
    (safeSpan - elementSpan) / 2
  );

  return Math.min(desired, available);
}

function anchorPoint(
  anchor: Anchor,
  safe: Rect,
  size: Size
): Rect {
  const marginX = edgeMargin(
    safe.width,
    size.width
  );

  const marginY = edgeMargin(
    safe.height,
    size.height
  );

  const positions: Record<
    Anchor,
    { x: number; y: number }
  > = {
    'top-left': {
      x: safe.x + marginX,
      y: safe.y + marginY,
    },

    'top-center': {
      x: safe.x + (safe.width - size.width) / 2,
      y: safe.y + marginY,
    },

    'top-right': {
      x: safe.x + safe.width - size.width - marginX,
      y: safe.y + marginY,
    },

    'center-left': {
      x: safe.x + marginX,
      y: safe.y + (safe.height - size.height) / 2,
    },

    center: {
      x: safe.x + (safe.width - size.width) / 2,
      y: safe.y + (safe.height - size.height) / 2,
    },

    'center-right': {
      x: safe.x + safe.width - size.width - marginX,
      y: safe.y + (safe.height - size.height) / 2,
    },

    'bottom-left': {
      x: safe.x + marginX,
      y: safe.y + safe.height - size.height - marginY,
    },

    'bottom-center': {
      x: safe.x + (safe.width - size.width) / 2,
      y: safe.y + safe.height - size.height - marginY,
    },

    'bottom-right': {
      x:
        safe.x +
        safe.width -
        size.width -
        marginX,
      y:
        safe.y +
        safe.height -
        size.height -
        marginY,
    },
  };

  const point = positions[anchor];

  return {
    x: point.x,
    y: point.y,
    width: size.width,
    height: size.height,
  };
}

/* -------------------------------------------------------------------------- */
/* Holistic candidate scoring                                                 */
/*                                                                            */
/* A candidate is not judged only against the element being placed. The      */
/* resolver also scores the composition that would exist after the candidate */
/* is added. This keeps the algorithm geometry/role driven while allowing a  */
/* candidate that is locally valid but globally awkward to lose to a more    */
/* balanced alternative.                                                     */
/* -------------------------------------------------------------------------- */

interface OccupiedPlacement {
  element: AdElement;
  rect: Rect;
}

interface Candidate {
  rect: Rect;
  score: number;
  anchor: Anchor;
}

interface SearchState {
  placements: Map<string, PlacementLike>;
  occupied: OccupiedPlacement[];
  score: number;
}

interface PlacementLike {
  rect: Rect;
  resized: boolean;
  attempts: number;
  repositioned: boolean;
}

function centerOf(rect: Rect): {
  x: number;
  y: number;
} {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function normalizedDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  safe: Rect
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  const distance = Math.sqrt(
    dx * dx + dy * dy
  );

  const maxDistance =
    Math.sqrt(
      safe.width * safe.width +
        safe.height * safe.height
    ) || 1;

  return Math.min(
    1,
    distance / maxDistance
  );
}

function gapBetween(
  a: Rect,
  b: Rect,
  safe: Rect
): number {
  const horizontalGap = Math.max(
    0,
    Math.max(
      a.x - (b.x + b.width),
      b.x - (a.x + a.width)
    )
  );

  const verticalGap = Math.max(
    0,
    Math.max(
      a.y - (b.y + b.height),
      b.y - (a.y + a.height)
    )
  );

  return (
    Math.sqrt(
      horizontalGap * horizontalGap +
        verticalGap * verticalGap
    ) /
    Math.max(
      1,
      Math.sqrt(
        safe.width * safe.width +
          safe.height * safe.height
      )
    )
  );
}

/**
 * Rewards useful role relationships.
 *
 * These are content relationships, not surface-specific layouts:
 * - action <-> secondary keeps price/CTA content connected
 * - hero <-> secondary keeps supporting copy near the product
 * - primary <-> hero keeps the two main focal elements coherent
 */
function relationshipScore(
  element: AdElement,
  rect: Rect,
  occupied: OccupiedPlacement[],
  safe: Rect
): number {
  if (occupied.length === 0) {
    return 0;
  }

  const candidateCenter = centerOf(rect);
  let score = 0;

  for (const existing of occupied) {
    const existingCenter =
      centerOf(existing.rect);

    const distance = normalizedDistance(
      candidateCenter,
      existingCenter,
      safe
    );

    const related =
      (element.role === 'action' &&
        existing.element.role === 'secondary') ||
      (element.role === 'secondary' &&
        existing.element.role === 'action') ||
      (element.role === 'hero' &&
        existing.element.role === 'secondary') ||
      (element.role === 'secondary' &&
        existing.element.role === 'hero') ||
      (element.role === 'primary' &&
        existing.element.role === 'hero') ||
      (element.role === 'hero' &&
        existing.element.role === 'primary');

    if (related) {
      /*
       * Related content should be connected without being forced to
       * overlap. The closer the two resolved rectangles are, the better.
       */
      const relationshipWeight =
        element.role === 'primary' ||
        element.role === 'hero'
          ? 28
          : 36;

      score +=
        (1 - distance) *
        relationshipWeight;
    } else {
      /*
       * Unrelated content should not become an isolated island.
       */
      score +=
        (1 - distance) * 5;
    }

    /*
     * Branding should remain secondary and normally live away from
     * the visual center of the composition.
     */
    if (element.role === 'branding') {
      const safeCenter = {
        x: safe.x + safe.width / 2,
        y: safe.y + safe.height / 2,
      };

      const centerDistance =
        normalizedDistance(
          candidateCenter,
          safeCenter,
          safe
        );

      score += centerDistance * 12;
    }

    if (
      existing.element.role ===
      'branding'
    ) {
      score += distance * 3;
    }
  }

  return score;
}

/**
 * Scores the state that would exist after a candidate is placed.
 *
 * The goal is not to fill every pixel. The goal is to avoid a composition
 * that technically fits but leaves the important content disconnected,
 * extremely sparse, or dominated by one element.
 */
function compositionScore(
  occupied: OccupiedPlacement[],
  safe: Rect
): number {
  if (occupied.length === 0) {
    return 0;
  }

  const safeCenter = {
    x: safe.x + safe.width / 2,
    y: safe.y + safe.height / 2,
  };

  let score = 0;

  /*
   * Keep the visual mass reasonably connected to the usable safe area.
   * A large empty central region is a strong signal of weak composition.
   */
  let nearestCenterDistance = 1;

  for (const item of occupied) {
    nearestCenterDistance =
      Math.min(
        nearestCenterDistance,
        normalizedDistance(
          centerOf(item.rect),
          safeCenter,
          safe
        )
      );
  }

  score +=
    (1 - nearestCenterDistance) * 24;

  /*
   * Reward useful occupied area, but stop rewarding it once the
   * composition has enough visual mass. This prevents "fill everything"
   * from becoming the objective.
   */
  const safeArea =
    safe.width * safe.height;

  const occupiedArea =
    occupied.reduce(
      (total, item) =>
        total +
        item.rect.width *
          item.rect.height,
      0
    );

  const occupiedRatio =
    occupiedArea /
    Math.max(1, safeArea);

  score +=
    Math.min(occupiedRatio / 0.28, 1) *
    18;

  /*
   * Penalize a single element that visually dominates the safe area.
   * Hard size limits are handled elsewhere; this is a soft composition
   * preference.
   */
  for (const item of occupied) {
    const areaRatio =
      (item.rect.width *
        item.rect.height) /
      Math.max(1, safeArea);

    if (areaRatio > 0.38) {
      score -=
        Math.min(
          22,
          (areaRatio - 0.38) * 70
        );
    }
  }

  /*
   * Penalize large pairwise gaps. This is deliberately a soft penalty:
   * different aspect ratios may legitimately need different spacing.
   */
  for (let i = 0; i < occupied.length; i++) {
    for (
      let j = i + 1;
      j < occupied.length;
      j++
    ) {
      const first = occupied[i];
      const second = occupied[j];

      const gap =
        gapBetween(
          first.rect,
          second.rect,
          safe
        );

      const firstCenter =
        centerOf(first.rect);
      const secondCenter =
        centerOf(second.rect);

      const distance =
        normalizedDistance(
          firstCenter,
          secondCenter,
          safe
        );

      const related =
        (first.element.role ===
          'action' &&
          second.element.role ===
            'secondary') ||
        (first.element.role ===
          'secondary' &&
          second.element.role ===
            'action') ||
        (first.element.role ===
          'hero' &&
          second.element.role ===
            'secondary') ||
        (first.element.role ===
          'secondary' &&
          second.element.role ===
            'hero') ||
        (first.element.role ===
          'primary' &&
          second.element.role ===
            'hero') ||
        (first.element.role ===
          'hero' &&
          second.element.role ===
            'primary');

      if (related) {
        score -=
          gap *
          34;

        /*
         * A related pair that is extremely far apart is worse than
         * an ordinary unrelated pair with the same geometry.
         */
        score -=
          Math.max(
            0,
            distance - 0.45
          ) * 18;
      } else {
        score -=
          gap * 7;
      }
    }
  }

  /*
   * Reward a composition whose occupied bounding box uses the surface
   * naturally, while avoiding a huge reward for occupying almost all
   * available space.
   */
  const minX = Math.min(
    ...occupied.map(
      (item) => item.rect.x
    )
  );
  const minY = Math.min(
    ...occupied.map(
      (item) => item.rect.y
    )
  );
  const maxX = Math.max(
    ...occupied.map(
      (item) =>
        item.rect.x +
        item.rect.width
    )
  );
  const maxY = Math.max(
    ...occupied.map(
      (item) =>
        item.rect.y +
        item.rect.height
    )
  );

  const boundingRatio =
    ((maxX - minX) *
      (maxY - minY)) /
    Math.max(1, safeArea);

  score +=
    Math.min(
      1,
      boundingRatio / 0.55
    ) * 12;

  return score;
}

function scoreCandidate(
  element: AdElement,
  rect: Rect,
  anchor: Anchor,
  safe: Rect,
  occupied: OccupiedPlacement[]
): number {
  let score = 0;

  /*
   * Role-specific anchor preference is a soft preference only.
   * Geometry and composition can still override it.
   */
  const preferred =
    ROLE_PREFERRED_ANCHORS[
      element.role
    ];

  const preferenceIndex =
    preferred.indexOf(anchor);

  if (preferenceIndex >= 0) {
    score +=
      (preferred.length -
        preferenceIndex) *
      65;
  }

  /*
   * Avoid extremely narrow text columns.
   */
  if (element.type === 'text') {
    const widthRatio =
      rect.width /
      Math.max(1, safe.width);

    if (widthRatio < 0.18) {
      score -= 100;
    } else if (widthRatio < 0.25) {
      score -= 40;
    } else {
      score += Math.min(
        24,
        widthRatio * 24
      );
    }
  }

  /*
   * Large rectangles are valid when necessary, but a smaller balanced
   * rectangle is preferable when it still satisfies hard constraints.
   */
  const areaRatio =
    (rect.width * rect.height) /
    Math.max(
      1,
      safe.width * safe.height
    );

  if (areaRatio > 0.42) {
    score -=
      (areaRatio - 0.42) * 65;
  }

  score +=
    relationshipScore(
      element,
      rect,
      occupied,
      safe
    );

  /*
   * Evaluate the composition after this candidate is added.
   */
  const nextOccupied: OccupiedPlacement[] =
    [
      ...occupied,
      {
        element,
        rect,
      },
    ];

  score +=
    compositionScore(
      nextOccupied,
      safe
    );

  return score;
}

/**
 * Generate all valid candidates for a given element and size.
 *
 * Keeping this separate from the search makes the resolution flow easier
 * to explain: generate -> validate -> score -> compose -> select.
 */
function findCandidates(
  element: AdElement,
  size: Size,
  safe: Rect,
  occupied: OccupiedPlacement[]
): Candidate[] {
  const preferred =
    ROLE_PREFERRED_ANCHORS[
      element.role
    ];

  const anchors = [
    ...preferred,
    ...ALL_ANCHORS.filter(
      (anchor) =>
        !preferred.includes(anchor)
    ),
  ];

  const candidates: Candidate[] =
    [];

  for (const anchor of anchors) {
    const rect =
      anchorPoint(
        anchor,
        safe,
        size
      );

    if (!inside(rect, safe)) {
      continue;
    }

    if (
      occupied.some(
        (existing) =>
          overlaps(
            rect,
            existing.rect
          )
      )
    ) {
      continue;
    }

    candidates.push({
      rect,
      anchor,
      score:
        scoreCandidate(
          element,
          rect,
          anchor,
          safe,
          occupied
        ),
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  return candidates;
}

/* -------------------------------------------------------------------------- */
/* Packing                                                                    */
/* -------------------------------------------------------------------------- */

interface PackCandidate {
  element: AdElement;
  size: Size;
}

interface Placement {
  rect: Rect;
  resized: boolean;
  attempts: number;
  repositioned: boolean;
}

const SHRINK_STEPS = [
  1,
  0.9,
  0.8,
  0.7,
  0.55,
];

const MAX_BEAM_STATES = 24;

function sameSize(
  a: Size,
  b: Size
): boolean {
  return (
    Math.abs(a.width - b.width) <
      0.5 &&
    Math.abs(a.height - b.height) <
      0.5
  );
}

function stateScore(
  occupied: OccupiedPlacement[],
  safe: Rect
): number {
  return compositionScore(
    occupied,
    safe
  );
}

/**
 * Beam-search packing keeps several valid partial compositions alive.
 *
 * The old greedy approach selected the best position for one element and
 * immediately committed to it. That can make a later element impossible
 * or visually disconnected even though an earlier alternative would have
 * produced a much better complete advertisement.
 *
 * This is still a small priority-ordered resolver, not a per-surface
 * layout table.
 */
function attemptPack(
  ordered: PackCandidate[],
  safe: Rect,
  surface: SurfaceProfile
):
  | {
      success: true;
      placements: Map<
        string,
        Placement
      >;
    }
  | {
      success: false;
      failIndex: number;
    } {
  let states: SearchState[] = [
    {
      placements:
        new Map(),
      occupied: [],
      score: 0,
    },
  ];

  for (
    let index = 0;
    index < ordered.length;
    index++
  ) {
    const candidate =
      ordered[index];

    const nextStates: SearchState[] =
      [];

    for (const state of states) {
      let lastTriedSize:
        | Size
        | null = null;

      for (
        let scaleIndex = 0;
        scaleIndex <
        SHRINK_STEPS.length;
        scaleIndex++
      ) {
        const scale =
          SHRINK_STEPS[
            scaleIndex
          ];

        const rule =
          ROLE_SIZING[
            candidate.element.role
          ];

        if (
          scale < rule.shrinkFloor
        ) {
          break;
        }

        const size =
          scale === 1
            ? candidate.size
            : shrinkSize(
                candidate.element,
                candidate.size,
                scale,
                surface,
                safe
              );

        if (
          lastTriedSize &&
          sameSize(
            size,
            lastTriedSize
          )
        ) {
          continue;
        }

        lastTriedSize = size;

        const candidates =
          findCandidates(
            candidate.element,
            size,
            safe,
            state.occupied
          );

        /*
         * Keep several placement choices from every partial state.
         * This is what allows a locally second-best position to win
         * when evaluated as part of the final composition.
         */
        for (
          let candidateIndex = 0;
          candidateIndex <
            candidates.length &&
          candidateIndex < 6;
          candidateIndex++
        ) {
          const best =
            candidates[
              candidateIndex
            ];

          const placement: Placement =
            {
              rect: best.rect,
              resized:
                scale !== 1,
              attempts:
                scaleIndex + 1,
              repositioned:
                best.anchor !==
                'top-left',
            };

          const nextOccupied =
            [
              ...state.occupied,
              {
                element:
                  candidate.element,
                rect: best.rect,
              },
            ];

          const nextPlacements =
            new Map(
              state.placements
            );

          nextPlacements.set(
            candidate.element.id,
            placement
          );

          const incrementalScore =
            best.score +
            stateScore(
              nextOccupied,
              safe
            );

          nextStates.push({
            placements:
              nextPlacements,
            occupied:
              nextOccupied,
            score:
              state.score +
              incrementalScore,
          });
        }
      }
    }

    if (nextStates.length === 0) {
      return {
        success: false,
        failIndex: index,
      };
    }

    /*
     * Keep only the strongest distinct partial compositions.
     * The state count remains bounded and deterministic.
     */
    nextStates.sort(
      (a, b) =>
        b.score - a.score
    );

    const selected: SearchState[] =
      [];

    const seen = new Set<string>();

    for (const state of nextStates) {
      const signature =
        state.occupied
          .map(
            (item) =>
              `${item.element.id}:${Math.round(
                item.rect.x
              )},${Math.round(
                item.rect.y
              )},${Math.round(
                item.rect.width
              )},${Math.round(
                item.rect.height
              )}`
          )
          .join('|');

      if (seen.has(signature)) {
        continue;
      }

      seen.add(signature);
      selected.push(state);

      if (
        selected.length >=
        MAX_BEAM_STATES
      ) {
        break;
      }
    }

    states = selected;
  }

  if (states.length === 0) {
    return {
      success: false,
      failIndex: 0,
    };
  }

  /*
   * The best complete state is chosen only after all elements have been
   * considered. This is the holistic part of the resolver.
   */
  states.sort(
    (a, b) =>
      b.score - a.score
  );

  return {
    success: true,
    placements:
      states[0].placements,
  };
}

/* -------------------------------------------------------------------------- */
/* Resolution metadata                                                        */
/* -------------------------------------------------------------------------- */

function createDecision(
  strategy: string,
  attempts = 1,
  resized = false,
  repositioned = false,
  compositionChanged = false
): ResolutionDecision {
  return {
    strategy,
    attempts,
    resized,
    repositioned,
    compositionChanged,
  };
}

function visibleElement(
  element: AdElement,
  rect: Rect,
  decision: ResolutionDecision
): ResolvedElement {
  return {
    id: element.id,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    visible: true,
    decisions: decision,
  };
}

function droppedElement(
  element: AdElement,
  reason: string,
  decision: ResolutionDecision
): ResolvedElement {
  return {
    id: element.id,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
    reason,
    decisions: decision,
  };
}

/* -------------------------------------------------------------------------- */
/* Priority degradation                                                       */
/* -------------------------------------------------------------------------- */

function resolveWithDegradation(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result =
    new Map<
      string,
      ResolvedElement
    >();

  /*
   * Orientation is derived from available geometry.
   * No surface identity is inspected.
   */
  const orientation =
    determineOrientation(safe);

  /*
   * Process higher-priority content first.
   * Priority 1 is highest.
   */
  let ordered: PackCandidate[] =
    spec.elements
      .map((element, index) => ({
        element,
        index,
      }))
      .sort(
        (a, b) =>
          a.element.priority -
            b.element.priority ||
          a.index - b.index
      )
      .map(({ element }) => ({
        element,
        size: applyHardConstraints(
          element,
          baseTargetSize(
            element.role,
            safe,
            orientation
          ),
          surface,
          safe
        ),
      }));

  const dropped: {
    element: AdElement;
    reason: string;
  }[] = [];

  let finalPlacements =
    new Map<string, Placement>();

  /*
   * Keep trying to pack the composition.
   *
   * If it cannot fit, remove the least important element
   * among the elements considered so far and retry.
   */
  while (ordered.length > 0) {
    const packResult =
      attemptPack(
        ordered,
        safe,
        surface
      );

    if (packResult.success) {
      finalPlacements =
        packResult.placements;
      break;
    }

    const failIndex =
      'failIndex' in packResult
        ? packResult.failIndex
        : ordered.length;

    let victimIndex =
      failIndex;

    for (
      let i = 0;
      i <= failIndex;
      i++
    ) {
      if (
        ordered[i].element.priority >
        ordered[victimIndex].element
          .priority
      ) {
        victimIndex = i;
      }
    }

    const [victim] =
      ordered.splice(
        victimIndex,
        1
      );

    dropped.push({
      element: victim.element,
      reason:
        victimIndex === failIndex
          ? 'No valid, usable placement remained within the surface constraints.'
          : 'Dropped so higher-priority content could retain valid space.',
    });
  }

  /*
   * Convert successful placements into renderer output.
   */
  for (const candidate of ordered) {
    const placement =
      finalPlacements.get(
        candidate.element.id
      );

    if (!placement) {
      continue;
    }

    result.set(
      candidate.element.id,
      visibleElement(
        candidate.element,
        placement.rect,
        createDecision(
          'candidate-composition',
          placement.attempts,
          placement.resized,
          placement.repositioned,
          placement.resized ||
            placement.repositioned
        )
      )
    );
  }

  /*
   * Keep dropped elements in the output so the Inspector
   * can explain why they disappeared.
   */
  for (const droppedInfo of dropped) {
    result.set(
      droppedInfo.element.id,
      droppedElement(
        droppedInfo.element,
        droppedInfo.reason,
        createDecision(
          'priority-degradation',
          1,
          true,
          false,
          true
        )
      )
    );
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Final validation                                                           */
/* -------------------------------------------------------------------------- */

function validateResolvedLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect,
  elements: ResolvedElement[]
): boolean {
  const visible =
    elements.filter(
      (element) => element.visible
    );

  if (visible.length === 0) {
    return false;
  }

  /*
   * Every visible element must stay completely
   * inside the safe area and surface.
   */
  for (const element of visible) {
    if (!inside(element, safe)) {
      return false;
    }

    if (
      element.x < 0 ||
      element.y < 0 ||
      element.x + element.width >
        surface.width ||
      element.y + element.height >
        surface.height
    ) {
      return false;
    }

    const specElement =
      spec.elements.find(
        (item) =>
          item.id === element.id
      );

    /*
     * Interactive elements must satisfy the
     * surface tap-target constraint.
     */
    if (
      specElement?.type ===
        'button' &&
      surface.minTapTarget !==
        undefined
    ) {
      if (
        element.width <
          surface.minTapTarget ||
        element.height <
          surface.minTapTarget
      ) {
        return false;
      }
    }

    /*
     * Text must satisfy the surface's minimum
     * text-height constraint when provided.
     */
    if (
      specElement?.type === 'text' &&
      surface.minTextSize !==
        undefined
    ) {
      if (
        element.height <
        surface.minTextSize * 1.4
      ) {
        return false;
      }
    }
  }

  /*
   * Final pairwise overlap validation.
   */
  for (
    let i = 0;
    i < visible.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < visible.length;
      j++
    ) {
      if (
        overlaps(
          visible[i],
          visible[j]
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

/* -------------------------------------------------------------------------- */
/* Main resolver                                                              */
/* -------------------------------------------------------------------------- */

export function resolveLayout(
  spec: AdSpecification,
  surface: SurfaceProfile
): ResolvedLayout {
  /*
   * Validate the typed inputs before resolving.
   */
  const specErrors =
    validateAdSpec(spec);

  const surfaceErrors =
    validateSurface(surface);

  if (
    specErrors.length > 0 ||
    surfaceErrors.length > 0
  ) {
    const elements =
      spec.elements.map(
        (element) =>
          droppedElement(
            element,
            'Invalid specification or surface.',
            createDecision(
              'validation-failed',
              0,
              false,
              false,
              true
            )
          )
      );

    return {
      surface,
      elements,
      valid: false,
      visibleCount: 0,
      droppedCount:
        elements.length,
    };
  }

  const safe =
    safeRect(surface);

  /*
   * A surface must have usable space after safe-area
   * constraints are applied.
   */
  if (
    safe.width <= 0 ||
    safe.height <= 0
  ) {
    const elements =
      spec.elements.map(
        (element) =>
          droppedElement(
            element,
            'Surface has no usable safe area.',
            createDecision(
              'invalid-safe-area',
              0,
              false,
              false,
              true
            )
          )
      );

    return {
      surface,
      elements,
      valid: false,
      visibleCount: 0,
      droppedCount:
        elements.length,
    };
  }

  /*
   * The resolver adapts using geometry, element roles,
   * constraints, candidate scoring, and priority.
   *
   * No surface name is inspected.
   */
  const resolvedMap =
    resolveWithDegradation(
      spec,
      surface,
      safe
    );

  /*
   * Preserve original specification order for
   * the renderer and Layout Inspector.
   */
  const elements =
    spec.elements.map(
      (element) =>
        resolvedMap.get(
          element.id
        ) ??
        droppedElement(
          element,
          'No valid placement was produced.',
          createDecision(
            'composition-fallback',
            1,
            false,
            false,
            true
          )
        )
    );

  const visibleCount =
    elements.filter(
      (element) =>
        element.visible
    ).length;

  const droppedCount =
    elements.length -
    visibleCount;

  const valid =
    validateResolvedLayout(
      spec,
      surface,
      safe,
      elements
    );

  return {
    surface,
    elements,
    valid,
    visibleCount,
    droppedCount,
  };
}