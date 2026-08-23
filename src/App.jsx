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
  const [hasCourseStarted, setHasCourseStarted] = useState(false);

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
      const currentWidgetFilename = activeWidget ? activeWidget.filename : null;

      setActiveWidget(nextWidget);
      setTutorCommands(prev => ({ ...prev, activeWidget: nextWidget }));
      
      if (nextWidget.filename) {
        const target = files.find(f => f.name === nextWidget.filename);
        if (target && target.id !== activeFileId) {
          
          if (currentWidgetFilename && currentWidgetFilename !== nextWidget.filename) {
             const prevFile = files.find(f => f.name === currentWidgetFilename);
             if (prevFile && prevFile.isSandbox) {
                const isNeededAgain = newQueue.some(w => w.filename === currentWidgetFilename);
                if (!isNeededAgain) {
                   setFiles(prevFiles => prevFiles.filter(f => f.id !== prevFile.id));
                }
             }
          }

          setActiveFileId(target.id);
        }
      }
    } else {
      const currentWidgetFilename = activeWidget ? activeWidget.filename : null;
      if (currentWidgetFilename) {
         const prevFile = files.find(f => f.name === currentWidgetFilename);
         if (prevFile && prevFile.isSandbox) {
            setFiles(prevFiles => prevFiles.filter(f => f.id !== prevFile.id));
         }
      }

      setActiveWidget(null);
      setTutorCommands(prev => ({ ...prev, activeWidget: null }));
      
      // Auto-advance the conversation to next concept or final quiz
      handleTutorMessage(`[SYSTEM MESSAGE - DO NOT SHOW TO USER] The user has completed the interactive widgets for this code. If we are currently following a multi-concept syllabus, move to the next concept. IF THE LESSON IS ENTIRELY OVER, you MUST generate a final "Overview Quiz" by creating a new sandbox file with a simple coding question (using a purple widget). The user will write the code in the IDE to answer it.`, true);
    }
  };

  const handleCheckAnswer = (questionText, code) => {
    handleTutorMessage(`[SYSTEM MESSAGE - DO NOT SHOW TO USER] The user has submitted their code answer for the question: "${questionText}". 
Evaluate their code. Reply ONLY with an inlineWidgets array containing your feedback. Do NOT output a new sandboxFile. Keep your "message" field completely empty.`, true);
  };

  const handleExplainConcept = (conceptText) => {
    handleTutorMessage(`[SYSTEM MESSAGE - DO NOT SHOW TO USER] The user needs you to explain the concept behind this question: "${conceptText}". 
CRITICAL: You MUST output a \`sandboxFiles\` array containing a brand new file specifically for explaining this concept, and \`inlineWidgets\` that target this new file to teach it.`, true);
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

  const handleTutorMessage = async (text, isHidden = false) => {
    const displayHistory = isHidden ? tutorMessages : [...tutorMessages, { role: 'user', content: text }];
    const apiHistory = [...tutorMessages, { role: 'user', content: text }];
    
    if (!isHidden) setTutorMessages(displayHistory);
    setIsTutorLoading(true);

    try {
      const currentCode = activeFile ? activeFile.content : '';
      const currentLanguage = activeFile ? activeFile.language : 'general';
      const userProficiency = languageProficiencies[currentLanguage] || 'Beginner';

      const response = await chatWithTutor(geminiKey, ollamaUrl, ollamaModel, apiHistory, currentCode, currentLanguage, userProficiency);
      
      // Handle Course Syllabus Generation
      if (response.isCourse && response.concepts && response.concepts.length > 0 && !hasCourseStarted) {
        setPendingCourseConcepts(response.concepts);
      }

      // Handle Sandbox file generation & Active Tab Switching
      let newFiles = [];
      if (response.sandboxFiles && Array.isArray(response.sandboxFiles)) {
        newFiles = response.sandboxFiles.map((sf, index) => ({
           id: 'sandbox-' + Date.now() + '-' + index,
           name: sf.filename,
           language: currentLanguage,
           content: sf.code,
           isSandbox: true
        }));
      }

      const targetName = (response.inlineWidgets && response.inlineWidgets.length > 0) ? response.inlineWidgets[0].filename : null;

      if (newFiles.length > 0) {
        setFiles(prev => {
          const combined = [...prev, ...newFiles];
          if (targetName) {
            const target = combined.find(f => f.name === targetName);
            if (target) setTimeout(() => setActiveFileId(target.id), 0);
          } else {
            setTimeout(() => setActiveFileId(newFiles[0].id), 0);
          }
          return combined;
        });
      } else if (targetName) {
        const target = files.find(f => f.name === targetName);
        if (target) setActiveFileId(target.id);
      }

      if (!isHidden && response.message && response.message.trim() !== '') {
        setTutorMessages([...displayHistory, { role: 'ai', content: response.message }]);
      }
      
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
    setHasCourseStarted(true);
    const systemPrompt = `[SYSTEM MESSAGE - DO NOT SHOW TO USER]
The user has submitted their self-assessment for the syllabus concepts:
${Object.entries(assessments).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Based on this assessment, physically map out a lesson plan in order from least proficient ("Never Seen") to most proficient ("Understand").
Generate the sandbox files for ALL concepts at once in that exact order using the "sandboxFiles" array, and guide the user through them using "inlineWidgets".
CRITICAL: Do NOT set "isCourse" to true again! The course has already started.`;
    handleTutorMessage(systemPrompt, true);
  };

  // Deprecated Walkthrough function
  const handleWalkthroughNext = () => {};

  // Derive the active inlineWidget based on the walkthrough state
  const activeTutorCommands = tutorCommands;

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
        onCheckAnswer={handleCheckAnswer}
        onExplainConcept={handleExplainConcept}
        onSendMessage={handleTutorMessage}
        terminalOutput={terminalOutput}
        onCloseTerminal={() => setTerminalOutput(null)}
      />

      {/* Global Answer Box for Questions */}
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
