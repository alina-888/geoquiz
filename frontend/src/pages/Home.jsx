import React, { useEffect, useState } from 'react';
import { getQuizzes } from '../api/api';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTranslatedText } from '../utils/translations';

export default function Home() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    getQuizzes()
      .then(data => {
        setQuizzes(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading quizzes:', error);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center mt-4">{t('home.loading')}</p>;

  return (
    <div className="container mt-4">
      {/* Заголовок и кнопка */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold">{t('home.title')}</h1>
        <Link to="/quizzes/create/" className="btn btn-success">
          {t('home.createQuiz')}
        </Link>
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
