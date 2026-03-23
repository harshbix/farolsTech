import { motion } from 'framer-motion';

/**
 * Page transition animation wrapper
 * Fade in/out effect for page changes
 */
export const PageTransition = ({ children, key }) => (
  <motion.div
    key={key}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{
      duration: 0.3,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.div>
);

/**
 * Spring animation presets
 * Use these for consistent motion throughout the app
 */
export const springPresets = {
  gentle: {
    type: 'spring',
    damping: 25,
    stiffness: 300,
    mass: 1,
  },
  bouncy: {
    type: 'spring',
    damping: 15,
    stiffness: 300,
    mass: 1,
  },
  snappy: {
    type: 'spring',
    damping: 20,
    stiffness: 400,
    mass: 0.8,
  },
};

/**
 * Common motion variants
 */
export const motionVariants = {
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.2, ease: 'easeOut' },
    },
  },
  slideInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  },
  slideInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.3 },
    },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  },
};
