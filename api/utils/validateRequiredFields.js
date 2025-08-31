import { errorHandler } from './error.js';

/**
 * Ensures that every provided field has a value.
 * Throws a 400 error listing missing field names.
 *
 * @param {Record<string, any>} fields - key/value pairs to validate.
 */
export function validateRequiredFields(fields) {
  const missing = Object.entries(fields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);

  if (missing.length > 0) {
    throw errorHandler(400, `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
  }
}
