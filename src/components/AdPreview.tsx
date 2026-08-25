import type { ResolvedLayout } from '../engine/types';
import { getAdElementById } from '../engine/spec';
import { adData, selectProductAsset } from '../data/ad';
import './AdPreview.css';

interface AdPreviewProps {
  layout: ResolvedLayout;
  onElementClick?: (elementId: string) => void;
  selectedElementId?: string;
}

export function AdPreview({
  layout,
  onElementClick,
  selectedElementId,
}: AdPreviewProps) {
  const { surface, elements } = layout;

  return (
    <div className="ad-preview">
      <div
        className="ad-surface"
        style={{
          position: 'relative',
          width: surface.width,
          height: surface.height,
          overflow: 'hidden',
          boxSizing: 'border-box',
          background:
            'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        {elements.map((resolvedElement) => {
          const specElement = getAdElementById(resolvedElement.id);

          if (!specElement || !resolvedElement.visible) {
            return null;
          }

          return (
            <div
              key={resolvedElement.id}
              className={`ad-element ${
                selectedElementId === resolvedElement.id ? 'selected' : ''
              }`}
              style={{
                position: 'absolute',
                left: resolvedElement.x,
                top: resolvedElement.y,
                width: resolvedElement.width,
                height: resolvedElement.height,

                /*
                 * The resolver owns the geometry.
                 * The renderer must never move an element outside
                 * the rectangle it was given.
                 */
                boxSizing: 'border-box',
                overflow: 'hidden',

                cursor: onElementClick ? 'pointer' : 'default',
              }}
              onClick={() => onElementClick?.(resolvedElement.id)}
            >
              {renderElementContent(specElement, resolvedElement)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Estimate a safe readable font size from the already-resolved
 * element rectangle.
 *
 * IMPORTANT:
 * This is only typography/rendering.
 * It does NOT decide x/y/width/height or surface-specific layout.
 */
function getTextFontSize(
  text: string,
  width: number,
  height: number,
  role: string
): number {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);

  /*
   * Approximate number of characters that can fit on one line.
   * This prevents long strings from creating an oversized font
   * that visually collides with neighboring resolved elements.
   */
  const charactersPerLine = Math.max(
    8,
    Math.floor(safeWidth / (role === 'primary' ? 0.62 : 0.56) / 10)
  );

  const estimatedLines = Math.max(
    1,
    Math.ceil(text.length / charactersPerLine)
  );

  /*
   * Leave enough vertical room for the estimated number of lines.
   */
  const heightBasedSize =
    safeHeight / Math.max(1, estimatedLines * 1.25);

  /*
   * Width constraint based on the amount of text.
   */
  const widthBasedSize =
    safeWidth /
    Math.max(
      8,
      Math.min(text.length, charactersPerLine * estimatedLines) *
        (role === 'primary' ? 0.56 : 0.52)
    );

  /*
   * The resolved rectangle is the hard boundary.
   * Keep typography comfortably inside it.
   */
  let fontSize = Math.min(
    heightBasedSize,
    widthBasedSize,
    safeHeight * 0.72
  );

  /*
   * Primary/headline text can be larger, but still cannot
   * escape the resolved rectangle.
   */
  if (role === 'primary') {
    fontSize = Math.min(fontSize * 1.15, safeHeight * 0.7);
  }

  /*
   * Never create a font larger than the element can reasonably
   * contain, and never let tiny constrained elements generate
   * an enormous font.
   */
  const maxFontSize = Math.max(10, Math.min(96, safeHeight * 0.7));

  return Math.max(10, Math.min(fontSize, maxFontSize));
}

function renderElementContent(
  specElement: any,
  resolvedElement: any
) {
  const width = Math.max(1, resolvedElement.width);
  const height = Math.max(1, resolvedElement.height);

  switch (specElement.type) {
    case 'text': {
      const isPrimary = specElement.role === 'primary';

      const fontSize = getTextFontSize(
        String(specElement.content ?? ''),
        width,
        height,
        specElement.role
      );

      return (
        <div
          style={{
            width: '100%',
            height: '100%',

            boxSizing: 'border-box',

            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            color: '#FFFFFF',
            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

            fontSize,
            fontWeight: isPrimary ? 700 : 400,

            /*
             * Keep text inside the resolver's rectangle.
             */
            lineHeight: 1.15,
            textAlign: 'center',

            /*
             * Small internal padding prevents glyphs touching
             * the resolved boundary.
             */
            padding: Math.max(2, Math.min(8, fontSize * 0.12)),

            boxSizing: 'border-box',

            /*
             * Allow natural wrapping but never allow text to
             * visually escape the resolved element.
             */
            whiteSpace: 'normal',
            overflow: 'hidden',
            overflowWrap: 'break-word',
            wordBreak: 'normal',

            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        >
          {specElement.content}
        </div>
      );
    }

    case 'image': {
      if (specElement.role === 'hero') {
        const productAsset = selectProductAsset(width, height);

        return (
          <img
            src={productAsset}
            alt="NV Daily Reset Gentle Face Cleanser"
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',

              /*
               * Never distort the product.
               * The image remains entirely inside the resolved box.
               */
              objectFit: 'contain',
              objectPosition: 'center',

              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        );
      }

      if (specElement.role === 'branding') {
        return (
          <img
            src={adData.assets['logo']}
            alt="NV SKIN"
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',

              objectFit: 'contain',
              objectPosition: 'center',

              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        );
      }

      return null;
    }

    case 'button': {
      /*
       * The resolver already guarantees the button's rectangle
       * satisfies the minimum tap target when it is visible.
       *
       * The renderer therefore does not change its dimensions.
       */
      const buttonFontSize = Math.max(
        12,
        Math.min(
          height * 0.32,
          width * 0.16,
          28
        )
      );

      return (
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            width: '100%',
            height: '100%',

            boxSizing: 'border-box',

            backgroundColor: '#C9A86C',
            color: '#1A1A1A',

            border: 'none',
            borderRadius: Math.min(8, width * 0.08),

            fontFamily:
              'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

            fontSize: buttonFontSize,
            fontWeight: 600,

            lineHeight: 1.1,
            textAlign: 'center',

            padding: '4px 10px',

            /*
             * Button content must stay inside the resolved
             * button rectangle.
             */
            overflow: 'hidden',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',

            cursor: 'pointer',

            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {specElement.content}
        </button>
      );
    }

    default:
      return null;
  }
}