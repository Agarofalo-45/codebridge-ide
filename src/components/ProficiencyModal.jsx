import React from 'react';
import { BookOpen, Code, Terminal, X } from 'lucide-react';

export default function ProficiencyModal({ language, onSelect, onClose }) {
  if (!language) return null;

  const displayLang = language.charAt(0).toUpperCase() + language.slice(1);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2 style={{ marginBottom: 10 }}>Welcome to {displayLang}!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 25, lineHeight: '1.5' }}>
          To help your AI Tutor adapt to your learning style, how proficient are you in <strong>{displayLang}</strong>?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <button 
            style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20, textAlign: 'left', backgroundColor: 'var(--bg-editor)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => onSelect(language, 'Beginner')}
          >
            <div style={{ padding: 10, backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', borderRadius: '50%' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Complete Beginner</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>I'm new to this. Review basic concepts and walk me through step-by-step.</div>
            </div>
          </button>

          <button 
            style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20, textAlign: 'left', backgroundColor: 'var(--bg-editor)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => onSelect(language, 'Intermediate')}
          >
            <div style={{ padding: 10, backgroundColor: 'rgba(33, 150, 243, 0.2)', color: '#2196F3', borderRadius: '50%' }}>
              <Code size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Intermediate</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>I know the syntax, but I need help with logic, architecture, and debugging.</div>
            </div>
          </button>

          <button 
            style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 20, textAlign: 'left', backgroundColor: 'var(--bg-editor)', border: '1px solid var(--border-color)', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => onSelect(language, 'Advanced')}
          >
            <div style={{ padding: 10, backgroundColor: 'rgba(156, 39, 176, 0.2)', color: '#9c27b0', borderRadius: '50%' }}>
              <Terminal size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Advanced</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Skip the basics. Point out edge cases, optimizations, and deep architectural flaws.</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
