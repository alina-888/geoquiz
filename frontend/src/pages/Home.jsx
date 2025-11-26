import React, { useEffect, useState, useCallback } from 'react';
import { getQuizzes } from '../api/api';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTranslatedText } from '../utils/translations';
import { Search, X } from 'lucide-react';

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Local state for debounced search
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Get filter values from URL
  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    difficulty_level: searchParams.get('difficulty_level') || '',
    is_geo: searchParams.get('is_geo') || '',
    language: searchParams.get('language') || ''
  };

  // Fetch quizzes based on current filters
  const fetchQuizzes = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.difficulty_level) params.difficulty_level = filters.difficulty_level;
    if (filters.is_geo) params.is_geo = filters.is_geo;
    if (filters.language) params.language = filters.language;

    getQuizzes(params)
      .then(data => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading quizzes:', error);
        setLoading(false);
      });
  }, [filters.search, filters.category, filters.difficulty_level, filters.is_geo, filters.language]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Update a single filter
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v).length;

  if (loading) return <p className="text-center mt-4">{t('home.loading')}</p>;

  const CATEGORIES = ['history', 'landmarks', 'culture', 'nature', 'other'];
  const DIFFICULTIES = [1, 2, 3];
  const LANGUAGES = ['en', 'ru', 'sr'];

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 fw-bold">{t('home.title')}</h1>
        <Link to="/quizzes/create/" className="btn btn-success">
          {t('home.createQuiz')}
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            {/* Search */}
            <div className="col-12 col-md-4">
              <form onSubmit={handleSearchSubmit}>
                <div className="input-group">
                  <span className="input-group-text bg-white"><Search size={18} /></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('home.search')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button type="submit" className="btn btn-outline-secondary">
                    {t('home.searchButton')}
                  </button>
                </div>
              </form>
            </div>

            {/* Category */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
              >
                <option value="">{t('home.allCategories')}</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={filters.difficulty_level}
                onChange={(e) => updateFilter('difficulty_level', e.target.value)}
              >
                <option value="">{t('home.allDifficulties')}</option>
                {DIFFICULTIES.map(diff => (
                  <option key={diff} value={diff}>{t(`difficulty.${diff}`)}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={filters.language}
                onChange={(e) => updateFilter('language', e.target.value)}
              >
                <option value="">{t('home.allLanguages')}</option>
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Geo Toggle */}
            <div className="col-6 col-md-2 d-flex align-items-center">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="geoFilter"
                  checked={filters.is_geo === 'true'}
                  onChange={(e) => updateFilter('is_geo', e.target.checked ? 'true' : '')}
                />
                <label className="form-check-label" htmlFor="geoFilter">
                  {t('home.geoOnly')}
                </label>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <div className="mt-3">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={clearFilters}
              >
                <X size={16} className="me-1" />
                {t('home.clearFilters')} ({activeFilterCount})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Grid */}
      <div className="row g-4">
        {Array.isArray(quizzes?.results ?? quizzes) &&
          (quizzes.results || quizzes).map(quiz => (
            <div key={quiz.id} className="col-12 col-md-6 col-lg-4">
              <Link to={`/quizzes/${quiz.id}/`} className="text-decoration-none">
                <div className="card h-100 shadow-sm" style={{ transition: 'transform 0.2s' }}
                     onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                     onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  {(quiz.thumbnail_url || quiz.image_url) ? (
                    <img
                      src={quiz.thumbnail_url || quiz.image_url}
                      alt={quiz.title}
                      className="card-img-top"
                      style={{ height: '180px', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="card-img-top bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center"
                         style={{ height: '180px' }}>
                      <span className="text-muted">{t('home.noImage')}</span>
                    </div>
                  )}
                  <div className="card-body">
                    <h5 className="card-title">{getTranslatedText(quiz, 'title', i18n.language)}</h5>
                    <p className="card-text text-muted small" style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {getTranslatedText(quiz, 'description', i18n.language) || 'No description'}
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <span className="badge bg-secondary">{t(`categories.${quiz.category}`)}</span>
                      <span className="badge bg-info">{t(`difficulty.${quiz.difficulty_level}`)}</span>
                      {quiz.is_geo && <span className="badge bg-success">Geo</span>}
                    </div>
                    {/* Language badges */}
                    <div className="d-flex gap-1 flex-wrap mt-2">
                      <span className="badge bg-primary bg-opacity-75" style={{ fontSize: '0.7rem' }}>
                        {quiz.default_language?.toUpperCase() || 'EN'}
                      </span>
                      {quiz.translations && quiz.translations.map(tr => (
                        <span key={tr.language} className="badge bg-outline-primary border border-primary text-primary" style={{ fontSize: '0.7rem' }}>
                          {tr.language.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}
