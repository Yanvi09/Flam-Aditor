import { ResolvedLayout } from '../engine/types';
import { getAdElementById } from '../engine/spec';
import './Inspector.css';

interface InspectorProps {
  layout: ResolvedLayout;
  selectedElementId?: string;
}

export function Inspector({ layout, selectedElementId }: InspectorProps) {
  const { surface, elements, visibleCount, droppedCount } = layout;

  return (
    <div className="inspector">
      <div className="inspector-section">
        <h3>Surface</h3>
        <div className="inspector-info">
          <div className="info-row">
            <span className="info-label">Dimensions:</span>
            <span className="info-value">{surface.width} × {surface.height}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Safe Area:</span>
            <span className="info-value">
              T:{surface.safeArea.top} R:{surface.safeArea.right} B:{surface.safeArea.bottom} L:{surface.safeArea.left}
            </span>
          </div>
          {surface.minTapTarget && (
            <div className="info-row">
              <span className="info-label">Min Tap Target:</span>
              <span className="info-value">{surface.minTapTarget}px</span>
            </div>
          )}
          {surface.minTextSize && (
            <div className="info-row">
              <span className="info-label">Min Text Size:</span>
              <span className="info-value">{surface.minTextSize}px</span>
            </div>
          )}
        </div>
      </div>

      <div className="inspector-section">
        <h3>Resolution Status</h3>
        <div className="inspector-info">
          <div className="info-row">
            <span className="info-label">Visible Elements:</span>
            <span className="info-value">{visibleCount} / {elements.length}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dropped Elements:</span>
            <span className="info-value">{droppedCount}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`info-value ${layout.valid ? 'status-valid' : 'status-invalid'}`}>
              {layout.valid ? 'Valid' : 'Invalid'}
            </span>
          </div>
        </div>
      </div>

      <div className="inspector-section">
        <h3>Elements</h3>
        <div className="elements-list">
          {elements.map((resolvedElement) => {
            const specElement = getAdElementById(resolvedElement.id);
            if (!specElement) return null;

            return (
              <div
                key={resolvedElement.id}
                className={`element-item ${selectedElementId === resolvedElement.id ? 'selected' : ''}`}
              >
                <div className="element-header">
                  <span className="element-id">{resolvedElement.id}</span>
                  <span className={`element-status ${resolvedElement.visible ? 'visible' : 'dropped'}`}>
                    {resolvedElement.visible ? '✓' : '✗'}
                  </span>
                </div>
                {resolvedElement.visible && (
                  <div className="element-details">
                    <div className="detail-row">
                      <span>Position:</span>
                      <span>x:{Math.round(resolvedElement.x)}, y:{Math.round(resolvedElement.y)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Size:</span>
                      <span>{Math.round(resolvedElement.width)} × {Math.round(resolvedElement.height)}</span>
                    </div>
                  </div>
                )}
                {!resolvedElement.visible && resolvedElement.reason && (
                  <div className="element-reason">{resolvedElement.reason}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}