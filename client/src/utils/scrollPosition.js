import { useEffect } from 'react';

/**
 * Scroll Position Memory
 * Saves and restores scroll positions for visited pages
 */

const scrollPositions = new Map();

/**
 * Save scroll position for a route
 * @param {string} route - Route path
 * @param {number} position - Scroll Y position
 */
export function saveScrollPosition(route, position = window.scrollY) {
  scrollPositions.set(route, position);
}

/**
 * Get saved scroll position for a route
 * @param {string} route - Route path
 * @returns {number} Saved scroll position or 0
 */
export function getScrollPosition(route) {
  return scrollPositions.get(route) || 0;
}

/**
 * Clear scroll position for a route
 * @param {string} route - Route path
 */
export function clearScrollPosition(route) {
  scrollPositions.delete(route);
}

/**
 * Clear all scroll positions
 */
export function clearAllScrollPositions() {
  scrollPositions.clear();
}

/**
 * Hook to manage scroll position on route changes
 * Usage in component:
 * useScrollRestoration(location.pathname);
 */
export function useScrollRestoration(pathname) {
  useEffect(() => {
    // Save current position before component unmounts
    return () => {
      saveScrollPosition(pathname);
    };
  }, [pathname]);

  useEffect(() => {
    // Restore scroll position when component mounts
    const savedPosition = getScrollPosition(pathname);
    window.scrollTo(0, savedPosition);
  }, [pathname]);
}
