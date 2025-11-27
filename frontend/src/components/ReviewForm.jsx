import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RatingWidget from './RatingWidget';
import './ReviewForm.css';

/**
 * ReviewForm - Form for submitting ratings and reviews
 * @param {number} existingRating - User's existing rating (if any)
 * @param {string} existingReview - User's existing review text (if any)
 * @param {function} onSubmit - Callback with {rating, reviewText}
 * @param {function} onCancel - Callback when cancel is clicked
 * @param {boolean} loading - Whether submission is in progress
 */
const ReviewForm = ({ existingRating = 0, existingReview = '', onSubmit, onCancel, loading = false }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingRating);
  const [reviewText, setReviewText] = useState(existingReview);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert(t('rating.selectRating'));
      return;
    }
    onSubmit({ rating, review_text: reviewText.trim() });
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>{t('rating.yourRating')}</label>
        <RatingWidget rating={rating} onRate={setRating} interactive size="large" />
        {rating > 0 && <span className="rating-label">{rating}/5</span>}
      </div>

      <div className="form-group">
        <label htmlFor="review-text">{t('rating.reviewOptional')}</label>
        <textarea
          id="review-text"
          className="form-control"
          rows="4"
          placeholder={t('rating.reviewPlaceholder')}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          disabled={loading}
        />
        <small className="form-text">{t('rating.reviewHint')}</small>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading || rating === 0}>
          {loading ? t('common.loading') : t('rating.submitRating')}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

export default ReviewForm;
