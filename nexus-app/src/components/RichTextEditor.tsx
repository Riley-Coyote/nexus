'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxCharacters?: number;
  className?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter your text...",
  maxCharacters = 2000,
  className = "",
  disabled = false
}: RichTextEditorProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [activeCommands, setActiveCommands] = useState<Set<string>>(new Set());

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateActiveCommands();
    handleContentChange();
  }, []);

  const updateActiveCommands = useCallback(() => {
    const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
    const newActiveCommands = new Set<string>();
    
    commands.forEach(command => {
      if (document.queryCommandState(command)) {
        newActiveCommands.add(command);
      }
    });
    
    setActiveCommands(newActiveCommands);
  }, []);

  const handleContentChange = useCallback(() => {
    if (!contentRef.current) return;
    
    const content = contentRef.current.innerHTML;
    const textContent = contentRef.current.textContent || '';
    
    setCharacterCount(textContent.length);
    
    if (textContent.length <= maxCharacters) {
      onChange(content);
    } else {
      // Truncate content if it exceeds max characters
      const truncatedText = textContent.substring(0, maxCharacters);
      contentRef.current.textContent = truncatedText;
      onChange(contentRef.current.innerHTML);
    }
  }, [onChange, maxCharacters]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
      }
    }
  }, [execCommand]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    execCommand('insertText', text);
  }, [execCommand]);

  const handleSelectionChange = useCallback(() => {
    updateActiveCommands();
  }, [updateActiveCommands]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerHTML !== value) {
      contentRef.current.innerHTML = value;
      setCharacterCount(contentRef.current.textContent?.length || 0);
    }
  }, [value]);

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="rich-text-toolbar">
        <div className="toolbar-group">
          <select 
            className="toolbar-select"
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            disabled={disabled}
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="blockquote">Quote</option>
          </select>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button
            type="button"
            className={`toolbar-btn ${activeCommands.has('bold') ? 'active' : ''}`}
            onClick={() => execCommand('bold')}
            title="Bold (Ctrl+B)"
            disabled={disabled}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeCommands.has('italic') ? 'active' : ''}`}
            onClick={() => execCommand('italic')}
            title="Italic (Ctrl+I)"
            disabled={disabled}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeCommands.has('underline') ? 'active' : ''}`}
            onClick={() => execCommand('underline')}
            title="Underline (Ctrl+U)"
            disabled={disabled}
          >
            <u>U</u>
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeCommands.has('strikeThrough') ? 'active' : ''}`}
            onClick={() => execCommand('strikeThrough')}
            title="Strikethrough"
            disabled={disabled}
          >
            <s>S</s>
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertUnorderedList')}
            title="Bullet List"
            disabled={disabled}
          >
            •
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertOrderedList')}
            title="Numbered List"
            disabled={disabled}
          >
            1.
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('outdent')}
            title="Decrease Indent"
            disabled={disabled}
          >
            ⇤
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('indent')}
            title="Increase Indent"
            disabled={disabled}
          >
            ⇥
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyLeft')}
            title="Align Left"
            disabled={disabled}
          >
            ⫷
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyCenter')}
            title="Align Center"
            disabled={disabled}
          >
            ⫸
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('justifyRight')}
            title="Align Right"
            disabled={disabled}
          >
            ⫹
          </button>
        </div>
        
        <div className="toolbar-separator"></div>
        
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('insertHorizontalRule')}
            title="Horizontal Line"
            disabled={disabled}
          >
            ―
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => execCommand('removeFormat')}
            title="Clear Formatting"
            disabled={disabled}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div
        ref={contentRef}
        className="rich-text-content"
        contentEditable={!disabled}
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{
          minHeight: '120px',
          padding: '12px',
          outline: 'none',
          color: 'var(--text-secondary)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: '200',
          lineHeight: '1.6',
          overflowY: 'auto',
          maxHeight: '800px'
        }}
      />
      
      {/* Character Counter */}
      {characterCount > 0 && (
        <div className={`rich-text-counter ${
          characterCount > maxCharacters * 0.9 ? 'warning' : ''
        } ${characterCount >= maxCharacters ? 'error' : ''}`}>
          {characterCount}/{maxCharacters}
        </div>
      )}
    </div>
  );
} 