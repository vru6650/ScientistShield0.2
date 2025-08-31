import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { createLowlight } from 'lowlight';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Youtube } from '@tiptap/extension-youtube';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import { useSelector } from 'react-redux';
import Placeholder from '@tiptap/extension-placeholder';
import { ListItem } from '@tiptap/extension-list-item';
import TiptapToolbar from './TiptapToolbar';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import CodeSnippet from '../tiptap/CodeSnippet';
import ColoredCodeBlock from '../tiptap/ColoredCodeBlock';

export default function TiptapEditor({ content, onChange, placeholder }) {
    const { upload, isUploading } = useCloudinaryUpload();
    const fileInputRef = useRef(null);
    const lowlight = createLowlight();
    const { currentUser } = useSelector((state) => state.user);
    const [isMounted, setIsMounted] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                horizontalRule: false,
                link: false,
                orderedList: { keepAttributes: true },
                bulletList: { keepAttributes: true },
            }),
            HorizontalRule,
            Image,
            Highlight,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'bulletList', 'orderedList', 'listItem'],
            }),
            Subscript,
            Superscript,
            Link.configure({
                openOnClick: false,
                autolink: true,
            }),
            TextStyle,
            Color,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            ColoredCodeBlock.configure({
                lowlight,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            Youtube.configure({
                controls: false,
                class: 'youtube-iframe',
            }),
            CharacterCount.configure({
                limit: 10000,
            }),
            CodeSnippet,
            Placeholder.configure({
                placeholder: placeholder,
            }),
            ListItem
        ],
        content: content,
        onUpdate: ({ editor }) => {
            if (onChange) {
                const html = editor.getHTML();
                const text = editor.getText();
                onChange(html, text); // ✅ return both HTML + plain text
            }
        },
        editorProps: {
            attributes: {
                class: 'tiptap prose max-w-none focus:outline-none dark:prose-invert',
            },
        },
    }, [isMounted]);

    useEffect(() => {
        if (editor) {
            setIsMounted(true);
        }
        if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    useEffect(() => {
        if (!editor) return;

        const addCopyButtons = () => {
            const blocks = editor.view.dom.querySelectorAll('pre');
            blocks.forEach((block) => {
                if (block.querySelector('.code-copy-btn')) return;
                const button = document.createElement('button');
                button.innerText = 'Copy';
                button.className = 'code-copy-btn';
                button.addEventListener('click', () => {
                    const code = block.querySelector('code')?.textContent || '';
                    navigator.clipboard.writeText(code);
                });
                block.appendChild(button);
            });
        };

        addCopyButtons();
        editor.on('update', addCopyButtons);
        return () => {
            editor.off('update', addCopyButtons);
        };
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Enter YouTube URL');
        if (url && editor) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }, [editor]);

    const handleImageUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const url = await upload(file, {
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                maxSizeMB: 2
            });
            if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Image upload failed: ' + error.message);
        }
    }, [editor, upload]);

    const addCodeSnippet = useCallback(async () => {
        if (!currentUser || !currentUser.isAdmin) {
            alert('You must be an admin to add a code snippet.');
            return;
        }
        if (!editor) return;

        try {
            const res = await fetch('/api/code-snippet/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: '', css: '', js: '' }),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create code snippet.');
            }
            const newSnippet = await res.json();
            editor.chain().focus().insertContent({
                type: 'codeSnippet',
                attrs: { snippetId: newSnippet._id },
            }).run();
        } catch (error) {
            console.error('Failed to create code snippet:', error.message);
            alert('Failed to create code snippet: ' + error.message);
        }
    }, [editor, currentUser]);

    const memoizedToolbar = useMemo(() => {
        if (!editor) return null;
        return (
            <TiptapToolbar
                editor={editor}
                isUploading={isUploading}
                onAddImage={() => fileInputRef.current?.click()}
                onAddYoutubeVideo={addYoutubeVideo}
                onAddCodeSnippet={addCodeSnippet}
            />
        );
    }, [editor, isUploading, addYoutubeVideo, addCodeSnippet]);

    return (
        <div className="tiptap-container">
            {memoizedToolbar}
            <EditorContent editor={editor} />
            {editor && (
                <div className="character-count text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {editor.storage.characterCount.characters()} characters
                    {' / '}
                    {editor.storage.characterCount.words()} words
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
            />
        </div>
    );
}