import SEOHead from '../components/SEOHead.jsx';

export default function About() {
  return (
    <>
      <SEOHead title="About" description="About Farols newsroom" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <section>
          <h1 className="text-3xl font-display font-bold mb-3">About Farols</h1>
          <p className="text-gray-300 leading-relaxed">
            Farols is a digital-first East African newsroom focused on timely reporting, clear context,
            and useful journalism. We publish with a mobile-first mindset and prioritize clarity, speed,
            and trust in every story.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-display font-semibold mb-3">Editorial Principles</h2>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Verify before publishing.</li>
            <li>Clearly label updates and corrections.</li>
            <li>Protect readers from misinformation and harmful manipulation.</li>
          </ul>
        </section>

        <section id="credits" className="card p-5">
          <h2 className="text-2xl font-display font-semibold mb-2">Credits</h2>
          <p className="text-gray-300">
            Product and implementation credits: Junior Jeconia.
          </p>
        </section>
      </div>
    </>
  );
}
