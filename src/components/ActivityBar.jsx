import React, { useState } from 'react';
import { Settings, Copy, PlusSquare } from 'lucide-react';

export default function ActivityBar({ onSettingsClick }) {
  return (
    <div className="activity-bar">
      <div className="activity-icon active" title="Explorer">
        <Copy size={24} strokeWidth={1.5} />
      </div>
      <div className="activity-icon" title="Search">
        <PlusSquare size={24} strokeWidth={1.5} />
      </div>
      <div className="activity-icon bottom" title="Settings" onClick={onSettingsClick}>
        <Settings size={24} strokeWidth={1.5} />
      </div>
    </div>
  );
}
