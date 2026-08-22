import React, { useState } from 'react';
import { X, KeyRound, Server } from 'lucide-react';

export default function SettingsModal({ ollamaUrl, ollamaModel, geminiKey, onSave, onClose }) {
  const [url, setUrl] = useState(ollamaUrl);
  const [model, setModel] = useState(ollamaModel);
  const [gKey, setGKey] = useState(geminiKey || '');

  const handleSave = () => {
    localStorage.setItem('ollamaUrl', url);
    localStorage.setItem('ollamaModel', model);
    localStorage.setItem('geminiKey', gKey);
    onSave(url, model, gKey);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span>Settings</span>
          <X className="modal-close" size={20} onClick={onClose} />
        </div>
        <div className="modal-content">
          <div style={{marginBottom: 15, fontSize: 13, color: 'var(--text-muted)'}}>
            <Server size={14} style={{display: 'inline', marginRight: 5, verticalAlign: 'middle'}}/>
            <strong>Local AI (Privacy-First)</strong>
          </div>
          <div className="form-group">
            <label>Ollama Server URL</label>
            <input 
              type="text" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="form-group">
            <label>Ollama Model</label>
            <input 
              type="text" 
              value={model} 
              onChange={(e) => setModel(e.target.value)} 
              placeholder="e.g. codellama, llama2"
            />
          </div>
          
          <div style={{marginTop: 25, marginBottom: 15, fontSize: 13, color: 'var(--text-muted)'}}>
            <KeyRound size={14} style={{display: 'inline', marginRight: 5, verticalAlign: 'middle'}}/>
            <strong>Online Features (Tutor)</strong>
          </div>
          <div className="form-group">
            <label>Google Gemini API Key</label>
            <input 
              type="password" 
              value={gKey} 
              onChange={(e) => setGKey(e.target.value)} 
              placeholder="AIzaSy..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
