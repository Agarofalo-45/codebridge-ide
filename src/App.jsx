import React, { useState, useEffect, useCallback, useRef } from 'react';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import SettingsModal from './components/SettingsModal';
import ProficiencyModal from './components/ProficiencyModal';
import ConceptChecklistModal from './components/ConceptChecklistModal';
import { translateCode } from './services/ai';
import { chatWithTutor } from './services/tutor';
import { executeCode } from './services/piston';

const initialFiles = [
  { id: '1', name: 'main.py', language: 'python', content: `print("Hello World!")` },
  {
    id: '2',
    name: 'server.js',
    language: 'javascript',
    content: `const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\\n');
});

server.listen(3000, '127.0.0.1', () => {
  console.log('Server running at http://127.0.0.1:3000/');
});`
  }
];

function App() {
  const [files, setFiles] = useState(initialFiles);
  const [activeFileId, setActiveFileId] = useState(initialFiles[0].id);
  const [targetLanguage, setTargetLanguage] = useState('javascript');
  
  // Store translations by tab ID so they don't overwrite each other
  const [translations, setTranslations] = useState({});
  const [latestTranslationId, setLatestTranslationId] = useState(null);
  const [widgetQueue, setWidgetQueue] = useState([]);
  const [activeWidget, setActiveWidget] = useState(null);

  const [terminalOutput, setTerminalOutput] = useState(null);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollamaUrl') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollamaModel') || 'codellama');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
  const [languageProficiencies, setLanguageProficiencies] = useState({});

  const [tutorMessages, setTutorMessages] = useState(() => {
    const hasSeen = localStorage.getItem('hasSeenWelcome2'); // using a new key to force it to show for the user
    if (!hasSeen) {
      localStorage.setItem('hasSeenWelcome2', 'true');
      return [{
        role: 'ai',
        content: `👋 **Hi there! I'm your AI Coding Mentor.**

I'm here to help you learn programming by building real projects. Instead of just giving you the answers, I act as your personal curriculum designer and tutor!

**How I work:**
1. **Ideation:** Tell me what you want to build (e.g., "A movement script in Unity" or "A Python calculator").
2. **Syllabus:** I'll design a customized Course Syllabus tailored to your skill level.
3. **Sandbox:** For each concept, I'll open a Sandbox file and teach you step-by-step.
4. **Interactive Mentorship:** I'll use interactive purple widgets and ghost text inside your editor. You'll trace over my hints to build muscle memory!

To get started, simply tell me what you'd like to build today! 👇`
      }];
    }
    return [{ role: 'ai', content: "What are you trying to build today?" }];
  });
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorCommands, setTutorCommands] = useState(null);
  const [tutorOpenTrigger, setTutorOpenTrigger] = useState(0);
  const [pendingCourseConcepts, setPendingCourseConcepts] = useState(null);
  
  const activeFile = files.find(f => f.id === activeFileId);
  const [dismissedProficiencies, setDismissedProficiencies] = useState({});

  // Compute if modal should be open directly (no useEffect needed)
  const isProficiencyModalOpen = Boolean(
    activeFile && 
    activeFile.language && 
    !languageProficiencies[activeFile.language] && 
    !dismissedProficiencies[activeFile.language]
  );

  const handleProficiencyClose = () => {
    if (activeFile && activeFile.language) {
      setDismissedProficiencies(prev => ({ ...prev, [activeFile.language]: true }));
    }
  };
  
  // Compute global translating state for the sidebar button based on the latest translation
  const isTranslating = latestTranslationId && translations[latestTranslationId]?.loading;

  const handleSaveSettings = (url, model, key) => {
    setOllamaUrl(url);
    setOllamaModel(model);
    setGeminiKey(key);
    localStorage.setItem('ollamaUrl', url);
    localStorage.setItem('ollamaModel', model);
    localStorage.setItem('geminiKey', key);
  };

  const handleCodeChange = (fileId, newContent) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: newContent } : f));
  };

  const handleChangeLanguage = (fileId, newLanguage) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, language: newLanguage } : f));
  };

  const handleTranslate = useCallback(async () => {
    if (!ollamaUrl || !ollamaModel) {
      alert("Please configure Ollama settings first.");
      setIsSettingsOpen(true);
      return;
    }

    if (!activeFile) return;

    const transTabId = `trans-${activeFile.id}-${targetLanguage}`;
    setLatestTranslationId(transTabId);
    
    // Set initial loading state for this specific translation tab
    setTranslations(prev => ({ 
      ...prev, 
      [transTabId]: { 
        loading: true, 
        targetLanguage, 
        fileName: activeFile.name 
      } 
    }));

    try {
      const result = await translateCode(ollamaUrl, ollamaModel, activeFile.content, targetLanguage);
      setTranslations(prev => ({ 
        ...prev, 
        [transTabId]: { 
          ...result, 
          loading: false, 
          targetLanguage, 
          fileName: activeFile.name 
        } 
      }));
    } catch (error) {
      alert("Translation failed. Make sure Ollama is running and the model is downloaded. Error: " + error.message);
      setTranslations(prev => ({ 
        ...prev, 
        [transTabId]: { 
          loading: false, 
          targetLanguage, 
          fileName: activeFile.name, 
          error: error.message 
        } 
      }));
    }
  }, [ollamaUrl, ollamaModel, activeFile, targetLanguage]);

  const handleRunCode = async () => {
    if (!activeFile) return;
    setIsTerminalRunning(true);
    setTerminalOutput({ type: 'info', text: `Running ${activeFile.language} code...` });
    
    try {
      const result = await executeCode(activeFile.language, activeFile.content);
      setTerminalOutput({
        type: result.code === 0 ? 'success' : 'error',
        stdout: result.output,
        stderr: result.error,
        exitCode: result.code
      });
    } catch (err) {
      setTerminalOutput({ type: 'error', stderr: err.message });
    } finally {
      setIsTerminalRunning(false);
    }
  };

  const handleOpenTutor = () => {
    setTutorOpenTrigger(Date.now());
  };

  const handleNextWidget = () => {
    if (widgetQueue.length > 0) {
      const newQueue = [...widgetQueue];
      const nextWidget = newQueue.shift();
      setWidgetQueue(newQueue);
      setActiveWidget(nextWidget);
      setTutorCommands(prev => ({ ...prev, activeWidget: nextWidget }));
      
      if (nextWidget.filename) {
        const target = files.find(f => f.name === nextWidget.filename);
        if (target && target.id !== activeFileId) {
          setActiveFileId(target.id);
        }
      }
    } else {
      setActiveWidget(null);
      setTutorCommands(prev => ({ ...prev, activeWidget: null }));
      
      // Auto-advance the conversation so the AI knows they finished tracing the code
      handleTutorMessage(`[SYSTEM MESSAGE] The user has completed the interactive widgets for this code. If we are currently following a multi-concept syllabus, please move on to the next concept by generating the next sandbox file and widgets. If the lesson is over, just ask them if they have any questions.`);
    }
  };

  const handleDismissWidget = () => {
    setWidgetQueue([]);
    setActiveWidget(null);
    setTutorCommands(prev => ({ ...prev, activeWidget: null }));
  };

  const handleTutorAction = (prompt) => {
    handleOpenTutor();
    handleTutorMessage(prompt);
  };

  const handleTutorMessage = async (text) => {
    const newHistory = [...tutorMessages, { role: 'user', content: text }];
    setTutorMessages(newHistory);
    setIsTutorLoading(true);

    try {
      const currentCode = activeFile ? activeFile.content : '';
      const currentLanguage = activeFile ? activeFile.language : 'general';
      const userProficiency = languageProficiencies[currentLanguage] || 'Beginner';

      const response = await chatWithTutor(geminiKey, ollamaUrl, ollamaModel, newHistory, currentCode, currentLanguage, userProficiency);
      
      // Handle Course Syllabus Generation
      if (response.isCourse && response.concepts && response.concepts.length > 0) {
        setPendingCourseConcepts(response.concepts);
      }

      // Handle Sandbox file generation
      if (response.sandboxFiles && Array.isArray(response.sandboxFiles)) {
        const newFiles = response.sandboxFiles.map((sf, index) => ({
           id: 'sandbox-' + Date.now() + '-' + index,
           name: sf.filename,
           language: currentLanguage,
           content: sf.code,
           isSandbox: true
        }));
        
        if (newFiles.length > 0) {
          setFiles(prev => [...prev, ...newFiles]);
          
          let startFileId = newFiles[0].id;
          if (response.inlineWidgets && response.inlineWidgets.length > 0 && response.inlineWidgets[0].filename) {
            const targetName = response.inlineWidgets[0].filename;
            const target = newFiles.find(f => f.name === targetName);
            if (target) startFileId = target.id;
          }
          setActiveFileId(startFileId);
        }
      }

      setTutorMessages([...newHistory, { role: 'ai', content: response.message }]);
      
      // Update tutor commands.
      if (response.inlineWidgets && Array.isArray(response.inlineWidgets) && response.inlineWidgets.length > 0) {
        const queue = [...response.inlineWidgets];
        const firstWidget = queue.shift();
        setWidgetQueue(queue);
        setActiveWidget(firstWidget);
        setTutorCommands(prev => ({ ...prev, activeWidget: firstWidget, highlight: response.highlight }));
      } else {
        setTutorCommands({
          highlight: response.highlight,
          inlineWidget: response.inlineWidget
        });
      }
      
    } catch (error) {
      setTutorMessages([...newHistory, { role: 'ai', content: `**Error**: ${error.message}` }]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const handleCourseAssessments = (assessments) => {
    setPendingCourseConcepts(null);
    const systemPrompt = `[SYSTEM MESSAGE - DO NOT SHOW TO USER]
The user has submitted their self-assessment for the syllabus concepts:
${Object.entries(assessments).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Based on this assessment, please open a sandbox file to teach the first concept using the "sandboxFile", "sandboxCode", and "walkthroughSteps" JSON parameters.`;
    handleTutorMessage(systemPrompt);
  };

  // Deprecated Walkthrough function
  const handleWalkthroughNext = () => {};

  // Derive the active inlineWidget based on the walkthrough state
  const activeTutorCommands = { ...tutorCommands };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleTranslate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTranslate]);

  return (
    <div className="app-container">
      <ActivityBar onSettingsClick={() => setIsSettingsOpen(true)} />
      
      <Sidebar 
        files={files}
        activeFileId={activeFileId}
        onFileSelect={setActiveFileId}
        targetLanguage={targetLanguage}
        onTargetLanguageChange={setTargetLanguage}
        onTranslate={handleTranslate}
        isTranslating={isTranslating}
        onOpenTutor={handleOpenTutor}
        onChangeLanguage={handleChangeLanguage}
        onTutorAction={handleTutorAction}
        onRunCode={handleRunCode}
        isTerminalRunning={isTerminalRunning}
      />
      
      <EditorArea 
        files={files}
        activeFileId={activeFileId}
        onActiveFileChange={setActiveFileId}
        onCodeChange={handleCodeChange}
        translations={translations}
        latestTranslationId={latestTranslationId}
        onTranslate={handleTranslate}
        tutorMessages={tutorMessages}
        onTutorMessage={handleTutorMessage}
        isTutorLoading={isTutorLoading}
        tutorCommands={activeTutorCommands}
        tutorOpenTrigger={tutorOpenTrigger}
        onWalkthroughNext={handleWalkthroughNext}
        onNextWidget={handleNextWidget}
        onDismissWidget={handleDismissWidget}
        onSendMessage={handleTutorAction}
        terminalOutput={terminalOutput}
        onCloseTerminal={() => setTerminalOutput(null)}
      />

      {/* Global Answer Box for Questions */}
      {activeWidget && activeWidget.type === 'question' && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          maxWidth: '90%',
          backgroundColor: 'var(--bg-sidebar)',
          border: '1px solid #673ab7',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          padding: 20,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 15,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#673ab7', fontWeight: 'bold', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              Tutor Question
            </div>
            <button onClick={handleDismissWidget} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <div style={{ fontSize: 14, color: 'var(--text-main)' }}>
            {activeWidget.text}
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            <input 
              id="question-answer-input"
              type="text" 
              placeholder="Type your answer here..."
              style={{
                flex: 1,
                padding: '12px 15px',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-editor)',
                color: 'var(--text-main)',
                fontSize: 14,
                outline: 'none'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  handleTutorAction("My answer: " + e.target.value);
                  handleNextWidget();
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('question-answer-input');
                if (input && input.value.trim()) {
                  handleTutorAction("My answer: " + input.value);
                  handleNextWidget();
                }
              }}
              style={{
                padding: '0 20px',
                backgroundColor: '#673ab7',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <SettingsModal 
          ollamaUrl={ollamaUrl} 
          ollamaModel={ollamaModel}
          geminiKey={geminiKey}
          onSave={handleSaveSettings} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}

      {isProficiencyModalOpen && activeFile && (
        <ProficiencyModal 
          language={activeFile.language}
          onSelect={(lang, level) => {
            const newProfs = { ...languageProficiencies, [lang]: level };
            setLanguageProficiencies(newProfs);
          }}
          onClose={handleProficiencyClose}
        />
      )}

      {pendingCourseConcepts && (
        <ConceptChecklistModal
          concepts={pendingCourseConcepts}
          onSubmit={handleCourseAssessments}
          onClose={() => setPendingCourseConcepts(null)}
        />
      )}
    </div>
  );
}

export default App;
