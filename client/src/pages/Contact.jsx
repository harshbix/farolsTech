import { useState } from 'react';
import toast from 'react-hot-toast';
import SEOHead from '../components/SEOHead.jsx';

export default function Contact() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function onSubmit(event) {
    event.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error('Please provide email and message');
      return;
    }
    toast.success('Message captured. Our editorial team will follow up soon.');
    setEmail('');
    setMessage('');
  }

  return (
    <>
      <SEOHead title="Contact" description="Get in touch with Farols" />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Contact</h1>
        <p className="text-gray-400 mb-8">Questions, corrections, partnerships, or support requests.</p>

        <div className="card p-6 mb-6">
          <p className="text-sm text-gray-300">Email: editorial@farols.news</p>
          <p className="text-sm text-gray-300 mt-1">Phone: +255 700 000 000</p>
          <p className="text-sm text-gray-300 mt-1">Location: Dar es Salaam, Tanzania</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <input
            type="email"
            placeholder="Your email"
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            placeholder="How can we help?"
            className="input w-full min-h-36"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button type="submit" className="btn-primary">Send message</button>
        </form>
      </div>
    </>
  );
}
