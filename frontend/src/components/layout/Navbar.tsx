import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Menu, Sparkles, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';
import { NAV_ITEMS, Logo } from './Sidebar';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = NAV_ITEMS.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out. See you soon!');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-bg/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={onMenuClick} className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Logo compact />
        </div>

        <div className="hidden lg:block">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">NoteMinds AI</p>
          <h2 className="text-sm font-semibold text-white">{current?.label ?? 'Workspace'}</h2>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/chat"
            className="hidden items-center gap-2 rounded-xl border border-primary-400/30 bg-primary-500/10 px-3 py-2 text-xs font-semibold text-primary-200 transition hover:bg-primary-500/20 sm:flex"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </Link>
          <Link to="/recommendations" className="relative rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Recommendations">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-400 shadow-[0_0_8px_#22d3ee]" />
          </Link>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2.5 transition hover:bg-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
                {user ? initials(user.name) : '?'}
              </span>
              <span className="hidden max-w-[120px] truncate text-sm font-medium text-white sm:block">{user?.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  className="glass-strong absolute right-0 mt-2 w-56 overflow-hidden p-1.5"
                >
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <Link to="/profile" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
                    <UserRound className="h-4 w-4" /> Profile
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">
                    <LogOut className="h-4 w-4" /> Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
