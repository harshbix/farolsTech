import SEOHead from '../components/SEOHead.jsx';

const ENDPOINTS = [
  { method: 'POST', path: '/api/auth/login', note: 'User login' },
  { method: 'POST', path: '/api/auth/register', note: 'User signup' },
  { method: 'GET', path: '/api/posts', note: 'List posts' },
  { method: 'GET', path: '/api/users/me/feed', note: 'Personalized feed' },
  { method: 'GET', path: '/api/analytics/my-posts', note: 'Analytics for current user' },
  { method: 'GET', path: '/api/admin/flagged-comments', note: 'Admin moderation queue' },
];

export default function ApiDocs() {
  return (
    <>
      <SEOHead title="API Docs" description="Farols API quick reference" />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold mb-2">API Docs</h1>
        <p className="text-gray-400 mb-8">A practical reference for common API routes.</p>

        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-surface-border">
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Path</th>
                <th className="py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((ep) => (
                <tr key={`${ep.method}-${ep.path}`} className="border-b border-surface-border/40">
                  <td className="py-2 pr-4 text-brand-300 font-semibold">{ep.method}</td>
                  <td className="py-2 pr-4 font-mono text-gray-200">{ep.path}</td>
                  <td className="py-2 text-gray-300">{ep.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
