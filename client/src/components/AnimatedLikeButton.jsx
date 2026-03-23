import { motion } from 'framer-motion';
import { springPresets } from '../utils/animations.js';

/**
 * Animated Like Button with Spring Physics
 * Provides satisfying feedback on like/unlike action
 */
export default function AnimatedLikeButton({
  liked,
  count,
  label,
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`btn transition-all duration-200 ${
        liked 
          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
          : 'btn-ghost hover:text-red-400'
      } ${className}`}
    >
      <motion.span
        key={liked ? 'liked' : 'unliked'}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={springPresets.bouncy}
        className="text-lg"
      >
        ♥
      </motion.span>
      <span>{count}</span>
      <span>{label}</span>
    </motion.button>
  );
}
