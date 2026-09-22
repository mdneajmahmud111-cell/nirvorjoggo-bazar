export function StarRating({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className={`${size} tracking-tight text-amber-500`} aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {"★".repeat(rounded)}
      <span className="text-gray-300">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}
