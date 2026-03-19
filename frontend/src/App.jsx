import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import { login } from './utils/api';

const AUTO_EMAIL = import.meta.env.VITE_CLIENT_EMAIL;

function PrivateRoute({ children, ready }) {
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function autoLogin() {
      if (localStorage.getItem('token')) {
        setReady(true);
        return;
      }
      if (AUTO_EMAIL) {
        try {
          const data = await login(AUTO_EMAIL.trim());
          localStorage.setItem('token', data.token);
          localStorage.setItem('landscaper', JSON.stringify(data.landscaper));
        } catch {
          // fall through to login page
        }
      }
      setReady(true);
    }
    autoLogin();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <PrivateRoute ready={ready}>
            <AppLayout><Dashboard /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/clients" element={
          <PrivateRoute ready={ready}>
            <AppLayout><Clients /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/jobs" element={
          <PrivateRoute ready={ready}>
            <AppLayout><Jobs /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/jobs/:id" element={
          <PrivateRoute ready={ready}>
            <AppLayout><JobDetail /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/reviews" element={
          <PrivateRoute ready={ready}>
            <AppLayout><Reviews /></AppLayout>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute ready={ready}>
            <AppLayout><Settings /></AppLayout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
