import React, { useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const TypewriterMarkdown = ({ content, role }) => {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const contentRef = React.useRef(content);

  React.useEffect(() => {
    // Only animate if it's an AI message and the content actually changed/is new
    if (role === 'ai' && content !== contentRef.current) {
      contentRef.current = content;
      setDisplayed('');
      setIsTyping(true);
    } else if (role !== 'ai') {
      setDisplayed(content);
    }
  }, [content, role]);

  React.useEffect(() => {
    // Initialize if empty (e.g. first mount)
    if (displayed === '' && content !== '' && role === 'ai') {
      setIsTyping(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isTyping || role !== 'ai') {
      setDisplayed(content);
      return;
    }

    let i = displayed.length;
    const timer = setInterval(() => {
      i += 3; // Type 3 chars at a time
      if (i >= content.length) {
        i = content.length;
        clearInterval(timer);
        setIsTyping(false);
      }
      setDisplayed(content.substring(0, i));
    }, 15); // 15ms interval

    return () => clearInterval(timer);
  }, [isTyping, content, role]);

  return <ReactMarkdown>{displayed}</ReactMarkdown>;
};

export default function TutorPanel({ messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-editor)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            marginBottom: 20, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 5,
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
            }}>
              {m.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
              {m.role === 'user' ? 'You' : 'AI Tutor'}
            </div>
            <div style={{
              backgroundColor: m.role === 'user' ? 'var(--accent-color)' : 'var(--bg-sidebar)',
              padding: '10px 15px',
              borderRadius: 8,
              maxWidth: '85%',
              border: m.role === 'user' ? 'none' : '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: 13,
              lineHeight: 1.5,
              wordBreak: 'break-word'
            }}>
              <TypewriterMarkdown content={m.content} role={m.role} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 10 }}>
            <span className="loading-text">Tutor is thinking</span>
          </div>
        )}
      </div>
      
      <div style={{ padding: 15, borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-sidebar)' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for help..."
            style={{ 
              flex: 1, 
              padding: '10px 15px',
              borderRadius: 20,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-editor)',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              padding: 10,
              borderRadius: '50%',
              width: 40,
              height: 40,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
