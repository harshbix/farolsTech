import sanitizeHtml from 'sanitize-html';

export function sanitizePlainText(value, maxLength = 5000) {
  const cleaned = sanitizeHtml(String(value ?? ''), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  return cleaned.slice(0, maxLength);
}

export function sanitizeRichHtml(value) {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 'blockquote', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'a', 'img',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
