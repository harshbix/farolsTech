import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';

function EditorToolbar({ editor }) {
  if (!editor) return null;
  const btn = (action, label, active = false) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 text-sm rounded transition-colors ${active ? 'bg-brand-600 text-white' : 'hover:bg-white/10 text-gray-300'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-surface-border bg-surface-raised rounded-t-lg">
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), 'S', editor.isActive('strike'))}
      <div className="w-px bg-surface-border mx-1" />
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      <div className="w-px bg-surface-border mx-1" />
      {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleCodeBlock().run(), '</>', editor.isActive('codeBlock'))}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState({
    title: '', excerpt: '', cover_image: '', status: 'draft',
    meta_title: '', meta_desc: '', category_id: null,
  });
  const [autoSaveTimer, setAutoSaveTimer] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your story…' }),
      Image,
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'article-content min-h-[400px] focus:outline-none p-4' },
    },
  });

  // Load existing post if editing
  const { data: existing } = useQuery({
    queryKey: ['post-edit', id],
    queryFn: () => api.get(`/posts/${id}`).then(r => r.data.post),
    enabled: !!id,
  });

  useEffect(() => {
    if (existing && editor) {
      setMeta({
        title: existing.title || '',
        excerpt: existing.excerpt || '',
        cover_image: existing.cover_image || '',
        status: existing.status || 'draft',
        meta_title: existing.meta_title || '',
        meta_desc: existing.meta_desc || '',
        category_id: existing.category_id || null,
      });
      // Load content
      try {
        const content = JSON.parse(existing.content_json);
        editor.commands.setContent(content);
      } catch {
        editor.commands.setContent(existing.content_json || '');
      }
    }
  }, [existing, editor]);

  const saveMutation = useMutation({
    mutationFn: (payload) => id
      ? api.put(`/posts/${id}`, payload)
      : api.post('/posts', payload),
    onSuccess: ({ data }) => {
      toast.success(meta.status === 'published' ? 'Published! 🎉' : 'Draft saved');
      if (!id) navigate(`/editor/${data.post.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Save failed'),
  });

  const save = useCallback((status) => {
    const content = editor?.getJSON();
    saveMutation.mutate({
      ...meta,
      status: status || meta.status,
      content_json: JSON.stringify(content),
    });
  }, [meta, editor, saveMutation]);

  // Auto-save every 30 seconds (spec requirement)
  useEffect(() => {
    const timer = setInterval(() => {
      if (meta.title.trim() && editor) {
        save('draft');
      }
    }, 30000);
    setAutoSaveTimer(timer);
    return () => clearInterval(timer);
  }, [save, meta.title, editor]);

  return (
    <>
      <SEOHead title={id ? 'Edit Post' : 'New Post'} description="Write and publish your story" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold">{id ? 'Edit Post' : 'New Post'}</h1>
          <div className="flex gap-3">
            <button
              id="save-draft-btn"
              onClick={() => save('draft')}
              disabled={saveMutation.isPending}
              className="btn-ghost"
            >
              Save Draft
            </button>
            <button
              id="publish-btn"
              onClick={() => save('published')}
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Title */}
        <input
          id="post-title"
          value={meta.title}
          onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
          className="w-full bg-transparent text-3xl font-display font-bold placeholder-gray-600 focus:outline-none mb-4 border-0"
          placeholder="Post title…"
        />

        {/* Cover image URL */}
        <input
          value={meta.cover_image}
          onChange={e => setMeta(m => ({ ...m, cover_image: e.target.value }))}
          className="input text-sm mb-4"
          placeholder="Cover image URL (optional)"
        />

        {/* Tiptap editor */}
        <div className="card">
          <EditorToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>

        {/* SEO meta */}
        <details className="mt-6 card p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-300">SEO Settings</summary>
          <div className="mt-4 space-y-3">
            <input value={meta.meta_title} onChange={e => setMeta(m => ({ ...m, meta_title: e.target.value }))}
              className="input text-sm" placeholder="Meta title (max 70 chars)" maxLength={70} />
            <textarea value={meta.meta_desc} onChange={e => setMeta(m => ({ ...m, meta_desc: e.target.value }))}
              className="input text-sm resize-none" rows={2} placeholder="Meta description (max 160 chars)" maxLength={160} />
            <input value={meta.excerpt} onChange={e => setMeta(m => ({ ...m, excerpt: e.target.value }))}
              className="input text-sm" placeholder="Short excerpt shown in post cards…" />
          </div>
        </details>
      </div>
    </>
  );
}
