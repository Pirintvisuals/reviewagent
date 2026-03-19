const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('landscaper');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export const login = (email, businessName) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, businessName }) });

// Landscaper profile
export const getProfile = () => request('/landscaper/profile');
export const updateProfile = (data) =>
  request('/landscaper/profile', { method: 'PUT', body: JSON.stringify(data) });

// Clients
export const getClients = () => request('/clients');
export const getClient = (id) => request(`/clients/${id}`);
export const createClient = (data) =>
  request('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id, data) =>
  request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id) =>
  request(`/clients/${id}`, { method: 'DELETE' });

// Jobs
export const getJobs = (status) =>
  request(`/jobs${status && status !== 'all' ? `?status=${status}` : ''}`);
export const getJob = (id) => request(`/jobs/${id}`);
export const createJob = (data) =>
  request('/jobs', { method: 'POST', body: JSON.stringify(data) });
export const updateJob = (id, data) =>
  request(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const completeJob = (id) =>
  request(`/jobs/${id}/complete`, { method: 'POST' });
export const deleteJob = (id) =>
  request(`/jobs/${id}`, { method: 'DELETE' });

// Reviews
export const getReviews = () => request('/reviews');
export const getReview = (jobId) => request(`/reviews/${jobId}`);
export const simulateResponse = (data) =>
  request('/reviews/simulate-response', { method: 'POST', body: JSON.stringify(data) });
