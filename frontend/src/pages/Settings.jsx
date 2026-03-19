import { useState, useEffect } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { getProfile, updateProfile } from '../utils/api';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { addToast, ToastContainer } = useToast();
  const [form, setForm] = useState({ businessName: '', googleReviewLink: '', defaultTemplate: 'ai_generated' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then(p => setForm({ businessName: p.businessName, googleReviewLink: p.googleReviewLink || '', defaultTemplate: p.defaultTemplate || 'ai_generated' }))
      .catch(() => addToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('landscaper') || '{}');
      localStorage.setItem('landscaper', JSON.stringify({ ...stored, ...updated }));
      addToast('Settings saved');
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            value={form.businessName}
            onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Green Thumb Landscaping"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Google Review Link
          </label>
          <input
            value={form.googleReviewLink}
            onChange={e => setForm(f => ({ ...f, googleReviewLink: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="https://g.page/r/your-business/review"
          />
          <p className="text-xs text-gray-400 mt-1">
            Find this in your Google Business Profile. Clients with ratings 6+ will receive this link.
          </p>
          {form.googleReviewLink && (
            <a
              href={form.googleReviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-1 min-h-0"
            >
              <ExternalLink size={11} /> Test link
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Message Style
          </label>
          <select
            value={form.defaultTemplate}
            onChange={e => setForm(f => ({ ...f, defaultTemplate: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="ai_generated">🤖 AI Generated — Claude writes a unique message each time</option>
            <option value="friendly">😊 Friendly — Warm, casual and personal</option>
            <option value="professional">👔 Professional — Polite and formal</option>
            <option value="brief">⚡ Brief — Short and to the point</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Controls how review request messages are written. All templates personalise with the client's name, job type, and date.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      <ToastContainer />
    </div>
  );
}
