import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'ru', name: 'Русский', flag: 'RU' },
    { code: 'sr', name: 'Srpski', flag: 'SR' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2"
        type="button"
        id="languageDropdown"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        <Globe size={18} />
        <span>{currentLanguage.flag}</span>
      </button>
      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="languageDropdown">
        {languages.map((lang) => (
          <li key={lang.code}>
            <button
              className={`dropdown-item ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
            >
              {lang.flag} - {lang.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
