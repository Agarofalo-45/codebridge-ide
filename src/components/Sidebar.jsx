import React from 'react';
import { Settings, FileCode, Sparkles, BugPlay, ListChecks, MessageCircleQuestion, Play } from 'lucide-react';

export default function Sidebar({ 
  files, 
  activeFileId, 
  onFileSelect, 
  targetLanguage, 
  onTargetLanguageChange, 
  onTranslate,
  isTranslating,
  onOpenTutor,
  onChangeLanguage,
  onTutorAction,
  onRunCode,
  isTerminalRunning
}) {
  const activeFile = files.find(f => f.id === activeFileId);
  const activeLanguage = activeFile ? activeFile.language : '';

  return (
    <div className="sidebar">
      <div className="sidebar-section" style={{borderBottom: '1px solid var(--border-color)', paddingBottom: 15}}>
        <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8}}>Editor Language</div>
        <select 
          value={activeLanguage}
          onChange={(e) => onChangeLanguage(activeFileId, e.target.value)}
          disabled={!activeFileId}
          style={{
            width: '100%', 
            padding: '6px 8px', 
            backgroundColor: 'var(--bg-editor)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 4,
            fontSize: 12
          }}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="csharp">C#</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>
      </div>

      <div className="sidebar-section">
        <div style={{padding: '5px 20px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600}}>OPEN EDITORS</div>
        {files.map(file => (
          <div 
            key={file.id} 
            className={`file-item ${file.id === activeFileId ? 'active' : ''}`}
            onClick={() => onFileSelect(file.id)}
          >
            <FileCode size={14} />
            {file.name}
          </div>
        ))}
      </div>
      
      <div className="translate-tool">
        <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase'}}>AI Translation</div>
        <div className="form-group">
          <label>Target Language</label>
          <select value={targetLanguage} onChange={(e) => onTargetLanguageChange(e.target.value)}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
        <button onClick={onTranslate} disabled={isTranslating}>
          <Sparkles size={16} />
          {isTranslating ? <span className="loading-text">Translating</span> : 'Translate Code'}
        </button>
      </div>

      <div className="translate-tool">
        <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10}}>Interactive Learning</div>
        
        <button onClick={() => onTutorAction("Can you help me find any bugs in my current code?")}>
          <BugPlay size={16} />
          Scan for Bugs
        </button>
        
        <button className="secondary" onClick={() => onTutorAction("Can you explain how the code in my current file works?")} style={{marginTop: 5}}>
          <ListChecks size={16} />
          Explain Code
        </button>
        
        <button 
          onClick={onRunCode}
          disabled={isTerminalRunning}
          style={{marginTop: 5, backgroundColor: isTerminalRunning ? '#3c3c3c' : '#4CAF50', color: 'white'}}
        >
          <Play size={16} />
          {isTerminalRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>

      <div className="translate-tool" style={{borderTop: 'none', paddingTop: 0}}>
        <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 10}}>AI Tutor (Online)</div>
        <button onClick={onOpenTutor} style={{backgroundColor: '#673ab7'}}>
          <MessageCircleQuestion size={16} />
          Open AI Tutor
        </button>
      </div>
    </div>
  );
}
