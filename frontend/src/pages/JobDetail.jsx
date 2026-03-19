import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCheck, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import { StatusBadge, RatingBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { getJob, completeJob } from '../utils/api';

function EmailThread({ thread }) {
  const [expanded, setExpanded] = useState(true);

  if (!thread || thread.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 min-h-0"
      >
        <div className="flex items-center gap-2">
          <Mail size={18} className="text-gray-400" />
          <span className="font-medium text-gray-900 text-sm">Message Thread ({thread.length} messages)</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50">
          {thread.map((email, i) => (
            <div key={i} className={`px-4 py-3 ${email.direction === 'inbound' ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start gap-2 mb-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                  ${email.direction === 'outbound'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'}`}>
                  {email.direction === 'outbound' ? 'You' : 'Client'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(email.sentAt || email.receivedAt).toLocaleString('en-GB')}
                </span>
                {email.channel === 'whatsapp' && (
                  <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">📱 WhatsApp</span>
                )}
                {email.type === 'reminder_nudge' && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">⏰ Reminder</span>
                )}
              </div>
              {email.subject && (
                <p className="text-xs text-gray-500 mb-1 font-medium">Subject: {email.subject}</p>
              )}
              {email.rating && (
                <p className="text-sm font-semibold text-blue-700 mb-1">Rating: {email.rating}/10</p>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-line">{email.body}</p>
              {email.type === 'google_review_request' && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <ExternalLink size={12} /> Google review link included
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => { loadJob(); }, [id]);

  const loadJob = async () => {
    try {
      const data = await getJob(id);
      setJob(data);
    } catch (err) {
      addToast('Failed to load job', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const result = await completeJob(id);
      addToast(result.message || 'Review request scheduled!');
      loadJob();
    } catch (err) {
      addToast(err.message || 'Failed to complete job', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;
  }

  if (!job) return <div className="p-4 text-center text-gray-500">Job not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 min-h-0">
        <ArrowLeft size={16} /> Back to Jobs
      </button>

      {/* Job Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{job.jobType}</h1>
            <p className="text-gray-500 text-sm">{new Date(job.jobDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Client</h2>
          <p className="font-medium text-gray-900">{job.clientName}</p>
          <p className="text-sm text-gray-500">{job.clientEmail}</p>
          {job.clientPhone && <p className="text-sm text-gray-500">{job.clientPhone}</p>}
        </div>

        {/* Review info */}
        {job.review && job.review.rating !== null && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Review</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <RatingBadge rating={job.review.rating} />
              {job.review.googleReviewSent && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Google review link sent ✓</span>
              )}
              {job.review.negativeFlagged && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠ Needs attention</span>
              )}
            </div>
            {job.review.feedbackText && (
              <p className="mt-2 text-sm text-gray-600 italic">"{job.review.feedbackText}"</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {job.status === 'pending' && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl"
          >
            <CheckCheck size={20} />
            {completing ? 'Scheduling...' : 'Mark Complete & Schedule Review'}
          </button>
        )}

        {job.status === 'scheduled' && (
          <div className="flex-1 flex items-center gap-3 bg-orange-50 border border-orange-200 text-orange-700 font-medium py-3 px-4 rounded-xl text-sm">
            <Clock size={18} className="flex-shrink-0" />
            <div>
              <p className="font-semibold">Review request scheduled</p>
              {job.reviewScheduledAt && (
                <p className="text-xs text-orange-500 mt-0.5">
                  Sends ~{new Date(job.reviewScheduledAt).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {job.status === 'review_sent' && (!job.review || job.review.rating === null) && (
          <div className="flex-1 flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 font-medium py-3 px-4 rounded-xl text-sm">
            <Mail size={18} className="flex-shrink-0" />
            <p className="font-semibold">Waiting for client to respond</p>
          </div>
        )}
      </div>

      {/* Email Thread */}
      {job.review && <EmailThread thread={job.review.emailThread} />}

      <ToastContainer />
    </div>
  );
}
