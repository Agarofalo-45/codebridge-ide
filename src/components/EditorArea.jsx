import React, { useRef, useEffect } from 'react';
import { Layout, Model, Actions, DockLocation } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import Editor from '@monaco-editor/react';
import { Columns, CheckCircle } from 'lucide-react';
import TutorPanel from './TutorPanel';

const initialLayout = {
  global: {
    tabEnableClose: true,
    tabEnableRename: false,
    tabSetEnableMaximize: false,
    splitterSize: 4,
  },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 100,
        id: "main",
        children: [
          {
            type: "tab",
            component: "file",
            id: "1",
            name: "algorithm.py",
          }
        ]
      }
    ]
  }
};

export default function EditorArea({ 
  files, 
  activeFileId,
  onActiveFileChange,
  onCodeChange, 
  translations, 
  latestTranslationId,
  onTranslate,
  tutorMessages,
  onTutorMessage,
  isTutorLoading,
  tutorCommands,
  tutorOpenTrigger,
  onWalkthroughNext,
  onNextWidget,
  onDismissWidget,
  onSendMessage,
  terminalOutput,
  onCloseTerminal
}) {
  const [model] = React.useState(() => Model.fromJson(initialLayout));
  const layoutRef = useRef(null);

  // Store Monaco references to interact with decorations/view zones
  const editorRefs = useRef({});
  const activeDecorations = useRef({}); 
  const activeViewZones = useRef({});

  const handleEditorDidMount = (fileId, editor, monaco) => {
    editorRefs.current[fileId] = { editor, monaco };
  };

  // Sync active file from sidebar to FlexLayout
  useEffect(() => {
    if (!activeFileId || !layoutRef.current) return;
    
    const file = files.find(f => f.id === activeFileId);
    if (!file) return;

    const existingNode = model.getNodeById(file.id);
    if (existingNode) {
      model.doAction(Actions.selectTab(existingNode.getId()));
    } else {
      let targetTabset = model.getActiveTabset();
      let dockLocation = DockLocation.CENTER;

      // Prevent opening files inside the AI Tutor's split pane
      if (targetTabset) {
        const hasTutor = targetTabset.getChildren().some(c => c.getComponent && c.getComponent() === 'tutor-panel');
        if (hasTutor) {
          const allTabsets = [];
          model.visitNodes((node) => {
            if (node.getType() === "tabset") allTabsets.push(node);
          });
          const altTabset = allTabsets.find(ts => !ts.getChildren().some(c => c.getComponent && c.getComponent() === 'tutor-panel'));
          
          if (altTabset) {
            targetTabset = altTabset;
          } else {
            // If no other tabset exists, split to the left instead of overwriting the AI Tutor
            dockLocation = DockLocation.LEFT;
          }
        }
      }

      if (targetTabset) {
         model.doAction(Actions.addNode({
            type: "tab",
            component: "file",
            id: file.id,
            name: file.name,
          }, targetTabset.getId(), dockLocation, -1));
      }
    }
  }, [activeFileId, files, model]);

  // Sync translation results to a new tab
  useEffect(() => {
    if (!latestTranslationId || !layoutRef.current) return;

    const transTabId = latestTranslationId;
    const existingNode = model.getNodeById(transTabId);
    const transData = translations[transTabId];
    
    if (!existingNode && transData) {
       const activeTabset = model.getActiveTabset();
       if (activeTabset) {
         model.doAction(Actions.addNode({
           type: "tab",
           component: "translation",
           id: transTabId,
           name: `${transData.fileName} ➔ ${transData.targetLanguage}`,
         }, activeTabset.getId(), DockLocation.RIGHT, -1));
       }
    } else if (existingNode) {
       model.doAction(Actions.selectTab(existingNode.getId()));
    }
  }, [latestTranslationId, model, translations]);

  // Sync Tutor panel
  useEffect(() => {
    if (tutorOpenTrigger === 0 || !layoutRef.current) return;
    const tabId = "tutor-panel";
    const existingNode = model.getNodeById(tabId);
    
    if (!existingNode) {
       const activeTabset = model.getActiveTabset();
       if (activeTabset) {
         model.doAction(Actions.addNode({
           type: "tab",
           component: "tutor-panel",
           id: tabId,
           name: "AI Tutor",
         }, activeTabset.getId(), DockLocation.RIGHT, -1));
       }
    } else {
       model.doAction(Actions.selectTab(existingNode.getId()));
    }
  }, [tutorOpenTrigger, model]);

  // Handle Tutor Editor Interactions (Decorations & View Zones)
  useEffect(() => {
    if (!tutorCommands || !activeFileId) return;
    
    const editorObj = editorRefs.current[activeFileId];
    if (!editorObj) return;

    const { editor, monaco } = editorObj;

    // Clear previous decorations/zones for this file
    if (activeDecorations.current[activeFileId]) {
      editor.deltaDecorations(activeDecorations.current[activeFileId], []);
    }
    
    editor.changeViewZones((changeAccessor) => {
      if (activeViewZones.current[activeFileId]) {
        changeAccessor.removeZone(activeViewZones.current[activeFileId]);
        activeViewZones.current[activeFileId] = null;
      }
    });    // Apply Highlight
    let currentDecorations = [];
    if (tutorCommands.highlight && Array.isArray(tutorCommands.highlight) && tutorCommands.highlight.length === 2) {
      const [startLine, endLine] = tutorCommands.highlight;
      currentDecorations.push({
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'tutor-action-line'
        }
      });
      
      editor.revealLineInCenterIfOutsideViewport(startLine);
    }

    // Apply Inline Widget (View Zone) & Ghost Text
    if (tutorCommands.activeWidget && tutorCommands.activeWidget.line) {
      const line = tutorCommands.activeWidget.line;
      const { type, text, demoCode, ghostText } = tutorCommands.activeWidget;

      editor.changeViewZones((changeAccessor) => {
        const domNode = document.createElement('div');
        domNode.className = 'tutor-inline-widget';
        domNode.style.animation = 'slideUp 0.3s ease-out';
        
        let isExpanded = false;
        
        const renderWidget = () => {
          if (type === 'question') {
            domNode.innerHTML = `
              <div style="position: relative; height: 100%; display: flex; align-items: flex-end;">
                <div style="background-color: #673ab7; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-left: 20px; margin-bottom: 8px;">
                  ? Answer Below
                  <div style="position: absolute; bottom: 0px; left: 20px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #673ab7;"></div>
                </div>
              </div>
            `;
          } else {
            domNode.innerHTML = `
              <div style="background-color: #673ab7; color: white; padding: 12px; border-radius: 8px; font-family: sans-serif; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-top: 5px; position: relative; max-width: 80%; display: flex; flex-direction: column; gap: 10px; z-index: 10;">
                <button id="btn-close" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: white; cursor: pointer; opacity: 0.7; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div style="font-weight: bold; display: flex; align-items: center; gap: 5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  AI Tutor Explanation
                </div>
                <div style="padding-right: 15px;">${text}</div>
                
                <div style="display: flex; gap: 10px; margin-top: 5px; align-items: center;">
                  <button id="btn-ask-more" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 4px;" title="Explain this more">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Explain More
                  </button>
                  ${demoCode ? `<button id="btn-example" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">${isExpanded ? 'Hide Example' : 'View Example'}</button>` : ''}
                  ${ghostText ? `<button id="btn-hint" style="background: var(--accent-color, #4CAF50); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Show Hint</button>` : ''}
                  <button id="btn-gotit" style="background: var(--accent-color, #4CAF50); border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; margin-left: auto;">Got it! &gt;</button>
                </div>
                
                ${isExpanded && demoCode ? `
                  <div style="margin-top: 10px; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; font-size: 12px; animation: fadeIn 0.3s ease-out;">
                    ${demoCode}
                  </div>
                ` : ''}
                
                <div style="position: absolute; bottom: -8px; left: 20px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #673ab7;"></div>
              </div>
            `;
          }

          // Attach event listeners dynamically
          const btnClose = domNode.querySelector('#btn-close');
          if (btnClose && typeof onDismissWidget === 'function') {
            btnClose.onclick = onDismissWidget;
          }

          const btnAskMore = domNode.querySelector('#btn-ask-more');
          if (btnAskMore && typeof onSendMessage === 'function') {
            btnAskMore.onclick = () => onSendMessage(`Can you explain in detail how line ${line} works? (${text})`);
          }

          const btnGotIt = domNode.querySelector('#btn-gotit');
          if (btnGotIt && typeof onNextWidget === 'function') {
            btnGotIt.onclick = () => onNextWidget();
          }

          const btnExample = domNode.querySelector('#btn-example');
          if (btnExample) {
            btnExample.onclick = () => {
              isExpanded = !isExpanded;
              renderWidget();
              editor.changeViewZones(accessor => accessor.layoutZone(zoneId));
            };
          }

          const btnHint = domNode.querySelector('#btn-hint');
          if (btnHint) {
            btnHint.onclick = () => {
              const hintDecoration = {
                range: new monaco.Range(line, 1, line, 1),
                options: {
                  isWholeLine: false,
                  after: { content: ghostText, inlineClassName: 'ghost-text-hint' }
                }
              };
              currentDecorations.push(hintDecoration);
              activeDecorations.current[activeFileId] = editor.deltaDecorations(activeDecorations.current[activeFileId] || [], currentDecorations);
              btnHint.style.display = 'none';
            };
          }
        };

        renderWidget();
        
        const zoneId = changeAccessor.addZone({
          afterLineNumber: Math.max(1, line - 1),
          heightInLines: type === 'question' ? 2 : 7,
          domNode: domNode
        });
        activeViewZones.current[activeFileId] = zoneId;
      });
      
      editor.revealLineInCenterIfOutsideViewport(line);
    }

    if (currentDecorations.length > 0) {
      const decs = editor.deltaDecorations([], currentDecorations);
      activeDecorations.current[activeFileId] = decs;
    }

  }, [tutorCommands, activeFileId]);

  // Keep App state in sync when user clicks a tab
  const onAction = (action) => {
    if (action.type === Actions.SELECT_TAB) {
      const tabId = action.data.tabNode;
      if (files.some(f => f.id === tabId)) {
        onActiveFileChange(tabId);
      }
    }
    return action;
  };

  const onRenderTabSet = (node, renderState) => {
    // No custom buttons for now
  };

  const factory = (node) => {
    const component = node.getComponent();
    
    if (component === "file") {
      const fileId = node.getId();
      const file = files.find(f => f.id === fileId);
      if (!file) return <div style={{padding: 20}}>File not found</div>;
      
      return (
        <Editor
          height="100%"
          language={file.language}
          theme="vs-dark"
          value={file.content}
          onChange={(val) => onCodeChange(file.id, val)}
          onMount={(editor, monaco) => handleEditorDidMount(file.id, editor, monaco)}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            fontFamily: 'JetBrains Mono, Fira Code, monospace'
          }}
        />
      );
    }
    
    if (component === "translation") {
      const transTabId = node.getId();
      const transData = translations[transTabId];
      if (!transData) return null;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              language={transData.targetLanguage}
              theme="vs-dark"
              value={transData.translatedCode || '// Translating...'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                fontFamily: 'JetBrains Mono, Fira Code, monospace'
              }}
            />
          </div>
          {transData.notes && (
            <div style={{
              height: '150px',
              borderTop: '1px solid var(--border-color)',
              padding: '10px',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-sidebar)'
            }}>
              <div style={{fontWeight: 600, marginBottom: 5, color: 'var(--accent-color)'}}>AI Notes</div>
              <div style={{color: 'var(--text-muted)', lineHeight: '1.4'}}>{transData.notes}</div>
            </div>
          )}
        </div>
      );
    }

    if (component === "tutor-panel") {
      return (
        <TutorPanel 
          messages={tutorMessages} 
          onSendMessage={onTutorMessage} 
          isLoading={isTutorLoading} 
        />
      );
    }

    return null;
  };

  return (
    <div className="editor-area" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Layout 
          ref={layoutRef}
          model={model} 
          factory={factory} 
          onAction={onAction}
          onRenderTabSet={onRenderTabSet}
        />
      </div>

      {terminalOutput && (
        <div style={{
          height: '200px',
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #3c3c3c',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          fontFamily: 'monospace'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '5px 15px',
            backgroundColor: '#252526',
            borderBottom: '1px solid #3c3c3c',
            fontSize: '11px',
            textTransform: 'uppercase',
            color: '#ccc'
          }}>
            <span>Terminal</span>
            <button onClick={onCloseTerminal} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
          <div style={{
            flex: 1,
            padding: '10px 15px',
            overflowY: 'auto',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap',
            fontSize: '13px'
          }}>
            {terminalOutput.type === 'info' && <span style={{ color: '#569cd6' }}>{terminalOutput.text}</span>}
            {terminalOutput.type !== 'info' && (
              <>
                <div style={{ color: '#4CAF50', marginBottom: '8px' }}>$ piston run code</div>
                {terminalOutput.stdout && <div>{terminalOutput.stdout}</div>}
                {terminalOutput.stderr && <div style={{ color: '#f14c4c' }}>{terminalOutput.stderr}</div>}
                {terminalOutput.exitCode !== undefined && (
                  <div style={{ marginTop: '8px', color: '#858585', fontSize: '11px' }}>
                    Process exited with code {terminalOutput.exitCode}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
