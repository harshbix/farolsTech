import { motion } from 'framer-motion';

/**
 * Animated Card Component
 * Provides hover lift effect with smooth spring animation
 */
export default function AnimatedCard({
  children,
  className = '',
  whilehover = { y: -4, transition: { duration: 0.2 } },
  onClick = null,
}) {
  return (
    <motion.div
      whileHover={whilehover}
      onClick={onClick}
      className={className}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {children}
    </motion.div>
  );
}
