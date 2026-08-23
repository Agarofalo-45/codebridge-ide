import React, { useState } from 'react';
import { BookOpen, CheckCircle, Code, Star, Sparkles, ChevronRight } from 'lucide-react';

export default function ConceptChecklistModal({ concepts, onSubmit, onClose }) {
  const [assessments, setAssessments] = useState({});

  const handleSelect = (concept, level) => {
    setAssessments(prev => ({
      ...prev,
      [concept]: level
    }));
  };

  const isComplete = concepts.every(c => assessments[c]);

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit(assessments);
    }
  };

  return (
    <div className="modal-overlay" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="modal-content" style={{ maxWidth: 600, padding: 30, animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
          <div style={{ backgroundColor: 'var(--accent-color)', padding: 10, borderRadius: '50%', color: 'white' }}>
            <Sparkles size={24} />
          </div>
          <h2 style={{ fontSize: 24, margin: 0 }}>Course Syllabus Generated!</h2>
        </div>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: 25, lineHeight: '1.5', fontSize: 15 }}>
          To build your project, we need to master the following concepts. 
          Please rate your current comfort level with each one so I can tailor the depth of our lessons!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 30, maxHeight: '55vh', overflowY: 'auto', paddingRight: 10 }}>
          {concepts.map((concept, idx) => (
            <div key={idx} style={{ 
              backgroundColor: 'var(--bg-editor)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 8, 
              padding: 20 
            }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: 18, color: '#fff' }}>{idx + 1}. {concept}</h3>
              
              <div style={{ display: 'flex', gap: 10 }}>
                {['Never Seen', 'Basic', 'Understand'].map(level => {
                  const isSelected = assessments[concept] === level;
                  let colors = { bg: 'rgba(255,255,255,0.05)', border: 'transparent', text: 'var(--text-muted)' };
                  
                  if (isSelected) {
                    if (level === 'Never Seen') colors = { bg: 'rgba(76, 175, 80, 0.2)', border: '#4CAF50', text: '#4CAF50' };
                    if (level === 'Basic') colors = { bg: 'rgba(33, 150, 243, 0.2)', border: '#2196F3', text: '#2196F3' };
                    if (level === 'Understand') colors = { bg: 'rgba(156, 39, 176, 0.2)', border: '#9c27b0', text: '#9c27b0' };
                  }

                  return (
                    <button
                      key={level}
                      onClick={() => handleSelect(concept, level)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 6,
                        color: colors.text,
                        cursor: 'pointer',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 15 }}>
          <button 
            style={{ padding: '12px 24px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            disabled={!isComplete}
            onClick={handleSubmit}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: isComplete ? 'var(--accent-color)' : 'var(--bg-editor)', 
              color: isComplete ? 'white' : 'var(--text-muted)', 
              border: 'none', 
              borderRadius: 6, 
              cursor: isComplete ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            Start Course <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
