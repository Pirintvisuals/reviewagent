export function StatusBadge({ status }) {
  const config = {
    pending:     { label: 'Pending',     className: 'bg-yellow-100 text-yellow-800' },
    scheduled:   { label: 'Scheduled',   className: 'bg-orange-100 text-orange-800' },
    review_sent: { label: 'Awaiting Reply', className: 'bg-blue-100 text-blue-800' },
    completed:   { label: 'Completed',   className: 'bg-green-100 text-green-800' },
  };

  const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function RatingBadge({ rating }) {
  if (rating === null || rating === undefined) {
    return <span className="text-xs text-gray-400 italic">No response</span>;
  }

  const color = rating >= 8 ? 'text-green-600' : rating >= 6 ? 'text-yellow-600' : 'text-red-600';
  const stars = '★'.repeat(Math.round(rating / 2)) + '☆'.repeat(5 - Math.round(rating / 2));

  return (
    <span className={`text-sm font-semibold ${color}`}>
      {stars} {rating}/10
    </span>
  );
}
