import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
}

const StarRating = ({ rating, size = 12, showNumber = true }: StarRatingProps) => {
  return (
    <div className="flex items-center gap-1">
      <Star
        size={size}
        className="fill-yellow-400 text-yellow-400"
      />
      {showNumber && (
        <span className="text-xs text-muted-foreground font-medium">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;
