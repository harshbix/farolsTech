import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import { getErrorMessage } from '../utils/errorFormatter.js';
import { useAuthStore } from '../store/index.js';

function normalizeAssetUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;

  const configuredApi = import.meta.env.VITE_API_URL;
  if (configuredApi && /^https?:\/\//i.test(configuredApi)) {
    return new URL(url, configuredApi).toString();
  }

  if (url.startsWith('/uploads')) {
    const fallbackApi = import.meta.env.VITE_API_ORIGIN || `${window.location.protocol}//${window.location.hostname}:3001`;
    return new URL(url, fallbackApi).toString();
  }

  return url;
}

function EditorToolbar({ editor, onUploadClick }) {
  if (!editor) return null;
  const btn = (action, label, active = false) => (
    <button
      type="button"
      onClick={action}
      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        active 
          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
          : 'text-[rgb(var(--text-secondary))] hover:bg-surface-muted border border-transparent'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2 p-4 border-b border-surface-border bg-surface-raised rounded-t-xl">
      <div className="flex gap-1">
        {btn(() => editor.chain().focus().toggleBold().run(), '𝐁', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), '𝘐', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleUnderline().run(), '𝑼', editor.isActive('underline'))}
        {btn(() => editor.chain().focus().toggleStrike().run(), '𝑺', editor.isActive('strike'))}
      </div>
      <div className="w-px bg-surface-border"/>
      <div className="flex gap-1">
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      </div>
      <div className="w-px bg-surface-border"/>
      <div className="flex gap-1">
        {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), '</>', editor.isActive('codeBlock'))}
      </div>
      <div className="w-px bg-surface-border"/>
      {btn(onUploadClick, '📷 Image')}
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const imageInputRef = useRef(null);
  const coverImageInputRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [rejectReason, setRejectReason] = useState('');
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
      attributes: { class: 'article-content min-h-[500px] focus:outline-none p-6 text-[rgb(var(--text-primary))]' },
    },
  });

  // Load existing post if editing
  const { data: existing } = useQuery({
    queryKey: ['post-edit', id],
    queryFn: () => api.get(`/posts/id/${id}`).then(r => r.data.post),
    enabled: !!id,
  });

  // Load categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.categories),
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'latest'] });
      queryClient.invalidateQueries({ queryKey: ['trending'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-posts'] });

      toast.success(meta.status === 'published' ? '✨ Published successfully!' : '💾 Draft saved');
      if (data?.post?.status === 'published' && data?.post?.slug) {
        navigate(`/posts/${data.post.slug}`);
        return;
      }

      if (!id && data?.post?.id) navigate(`/editor/${data.post.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Save failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowDeleteModal(false);
      toast.success('📁 Story archived');
      navigate('/editor');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Archive failed')),
  });

  const publishActionMutation = useMutation({
    mutationFn: async ({ action, payload }) => {
      if (!id) throw new Error('Save post first before this action');
      if (action === 'submit-review') return api.post(`/posts/${id}/submit-review`);
      if (action === 'approve') return api.post(`/posts/${id}/approve`);
      if (action === 'reject') return api.post(`/posts/${id}/reject`, payload || {});
      if (action === 'schedule') return api.post(`/posts/${id}/schedule`, payload || {});
      if (action === 'breaking') return api.patch(`/posts/${id}/breaking`, payload || {});
      throw new Error('Unknown publishing action');
    },
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['post-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-posts'] });
      if (vars.action === 'approve') {
        toast.success('Post approved and published');
        navigate('/dashboard');
      } else if (vars.action === 'reject') {
        toast.success('Post rejected back to draft');
      } else if (vars.action === 'submit-review') {
        toast.success('Post submitted for review');
      } else if (vars.action === 'schedule') {
        toast.success('Post scheduled');
      } else if (vars.action === 'breaking') {
        toast.success('Breaking status updated');
      }
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Publishing action failed')),
  });

  const save = useCallback((status) => {
    if (!meta.title.trim()) {
      toast.error('Please add a title');
      return;
    }
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

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !editor) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/uploads/posts/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.image?.url) {
        const src = normalizeAssetUrl(data.image.url);
        editor.chain().focus().setImage({ src, alt: meta.title || 'Farols image' }).run();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Image upload failed'));
    }
  };

  const handleCoverImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/uploads/posts/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data?.image?.url) {
        setMeta(m => ({ ...m, cover_image: data.image.url }));
        toast.success('Cover image added');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cover upload failed'));
    }
  };

  const coverImageUrl = meta.cover_image ? normalizeAssetUrl(meta.cover_image) : null;

  return (
    <>
      <SEOHead title={id ? 'Edit Post' : 'New Post'} description="Write and publish your story" />
      <div className="bg-[rgb(var(--surface-bg))] min-h-screen">
        
        {/* Top Action Bar */}
        <div className="sticky top-0 z-40 border-b border-surface-border bg-[rgb(var(--surface-bg))]/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/editor')}
                className="p-2 hover:bg-surface-raised rounded-lg transition-colors text-[rgb(var(--text-secondary))]"
              >
                ← Back
              </button>
              <div>
                <h1 className="font-display font-bold text-lg text-[rgb(var(--text-primary))]">
                  {id ? 'Edit Story' : 'New Story'}
                </h1>
                <p className="text-xs text-[rgb(var(--text-secondary))]">
                  {meta.status === 'published' ? '🟢 Published' : meta.status === 'draft' ? '🟡 Draft' : '⚪ Archived'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {id && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400 hover:text-red-300"
                  title="Archive this story"
                >
                  🗑️ Archive
                </button>
              )}
              <button
                onClick={() => save('draft')}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-lg border border-surface-border text-[rgb(var(--text-primary))] hover:border-brand-500 transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? '⏳ Saving…' : 'Save Draft'}
              </button>
              {isAdmin ? (
                <>
                  <button
                    onClick={() => id ? publishActionMutation.mutate({ action: 'approve' }) : save('published')}
                    disabled={saveMutation.isPending || publishActionMutation.isPending || !meta.title.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {saveMutation.isPending || publishActionMutation.isPending ? '⏳ Working…' : 'Approve'}
                  </button>
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="input text-xs py-2 w-40"
                    placeholder="Reject reason"
                  />
                  <button
                    onClick={() => publishActionMutation.mutate({ action: 'reject', payload: { reason: rejectReason } })}
                    disabled={!id || !rejectReason.trim() || publishActionMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => save('published')}
                    disabled={saveMutation.isPending || !meta.title.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-700 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    Publish Now
                  </button>
                  <button
                    onClick={() => publishActionMutation.mutate({ action: 'breaking', payload: { is_breaking: true } })}
                    disabled={!id || publishActionMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    Mark Breaking
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => publishActionMutation.mutate({ action: 'submit-review' })}
                    disabled={!id || saveMutation.isPending || publishActionMutation.isPending || !meta.title.trim()}
                    className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    Submit for Review
                  </button>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="input text-xs py-2"
                  />
                  <button
                    onClick={() => publishActionMutation.mutate({ action: 'schedule', payload: { scheduled_at: scheduleAt } })}
                    disabled={!id || !scheduleAt || publishActionMutation.isPending}
                    className="px-4 py-2 rounded-lg border border-surface-border text-[rgb(var(--text-primary))] hover:border-brand-500 transition-colors disabled:opacity-50"
                  >
                    Schedule
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Cover Image Section */}
          <div className="mb-8">
            {coverImageUrl ? (
              <div className="relative group rounded-2xl overflow-hidden border border-surface-border mb-4">
                <img
                  src={coverImageUrl}
                  alt="Cover"
                  className="w-full h-80 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => coverImageInputRef.current?.click()}
                    className="px-4 py-2 bg-white text-black rounded-lg font-medium flex items-center gap-2"
                  >
                    🖼️ Change Cover
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => coverImageInputRef.current?.click()}
                className="w-full h-80 border-2 border-dashed border-surface-border rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-brand-500 hover:bg-brand-500/5 transition-all group cursor-pointer mb-4"
              >
                <span className="text-5xl">🖼️</span>
                <div className="text-center">
                  <p className="font-semibold text-[rgb(var(--text-primary))] group-hover:text-brand-400 transition-colors">
                    Add Cover Image
                  </p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">
                    Drag & drop or click to upload
                  </p>
                </div>
              </button>
            )}
            <input
              ref={coverImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleCoverImageUpload}
            />
          </div>

          {/* Title Section */}
          <div className="mb-8">
            <input
              id="post-title"
              value={meta.title}
              onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
              className="w-full bg-transparent text-4xl md:text-5xl font-display font-bold text-[rgb(var(--text-primary))] placeholder-surface-muted focus:outline-none border-0"
              placeholder="Your story title…"
            />
            {meta.title && (
              <p className="text-sm text-[rgb(var(--text-secondary))] mt-2">
                {meta.title.length} characters
              </p>
            )}
          </div>

          {/* Metadata Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-surface-border">
            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                Category
              </label>
              <select
                value={meta.category_id || ''}
                onChange={e => setMeta(m => ({ ...m, category_id: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-[rgb(var(--text-primary))] focus:outline-none focus:border-brand-500"
              >
                <option value="">No category</option>
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                Status
              </label>
              <select
                value={meta.status}
                onChange={e => setMeta(m => ({ ...m, status: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-[rgb(var(--text-primary))] focus:outline-none focus:border-brand-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                Excerpt
              </label>
              <input
                value={meta.excerpt}
                onChange={e => setMeta(m => ({ ...m, excerpt: e.target.value }))}
                className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-[rgb(var(--text-primary))] text-sm focus:outline-none focus:border-brand-500"
                placeholder="Brief summary…"
                maxLength={160}
              />
            </div>
          </div>

          {/* Editor Section */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-[rgb(var(--text-secondary))] mb-3">
              Content
            </p>
            <div className="card rounded-xl overflow-hidden border border-surface-border">
              <EditorToolbar editor={editor} onUploadClick={() => imageInputRef.current?.click()} />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="mb-8">
            <details className="card p-6 rounded-xl border border-surface-border group">
              <summary className="cursor-pointer flex items-center justify-between font-semibold text-[rgb(var(--text-primary))] select-none">
                <span>🔍 SEO Settings</span>
                <span className="transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                    Meta Title
                  </label>
                  <input
                    value={meta.meta_title}
                    onChange={e => setMeta(m => ({ ...m, meta_title: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-[rgb(var(--text-primary))] text-sm focus:outline-none focus:border-brand-500"
                    placeholder="How this appears in search results"
                    maxLength={70}
                  />
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    {meta.meta_title.length} / 70 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[rgb(var(--text-secondary))] mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={meta.meta_desc}
                    onChange={e => setMeta(m => ({ ...m, meta_desc: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-raised border border-surface-border rounded-lg text-[rgb(var(--text-primary))] text-sm focus:outline-none focus:border-brand-500 resize-none"
                    rows={3}
                    placeholder="Brief description for search engines…"
                    maxLength={160}
                  />
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                    {meta.meta_desc.length} / 160 characters
                  </p>
                </div>
              </div>
            </details>
          </div>

        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-raised rounded-2xl border border-surface-border p-6 max-w-md w-full space-y-4">
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2">
                🗑️ Archive Story
              </h2>
              <p className="text-[rgb(var(--text-secondary))]">
                This will move your story to the archive. You can restore it later from your dashboard.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-surface-border text-[rgb(var(--text-primary))] hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Archiving…' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
