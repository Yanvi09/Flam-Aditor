import './ResolutionFlow.css';

interface ResolutionFlowProps {
  isActive: boolean;
}

export function ResolutionFlow({ isActive }: ResolutionFlowProps) {
  return (
    <div className="resolution-flow">
      <div className="flow-step">
        <span className="step-label">Ad Spec</span>
        <div className="step-arrow">↓</div>
      </div>
      <div className="flow-step">
        <span className="step-label">Surface Constraints</span>
        <div className="step-arrow">↓</div>
      </div>
      <div className="flow-step">
        <span className="step-label">Priority Resolver</span>
        <div className="step-arrow">↓</div>
      </div>
      <div className="flow-step">
        <span className="step-label">Resolved Layout</span>
        <div className="step-arrow">↓</div>
      </div>
      <div className="flow-step">
        <span className="step-label">Renderer</span>
      </div>
      {isActive && <div className="flow-indicator">Resolving...</div>}
    </div>
  );
}