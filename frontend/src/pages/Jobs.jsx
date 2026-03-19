import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Briefcase, CheckCheck, ChevronRight, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { StatusBadge, RatingBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { getJobs, getClients, createJob, completeJob, deleteJob } from '../utils/api';

const JOB_TYPES = [
  'Lawn Mowing', 'Hedge Trimming', 'Garden Design', 'Patio Installation',
  'Patio Cleaning', 'Garden Clearance', 'Tree Surgery', 'Turfing',
  'Planting', 'Fencing', 'Decking', 'Irrigation', 'Other'
];

function AddJobModal({ isOpen, onClose, onSave, loading }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ clientId: '', jobType: '', jobDate: new Date().toISOString().split('T')[0] });
  const [errors, setErrors] = useState({});
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      getClients().then(setClients).catch(() => {});
    }
  }, [isOpen]);

  const validate = () => {
    const errs = {};
    if (!form.clientId) errs.clientId = 'Please select a client';
    if (!form.jobType.trim()) errs.jobType = 'Job type is required';
    if (!form.jobDate) errs.jobDate = 'Date is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
          <input
            placeholder="Search clients..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm mb-1 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <select
            value={form.clientId}
            onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
            size={Math.min(filteredClients.length + 1, 5)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">— Select client —</option>
            {filteredClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clientId && <p className="text-red-500 text-xs mt-1">{errors.clientId}</p>}
          {clients.length === 0 && (
            <p className="text-xs text-yellow-600 mt-1">No clients yet — <Link to="/clients" className="underline">add a client first</Link></p>
          )}
        </div>

        {/* Job type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Type *</label>
          <input
            list="job-types"
            value={form.jobType}
            onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
            placeholder="e.g. Lawn Mowing"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <datalist id="job-types">
            {JOB_TYPES.map(t => <option key={t} value={t} />)}
          </datalist>
          {errors.jobType && <p className="text-red-500 text-xs mt-1">{errors.jobType}</p>}
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Date *</label>
          <input
            type="date"
            value={form.jobDate}
            onChange={e => setForm(f => ({ ...f, jobDate: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.jobDate && <p className="text-red-500 text-xs mt-1">{errors.jobDate}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 px-4 rounded-xl"
          >
            {loading ? 'Creating...' : 'Create Job'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-3 text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Jobs() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast, ToastContainer } = useToast();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(searchParams.get('add') === 'true');
  const [saving, setSaving] = useState(false);
  const [completingJob, setCompletingJob] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadJobs(); }, [filter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      // 'pending' tab shows both pending + scheduled jobs via the pending_all API param
      const data = await getJobs(filter === 'pending' ? 'pending_all' : filter);
      setJobs(data);
    } catch (err) {
      addToast('Failed to load jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (form) => {
    setSaving(true);
    try {
      await createJob({ clientId: Number(form.clientId), jobType: form.jobType, jobDate: form.jobDate });
      addToast('Job created');
      setShowAdd(false);
      loadJobs();
    } catch (err) {
      addToast(err.message || 'Failed to create job', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (jobId) => {
    setCompletingJob(jobId);
    try {
      const result = await completeJob(jobId);
      addToast(result.message || 'Job marked complete');
      loadJobs();
    } catch (err) {
      addToast(err.message || 'Failed to complete job', 'error');
    } finally {
      setCompletingJob(null);
    }
  };

  const handleDelete = async (job) => {
    try {
      await deleteJob(job.id);
      addToast('Job deleted');
      setDeleteConfirm(null);
      loadJobs();
    } catch (err) {
      addToast(err.message || 'Failed to delete job', 'error');
      setDeleteConfirm(null);
    }
  };

  const tabs = ['all', 'pending', 'review_sent'];
  const tabLabels = { all: 'All', pending: 'Pending', review_sent: 'Sent' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl text-sm"
        >
          <Plus size={18} /> Add Job
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg min-h-0
              ${filter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Briefcase size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">
            {filter === 'all' ? 'No jobs yet' : `No ${tabLabels[filter].toLowerCase()} jobs`}
          </p>
          {filter === 'all' && (
            <button onClick={() => setShowAdd(true)} className="mt-4 text-green-600 font-medium text-sm min-h-0">
              Add your first job →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {jobs.map(job => (
            <div key={job.id} className="px-4 py-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{job.clientName}</span>
                  <StatusBadge status={job.status} />
                  {Boolean(job.negativeFlagged) && (
                    <span className="text-xs text-red-500 font-medium">⚠ Needs attention</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-600 font-medium">{job.jobType}</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{new Date(job.jobDate).toLocaleDateString('en-GB')}</span>
                  {job.rating !== null && job.rating !== undefined && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <RatingBadge rating={job.rating} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {job.status === 'pending' && (
                  <button
                    onClick={() => handleComplete(job.id)}
                    disabled={completingJob === job.id}
                    className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium min-h-0 disabled:opacity-50"
                  >
                    <CheckCheck size={14} />
                    {completingJob === job.id ? '...' : 'Complete'}
                  </button>
                )}
                <Link
                  to={`/jobs/${job.id}`}
                  className="p-2 text-gray-400 hover:text-green-600 min-h-0"
                >
                  <ChevronRight size={18} />
                </Link>
                <button
                  onClick={() => setDeleteConfirm(job)}
                  className="p-2 text-gray-300 hover:text-red-500 min-h-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddJobModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleCreateJob}
        loading={saving}
      />

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Job" size="sm">
        <p className="text-gray-600 mb-6">
          Delete the <strong>{deleteConfirm?.jobType}</strong> job for <strong>{deleteConfirm?.clientName}</strong>?
          {deleteConfirm?.status !== 'pending' && (
            <span className="block mt-2 text-yellow-600 text-sm">This will also delete any associated review data.</span>
          )}
        </p>
        <div className="flex gap-3">
          <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl">Delete</button>
          <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl">Cancel</button>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
}
