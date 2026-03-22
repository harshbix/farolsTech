import { Link } from 'react-router-dom';
import SEOHead from '../components/SEOHead.jsx';

export default function NotFound() {
  return (
    <>
      <SEOHead title="404 – Page Not Found" description="This page does not exist" />
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-8xl font-display font-bold text-gradient mb-4">404</p>
        <h1 className="text-2xl font-display font-semibold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </>
  );
}
