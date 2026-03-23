/**
 * Calculate reading time in minutes
 * Average reading speed: 200 words per minute
 * @param {string} contentJson - JSON content from editor
 * @returns {number} Reading time in minutes
 */
export function calculateReadingTime(contentJson) {
  if (!contentJson) return 0;

  try {
    const content = JSON.parse(contentJson);
    const wordCount = countWords(content);
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    return readingTime;
  } catch {
    return 0;
  }
}

function countWords(node) {
  let count = 0;

  if (node.type === 'text') {
    count = (node.text || '').split(/\s+/).length;
  } else if (node.content && Array.isArray(node.content)) {
    count = node.content.reduce((acc, child) => acc + countWords(child), 0);
  }

  return count;
}

/**
 * Format reading time for display
 * @param {number} minutes - Reading time in minutes
 * @returns {string} Formatted string (e.g., "5 min read")
 */
export function formatReadingTime(minutes) {
  if (minutes <= 1) return '< 1 min read';
  if (minutes > 500) return 'Long read';
  return `${minutes} min read`;
}
