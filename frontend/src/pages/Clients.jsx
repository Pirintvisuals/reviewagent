import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, User, Phone, Mail, Briefcase } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { getClients, createClient, updateClient, deleteClient } from '../utils/api';

function ClientForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', whatsappConsent: false, ...initial });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="James Whitfield"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
        <input
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="james@example.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input
          type="tel"
          value={form.phone}
          onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="07700 900123"
        />
      </div>

      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
        <input
          type="checkbox"
          id="whatsapp-consent"
          checked={form.whatsappConsent}
          onChange={e => setForm(f => ({ ...f, whatsappConsent: e.target.checked }))}
          className="mt-0.5 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 flex-shrink-0"
        />
        <label htmlFor="whatsapp-consent" className="text-sm text-gray-700 cursor-pointer">
          <span className="font-medium">📱 WhatsApp consent</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Client has agreed to receive review requests via WhatsApp. Requires a phone number above.
          </span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 px-4 rounded-xl"
        >
          {loading ? 'Saving...' : 'Save Client'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-3 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-xl">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Clients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast, ToastContainer } = useToast();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(searchParams.get('add') === 'true');
  const [editClient, setEditClient] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      addToast('Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editClient) {
        await updateClient(editClient.id, form);
        addToast('Client updated');
      } else {
        await createClient(form);
        addToast('Client added successfully');
      }
      setShowModal(false);
      setEditClient(null);
      loadClients();
    } catch (err) {
      addToast(err.message || 'Failed to save client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteClient(id);
      addToast('Client deleted');
      setDeleteConfirm(null);
      loadClients();
    } catch (err) {
      addToast(err.message || 'Cannot delete this client', 'error');
      setDeleteConfirm(null);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => { setEditClient(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-xl text-sm"
        >
          <Plus size={18} /> Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <User size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-green-600 font-medium text-sm hover:text-green-700 min-h-0"
            >
              Add your first client →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {filtered.map(client => (
            <div key={client.id} className="px-4 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-semibold text-sm">
                  {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{client.name}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail size={12} /> {client.email}
                  </span>
                  {client.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone size={12} /> {client.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Briefcase size={12} /> {client.jobCount} job{client.jobCount !== 1 ? 's' : ''}
                  </span>
                  {client.lastJobDate && (
                    <span className="text-xs text-gray-400">
                      Last: {new Date(client.lastJobDate).toLocaleDateString('en-GB')}
                    </span>
                  )}
                  {client.whatsappConsent && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium" title="WhatsApp consent given">
                      📱 WhatsApp
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => { setEditClient(client); setShowModal(true); }}
                  className="p-2 text-gray-400 hover:text-green-600 rounded-lg min-h-0"
                  title="Edit client"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(client)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg min-h-0"
                  title="Delete client"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditClient(null); }}
        title={editClient ? 'Edit Client' : 'Add New Client'}
      >
        <ClientForm
          initial={editClient ? { name: editClient.name, email: editClient.email, phone: editClient.phone || '', whatsappConsent: editClient.whatsappConsent || false } : {}}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditClient(null); }}
          loading={saving}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Client"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
          {deleteConfirm?.jobCount > 0 && (
            <span className="block mt-2 text-red-600 text-sm">
              This client has {deleteConfirm.jobCount} job(s) — deletion may be blocked.
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleDelete(deleteConfirm.id)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl"
          >
            Delete
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
}
