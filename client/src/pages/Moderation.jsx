import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';

export default function Moderation() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['flagged-comments'],
    queryFn: () => api.get('/admin/flagged-comments?limit=50').then((r) => r.data),
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/comments/${id}/dismiss`),
    onSuccess: () => {
      toast.success('Comment dismissed');
      queryClient.invalidateQueries({ queryKey: ['flagged-comments'] });
    },
    onError: () => toast.error('Failed to dismiss comment'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/comments/${id}/delete`),
    onSuccess: () => {
      toast.success('Comment deleted');
      queryClient.invalidateQueries({ queryKey: ['flagged-comments'] });
    },
    onError: () => toast.error('Failed to delete comment'),
  });

  return (
    <>
      <SEOHead title="Moderation" description="Review and resolve flagged comments" />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-display font-bold mb-2">Moderation Queue</h1>
        <p className="text-gray-400 mb-8">Review flagged comments and take action.</p>

        {isLoading && <div className="card p-6">Loading flagged comments...</div>}

        {!isLoading && data?.comments?.length === 0 && (
          <div className="card p-6 text-gray-400">No flagged comments currently.</div>
        )}

        <div className="space-y-4">
          {data?.comments?.map((comment) => (
            <div key={comment.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">
                    Post: <a className="text-brand-300 hover:text-brand-200" href={`/posts/${comment.post_slug}`}>{comment.post_title}</a>
                  </p>
                  <p className="text-sm text-gray-400">Author: {comment.author_name || comment.author_username}</p>
                  <p className="text-sm text-red-300 mt-1">Flag reason: {comment.flag_reason || 'Not provided'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => dismissMutation.mutate(comment.id)}
                    disabled={dismissMutation.isPending}
                    className="btn-ghost text-sm"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(comment.id)}
                    disabled={deleteMutation.isPending}
                    className="btn text-sm text-red-300 hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-200">{comment.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
