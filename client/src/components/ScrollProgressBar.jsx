import { useEffect, useState } from 'react';

export default function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = window.scrollY;
      const scrollPercent = windowHeight > 0 ? (scrolled / windowHeight) * 100 : 0;
      setProgress(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="progress-bar"
      style={{
        width: `${progress}%`,
        opacity: progress > 0.5 ? 1 : 0,
        transition: 'opacity 0.3s ease-out',
      }}
      aria-label={`Page scroll progress: ${Math.round(progress)}%`}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin="0"
      aria-valuemax="100"
    />
  );
}
