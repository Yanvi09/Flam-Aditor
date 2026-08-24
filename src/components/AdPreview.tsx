import type { ResolvedLayout } from '../engine/types';
import { getAdElementById } from '../engine/spec';
import { selectProductAsset } from '../data/ad';
import './AdPreview.css';

interface AdPreviewProps {
  layout: ResolvedLayout;
  onElementClick?: (elementId: string) => void;
  selectedElementId?: string;
}

export function AdPreview({ layout, onElementClick, selectedElementId }: AdPreviewProps) {
  const { surface, elements } = layout;

  return (
    <div className="ad-preview">
      <div
        className="ad-surface"
        style={{
          width: surface.width,
          height: surface.height,
          backgroundColor: '#F5F0EB',
        }}
      >
        {elements.map((resolvedElement) => {
          const specElement = getAdElementById(resolvedElement.id);
          if (!specElement || !resolvedElement.visible) return null;

          return (
            <div
              key={resolvedElement.id}
              className={`ad-element ${selectedElementId === resolvedElement.id ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: resolvedElement.x,
                top: resolvedElement.y,
                width: resolvedElement.width,
                height: resolvedElement.height,
                cursor: 'pointer',
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

function renderElementContent(specElement: any, resolvedElement: any) {
  switch (specElement.type) {
    case 'text':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1A1A1A',
            fontFamily: 'system-ui, sans-serif',
            fontSize: resolvedElement.height * 0.6,
            fontWeight: specElement.role === 'primary' ? 600 : 400,
            textAlign: 'center',
            padding: '4px',
          }}
        >
          {specElement.content}
        </div>
      );

    case 'image':
      if (specElement.role === 'hero') {
        const productAsset = selectProductAsset(resolvedElement.width, resolvedElement.height);
        return (
          <img
            src={productAsset}
            alt="NV Daily Reset"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        );
      } else if (specElement.role === 'branding') {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1A1A1A',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <span style={{ fontSize: resolvedElement.height * 0.6, fontWeight: 600 }}>NV</span>
            <span style={{ fontSize: resolvedElement.height * 0.3, letterSpacing: '1px' }}>SKIN</span>
          </div>
        );
      }
      break;

    case 'button':
      return (
        <button
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#D6A080',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: '4px',
            fontFamily: 'system-ui, sans-serif',
            fontSize: resolvedElement.height * 0.4,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {specElement.content}
        </button>
      );
  }

  return null;
}