import SEOHead from '../components/SEOHead.jsx';

export default function Terms() {
  return (
    <>
      <SEOHead title="Terms of Service" description="Terms for using Farols platform" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-display font-bold">Terms of Service</h1>
        <p className="text-gray-300">
          By using Farols, you agree to use the platform lawfully and avoid posting content that is
          abusive, deceptive, or violates intellectual property rights.
        </p>
        <p className="text-gray-300">
          We may remove content that breaches policy and suspend accounts for repeated violations.
        </p>
      </div>
    </>
  );
}
