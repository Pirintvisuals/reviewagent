import { useState, useEffect } from 'react';
import { Star, ExternalLink, ChevronDown, ChevronUp, Mail, AlertTriangle, ThumbsUp, Clock } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { RatingBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { getReviews } from '../utils/api';

function ReviewCard({ review }) {
  const [showThread, setShowThread] = useState(false);
  const isNegative = Boolean(review.negativeFlagged);
  const isPositive = !isNegative && review.rating >= 6;
  const noResponse = review.rating === null;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 space-y-3
      ${isNegative ? 'border-red-300' : noResponse ? 'border-gray-200' : 'border-green-200'}`}>
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{review.clientName}</span>
            {isNegative && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle size={10} /> Needs Attention
              </span>
            )}
            {isPositive && review.googleReviewSent && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Google review sent ✓
              </span>
            )}
            {noResponse && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Awaiting response
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {review.jobType} · {new Date(review.jobDate).toLocaleDateString('en-GB')}
          </p>
        </div>
        <div className="flex-shrink-0">
          <RatingBadge rating={review.rating} />
        </div>
      </div>

      {/* Feedback */}
      {review.feedbackText && (
        <div className={`px-3 py-2 rounded-lg text-sm italic
          ${isNegative ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
          "{review.feedbackText}"
        </div>
      )}

      {/* Email thread toggle */}
      {review.emailThread && review.emailThread.length > 0 && (
        <div>
          <button
            onClick={() => setShowThread(!showThread)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 min-h-0"
          >
            <Mail size={13} />
            {review.emailThread.length} message{review.emailThread.length > 1 ? 's' : ''}
            {showThread ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showThread && (
            <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
              {review.emailThread.map((email, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold
                      ${email.direction === 'outbound' ? 'text-green-600' : 'text-blue-600'}`}>
                      {email.direction === 'outbound' ? '→ You' : '← Client'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(email.sentAt || email.receivedAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                  {email.rating && <p className="text-xs font-semibold text-blue-700">Rating: {email.rating}/10</p>}
                  <p className="text-xs text-gray-600 whitespace-pre-line">{email.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  const { addToast, ToastContainer } = useToast();
  const [data, setData] = useState({ stats: null, reviews: [] });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    try {
      const result = await getReviews();
      setData(result);
    } catch (err) {
      addToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { stats, reviews } = data;

  const filtered = reviews.filter(r => {
    if (filter === 'positive') return r.rating !== null && r.rating >= 6;
    if (filter === 'negative') return r.rating !== null && r.rating < 6;
    if (filter === 'no_response') return r.rating === null;
    return true;
  });

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'positive', label: 'Positive (6+)' },
    { key: 'negative', label: `Negative (<6)${stats?.flaggedCount ? ` · ${stats.flaggedCount}` : ''}` },
    { key: 'no_response', label: 'No Response' },
  ];

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Reviews</h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatsCard icon={Star} label="Total Reviews" value={stats.total} color="blue" />
          <StatsCard
            icon={Star}
            label="Avg Rating"
            value={stats.avgRating ? `${stats.avgRating}/10` : '—'}
            color="green"
            subtext={stats.ratedCount ? `${stats.ratedCount} rated` : 'None yet'}
          />
          <StatsCard icon={ThumbsUp} label="Google Links Sent" value={stats.googleReviewsSent} color="green" />
          <StatsCard icon={AlertTriangle} label="Need Attention" value={stats.flaggedCount} color={stats.flaggedCount > 0 ? 'red' : 'green'} />
        </div>
      )}

      {/* Negative flag alert */}
      {stats?.flaggedCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertTriangle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-medium">{stats.flaggedCount} review{stats.flaggedCount > 1 ? 's' : ''} need your attention</p>
            <p className="text-xs text-red-500 mt-0.5">Follow up with these clients to resolve issues</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium min-h-0
              ${filter === tab.key
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Star size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">
            {filter === 'all' ? 'No reviews yet' : `No ${filter.replace('_', ' ')} reviews`}
          </p>
          {filter === 'all' && (
            <p className="text-sm text-gray-400 mt-1">Complete a job and send a review request to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
