import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn } from 'lucide-react';
import { login } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await login(email.trim());
      localStorage.setItem('token', data.token);
      localStorage.setItem('landscaper', JSON.stringify(data.landscaper));
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-green-600 p-3 rounded-xl">
            <Leaf size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ReviewGrow</h1>
            <p className="text-sm text-gray-500">For Landscapers</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
          Sign in to your account
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email to get started. New? We'll create your account automatically.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700
              disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {loading ? (
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <LogIn size={20} />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-xs text-center text-gray-400">
          New here? Just enter your email and we'll set you up instantly — no password needed.
        </p>
      </div>
    </div>
  );
}
