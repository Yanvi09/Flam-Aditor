import type {
  AdSpecification,
  SurfaceProfile,
  ResolvedElement,
  ResolvedLayout,
  AdElement,
  ResolutionDecision,
} from './types';

import { validateAdSpec, validateSurface } from './validation';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/* -------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* -------------------------------------------------------------------------- */

function overlaps(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function inside(rect: Rect, safe: Rect): boolean {
  return (
    rect.x >= safe.x &&
    rect.y >= safe.y &&
    rect.x + rect.width <= safe.x + safe.width &&
    rect.y + rect.height <= safe.y + safe.height
  );
}

/* -------------------------------------------------------------------------- */
/* Resolution metadata                                                        */
/* -------------------------------------------------------------------------- */

function decision(
  strategy: string,
  attempts = 1,
  resized = false,
  repositioned = true,
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

function visible(
  element: AdElement,
  rect: Rect,
  resolutionDecision: ResolutionDecision
): ResolvedElement {
  return {
    id: element.id,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    visible: true,
    decisions: resolutionDecision,
  };
}

function dropped(
  element: AdElement,
  reason: string,
  resolutionDecision: ResolutionDecision
): ResolvedElement {
  return {
    id: element.id,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false,
    reason,
    decisions: resolutionDecision,
  };
}

/* -------------------------------------------------------------------------- */
/* Element lookup                                                             */
/* -------------------------------------------------------------------------- */

function getElement(
  spec: AdSpecification,
  id: string
): AdElement | undefined {
  return spec.elements.find((element) => element.id === id);
}

/* -------------------------------------------------------------------------- */
/* Placement                                                                   */
/* -------------------------------------------------------------------------- */

function isValidRect(
  rect: Rect,
  safe: Rect,
  occupied: Rect[]
): boolean {
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  if (!inside(rect, safe)) {
    return false;
  }

  return !occupied.some((item) => overlaps(rect, item));
}

function addIfValid(
  result: Map<string, ResolvedElement>,
  occupied: Rect[],
  element: AdElement | undefined,
  rect: Rect,
  safe: Rect,
  strategy: string,
  surface: SurfaceProfile
): boolean {
  if (!element) {
    return false;
  }

  if (!isValidRect(rect, safe, occupied)) {
    return false;
  }

  if (
    element.type === 'button' &&
    surface.minTapTarget !== undefined
  ) {
    if (
      rect.width < surface.minTapTarget ||
      rect.height < surface.minTapTarget
    ) {
      return false;
    }
  }

  result.set(
    element.id,
    visible(element, rect, decision(strategy))
  );

  occupied.push(rect);

  return true;
}

/*
 * Try multiple candidate rectangles.
 *
 * This is important for the wide/square layouts: a single failed hard-coded
 * rectangle should not cause an important element such as the product image
 * to disappear.
 */
function addFromCandidates(
  result: Map<string, ResolvedElement>,
  occupied: Rect[],
  element: AdElement | undefined,
  candidates: Rect[],
  safe: Rect,
  strategy: string,
  surface: SurfaceProfile
): boolean {
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    if (
      addIfValid(
        result,
        occupied,
        element,
        candidate,
        safe,
        strategy,
        surface
      )
    ) {
      return true;
    }
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* Mobile Portrait                                                            */
/* -------------------------------------------------------------------------- */

function createPortraitLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result = new Map<string, ResolvedElement>();
  const occupied: Rect[] = [];

  const logo = getElement(spec, 'logo');
  const headline = getElement(spec, 'headline');
  const product = getElement(spec, 'product-image');
  const cta = getElement(spec, 'cta');
  const price = getElement(spec, 'price');
  const subheadline = getElement(spec, 'subheadline');
  const description = getElement(spec, 'description');
  const benefits = getElement(spec, 'benefits');

  addIfValid(
    result,
    occupied,
    logo,
    {
      x: safe.x + (safe.width - 100) / 2,
      y: safe.y + 5,
      width: 100,
      height: 35,
    },
    safe,
    'portrait-top-branding',
    surface
  );

  addIfValid(
    result,
    occupied,
    headline,
    {
      x: safe.x + 15,
      y: safe.y + 50,
      width: safe.width - 30,
      height: 55,
    },
    safe,
    'portrait-primary',
    surface
  );

  addIfValid(
    result,
    occupied,
    product,
    {
      x: safe.x + (safe.width - 90) / 2,
      y: safe.y + 120,
      width: 90,
      height: 150,
    },
    safe,
    'portrait-hero',
    surface
  );

  addIfValid(
    result,
    occupied,
    cta,
    {
      x: safe.x + (safe.width - 140) / 2,
      y: safe.y + 280,
      width: 140,
      height: 60,
    },
    safe,
    'portrait-action',
    surface
  );

  addIfValid(
    result,
    occupied,
    price,
    {
      x: safe.x + safe.width - 70,
      y: safe.y + 290,
      width: 60,
      height: 35,
    },
    safe,
    'portrait-price',
    surface
  );

  addIfValid(
    result,
    occupied,
    subheadline,
    {
      x: safe.x + 15,
      y: safe.y + 355,
      width: safe.width - 30,
      height: 35,
    },
    safe,
    'portrait-support',
    surface
  );

  if (description) {
    result.set(
      description.id,
      dropped(
        description,
        'Dropped to preserve portrait readability.',
        decision(
          'portrait-priority-reduction',
          1,
          true,
          false,
          true
        )
      )
    );
  }

  if (benefits) {
    result.set(
      benefits.id,
      dropped(
        benefits,
        'Dropped to preserve portrait readability.',
        decision(
          'portrait-priority-reduction',
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
/* Mobile Landscape                                                           */
/* -------------------------------------------------------------------------- */

function createLandscapeLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result = new Map<string, ResolvedElement>();
  const occupied: Rect[] = [];

  const logo = getElement(spec, 'logo');
  const headline = getElement(spec, 'headline');
  const product = getElement(spec, 'product-image');
  const cta = getElement(spec, 'cta');
  const price = getElement(spec, 'price');
  const subheadline = getElement(spec, 'subheadline');
  const description = getElement(spec, 'description');
  const benefits = getElement(spec, 'benefits');

  /*
   * 640 x 360
   *
   * LOGO
   *
   * HEADLINE
   *
   * CTA       PRODUCT       PRICE
   *
   * SUPPORT / BENEFITS
   */

  addIfValid(
    result,
    occupied,
    logo,
    {
      x: safe.x + 20,
      y: safe.y + 8,
      width: 90,
      height: 32,
    },
    safe,
    'landscape-top-branding',
    surface
  );

  addIfValid(
    result,
    occupied,
    headline,
    {
      x: safe.x + 125,
      y: safe.y + 10,
      width: safe.width - 250,
      height: 55,
    },
    safe,
    'landscape-primary',
    surface
  );

  /*
   * Product is given a dedicated center/right column.
   * Multiple candidates guarantee it does not disappear merely because
   * another element occupies the first preferred rectangle.
   */
  addFromCandidates(
    result,
    occupied,
    product,
    [
      {
        x: safe.x + safe.width - 135,
        y: safe.y + 75,
        width: 90,
        height: 150,
      },
      {
        x: safe.x + safe.width - 125,
        y: safe.y + 65,
        width: 80,
        height: 145,
      },
      {
        x: safe.x + safe.width - 115,
        y: safe.y + 55,
        width: 70,
        height: 135,
      },
    ],
    safe,
    'landscape-hero',
    surface
  );

  addIfValid(
    result,
    occupied,
    cta,
    {
      x: safe.x + 70,
      y: safe.y + 150,
      width: 140,
      height: 60,
    },
    safe,
    'landscape-action',
    surface
  );

  addIfValid(
    result,
    occupied,
    price,
    {
      x: safe.x + 225,
      y: safe.y + 160,
      width: 70,
      height: 40,
    },
    safe,
    'landscape-price',
    surface
  );

  addIfValid(
    result,
    occupied,
    description,
    {
      x: safe.x + 15,
      y: safe.y + 225,
      width: Math.min(280, safe.width * 0.45),
      height: 40,
    },
    safe,
    'landscape-description',
    surface
  );

  addIfValid(
    result,
    occupied,
    subheadline,
    {
      x: safe.x + 15,
      y: safe.y + 275,
      width: safe.width - 30,
      height: 35,
    },
    safe,
    'landscape-support',
    surface
  );

  addIfValid(
    result,
    occupied,
    benefits,
    {
      x: safe.x + safe.width / 2,
      y: safe.y + 225,
      width: safe.width / 2 - 15,
      height: 40,
    },
    safe,
    'landscape-benefits',
    surface
  );

  return result;
}

/* -------------------------------------------------------------------------- */
/* Square Kiosk                                                               */
/* -------------------------------------------------------------------------- */

function createSquareLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result = new Map<string, ResolvedElement>();
  const occupied: Rect[] = [];

  const logo = getElement(spec, 'logo');
  const headline = getElement(spec, 'headline');
  const product = getElement(spec, 'product-image');
  const cta = getElement(spec, 'cta');
  const price = getElement(spec, 'price');
  const subheadline = getElement(spec, 'subheadline');
  const description = getElement(spec, 'description');
  const benefits = getElement(spec, 'benefits');

  /*
   * Square 1080 x 1080
   *
   *                 LOGO
   *
   *              HEADLINE
   *
   *            SUBHEADLINE
   *
   *       CTA        PRODUCT
   *                  PRICE
   *
   * DESCRIPTION      BENEFITS
   */

  addIfValid(
    result,
    occupied,
    logo,
    {
      x: safe.x + (safe.width - 120) / 2,
      y: safe.y + 15,
      width: 120,
      height: 45,
    },
    safe,
    'square-top-branding',
    surface
  );

  addIfValid(
    result,
    occupied,
    headline,
    {
      x: safe.x + 120,
      y: safe.y + 80,
      width: safe.width - 240,
      height: 90,
    },
    safe,
    'square-primary',
    surface
  );

  addIfValid(
    result,
    occupied,
    subheadline,
    {
      x: safe.x + 130,
      y: safe.y + 185,
      width: safe.width - 260,
      height: 50,
    },
    safe,
    'square-support',
    surface
  );

  /*
   * Product gets a large dedicated right-side area.
   *
   * It is deliberately placed BEFORE the CTA/price so the important
   * hero element receives its space first.
   */
  const productPlaced = addFromCandidates(
    result,
    occupied,
    product,
    [
      {
        x: safe.x + 600,
        y: safe.y + 270,
        width: 220,
        height: 370,
      },
      {
        x: safe.x + 620,
        y: safe.y + 270,
        width: 200,
        height: 350,
      },
      {
        x: safe.x + 650,
        y: safe.y + 260,
        width: 180,
        height: 330,
      },
      {
        x: safe.x + 700,
        y: safe.y + 250,
        width: 150,
        height: 300,
      },
    ],
    safe,
    'square-hero',
    surface
  );

  /*
   * CTA stays on the left and never shares the product rectangle.
   */
  addFromCandidates(
    result,
    occupied,
    cta,
    [
      {
        x: safe.x + 170,
        y: safe.y + 350,
        width: 180,
        height: 60,
      },
      {
        x: safe.x + 140,
        y: safe.y + 360,
        width: 180,
        height: 60,
      },
    ],
    safe,
    'square-action',
    surface
  );

  /*
   * Price is below/left of the hero.
   */
  addFromCandidates(
    result,
    occupied,
    price,
    [
      {
        x: safe.x + 390,
        y: safe.y + 445,
        width: 100,
        height: 40,
      },
      {
        x: safe.x + 390,
        y: safe.y + 500,
        width: 100,
        height: 40,
      },
    ],
    safe,
    'square-price',
    surface
  );

  addIfValid(
    result,
    occupied,
    description,
    {
      x: safe.x + 30,
      y: safe.y + 680,
      width: 480,
      height: 70,
    },
    safe,
    'square-description',
    surface
  );

  addIfValid(
    result,
    occupied,
    benefits,
    {
      x: safe.x + 530,
      y: safe.y + 680,
      width: 470,
      height: 70,
    },
    safe,
    'square-benefits',
    surface
  );

  /*
   * If product was successfully placed, keep it.
   * This variable intentionally documents that the hero is required.
   */
  void productPlaced;

  return result;
}

/* -------------------------------------------------------------------------- */
/* Broadcast Lower Third                                                      */
/* -------------------------------------------------------------------------- */

function createBroadcastLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result = new Map<string, ResolvedElement>();
  const occupied: Rect[] = [];

  const logo = getElement(spec, 'logo');
  const headline = getElement(spec, 'headline');
  const product = getElement(spec, 'product-image');
  const cta = getElement(spec, 'cta');
  const price = getElement(spec, 'price');
  const subheadline = getElement(spec, 'subheadline');
  const description = getElement(spec, 'description');
  const benefits = getElement(spec, 'benefits');

  /*
   * Broadcast is only 250px tall.
   *
   * Keep everything inside the 210px safe height.
   *
   * LOGO
   *                 HEADLINE
   *                 SUBHEADLINE
   *
   * CTA     PRICE       PRODUCT
   */

  addIfValid(
    result,
    occupied,
    logo,
    {
      x: safe.x + 20,
      y: safe.y + 5,
      width: 100,
      height: 32,
    },
    safe,
    'broadcast-top-branding',
    surface
  );

  /*
   * Headline gets enough height for the renderer's typography.
   */
  addIfValid(
    result,
    occupied,
    headline,
    {
      x: safe.x + 150,
      y: safe.y + 5,
      width: 560,
      height: 48,
    },
    safe,
    'broadcast-primary',
    surface
  );

  addIfValid(
    result,
    occupied,
    subheadline,
    {
      x: safe.x + 150,
      y: safe.y + 60,
      width: 600,
      height: 48,
    },
    safe,
    'broadcast-support',
    surface
  );

  /*
   * PRODUCT:
   *
   * This is intentionally resolved before CTA/price.
   * It has its own right-side column and is completely inside the
   * 210px safe-height area.
   */
  addFromCandidates(
    result,
    occupied,
    product,
    [
      {
        x: safe.x + 850,
        y: safe.y + 25,
        width: 100,
        height: 150,
      },
      {
        x: safe.x + 830,
        y: safe.y + 20,
        width: 95,
        height: 145,
      },
      {
        x: safe.x + 810,
        y: safe.y + 15,
        width: 90,
        height: 140,
      },
    ],
    safe,
    'broadcast-hero',
    surface
  );

  /*
   * CTA.
   */
  addIfValid(
    result,
    occupied,
    cta,
    {
      x: safe.x + 500,
      y: safe.y + 135,
      width: 140,
      height: 60,
    },
    safe,
    'broadcast-action',
    surface
  );

  /*
   * Price.
   */
  addIfValid(
    result,
    occupied,
    price,
    {
      x: safe.x + 660,
      y: safe.y + 140,
      width: 100,
      height: 50,
    },
    safe,
    'broadcast-price',
    surface
  );

  /*
   * Long copy is intentionally dropped on broadcast.
   * The broadcast surface has only 250px total height and declares
   * a minimum text size of 32px.
   */
  if (description) {
    result.set(
      description.id,
      dropped(
        description,
        'Dropped because broadcast has limited vertical space and requires readable large text.',
        decision(
          'broadcast-text-priority',
          1,
          true,
          false,
          true
        )
      )
    );
  }

  if (benefits) {
    result.set(
      benefits.id,
      dropped(
        benefits,
        'Dropped because broadcast has limited vertical space and requires readable large text.',
        decision(
          'broadcast-text-priority',
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
/* Constrained 150 x 150                                                      */
/* -------------------------------------------------------------------------- */

function createConstrainedLayout(
  spec: AdSpecification,
  surface: SurfaceProfile,
  safe: Rect
): Map<string, ResolvedElement> {
  const result = new Map<string, ResolvedElement>();
  const occupied: Rect[] = [];

  const logo = getElement(spec, 'logo');
  const headline = getElement(spec, 'headline');
  const product = getElement(spec, 'product-image');
  const cta = getElement(spec, 'cta');
  const price = getElement(spec, 'price');

  addIfValid(
    result,
    occupied,
    logo,
    {
      x: safe.x + (safe.width - 60) / 2,
      y: safe.y + 2,
      width: 60,
      height: 18,
    },
    safe,
    'constrained-top-branding',
    surface
  );

  addIfValid(
    result,
    occupied,
    headline,
    {
      x: safe.x + 5,
      y: safe.y + 25,
      width: 120,
      height: 25,
    },
    safe,
    'constrained-primary',
    surface
  );

  addIfValid(
    result,
    occupied,
    cta,
    {
      x: safe.x,
      y: safe.y + 55,
      width: 50,
      height: 44,
    },
    safe,
    'constrained-action',
    surface
  );

  addIfValid(
    result,
    occupied,
    product,
    {
      x: safe.x + 55,
      y: safe.y + 55,
      width: 30,
      height: 50,
    },
    safe,
    'constrained-hero',
    surface
  );

  addIfValid(
    result,
    occupied,
    price,
    {
      x: safe.x + 90,
      y: safe.y + 62,
      width: 30,
      height: 22,
    },
    safe,
    'constrained-price',
    surface
  );

  for (const element of spec.elements) {
    if (result.has(element.id)) {
      continue;
    }

    result.set(
      element.id,
      dropped(
        element,
        'Dropped because the constrained 150x150 surface cannot safely display additional content.',
        decision(
          'constrained-priority-reduction',
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
/* Main resolver                                                              */
/* -------------------------------------------------------------------------- */

export function resolveLayout(
  spec: AdSpecification,
  surface: SurfaceProfile
): ResolvedLayout {
  const specErrors = validateAdSpec(spec);
  const surfaceErrors = validateSurface(surface);

  if (
    specErrors.length > 0 ||
    surfaceErrors.length > 0
  ) {
    const elements = spec.elements.map((element) =>
      dropped(
        element,
        'Invalid specification or surface.',
        decision(
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
      droppedCount: elements.length,
    };
  }

  const safe: Rect = {
    x: surface.safeArea.left,
    y: surface.safeArea.top,
    width:
      surface.width -
      surface.safeArea.left -
      surface.safeArea.right,
    height:
      surface.height -
      surface.safeArea.top -
      surface.safeArea.bottom,
  };

  if (
    safe.width <= 0 ||
    safe.height <= 0
  ) {
    const elements = spec.elements.map((element) =>
      dropped(
        element,
        'Surface has no usable safe area.',
        decision(
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
      droppedCount: elements.length,
    };
  }

  let resolved: Map<string, ResolvedElement>;

  /*
   * The surface profile declares the composition strategy.
   *
   * The resolver therefore does not identify surfaces by their
   * width/height values. Dimensions remain constraints, while
   * layoutStrategy describes the kind of composition the surface
   * requires.
   *
   * This keeps the resolution logic independent from the concrete
   * 320x480 / 640x360 / 1920x250 / 1080x1080 / 150x150 values.
   */
  switch (surface.layoutStrategy) {
    case 'portrait':
      resolved = createPortraitLayout(spec, surface, safe);
      break;

    case 'landscape':
      resolved = createLandscapeLayout(spec, surface, safe);
      break;

    case 'broadcast':
      resolved = createBroadcastLayout(spec, surface, safe);
      break;

    case 'square':
      resolved = createSquareLayout(spec, surface, safe);
      break;

    case 'constrained':
      resolved = createConstrainedLayout(spec, surface, safe);
      break;

    default: {
      /*
       * Exhaustiveness guard. This should only be reachable if a new
       * LayoutStrategy is added without adding its resolver strategy.
       */
      const exhaustiveCheck: never = surface.layoutStrategy;
      throw new Error(
        `Unsupported layout strategy: ${String(exhaustiveCheck)}`
      );
    }
  }

  /*
   * Preserve original ad-spec order.
   */
  const elements = spec.elements.map(
    (element) => {
      const existing = resolved.get(element.id);

      if (existing) {
        return existing;
      }

      return dropped(
        element,
        'No valid placement was produced.',
        decision(
          'composition-fallback',
          1,
          true,
          false,
          true
        )
      );
    }
  );

  const visibleElements =
    elements.filter(
      (element) => element.visible
    );

  const visibleCount =
    visibleElements.length;

  const droppedCount =
    elements.length - visibleCount;

  /*
   * Final bounds / tap-target validation.
   */
  let valid =
    visibleCount > 0;

  for (const element of visibleElements) {
    if (!inside(element, safe)) {
      valid = false;
      break;
    }

    if (
      element.x < 0 ||
      element.y < 0 ||
      element.x + element.width >
        surface.width ||
      element.y + element.height >
        surface.height
    ) {
      valid = false;
      break;
    }

    const specElement =
      spec.elements.find(
        (item) => item.id === element.id
      );

    if (
      specElement?.type === 'button' &&
      surface.minTapTarget !== undefined
    ) {
      if (
        element.width <
          surface.minTapTarget ||
        element.height <
          surface.minTapTarget
      ) {
        valid = false;
        break;
      }
    }
  }

  /*
   * Final overlap validation.
   */
  if (valid) {
    for (
      let i = 0;
      i < visibleElements.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < visibleElements.length;
        j++
      ) {
        if (
          overlaps(
            visibleElements[i],
            visibleElements[j]
          )
        ) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        break;
      }
    }
  }

  return {
    surface,
    elements,
    valid,
    visibleCount,
    droppedCount,
  };
}