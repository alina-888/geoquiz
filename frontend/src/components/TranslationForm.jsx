import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Reusable component for managing translations
 * Supports multiple languages and multiple fields per translation
 *
 * @param {Object} props
 * @param {Array} props.translations - Array of translation objects: { language, ...fields }
 * @param {Function} props.onChange - Callback when translations change
 * @param {Array} props.fields - Array of field configs: { name, label, type, required, multiline }
 * @param {Array} props.languages - Available languages (defaults to ['en', 'ru', 'sr'])
 * @param {string} props.defaultLanguage - The default language to exclude from translation options
 */
export default function TranslationForm({ translations = [], onChange, fields = [], languages = ['en', 'ru', 'sr'], defaultLanguage = null }) {
  const { t } = useTranslation();

  const languageNames = {
    en: 'English',
    ru: 'Русский',
    sr: 'Srpski'
  };

  // Filter out the default language from available languages
  const availableLanguages = defaultLanguage
    ? languages.filter(lang => lang !== defaultLanguage)
    : languages;

  // Get translation for specific language or create empty one
  const getTranslation = (lang) => {
    const existing = translations.find(tr => tr.language === lang);
    if (existing) return existing;

    // Create empty translation with all fields
    const empty = { language: lang };
    fields.forEach(field => {
      empty[field.name] = '';
    });
    return empty;
  };

  // Update translation for specific language
  const updateTranslation = (lang, fieldName, value) => {
    const updatedTranslations = [...translations];
    const index = updatedTranslations.findIndex(tr => tr.language === lang);

    if (index >= 0) {
      // Update existing translation
      updatedTranslations[index] = {
        ...updatedTranslations[index],
        [fieldName]: value
      };
    } else {
      // Add new translation
      const newTranslation = { language: lang };
      fields.forEach(field => {
        newTranslation[field.name] = field.name === fieldName ? value : '';
      });
      updatedTranslations.push(newTranslation);
    }

    onChange(updatedTranslations);
  };

  return (
    <div className="card mt-3">
      <div className="card-body">
        <h5 className="card-title mb-3">
          {t('translations.title')} <small className="text-muted">{t('translations.optional')}</small>
        </h5>
        <p className="text-muted small mb-3">{t('translations.description')}</p>

        {availableLanguages.length === 0 ? (
          <p className="text-muted">{t('translations.noLanguagesAvailable')}</p>
        ) : availableLanguages.map(lang => {
          const translation = getTranslation(lang);

          return (
            <div key={lang} className="border rounded p-3 mb-3">
              <h6 className="mb-3">
                <span className="badge bg-secondary me-2">{lang.toUpperCase()}</span>
                {languageNames[lang]}
              </h6>

              {fields.map(field => (
                <div key={field.name} className="mb-3">
                  <label className="form-label">
                    {field.label}
                    {field.required && <span className="text-danger">*</span>}
                  </label>
                  {field.multiline ? (
                    <textarea
                      className="form-control"
                      value={translation[field.name] || ''}
                      onChange={(e) => updateTranslation(lang, field.name, e.target.value)}
                      rows={field.rows || 3}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className="form-control"
                      value={translation[field.name] || ''}
                      onChange={(e) => updateTranslation(lang, field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
