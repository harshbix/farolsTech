import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';
import SEOHead from '../components/SEOHead.jsx';
import PostCard from '../components/PostCard.jsx';
import { SkeletonCard } from '../components/PageLoader.jsx';

export default function Author() {
  const { username } = useParams();

  const { data: userData } = useQuery({
    queryKey: ['user', username],
    queryFn: () => api.get(`/users/${username}`).then(r => r.data),
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['user-posts', username],
    queryFn: () => api.get(`/users/${username}/posts`).then(r => r.data),
  });

  const user = userData?.user;

  return (
    <>
      <SEOHead
        title={user?.display_name || username}
        description={user?.bio || `Read articles by ${username} on Farols`}
      />
      <div className="max-w-5xl mx-auto px-4 py-10">
        {user && (
          <div className="flex items-start gap-5 mb-10">
            <div className="w-20 h-20 rounded-full bg-brand-700 flex items-center justify-center text-3xl font-bold uppercase flex-shrink-0">
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
                : user.username[0]
              }
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">{user.display_name || user.username}</h1>
              <p className="text-brand-400 text-sm mt-0.5">@{user.username}</p>
              {user.bio && <p className="text-gray-400 mt-2 max-w-lg">{user.bio}</p>}
              <p className="text-sm text-gray-500 mt-2">{user.post_count} articles published</p>
            </div>
          </div>
        )}

        <h2 className="text-xl font-display font-semibold mb-5">Articles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : postsData?.posts?.map(post => <PostCard key={post.id} post={post} />)
          }
        </div>
        {!isLoading && postsData?.posts?.length === 0 && (
          <p className="text-center text-gray-500 py-12">No published articles yet.</p>
        )}
      </div>
    </>
  );
}
