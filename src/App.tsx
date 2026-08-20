import './App.css'

function App() {
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
          <div className="surface-picker">
            {/* Surface picker will be added here */}
          </div>
        </div>

        <div className="workspace-center">
          <div className="panel-header">Ad Preview</div>
          <div className="preview-container">
            {/* Ad preview will be added here */}
          </div>
        </div>

        <div className="workspace-right">
          <div className="panel-header">Layout Inspector</div>
          <div className="inspector-content">
            {/* Inspector will be added here */}
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
