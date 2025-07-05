'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Strike from '@tiptap/extension-strike';
import React from 'react';

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
  placeholder = 'Enter your text…',
  maxCharacters = 2000,
  className = '',
  disabled = false,
}: RichTextEditorProps) {
  // Initialise TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true }),
      Underline,
      Strike,
    ],
    content: value || '<p></p>',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      if (text.length <= maxCharacters) {
        onChange(html);
      }
    },
  });

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
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="rich-text-toolbar">
        {renderBtn(<strong>B</strong>, editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
        {renderBtn(<em>I</em>, editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
        {renderBtn(<u>U</u>, editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run())}
        {renderBtn(<s>S</s>, editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run())}
        {renderBtn('•', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
        {renderBtn('1.', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
        {renderBtn('P', editor.isActive('paragraph'), () => editor.chain().focus().setParagraph().run())}
        {renderBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
        {renderBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        {renderBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
      </div>

      {/* Editor Area */}
      <EditorContent
        editor={editor}
        className="rich-text-content"
        data-placeholder={placeholder}
      />
    </div>
  );
} 