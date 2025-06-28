'use client';

import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface EntryComposerData {
  types: string[];
  placeholder: string;
  buttonText: string;
}

interface EntryComposerProps {
  data: EntryComposerData;
  onSubmit?: (content: string, type: string, isPublic: boolean) => void;
}

export default function EntryComposer({ data, onSubmit }: EntryComposerProps) {
  const [selectedType, setSelectedType] = useState(data.types[0]);
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit?.(content, selectedType, isPublic);
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="glass-panel rounded-xl p-1 flex flex-col gap-4 shadow-level-2 depth-near depth-responsive atmosphere-layer-1">
      <div className="p-5 pb-0 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <select 
            id="category-select" 
            className="bg-transparent text-text-secondary text-sm font-light border-0 focus:ring-0 p-0 outline-none"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {data.types.map((type, index) => (
              <option key={index} value={type}>{type}</option>
            ))}
          </select>
          <div className="writing-indicator"></div>
        </div>
        <div className="rich-text-editor-container">
          <textarea
            className="entry-composer-textarea w-full p-3 rounded-lg focus:outline-none resize-none"
            placeholder={data.placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            style={{
              minHeight: '120px',
              backgroundColor: 'rgba(15, 23, 42, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)'
            }}
          />
        </div>
      </div>
      <div className="flex justify-between items-center bg-black/10 p-3 px-5 rounded-b-xl mt-auto">
        <div className="flex items-center gap-4">
          <button 
            id="share-toggle" 
            title="Share Publicly" 
            className={`interactive-icon ${isPublic ? 'text-current-accent' : 'text-text-quaternary'} hover:text-current-accent transition-colors`}
            onClick={() => setIsPublic(!isPublic)}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
        <button 
          className="commit-btn interactive-btn text-sm px-4 py-2 rounded-md ripple-effect"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          {data.buttonText}
        </button>
      </div>
    </div>
  );
} 