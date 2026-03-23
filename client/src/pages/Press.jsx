import SEOHead from '../components/SEOHead.jsx';

export default function Press() {
  return (
    <>
      <SEOHead title="Press" description="Press resources and media contacts" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <h1 className="text-3xl font-display font-bold">Press</h1>
        <p className="text-gray-300">
          Media inquiries, interview requests, and press kits can be requested via press@farols.news.
        </p>
      </div>
    </>
  );
}
