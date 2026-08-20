import { ResolvedLayout, ResolvedElement } from '../engine/types';
import { getAdElementById } from '../engine/spec';
import './ExplainLayout.css';

interface ExplainLayoutProps {
  layout: ResolvedLayout;
  selectedElementId?: string;
}

export function ExplainLayout({ layout, selectedElementId }: ExplainLayoutProps) {
  if (!selectedElementId) {
    return (
      <div className="explain-layout">
        <div className="explain-placeholder">
          Click an element in the preview to see why it was positioned this way.
        </div>
      </div>
    );
  }

  const resolvedElement = layout.elements.find((el) => el.id === selectedElementId);
  const specElement = getAdElementById(selectedElementId);

  if (!resolvedElement || !specElement) {
    return null;
  }

  return (
    <div className="explain-layout">
      <div className="explain-header">
        <h3>{specElement.content || specElement.id}</h3>
        <div className="explain-badge">{specElement.type}</div>
      </div>

      <div className="explain-section">
        <h4>Priority</h4>
        <div className="explain-value">
          <span className={`priority-badge priority-${specElement.priority}`}>
            {specElement.priority} {specElement.priority === 1 ? '— High' : specElement.priority === 2 ? '— Medium' : '— Low'}
          </span>
        </div>
      </div>

      <div className="explain-section">
        <h4>Role</h4>
        <div className="explain-value">{specElement.role}</div>
      </div>

      {resolvedElement.visible ? (
        <>
          <div className="explain-section">
            <h4>Resolved Size</h4>
            <div className="explain-value">
              {Math.round(resolvedElement.width)} × {Math.round(resolvedElement.height)}
            </div>
          </div>

          <div className="explain-section">
            <h4>Position</h4>
            <div className="explain-value">
              x: {Math.round(resolvedElement.x)}, y: {Math.round(resolvedElement.y)}
            </div>
          </div>

          <div className="explain-section">
            <h4>Status</h4>
            <div className="explain-value status-visible">Visible</div>
          </div>

          <div className="explain-section">
            <h4>Why?</h4>
            <div className="explain-explanation">
              {generateExplanation(specElement, resolvedElement, layout)}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="explain-section">
            <h4>Status</h4>
            <div className="explain-value status-dropped">Dropped</div>
          </div>

          <div className="explain-section">
            <h4>Why?</h4>
            <div className="explain-explanation">
              {generateDroppedExplanation(specElement, resolvedElement, layout)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function generateExplanation(specElement: any, resolvedElement: ResolvedElement, layout: ResolvedLayout): string {
  const priorityText = specElement.priority === 1 ? 'High-priority' : 
                       specElement.priority === 2 ? 'Medium-priority' : 'Low-priority';
  
  const roleText = specElement.role === 'hero' ? 'hero element' :
                   specElement.role === 'primary' ? 'primary content' :
                   specElement.role === 'action' ? 'action element' :
                   specElement.role === 'secondary' ? 'secondary content' : 'branding element';

  const aspectRatio = layout.surface.width / layout.surface.height;
  const composition = aspectRatio < 0.75 ? 'vertical composition' : 
                      aspectRatio > 1.33 ? 'horizontal composition' : 'balanced composition';

  return `${priorityText} ${roleText}. Available surface dimensions (${layout.surface.width}×${layout.surface.height}) allowed a ${composition}. Element was placed without violating constraints or overlapping other elements.`;
}

function generateDroppedExplanation(specElement: any, resolvedElement: ResolvedElement, layout: ResolvedLayout): string {
  const priority = specElement.priority;
  const higherPriorityElements = layout.elements
    .filter(el => el.visible && getAdElementById(el.id)?.priority! < priority)
    .map(el => el.id);

  let explanation = `Available space was insufficient after protecting higher-priority elements.\n\nDegradation sequence:\n`;
  
  const allElements = layout.elements
    .map(el => ({ ...el, spec: getAdElementById(el.id)! }))
    .sort((a, b) => a.spec.priority - b.spec.priority);

  allElements.forEach((el, index) => {
    const status = el.visible ? '→ preserve' : '→ drop';
    explanation += `${index + 1}. ${el.spec.id} ${status}\n`;
  });

  return explanation;
}