import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './RatingWidget.css';

/**
 * RatingWidget - Interactive star rating component
 * @param {number} rating - Current rating value (1-5)
 * @param {function} onRate - Callback when user clicks a star (optional, for interactive mode)
 * @param {boolean} interactive - Whether stars are clickable
 * @param {string} size - Size variant: 'small', 'medium', 'large'
 */
const RatingWidget = ({ rating = 0, onRate, interactive = false, size = 'medium' }) => {
  const { t } = useTranslation();
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleStarClick = (starValue) => {
    if (interactive && onRate) {
      onRate(starValue);
    }
  };

  const displayRating = hoveredStar || rating;

  return (
    <div className={`rating-widget ${interactive ? 'interactive' : ''} size-${size}`}>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((starValue) => (
          <span
            key={starValue}
            className={`star ${starValue <= displayRating ? 'filled' : ''}`}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => interactive && setHoveredStar(starValue)}
            onMouseLeave={() => interactive && setHoveredStar(0)}
            role={interactive ? 'button' : 'presentation'}
            aria-label={interactive ? t('rating.star', { value: starValue }) : undefined}
          >
            ★
          </span>
        ))}
      </div>
      {rating > 0 && !interactive && (
        <span className="rating-value">{rating.toFixed(1)}</span>
      )}
    </div>
  );
};

export default RatingWidget;
