import React from 'react';
import { useTranslation } from 'react-i18next';
import RatingWidget from './RatingWidget';
import './ReviewsList.css';

/**
 * ReviewsList - Display list of reviews
 * @param {array} reviews - Array of review objects
 * @param {boolean} loading - Whether reviews are loading
 * @param {number} limit - Optional limit for number of reviews to show
 */
const ReviewsList = ({ reviews = [], loading = false, limit }) => {
  const { t } = useTranslation();

  const displayReviews = limit ? reviews.slice(0, limit) : reviews;

  if (loading) {
    return (
      <div className="reviews-list loading">
        <p>{t('common.loading')}...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-list empty">
        <p>{t('rating.noReviews')}</p>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      {displayReviews.map((review) => (
        <div key={review.id} className="review-item">
          <div className="review-header">
            <div className="review-author">
              {review.user_profile_picture && (
                <img
                  src={review.user_profile_picture}
                  alt={review.username}
                  className="author-avatar"
                />
              )}
              {!review.user_profile_picture && (
                <div className="author-avatar-placeholder">
                  {review.username.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="author-name">{review.username}</span>
            </div>
            <div className="review-rating">
              <RatingWidget rating={review.rating} size="small" />
            </div>
          </div>

          <div className="review-content">
            <p>{review.review_text}</p>
          </div>

          <div className="review-footer">
            <span className="review-date">
              {new Date(review.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewsList;
