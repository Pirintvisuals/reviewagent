import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Briefcase, CheckCircle, Star, Plus, AlertTriangle, ChevronRight, Settings } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge, RatingBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { getJobs, getClients, getReviews, completeJob } from '../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completingJob, setCompletingJob] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, clientsData, reviewsData] = await Promise.all([
        getJobs(),
        getClients(),
        getReviews(),
      ]);
      setJobs(jobsData);
      setClients(clientsData);
      setReviewStats(reviewsData.stats);
    } catch (err) {
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (jobId) => {
    setCompletingJob(jobId);
    try {
      const result = await completeJob(jobId);
      addToast(result.message || 'Review request scheduled!');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to complete job', 'error');
    } finally {
      setCompletingJob(null);
    }
  };

  const landscaper = JSON.parse(localStorage.getItem('landscaper') || '{}');
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const thisMonthCompleted = jobs.filter(j => {
    if (j.status === 'pending') return false;
    const jobDate = new Date(j.jobDate);
    const now = new Date();
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
  }).length;

  const recentJobs = [...jobs].slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard icon={Users} label="Total Clients" value={clients.length} color="green" />
        <StatsCard icon={Briefcase} label="Pending Jobs" value={pendingCount} color="yellow" />
        <StatsCard icon={CheckCircle} label="Completed This Month" value={thisMonthCompleted} color="blue" />
        <StatsCard
          icon={Star}
          label="Avg Rating"
          value={reviewStats?.avgRating ? `${reviewStats.avgRating}/10` : '—'}
          color={reviewStats?.avgRating >= 7 ? 'green' : reviewStats?.avgRating ? 'yellow' : 'green'}
          subtext={reviewStats?.ratedCount ? `from ${reviewStats.ratedCount} reviews` : 'No reviews yet'}
        />
      </div>

      {/* Setup prompt */}
      {!landscaper.googleReviewLink && (
        <Link
          to="/settings"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl hover:bg-amber-100"
        >
          <Settings size={20} className="flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-medium text-sm">Finish setting up your account</p>
            <p className="text-xs text-amber-600 mt-0.5">Add your Google Review link so clients can leave you a review</p>
          </div>
          <ChevronRight size={16} className="text-amber-500" />
        </Link>
      )}

      {/* Negative reviews alert */}
      {reviewStats?.flaggedCount > 0 && (
        <Link
          to="/reviews"
          className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl hover:bg-red-100"
        >
          <AlertTriangle size={20} className="flex-shrink-0" />
          <span className="font-medium">
            {reviewStats.flaggedCount} negative review{reviewStats.flaggedCount > 1 ? 's' : ''} need your attention
          </span>
          <ChevronRight size={16} className="ml-auto" />
        </Link>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/jobs?add=true')}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
            text-white font-semibold py-3 px-4 rounded-xl"
        >
          <Plus size={20} /> Add New Job
        </button>
        <button
          onClick={() => navigate('/clients?add=true')}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-green-600
            text-green-700 font-semibold py-3 px-4 rounded-xl hover:bg-green-50"
        >
          <Plus size={20} /> Add Client
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
          <Link to="/jobs" className="text-sm text-green-600 hover:text-green-700 font-medium min-h-0 flex items-center">
            View all <ChevronRight size={14} />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No jobs yet</p>
            <p className="text-sm mt-1">Add your first job to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentJobs.map(job => (
              <div key={job.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{job.clientName}</span>
                    <StatusBadge status={job.status} />
                    {Boolean(job.negativeFlagged) && (
                      <span className="text-xs text-red-500 font-medium">⚠ Flagged</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{job.jobType}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {new Date(job.jobDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {job.rating !== null && job.rating !== undefined && (
                    <RatingBadge rating={job.rating} />
                  )}
                  {job.status === 'pending' && (
                    <button
                      onClick={() => handleMarkComplete(job.id)}
                      disabled={completingJob === job.id}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium min-h-0 disabled:opacity-50"
                    >
                      {completingJob === job.id ? '...' : 'Complete'}
                    </button>
                  )}
                  {job.status !== 'pending' && (
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-xs text-green-600 hover:text-green-700 font-medium min-h-0 flex items-center px-2 py-2"
                    >
                      View <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
