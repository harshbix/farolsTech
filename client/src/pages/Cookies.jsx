import SEOHead from '../components/SEOHead.jsx';

export default function Cookies() {
  return (
    <>
      <SEOHead title="Cookie Policy" description="How cookies are used in Farols" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-display font-bold">Cookie Policy</h1>
        <p className="text-gray-300">
          We use essential cookies for authentication and security, and lightweight analytics cookies
          to understand feature usage and improve editorial products.
        </p>
        <p className="text-gray-300">
          You can control cookie behavior from your browser settings.
        </p>
      </div>
    </>
  );
}
