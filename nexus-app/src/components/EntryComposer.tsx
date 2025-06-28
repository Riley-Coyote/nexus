'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [charCount, setCharCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const maxLength = 40000;

  const updateContent = useCallback(() => {
    if (editorRef.current) {
      const textContent = editorRef.current.textContent || '';
      setCharCount(textContent.length);
      setContent(editorRef.current.innerHTML);
      
      // Update active formats based on current selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
          ? range.commonAncestorContainer.parentElement 
          : range.commonAncestorContainer as Element;
        
        const newActiveFormats = new Set<string>();
        
        if (parentElement) {
          let element: Element | null = parentElement;
          while (element && element !== editorRef.current) {
            const tagName = element.tagName?.toLowerCase();
            if (tagName === 'strong' || tagName === 'b') newActiveFormats.add('bold');
            if (tagName === 'em' || tagName === 'i') newActiveFormats.add('italic');
            if (tagName === 'u') newActiveFormats.add('underline');
            if (tagName === 's' || tagName === 'del') newActiveFormats.add('strikethrough');
            element = element.parentElement;
          }
        }
        
        setActiveFormats(newActiveFormats);
      }
    }
  }, []);

  useEffect(() => {
    updateContent();
  }, [updateContent]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0).cloneRange();
    }
    return null;
  };

  const restoreSelection = (range: Range) => {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const wrapSelection = (tagName: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    const selectedText = range.toString();
    
    if (selectedText) {
      const wrapper = document.createElement(tagName);
      
      try {
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
        
        // Select the new wrapped content
        range.selectNode(wrapper);
        selection.removeAllRanges();
        selection.addRange(range);
        
        updateContent();
      } catch (e) {
        console.error('Error wrapping selection:', e);
      }
    }
  };

  const unwrapSelection = (tagName: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
      ? range.commonAncestorContainer.parentElement 
      : range.commonAncestorContainer as Element;

    while (element && element !== editorRef.current) {
      if (element.tagName?.toLowerCase() === tagName.toLowerCase()) {
        const parent = element.parentNode;
        if (parent) {
          while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
          }
          parent.removeChild(element);
          updateContent();
          break;
        }
      }
      element = element.parentElement;
    }
  };

  const toggleFormat = (format: string) => {
    if (!editorRef.current) return;

    const savedRange = saveSelection();
    if (!savedRange) return;

    editorRef.current.focus();
    restoreSelection(savedRange);

    const isActive = activeFormats.has(format);
    
    const tagMap: { [key: string]: string } = {
      'bold': 'strong',
      'italic': 'em',
      'underline': 'u',
      'strikethrough': 's'
    };

    const tagName = tagMap[format];
    if (!tagName) return;

    if (isActive) {
      unwrapSelection(tagName);
    } else {
      wrapSelection(tagName);
    }
  };

  const insertList = (ordered: boolean) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const listElement = document.createElement(ordered ? 'ol' : 'ul');
    const listItem = document.createElement('li');
    
    if (range.toString()) {
      listItem.textContent = range.toString();
      range.deleteContents();
    } else {
      listItem.textContent = '';
    }
    
    listElement.appendChild(listItem);
    range.insertNode(listElement);
    
    // Position cursor inside the list item
    range.setStart(listItem, 0);
    range.setEnd(listItem, listItem.childNodes.length);
    selection.removeAllRanges();
    selection.addRange(range);
    
    updateContent();
  };

  const changeFormat = (formatType: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const element = document.createElement(formatType);
    
    if (range.toString()) {
      element.textContent = range.toString();
      range.deleteContents();
      range.insertNode(element);
    }
    
    updateContent();
  };

  const insertHorizontalRule = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const hr = document.createElement('hr');
    range.insertNode(hr);
    
    // Move cursor after the HR
    range.setStartAfter(hr);
    range.setEndAfter(hr);
    selection.removeAllRanges();
    selection.addRange(range);
    
    updateContent();
  };

  const clearFormatting = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      range.deleteContents();
      range.insertNode(document.createTextNode(selectedText));
      updateContent();
    }
  };

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit?.(content, selectedType, isPublic);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        setContent('');
        setCharCount(0);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          toggleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          toggleFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          toggleFormat('underline');
          break;
      }
    }
  };

  const handleInput = () => {
    updateContent();
  };

  const handleSelectionChange = () => {
    updateContent();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      updateContent();
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
        
        <div className="rich-text-editor">
          {/* Rich Text Toolbar */}
          <div className="rich-text-toolbar mb-3 p-3 bg-black/5 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Format Block Dropdown */}
              <div className="toolbar-group">
                <select 
                  className="toolbar-select bg-transparent text-text-secondary text-xs border border-white/10 rounded px-2 py-1"
                  onChange={(e) => changeFormat(e.target.value)}
                  value=""
                >
                  <option value="">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="blockquote">Quote</option>
                </select>
              </div>
              
              <div className="toolbar-separator w-px h-6 bg-white/10 mx-1"></div>
              
              {/* Text Style Buttons */}
              <div className="toolbar-group flex gap-1">
                <button
                  type="button"
                  className={`toolbar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors ${
                    activeFormats.has('bold') ? 'bg-white/20 text-current-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => toggleFormat('bold')}
                  title="Bold (Ctrl+B)"
                >
                  <strong className="text-xs">B</strong>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors ${
                    activeFormats.has('italic') ? 'bg-white/20 text-current-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => toggleFormat('italic')}
                  title="Italic (Ctrl+I)"
                >
                  <em className="text-xs">I</em>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors ${
                    activeFormats.has('underline') ? 'bg-white/20 text-current-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => toggleFormat('underline')}
                  title="Underline (Ctrl+U)"
                >
                  <u className="text-xs">U</u>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors ${
                    activeFormats.has('strikethrough') ? 'bg-white/20 text-current-accent' : 'text-text-secondary hover:text-text-primary'
                  }`}
                  onClick={() => toggleFormat('strikethrough')}
                  title="Strikethrough"
                >
                  <s className="text-xs">S</s>
                </button>
              </div>
              
              <div className="toolbar-separator w-px h-6 bg-white/10 mx-1"></div>
              
              {/* List Buttons */}
              <div className="toolbar-group flex gap-1">
                <button
                  type="button"
                  className="toolbar-btn w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
                  onClick={() => insertList(false)}
                  title="Bullet List"
                >
                  <span className="text-xs">•</span>
                </button>
                <button
                  type="button"
                  className="toolbar-btn w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
                  onClick={() => insertList(true)}
                  title="Numbered List"
                >
                  <span className="text-xs">1.</span>
                </button>
              </div>
              
              <div className="toolbar-separator w-px h-6 bg-white/10 mx-1"></div>
              
              {/* Misc Buttons */}
              <div className="toolbar-group flex gap-1">
                <button
                  type="button"
                  className="toolbar-btn w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
                  onClick={insertHorizontalRule}
                  title="Horizontal Line"
                >
                  <span className="text-xs">―</span>
                </button>
                <button
                  type="button"
                  className="toolbar-btn w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
                  onClick={clearFormatting}
                  title="Clear Formatting"
                >
                  <span className="text-xs">✕</span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Rich Text Content Area */}
          <div
            ref={editorRef}
            className="rich-text-content w-full p-3 rounded-lg focus:outline-none"
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            data-placeholder={data.placeholder}
            style={{
              minHeight: '120px',
              backgroundColor: 'rgba(15, 23, 42, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)'
            }}
          />
          
          {/* Character Counter */}
          <div className={`rich-text-counter text-xs mt-2 ${charCount > maxLength * 0.9 ? 'text-yellow-400' : charCount > maxLength ? 'text-red-400' : 'text-text-quaternary'}`}>
            {charCount}/{maxLength}
          </div>
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
          disabled={charCount === 0 || charCount > maxLength}
        >
          {data.buttonText}
        </button>
      </div>
    </div>
  );
} 