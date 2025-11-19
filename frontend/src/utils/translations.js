/**
 * Utility functions for handling translated content
 */

/**
 * Get translated text based on current language
 * Falls back to original text if translation not available
 *
 * @param {Object} item - The item with translations array
 * @param {string} field - The field name to translate
 * @param {string} currentLanguage - Current language code (en, ru, sr)
 * @returns {string} - Translated text or original text
 */
export function getTranslatedText(item, field, currentLanguage) {
  // If no item or no field value, return empty string
  if (!item || !item[field]) return '';

  // If no translations available, return original
  if (!item.translations || item.translations.length === 0) {
    return item[field];
  }

  // Find translation for current language
  const translation = item.translations.find(t => t.language === currentLanguage);

  // Return translated text if available, otherwise fall back to original
  return translation && translation[field] ? translation[field] : item[field];
}

/**
 * Get all translated fields for an item
 *
 * @param {Object} item - The item with translations
 * @param {Array} fields - Array of field names to translate
 * @param {string} currentLanguage - Current language code
 * @returns {Object} - Object with translated fields
 */
export function getTranslatedFields(item, fields, currentLanguage) {
  const result = {};

  fields.forEach(field => {
    result[field] = getTranslatedText(item, field, currentLanguage);
  });

  return result;
}
