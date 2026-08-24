import type { ResolvedLayout } from '../engine/types';
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
      {/* Surface Information */}
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

      {/* Resolution Status */}
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

      {/* Selected Element Details */}
      {selectedElementId && (
        <div className="inspector-section">
          <h3>Selected Element</h3>
          {renderSelectedElementDetails(selectedElementId, elements)}
        </div>
      )}

      {/* Elements List */}
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
                  <span className="element-id">{specElement.content || resolvedElement.id}</span>
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

function renderSelectedElementDetails(elementId: string, elements: any[]) {
  const resolvedElement = elements.find(e => e.id === elementId);
  const specElement = getAdElementById(elementId);

  if (!resolvedElement || !specElement) {
    return <div className="info-value">Element not found</div>;
  }

  return (
    <div className="selected-element-details">
      <div className="detail-row">
        <span className="info-label">Name:</span>
        <span className="info-value">{specElement.content || elementId}</span>
      </div>
      <div className="detail-row">
        <span className="info-label">Type:</span>
        <span className="info-value">{specElement.type}</span>
      </div>
      <div className="detail-row">
        <span className="info-label">Role:</span>
        <span className="info-value">{specElement.role}</span>
      </div>
      <div className="detail-row">
        <span className="info-label">Priority:</span>
        <span className={`info-value priority-${specElement.priority}`}>
          {specElement.priority} {specElement.priority === 1 ? '(High)' : specElement.priority === 2 ? '(Medium)' : '(Low)'}
        </span>
      </div>
      <div className="detail-row">
        <span className="info-label">Status:</span>
        <span className={`info-value ${resolvedElement.visible ? 'status-visible' : 'status-dropped'}`}>
          {resolvedElement.visible ? 'Visible' : 'Dropped'}
        </span>
      </div>
      {resolvedElement.visible && (
        <>
          <div className="detail-row">
            <span className="info-label">Position:</span>
            <span className="info-value">x:{Math.round(resolvedElement.x)}, y:{Math.round(resolvedElement.y)}</span>
          </div>
          <div className="detail-row">
            <span className="info-label">Size:</span>
            <span className="info-value">{Math.round(resolvedElement.width)} × {Math.round(resolvedElement.height)}</span>
          </div>
        </>
      )}
      {resolvedElement.decisions && (
        <div className="resolution-decisions">
          <div className="info-label">Resolution Strategy:</div>
          <div className="info-value">{resolvedElement.decisions.strategy}</div>
          <div className="info-label">Attempts:</div>
          <div className="info-value">{resolvedElement.decisions.attempts}</div>
          {resolvedElement.decisions.resized && <div className="decision-tag">Resized</div>}
          {resolvedElement.decisions.repositioned && <div className="decision-tag">Repositioned</div>}
          {resolvedElement.decisions.compositionChanged && <div className="decision-tag">Composition Changed</div>}
        </div>
      )}
      {!resolvedElement.visible && resolvedElement.reason && (
        <div className="drop-reason">
          <div className="info-label">Drop Reason:</div>
          <div className="info-value">{resolvedElement.reason}</div>
        </div>
      )}
    </div>
  );
}