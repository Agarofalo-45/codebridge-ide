import React, { useState, useEffect, useCallback, useRef } from 'react';
import ActivityBar from './components/ActivityBar';
import Sidebar from './components/Sidebar';
import EditorArea from './components/EditorArea';
import SettingsModal from './components/SettingsModal';
import ProficiencyModal from './components/ProficiencyModal';
import ConceptChecklistModal from './components/ConceptChecklistModal';
import { translateCode } from './services/ai';
import { chatWithTutor } from './services/tutor';

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollamaUrl') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollamaModel') || 'codellama');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('geminiKey') || '');
  const [languageProficiencies, setLanguageProficiencies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('languageProficiencies')) || {};
    } catch {
      return {};
    }
  });

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
  const [isProficiencyModalOpen, setIsProficiencyModalOpen] = useState(false);
  const [pendingCourseConcepts, setPendingCourseConcepts] = useState(null);
  const [currentWalkthrough, setCurrentWalkthrough] = useState(null);

  const activeFile = files.find(f => f.id === activeFileId);
  
  // Check proficiency when active language changes
  useEffect(() => {
    if (activeFile && activeFile.language) {
      if (!languageProficiencies[activeFile.language]) {
        setIsProficiencyModalOpen(true);
      }
    }
  }, [activeFileId, activeFile, languageProficiencies]);

  const handleProficiencySelect = (language, level) => {
    const newProfs = { ...languageProficiencies, [language]: level };
    setLanguageProficiencies(newProfs);
    localStorage.setItem('languageProficiencies', JSON.stringify(newProfs));
    setIsProficiencyModalOpen(false);
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

  const handleOpenTutor = () => {
    setTutorOpenTrigger(Date.now());
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
      if (response.sandboxFile && response.sandboxCode) {
        const newFile = {
           id: 'sandbox-' + Date.now(),
           name: response.sandboxFile,
           language: currentLanguage,
           content: response.sandboxCode,
           isSandbox: true
        };
        setFiles(prev => [...prev, newFile]);
        setActiveFileId(newFile.id);
        
        if (response.walkthroughSteps && response.walkthroughSteps.length > 0) {
          setCurrentWalkthrough({
            steps: response.walkthroughSteps,
            currentIndex: 0
          });
        }
      }

      setTutorMessages([...newHistory, { role: 'ai', content: response.message }]);
      
      // Update tutor commands. If we have a walkthrough, we will override the inlineWidget dynamically in rendering.
      setTutorCommands({
        highlight: response.highlight,
        inlineWidget: response.inlineWidget
      });
      
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

  const handleWalkthroughNext = () => {
    if (!currentWalkthrough) return;
    const nextIndex = currentWalkthrough.currentIndex + 1;
    if (nextIndex < currentWalkthrough.steps.length) {
      setCurrentWalkthrough({ ...currentWalkthrough, currentIndex: nextIndex });
    } else {
      setCurrentWalkthrough(null);
      const systemPrompt = `[SYSTEM MESSAGE] The user has finished the Sandbox walkthrough. Instruct them to return to their main code, and when they are ready, issue them a challenge using "inlineWidget" and "ghostText" on their main file.`;
      handleTutorMessage(systemPrompt);
    }
  };

  // Derive the active inlineWidget based on the walkthrough state
  const activeTutorCommands = { ...tutorCommands };
  if (currentWalkthrough) {
    const step = currentWalkthrough.steps[currentWalkthrough.currentIndex];
    activeTutorCommands.inlineWidget = {
      line: step.line,
      text: step.text,
      isWalkthroughStep: true
    };
    activeTutorCommands.highlight = [step.line, step.line];
  }

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
      />

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
          onSelect={handleProficiencySelect}
          onClose={() => setIsProficiencyModalOpen(false)}
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
