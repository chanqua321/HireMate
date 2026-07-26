import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarWidgetProps {
  initialRating?: number;
  onRate?: (rating: number) => void;
  readOnly?: boolean;
}

export const StarWidget: React.FC<StarWidgetProps> = ({
  initialRating = 0,
  onRate,
  readOnly = false,
}) => {
  const [rating, setRating] = useState<number>(initialRating);
  const [hover, setHover] = useState<number>(0);

  const handleRate = (val: number) => {
    if (readOnly) return;
    setRating(val);
    if (onRate) onRate(val);
  };

  return (
    <div className="star-widget" style={{ display: 'inline-flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => handleRate(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: readOnly ? 'default' : 'pointer',
              padding: '2px',
              color: active ? '#F59E0B' : '#CBD5E1',
              transition: 'transform 0.15s ease, color 0.15s ease',
            }}
            aria-label={`Đánh giá ${star} sao`}
          >
            <Star
              size={20}
              fill={active ? '#F59E0B' : 'transparent'}
              strokeWidth={2}
            />
          </button>
        );
      })}
    </div>
  );
};
