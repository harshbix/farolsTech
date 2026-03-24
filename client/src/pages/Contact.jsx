import { useState } from 'react';
import toast from 'react-hot-toast';
import SEOHead from '../components/SEOHead.jsx';

export default function Contact() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const WHATSAPP_NUMBER = '255755063711';

  function onSubmit(event) {
    event.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error('Please provide your name and message');
      return;
    }

    const text = `Hello Farols, my name is ${name.trim()}.\n\n${message.trim()}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    toast.success('Opening WhatsApp...');
    setName('');
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
          <p className="text-sm text-gray-300 mt-1">WhatsApp: +255 755 063 711</p>
          <p className="text-sm text-gray-300 mt-1">Location: Dar es Salaam, Tanzania</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <input
            type="text"
            placeholder="Your name"
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea
            placeholder="Your message"
            className="input w-full min-h-36"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Send via WhatsApp</button>
        </form>
      </div>
    </>
  );
}
