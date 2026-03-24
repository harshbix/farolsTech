import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';

export default function ExternalNewsModeration() {
  const queryClient = useQueryClient();
  const [sourceInput, setSourceInput] = useState('');
  const [prioritySource, setPrioritySource] = useState('');
  const [priorityValue, setPriorityValue] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['external-news-moderation-articles'],
    queryFn: () => api.get('/external-news/admin/articles?limit=120').then((r) => r.data),
  });

  const rows = useMemo(() => data?.articles || [], [data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['external-news-moderation-articles'] });
    queryClient.invalidateQueries({ queryKey: ['external-news-list-related'] });
    queryClient.invalidateQueries({ queryKey: ['external-news-detail'] });
  };

  const flagMutation = useMutation({
    mutationFn: ({ id, pinned, hidden }) => api.patch(`/external-news/admin/articles/${encodeURIComponent(String(id))}`, { pinned, hidden }),
    onSuccess: refresh,
  });

  const blacklistMutation = useMutation({
    mutationFn: ({ source, blacklisted }) => api.post('/external-news/admin/sources/blacklist', { source, blacklisted }),
    onSuccess: () => {
      setSourceInput('');
      refresh();
    },
  });

  const priorityMutation = useMutation({
    mutationFn: ({ source, priority }) => api.post('/external-news/admin/sources/priority', { source, priority }),
    onSuccess: () => {
      setPrioritySource('');
      setPriorityValue(0);
      refresh();
    },
  });

  return (
    <>
      <SEOHead title="External News Moderation" description="Moderate, pin, hide, prioritize, and blacklist external news sources" />
      <section className="max-w-7xl mx-auto px-4 py-10" aria-label="External news moderation">
        <h1 className="text-3xl font-display font-bold mb-2">External News Moderation</h1>
        <p className="text-[rgb(var(--text-secondary))] mb-6">Admin tools for pinning, hiding, source priority, and source blacklist.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card p-4">
            <h2 className="text-lg font-display font-semibold mt-0 mb-3">Blacklist Source</h2>
            <div className="flex gap-2">
              <input className="input" value={sourceInput} onChange={(e) => setSourceInput(e.target.value)} placeholder="Source name (e.g. Example News)" />
              <button
                type="button"
                className="btn-danger icon-btn"
                onClick={() => blacklistMutation.mutate({ source: sourceInput.trim(), blacklisted: true })}
                disabled={!sourceInput.trim() || blacklistMutation.isPending}
                aria-label="Blacklist source"
              >
                <span aria-hidden="true">⛔</span>
                <span className="icon-label">Block</span>
              </button>
            </div>
          </div>

          <div className="card p-4">
            <h2 className="text-lg font-display font-semibold mt-0 mb-3">Prioritize Source</h2>
            <div className="flex gap-2">
              <input className="input" value={prioritySource} onChange={(e) => setPrioritySource(e.target.value)} placeholder="Source name" />
              <input className="input max-w-[120px]" type="number" value={priorityValue} onChange={(e) => setPriorityValue(Number(e.target.value) || 0)} />
              <button
                type="button"
                className="btn-primary icon-btn"
                onClick={() => priorityMutation.mutate({ source: prioritySource.trim(), priority: priorityValue })}
                disabled={!prioritySource.trim() || priorityMutation.isPending}
                aria-label="Save source priority"
              >
                <span aria-hidden="true">⬆️</span>
                <span className="icon-label">Save</span>
              </button>
            </div>
          </div>
        </div>

        {isLoading && <div className="card p-4">Loading moderation articles...</div>}
        {isError && <div className="card p-4 text-red-300">Failed to load moderation data.</div>}

        {!isLoading && !isError && (
          <div className="card p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-surface-border">
                  <th className="py-2 pr-2">Title</th>
                  <th className="py-2 pr-2">Source</th>
                  <th className="py-2 pr-2">Trust</th>
                  <th className="py-2 pr-2">Pinned</th>
                  <th className="py-2 pr-2">Hidden</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-surface-border/60 align-top">
                    <td className="py-3 pr-2 max-w-[420px]">{row.title}</td>
                    <td className="py-3 pr-2">{row.source}</td>
                    <td className="py-3 pr-2">{row.trust_score || 'unverified'}</td>
                    <td className="py-3 pr-2">
                      <button
                        type="button"
                        className="btn-ghost icon-btn"
                        onClick={() => flagMutation.mutate({ id: row.id, pinned: !row.pinned, hidden: !!row.hidden })}
                        disabled={flagMutation.isPending}
                        aria-label={`Toggle pin for ${row.title}`}
                      >
                        <span aria-hidden="true">{row.pinned ? '📌' : '📍'}</span>
                        <span className="icon-label">{row.pinned ? 'Pinned' : 'Pin'}</span>
                      </button>
                    </td>
                    <td className="py-3 pr-2">
                      <button
                        type="button"
                        className="btn-ghost icon-btn"
                        onClick={() => flagMutation.mutate({ id: row.id, pinned: !!row.pinned, hidden: !row.hidden })}
                        disabled={flagMutation.isPending}
                        aria-label={`Toggle visibility for ${row.title}`}
                      >
                        <span aria-hidden="true">{row.hidden ? '🙈' : '👁️'}</span>
                        <span className="icon-label">{row.hidden ? 'Hidden' : 'Visible'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
