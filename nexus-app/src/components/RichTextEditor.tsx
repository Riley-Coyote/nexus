'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import React, { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxCharacters?: number;
  className?: string;
  disabled?: boolean;
  onEditorReady?: (editor: any) => void;
  showToolbar?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your text…',
  maxCharacters = 2000,
  className = '',
  disabled = false,
  onEditorReady,
  showToolbar = true,
}: RichTextEditorProps) {
  // Initialise TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure StarterKit to ensure lists work properly
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
    ],
    content: value || '<p></p>',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      if (text.length <= maxCharacters) {
        onChange(html);
      }
    },
  });

  // Sync editor content when value prop changes (for clearing after submission)
  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      // Only update if the content actually differs to avoid infinite loops
      if (value === '' || value === '<p></p>') {
        // Clear the editor completely
        editor.commands.clearContent(true);
      } else {
        // Set new content
        editor.commands.setContent(value, false);
      }
    }
  }, [value, editor]);

  // Expose editor instance to parent
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Helper to render toolbar buttons
  const renderBtn = (
    label: React.ReactNode,
    isActive: boolean,
    onClick: () => void,
  ) => (
    <button
      type="button"
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );

  if (!editor) return null;

  return (
    <>
      <div className={`rich-text-editor ${className}`}>
        {/* Toolbar - only show if showToolbar is true */}
        {showToolbar && (
          <div className="rich-text-toolbar">
            {renderBtn(<strong>B</strong>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
            {renderBtn(<em>I</em>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
            {renderBtn(<u>U</u>, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
            {renderBtn('•', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
            {renderBtn('1.', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
            {renderBtn('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
            {renderBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            {renderBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            {renderBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          </div>
        )}

        {/* Editor Area */}
        <div className="rich-text-editor-container">
          <EditorContent
            editor={editor}
            className="rich-text-content"
            data-placeholder={placeholder}
          />
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        .rich-text-editor-container .ProseMirror {
          outline: none;
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          line-height: 1.7;
          padding: 1rem;
          min-height: 200px;
        }

        .rich-text-editor-container .ProseMirror p {
          margin: 1em 0;
        }

        .rich-text-editor-container .ProseMirror p:first-child {
          margin-top: 0;
        }

        .rich-text-editor-container .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .rich-text-editor-container .ProseMirror h1 {
          font-size: 2em;
          font-weight: 600;
          margin: 1.5em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .rich-text-editor-container .ProseMirror h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 1.3em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .rich-text-editor-container .ProseMirror h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 1.2em 0 0.5em 0;
          color: rgba(255, 255, 255, 0.95);
        }

        .rich-text-editor-container .ProseMirror h1:first-child,
        .rich-text-editor-container .ProseMirror h2:first-child,
        .rich-text-editor-container .ProseMirror h3:first-child {
          margin-top: 0;
        }

        .rich-text-editor-container .ProseMirror ul,
        .rich-text-editor-container .ProseMirror ol {
          padding-left: 1.5em;
          margin: 1em 0;
        }

        .rich-text-editor-container .ProseMirror ul {
          list-style-type: disc;
        }

        .rich-text-editor-container .ProseMirror ol {
          list-style-type: decimal;
        }

        .rich-text-editor-container .ProseMirror li {
          margin: 0.5em 0;
        }

        .rich-text-editor-container .ProseMirror li p {
          margin: 0;
        }

        .rich-text-editor-container .ProseMirror strong {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
        }

        .rich-text-editor-container .ProseMirror em {
          font-style: italic;
        }

        .rich-text-editor-container .ProseMirror u {
          text-decoration: underline;
        }

        .rich-text-editor-container .ProseMirror.ProseMirror-focused {
          outline: none;
        }

        /* Placeholder styling */
        .rich-text-editor-container .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
          height: 0;
        }

        .rich-text-editor-container .ProseMirror:empty::before {
          content: attr(data-placeholder);
          color: rgba(255, 255, 255, 0.4);
          font-style: italic;
          pointer-events: none;
        }

        /* Ensure proper spacing and layout */
        .rich-text-editor-container {
          position: relative;
          flex: 1;
          overflow: hidden;
        }

        .rich-text-content {
          height: 100%;
          overflow-y: auto;
        }

        /* Toolbar styling */
        .rich-text-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px 8px 0 0;
        }

        .toolbar-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .toolbar-btn.active {
          background: rgba(34, 197, 94, 0.2);
          color: rgba(34, 197, 94, 1);
        }

        .toolbar-btn.active:hover {
          background: rgba(34, 197, 94, 0.3);
        }

        .toolbar-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Main editor container */
        .rich-text-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 8px;
          overflow: hidden;
        }

        /* Dark theme adjustments */
        .rich-text-editor-container {
          background: transparent;
        }
      `}</style>
    </>
  );
} 