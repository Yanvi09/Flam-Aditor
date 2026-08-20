import { useState, useEffect } from 'react';
import { SurfacePicker } from './components/SurfacePicker';
import { AdPreview } from './components/AdPreview';
import { Inspector } from './components/Inspector';
import { ExplainLayout } from './components/ExplainLayout';
import { ResolutionFlow } from './components/ResolutionFlow';
import { resolveLayout } from './engine/resolver';
import { adSpec } from './engine/spec';
import { getSurfaceByName } from './engine/surfaces';
import './App.css';

function App() {
  const [selectedSurface, setSelectedSurface] = useState('mobile-portrait');
  const [selectedElementId, setSelectedElementId] = useState<string | undefined>();
  const [isResolving, setIsResolving] = useState(false);
  const [layout, setLayout] = useState(() => {
    const surface = getSurfaceByName(selectedSurface);
    return surface ? resolveLayout(adSpec, surface) : null;
  });

  useEffect(() => {
    setIsResolving(true);
    const surface = getSurfaceByName(selectedSurface);
    if (surface) {
      const newLayout = resolveLayout(adSpec, surface);
      setLayout(newLayout);
      setSelectedElementId(undefined);
    }
    setTimeout(() => setIsResolving(false), 300);
  }, [selectedSurface]);

  const handleElementClick = (elementId: string) => {
    setSelectedElementId(elementId === selectedElementId ? undefined : elementId);
  };

  if (!layout) {
    return null;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <h1>Flam-Aditor</h1>
          <h2>Adaptive Layout Engine</h2>
        </div>
        <div className="header-controls">
          <span className="status-indicator">Engine Ready</span>
        </div>
      </header>

      <main className="app-main">
        <div className="workspace-left">
          <div className="panel-header">Surface Controls</div>
          <SurfacePicker
            selectedSurface={selectedSurface}
            onSurfaceSelect={setSelectedSurface}
          />
        </div>

        <div className="workspace-center">
          <div className="panel-header">Ad Preview</div>
          <div className="preview-container">
            <AdPreview
              layout={layout}
              onElementClick={handleElementClick}
              selectedElementId={selectedElementId}
            />
          </div>
        </div>

        <div className="workspace-right">
          <div className="panel-header">Layout Inspector</div>
          <div className="inspector-content">
            <ResolutionFlow isActive={isResolving} />
            <ExplainLayout
              layout={layout}
              selectedElementId={selectedElementId}
            />
            <Inspector
              layout={layout}
              selectedElementId={selectedElementId}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
