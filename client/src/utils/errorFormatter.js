/**
 * Safely extract error message from various error formats
 * Handles API errors, validation errors, and plain objects
 */
export function getErrorMessage(error, defaultMessage = 'Something went wrong') {
  if (!error) return defaultMessage;

  // If it's a string, return it
  if (typeof error === 'string') return error;

  // Handle Axios error response
  if (error.response?.data) {
    const data = error.response.data;
    
    // If data.error is a string, use it
    if (typeof data.error === 'string') return data.error;
    
    // If data.error is an object with message property
    if (data.error && typeof data.error === 'object' && data.error.message) {
      return data.error.message;
    }
    
    // If data has a message property directly
    if (typeof data.message === 'string') return data.message;
    
    // If data has validation errors
    if (data.validation && typeof data.validation === 'object') {
      const firstError = Object.values(data.validation)[0];
      if (typeof firstError === 'string') return firstError;
      if (Array.isArray(firstError) && firstError[0]) return firstError[0];
    }
  }

  // Handle network errors
  if (error.message) return error.message;

  // Fallback to default
  return defaultMessage;
}

/**
 * Format validation errors into a readable message
 */
export function formatValidationErrors(validation) {
  if (!validation || typeof validation !== 'object') return 'Validation error';

  const errors = Object.entries(validation)
    .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg[0] : msg}`)
    .slice(0, 2)
    .join(', ');

  return errors || 'Validation error';
}
