import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function FileSelectModal({ files, onScan, onClose }) {
  const [selected, setSelected] = useState(files.reduce((acc, f) => ({...acc, [f.id]: true}), {}));

  const toggle = (id) => setSelected(prev => ({...prev, [id]: !prev[id]}));

  const handleScan = () => {
    const selectedFiles = files.filter(f => selected[f.id]);
    if (selectedFiles.length === 0) return alert("Select at least one file.");
    onScan(selectedFiles);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span>Choose Files to Scan</span>
          <X className="modal-close" size={20} onClick={onClose} />
        </div>
        <div className="modal-content">
          {files.map(f => (
            <div key={f.id} style={{display: 'flex', alignItems: 'center', gap: 10}}>
              <input 
                type="checkbox" 
                checked={!!selected[f.id]} 
                onChange={() => toggle(f.id)} 
                id={`check-${f.id}`}
              />
              <label htmlFor={`check-${f.id}`} style={{fontSize: 13, color: 'var(--text-main)', cursor: 'pointer'}}>
                {f.name}
              </label>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button onClick={handleScan}>Scan Selected Files</button>
        </div>
      </div>
    </div>
  );
}
