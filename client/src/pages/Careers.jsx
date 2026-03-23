import SEOHead from '../components/SEOHead.jsx';

export default function Careers() {
  return (
    <>
      <SEOHead title="Careers" description="Join the Farols team" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
        <h1 className="text-3xl font-display font-bold">Careers</h1>
        <p className="text-gray-300">
          We are building a modern newsroom stack for East Africa. Open roles will be posted here.
        </p>
        <p className="text-gray-300">For general interest, email careers@farols.news.</p>
      </div>
    </>
  );
}
