import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, background: '#060810',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#00E5FF', fontFamily: 'serif', padding: 32, textAlign: 'center',
        }}>
          <p style={{ fontSize: 24, marginBottom: 16 }}>天道紊亂</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, padding: '8px 24px', border: '1px solid #00E5FF', background: 'transparent', color: '#00E5FF', borderRadius: 8, cursor: 'pointer' }}
          >
            重啟仙途
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
