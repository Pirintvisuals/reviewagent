import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/clients', label: 'Clients' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/settings', label: 'Settings' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const landscaper = JSON.parse(localStorage.getItem('landscaper') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('landscaper');
    navigate('/login');
  };

  return (
    <header className="bg-green-700 text-white shadow-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Business Name */}
          <div className="flex items-center gap-2">
            <Leaf size={22} className="text-green-200" />
            <span className="font-semibold text-sm sm:text-base truncate max-w-[140px] sm:max-w-none">
              {landscaper.businessName || 'Landscaper Reviews'}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-0 flex items-center
                  ${location.pathname === link.to
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-100 hover:bg-green-600 rounded-lg min-h-0"
            >
              <LogOut size={16} /> Logout
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-green-100 min-h-0"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 border-t border-green-600 mt-1 pt-2 flex flex-col gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium
                  ${location.pathname === link.to
                    ? 'bg-green-900 text-white'
                    : 'text-green-100 hover:bg-green-600'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-green-100 hover:bg-green-600 rounded-lg text-left"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
