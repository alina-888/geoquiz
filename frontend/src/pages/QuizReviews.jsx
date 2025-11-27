import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getQuizDetail, getReviews, getRatingSummary } from '../api/api';
import { useTranslation } from 'react-i18next';
import RatingWidget from '../components/RatingWidget';
import ReviewsList from '../components/ReviewsList';
import './QuizReviews.css';

export default function QuizReviews() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // Fetch quiz details
    getQuizDetail(id)
      .then(setQuiz)
      .catch(err => setError(err.message));

    // Fetch rating summary
    getRatingSummary(id)
      .then(setRatingSummary)
      .catch(err => console.error('Failed to load ratings:', err));
  }, [id]);

  useEffect(() => {
    // Fetch reviews
    setLoading(true);
    getReviews(id, { page, page_size: 20 })
      .then(data => {
        const newReviews = data.results || data;
        setReviews(prev => page === 1 ? newReviews : [...prev, ...newReviews]);
        setHasMore(!!data.next);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id, page]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  if (error) return <div className="container mt-4"><div className="alert alert-danger">{error}</div></div>;
  if (!quiz || !ratingSummary) return <div className="container mt-4">{t('common.loading')}...</div>;

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div className="mb-4">
        <Link to={`/quizzes/${id}`} className="btn btn-link text-decoration-none ps-0">
          <ArrowLeft size={16} className="me-1" /> {t('common.back')}
        </Link>
        <h2>{quiz.title}</h2>
        <p className="text-muted">{t('rating.allReviews')}</p>
      </div>

      {/* Rating Summary Card */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="rating-summary-large">
            <div className="rating-number">
              <div className="avg-rating">{ratingSummary.avg_rating.toFixed(1)}</div>
              <RatingWidget rating={ratingSummary.avg_rating} size="medium" />
              <div className="total-ratings">{ratingSummary.total_ratings} {t('rating.ratings')}</div>
            </div>

            <div className="rating-distribution">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingSummary.distribution[star] || 0;
                const percentage = ratingSummary.total_ratings > 0
                  ? (count / ratingSummary.total_ratings) * 100
                  : 0;

                return (
                  <div key={star} className="distribution-row">
                    <span className="star-label">{star} ★</span>
                    <div className="distribution-bar">
                      <div
                        className="distribution-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="star-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="card">
        <div className="card-body">
          <h5 className="mb-3">{t('rating.reviews')}</h5>
          <ReviewsList reviews={reviews} loading={loading && page === 1} />

          {hasMore && !loading && (
            <div className="text-center mt-3">
              <button className="btn btn-outline-primary" onClick={loadMore}>
                {t('common.loadMore')}
              </button>
            </div>
          )}

          {loading && page > 1 && (
            <div className="text-center mt-3">
              <span>{t('common.loading')}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
