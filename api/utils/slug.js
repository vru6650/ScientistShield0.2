/**
 * Convert a string into a URL friendly slug.
 *
 * The function performs the following operations:
 * - trims surrounding whitespace
 * - converts all characters to lower case
 * - removes any character that is not alphanumeric, a space or a hyphen
 * - replaces consecutive whitespace characters with a single hyphen
 * - collapses multiple hyphens into one
 * - trims leading or trailing hyphens
 *
 * @param {string} title - The text to transform.
 * @returns {string} A slugified representation of the provided title.
 */
export function generateSlug(title) {
    if (typeof title !== 'string') {
        throw new TypeError('Title must be a string');
    }

    const trimmed = title.trim();
    if (trimmed === '') {
        return '';
    }

    return trimmed
        .toLowerCase()
        // Remove all characters except letters, numbers, spaces and hyphens
        .replace(/[^a-z0-9\s-]/g, '')
        // Convert remaining whitespace to hyphens
        .replace(/\s+/g, '-')
        // Collapse multiple hyphens into a single hyphen
        .replace(/-+/g, '-')
        // Remove any leading or trailing hyphens
        .replace(/^-+|-+$/g, '');
}