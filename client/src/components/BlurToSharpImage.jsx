import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * BlurToSharp Image Component
 * Progressive image loading: blur → sharp
 * Shows low-quality placeholder while high-quality loads
 */
export default function BlurToSharpImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  blurDataUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3C/svg%3E',
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Blurred placeholder */}
      <motion.img
        src={blurDataUrl}
        alt={alt}
        className={`${className} blur-lg`}
        initial={{ opacity: 1 }}
        animate={{ opacity: isLoaded ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        aria-hidden="true"
      />

      {/* Actual image */}
      <motion.img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        loading="lazy"
      />
    </div>
  );
}
