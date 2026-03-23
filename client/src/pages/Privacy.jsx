import SEOHead from '../components/SEOHead.jsx';

export default function Privacy() {
  return (
    <>
      <SEOHead title="Privacy Policy" description="How Farols handles personal data" />
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
        <p className="text-gray-300">
          Farols collects minimal account and usage data to operate the platform, secure sessions,
          and improve story recommendations. We do not sell personal data.
        </p>
        <p className="text-gray-300">
          You may request account deletion or data export by contacting support via the contact page.
        </p>
      </div>
    </>
  );
}
