import { useEffect, useState } from 'react';
import SEOHead from '../components/SEOHead.jsx';

const TOPICS = ['ai', 'security', 'cloud', 'mobile', 'dev', 'startup'];

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('newsAlertSettings') || '{}');
  } catch {
    return {};
  }
}

export default function NewsAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState(() => TOPICS.reduce((acc, topic) => ({ ...acc, [topic]: true }), {}));
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');

  useEffect(() => {
    const saved = loadSettings();
    setEnabled(Boolean(saved.enabled));
    setEmail(saved.email || '');
    setTopics((prev) => ({ ...prev, ...(saved.topics || {}) }));
  }, []);

  const save = (next) => {
    localStorage.setItem('newsAlertSettings', JSON.stringify(next));
  };

  const toggleTopic = (topic) => {
    const nextTopics = { ...topics, [topic]: !topics[topic] };
    setTopics(nextTopics);
    save({ enabled, email, topics: nextTopics });
  };

  const toggleEnabled = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    save({ enabled: nextEnabled, email, topics });
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const testPush = () => {
    if (typeof Notification === 'undefined' || permission !== 'granted') return;
    new Notification('Farols Alerts', {
      body: 'Test alert: your topic preferences are active.',
      icon: '/favicon.ico',
    });
  };

  const saveEmail = () => {
    save({ enabled, email, topics });
  };

  return (
    <>
      <SEOHead title="News Alerts" description="Manage push and email alerts for external tech topics" />
      <section className="max-w-3xl mx-auto px-4 py-10" aria-label="News alert settings">
        <h1 className="text-3xl font-display font-bold mb-2">News Alerts</h1>
        <p className="text-[rgb(var(--text-secondary))] mb-6">Enable push and email alerts by topic.</p>

        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="m-0 font-semibold">Alerts Enabled</p>
              <p className="m-0 text-sm text-[rgb(var(--text-secondary))]">Turn personalized external news notifications on or off.</p>
            </div>
            <button type="button" className="btn-primary icon-btn" onClick={toggleEnabled} aria-label="Toggle alerts">
              <span aria-hidden="true">{enabled ? '✅' : '⛔'}</span>
              <span className="icon-label">{enabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        <div className="card p-5 mb-4">
          <p className="m-0 font-semibold mb-3">Push Notifications</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost icon-btn" onClick={requestPushPermission} aria-label="Request browser notification permission">
              <span aria-hidden="true">🔔</span>
              <span className="icon-label">Enable Push</span>
            </button>
            <button type="button" className="btn-ghost icon-btn" onClick={testPush} disabled={permission !== 'granted'} aria-label="Send test notification">
              <span aria-hidden="true">🧪</span>
              <span className="icon-label">Test</span>
            </button>
          </div>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-3 mb-0">Browser permission: {permission}</p>
        </div>

        <div className="card p-5 mb-4">
          <p className="m-0 font-semibold mb-3">Email Alerts</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className="btn-primary icon-btn" onClick={saveEmail} aria-label="Save email alerts">
              <span aria-hidden="true">✉️</span>
              <span className="icon-label">Save</span>
            </button>
          </div>
        </div>

        <div className="card p-5">
          <p className="m-0 font-semibold mb-3">Topic Preferences</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className="btn-ghost"
                onClick={() => toggleTopic(topic)}
                aria-label={`Toggle ${topic} alerts`}
              >
                <span aria-hidden="true">{topics[topic] ? '🟢' : '⚪'}</span>
                <span className="icon-label">{topic}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
