import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Edit2, Trash2, MapPin, Image, Music, Video } from 'lucide-react';
import { getQuizDetail, startQuiz, deleteQuiz, deleteQuestion, getRatingSummary, getReviews, submitRating } from '../api/api';
import { useTranslation } from 'react-i18next';
import { getTranslatedText } from '../utils/translations';
import { getAvatarGradient } from '../utils/avatarUtils';
import RatingWidget from '../components/RatingWidget';
import ReviewsList from '../components/ReviewsList';
import ReviewForm from '../components/ReviewForm';

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const username = localStorage.getItem('auth.username');
  const { t, i18n } = useTranslation();

  // Rating and review state
  const [ratingSummary, setRatingSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [existingReview, setExistingReview] = useState('');

  useEffect(() => {
    setLoading(true);
    getQuizDetail(id)
      .then((data) => {
        console.log('Quiz data:', data); // Debug: check creator structure
        setQuiz(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t('quiz.detail.failedToLoad'));
        setLoading(false);
      });

    // Fetch rating summary and reviews
    getRatingSummary(id)
      .then(setRatingSummary)
      .catch(err => console.error('Failed to load ratings:', err));

    getReviews(id, { page_size: 3 })
      .then(data => {
        setReviews(data.results || data);
        // Check if there are more reviews beyond the first 3
        setHasMoreReviews(!!data.next);
      })
      .catch(err => console.error('Failed to load reviews:', err));
  }, [id, t]);

  const onStart = async () => {
    try {
      await startQuiz(id);
      navigate(`/quizzes/${id}/start/`);
    } catch (err) {
      setError(err.message || t('quiz.detail.failedToStart'));
    }
  };

  const handleDelete = async () => {
    const questionCount = quiz.questions?.length || 0;
    const confirmMessage = questionCount > 0
      ? t('quiz.detail.deleteWithQuestions', { count: questionCount })
      : t('quiz.detail.deleteConfirm');

    if (window.confirm(confirmMessage)) {
      try {
        await deleteQuiz(id);
        navigate('/');
      } catch (err) {
        setError(err.message || t('quiz.detail.failedToDelete'));
      }
    }
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    if (window.confirm(t('quiz.detail.deleteQuestionConfirm', { text: questionText.substring(0, 50) }))) {
      try {
        await deleteQuestion(questionId);
        // Refresh quiz data
        const updated = await getQuizDetail(id);
        setQuiz(updated);
      } catch (err) {
        setError(err.message || t('quiz.detail.failedToDeleteQuestion'));
      }
    }
  };

  const handleSubmitRating = async (data) => {
    setSubmittingRating(true);
    try {
      await submitRating(id, data);
      // Refresh rating summary, reviews, and quiz data
      const summary = await getRatingSummary(id);
      setRatingSummary(summary);
      const reviewsData = await getReviews(id, { page_size: 3 });
      setReviews(reviewsData.results || reviewsData);
      setHasMoreReviews(!!reviewsData.next);
      // Refresh quiz to update avg_rating and total_ratings display
      const updatedQuiz = await getQuizDetail(id);
      setQuiz(updatedQuiz);
      setShowReviewForm(false);
      setExistingReview('');
      setError('');
    } catch (err) {
      setError(err.message || t('rating.submitError'));
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleEditRating = () => {
    // Use existing review text from rating summary
    setExistingReview(ratingSummary.user_review_text || '');
    setShowReviewForm(true);
  };

  if (loading) return <div className="p-4">{t('quiz.detail.loading')}</div>;
  if (error) return <div className="p-4 alert alert-danger">{error}</div>;
  if (!quiz) return null;

  // Check if current user is the creator
  const isCreator = quiz.creator_username && quiz.creator_username === username;

  console.log('Current user:', username); // Debug
  console.log('Quiz creator_username:', quiz.creator_username); // Debug
  console.log('Is creator?', isCreator); // Debug

  return (
    <div className="container mt-4" style={{ maxWidth: '700px' }}>
      <div className="card">
        {quiz.image_url && (
          <img
            src={quiz.image_url}
            alt={quiz.title}
            className="card-img-top"
            style={{ maxHeight: '300px', objectFit: 'cover' }}
          />
        )}
        <div className="card-body">
          <h1 className="card-title h4 mb-2">{getTranslatedText(quiz, 'title', i18n.language)}</h1>

          {/* Author display */}
          {quiz.creator_username && (
            <div className="d-flex align-items-center gap-2 mb-3">
              <Link
                to={`/profile/${quiz.creator_username}`}
                className="d-flex align-items-center gap-2 text-decoration-none"
              >
                {quiz.creator_profile_picture ? (
                  <img
                    src={quiz.creator_profile_picture}
                    alt={quiz.creator_username}
                    className="rounded-circle"
                    style={{ width: '32px', height: '32px', objectFit: 'cover', border: '2px solid #e0e0e0' }}
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: getAvatarGradient(quiz.creator_username),
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: '2px solid #e0e0e0'
                    }}
                  >
                    {quiz.creator_username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-muted small">by <strong>{quiz.creator_username}</strong></span>
              </Link>
            </div>
          )}

          <p className="card-text mb-3">{getTranslatedText(quiz, 'description', i18n.language)}</p>
          <div className="mb-3 text-muted">
            {t('quiz.detail.category')}: {t(`categories.${quiz.category}`)} • {t('quiz.detail.difficulty')}: {t(`difficulty.${quiz.difficulty_level}`)}
            {quiz.is_geo && <span className="ms-2 badge bg-info">{t('quiz.detail.geoQuiz')}</span>}
          </div>
          {/* Language badges */}
          <div className="d-flex gap-1 flex-wrap mb-3">
            <span className="badge bg-primary" style={{ fontSize: '0.75rem' }}>
              {quiz.default_language?.toUpperCase() || 'EN'}
            </span>
            {quiz.translations && quiz.translations.map(tr => (
              <span key={tr.language} className="badge border border-primary text-primary bg-white" style={{ fontSize: '0.75rem' }}>
                {tr.language.toUpperCase()}
              </span>
            ))}
          </div>

          {username ? (
            <div className="d-flex gap-2">
              <button onClick={onStart} className="btn btn-primary">{t('quiz.detail.start')}</button>

              {isCreator && (
                <>
                  <Link to={`/quizzes/${id}/edit`} className="btn btn-warning">
                    <Edit2 size={16} className="me-1" style={{ display: 'inline' }} />
                    {t('quiz.detail.edit')}
                  </Link>
                  <button onClick={handleDelete} className="btn btn-danger">
                    <Trash2 size={16} className="me-1" style={{ display: 'inline' }} />
                    {t('quiz.detail.delete')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-outline-primary">{t('quiz.detail.loginToStart')}</Link>
          )}
        </div>
      </div>

      {/* Questions list (for creator only) */}
      {isCreator && quiz.questions && quiz.questions.length > 0 && (
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title mb-3">{t('quiz.detail.questions')} ({quiz.questions.length})</h5>
            <ul className="list-group list-group-flush">
              {quiz.questions.map((q, index) => (
                <li key={q.id} className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="mb-1">
                        <strong>Q{index + 1}:</strong> {q.question_text.length > 80 ? q.question_text.substring(0, 80) + '...' : q.question_text}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <span className="badge bg-secondary">{t(`questionTypes.${q.question_type}`)}</span>
                        <span className="badge bg-primary">{q.points_value} {t('quiz.detail.points')}</span>
                        {q.geolocation && (
                          <span className="badge bg-info">
                            <MapPin size={12} style={{ display: 'inline' }} /> {t('quiz.detail.geo')}
                          </span>
                        )}
                        {/* Show badges for new media_files array */}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'image').length > 0 && (
                          <span className="badge bg-success">
                            <Image size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'image').length} {q.media_files.filter(m => m.media_type === 'image').length > 1 ? t('quiz.detail.images') : t('quiz.detail.image')}
                          </span>
                        )}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'audio').length > 0 && (
                          <span className="badge bg-success">
                            <Music size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'audio').length} {t('quiz.detail.audio')}
                          </span>
                        )}
                        {q.media_files && q.media_files.filter(m => m.media_type === 'video').length > 0 && (
                          <span className="badge bg-success">
                            <Video size={12} style={{ display: 'inline' }} /> {q.media_files.filter(m => m.media_type === 'video').length} {q.media_files.filter(m => m.media_type === 'video').length > 1 ? t('quiz.detail.videos') : t('quiz.detail.video')}
                          </span>
                        )}
                        {/* Fallback for legacy single media */}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'image' && (
                          <span className="badge bg-success">
                            <Image size={12} style={{ display: 'inline' }} /> {t('quiz.detail.image')}
                          </span>
                        )}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'audio' && (
                          <span className="badge bg-success">
                            <Music size={12} style={{ display: 'inline' }} /> {t('quiz.detail.audio')}
                          </span>
                        )}
                        {(!q.media_files || q.media_files.length === 0) && q.media_type === 'video' && (
                          <span className="badge bg-success">
                            <Video size={12} style={{ display: 'inline' }} /> {t('quiz.detail.video')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex gap-2 ms-3">
                      <Link to={`/quizzes/${id}/questions/${q.id}/edit`} className="btn btn-sm btn-outline-warning">
                        <Edit2 size={14} />
                      </Link>
                      <button
                        onClick={() => handleDeleteQuestion(q.id, q.question_text)}
                        className="btn btn-sm btn-outline-danger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Ratings and Reviews Section */}
      {ratingSummary && (
        <div className="card mt-4">
          <div className="card-body">
            <h5 className="card-title mb-3">{t('rating.ratingsReviews')}</h5>

            {/* Rating Summary */}
            <div className="d-flex align-items-center gap-3 mb-4">
              <RatingWidget rating={ratingSummary.avg_rating} size="large" />
              <div>
                <div className="fw-bold">{ratingSummary.avg_rating.toFixed(1)} / 5.0</div>
                <div className="text-muted small">{ratingSummary.total_ratings} {t('rating.ratings')}</div>
              </div>
            </div>

            {/* User's Rating/Review Form (only for non-creators) */}
            {username && !isCreator && (
              <div className="mb-4">
                {!showReviewForm && (
                  <div>
                    {ratingSummary.user_rating ? (
                      <div className="d-flex align-items-center gap-2">
                        <span>{t('rating.yourRating')}:</span>
                        <RatingWidget rating={ratingSummary.user_rating} size="small" />
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleEditRating}
                        >
                          {t('rating.editRating')}
                        </button>
                      </div>
                    ) : ratingSummary.user_has_attempted ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowReviewForm(true)}
                      >
                        {t('rating.rateThisQuiz')}
                      </button>
                    ) : (
                      <div className="alert alert-info">
                        {t('rating.mustAttemptFirst')}
                      </div>
                    )}
                  </div>
                )}
                {showReviewForm && (
                  <ReviewForm
                    existingRating={ratingSummary.user_rating || 0}
                    existingReview={existingReview}
                    onSubmit={handleSubmitRating}
                    onCancel={() => {
                      setShowReviewForm(false);
                      setExistingReview('');
                    }}
                    loading={submittingRating}
                  />
                )}
              </div>
            )}

            {/* Top 3 Reviews */}
            {reviews.length > 0 && (
              <div>
                <h6 className="mb-3">{t('rating.recentReviews')}</h6>
                <ReviewsList reviews={reviews} limit={3} />
                {hasMoreReviews && (
                  <div className="mt-3 text-center">
                    <Link to={`/quizzes/${id}/reviews`} className="btn btn-sm btn-outline-secondary">
                      {t('rating.viewAllReviews')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {reviews.length === 0 && ratingSummary.total_ratings === 0 && !isCreator && (
              <p className="text-muted text-center">{t('rating.noReviews')}</p>
            )}
          </div>
        </div>
      )}

      {/* Add questions button (for creator only) */}
      {isCreator && (
        <div className="mt-3">
          <Link to={`/quizzes/${id}/questions/create/`} className="btn btn-outline-primary">
            {t('quiz.detail.addQuestions')}
          </Link>
        </div>
      )}
    </div>
  );
}
