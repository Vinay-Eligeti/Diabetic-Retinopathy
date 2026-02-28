import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ScanAnalysis from './pages/ScanAnalysis';
import RiskProgression from './pages/RiskProgression';
import FollowUp from './pages/FollowUp';
import AIAssistant from './pages/AIAssistant';
import PatientProfile from './pages/PatientProfile';
import PatientsHistory from './pages/PatientsHistory';
import './App.css';

const PAGES = {
  dashboard: Dashboard,
  scan: ScanAnalysis,
  risk: RiskProgression,
  followup: FollowUp,
  assistant: AIAssistant,
  patient: PatientProfile,
  history: PatientsHistory,
};

const PAGE_TITLES = {
  dashboard: ['Dashboard', ''],
  scan: ['Scan ', 'Analysis'],
  risk: ['Risk ', 'Progression'],
  followup: ['Follow-Up ', 'Plan'],
  assistant: ['AI ', 'Assistant'],
  patient: ['Patient ', 'Profile'],
  history: ['Patient ', 'Registry'],
};

function AppContent() {
  const {
    currentSection, setCurrentSection,
    toasts, showToast,
    sidebarOpen, setSidebarOpen,
    apiModalOpen, setApiModalOpen,
    getAPIKey, setAPIKey,
    scanResult,
  } = useApp();

  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    if (apiModalOpen) setApiKeyInput(getAPIKey());
  }, [apiModalOpen, getAPIKey]);

  const saveKey = () => {
    setAPIKey(apiKeyInput.trim());
    setApiModalOpen(false);
    showToast(apiKeyInput.trim() ? 'API key saved! AI will use Gemini.' : 'API key cleared. Using templates.', 'success');
  };

  const [title, span] = PAGE_TITLES[currentSection] || ['', ''];

  const PageComponent = PAGES[currentSection] || Dashboard;

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { setApiModalOpen(false); setSidebarOpen(false); }
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const sections = ['dashboard', 'scan', 'risk', 'followup', 'assistant', 'patient'];
        const n = parseInt(e.key);
        if (n >= 1 && n <= 6) { e.preventDefault(); setCurrentSection(sections[n - 1]); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [setCurrentSection, setApiModalOpen, setSidebarOpen]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="app-container">
      <Sidebar />

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
            <div>
              <h1 className="page-title">{title}<span>{span}</span></h1>
            </div>
          </div>
          <div className="header-right">
            <span className="header-date">{dateStr}</span>
          </div>
        </header>

        <div className="page-content" key={currentSection}>
          <PageComponent />
        </div>
      </main>

      {/* API Key Modal */}
      <div className={`modal-overlay${apiModalOpen ? ' visible' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setApiModalOpen(false); }}>
        <div className="modal">
          <div className="modal-title">⚙️ Gemini API Key</div>
          <div className="modal-desc">Enter your Google Gemini API key for AI-powered responses. Without a key, the assistant uses built-in template responses.</div>
          <div className="form-group">
            <label className="form-label">API Key</label>
            <input className="form-input" type="password" value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="Enter Gemini API key..." />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setApiModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveKey}>Save Key</button>
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : 'ℹ️'}
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
