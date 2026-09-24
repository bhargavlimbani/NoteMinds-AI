import { NavLink, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subjects', label: 'Subjects', icon: BookOpen },
  { to: '/notes', label: 'Notes', icon: FileText },
  { to: '/chat', label: 'AI Chat', icon: MessageSquareText },
  { to: '/quiz', label: 'Quiz', icon: BrainCircuit },
  { to: '/progress', label: 'Progress', icon: LineChart },
  { to: '/recommendations', label: 'Recommendations', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 shadow-glow">
        <div className="absolute inset-0 rounded-2xl bg-white/10 blur-sm" />
        <BrainCircuit className="relative h-5 w-5 text-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="font-display text-base font-bold text-white">
            NoteMinds <span className="gradient-text">AI</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Personalised study</p>
        </div>
      )}
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} className={({ isActive }) => cn('nav-item group', isActive && 'nav-item-active')}>
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                  isActive ? 'bg-white/10 text-primary-200 shadow-inner' : 'text-slate-500 group-hover:text-white',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span>{label}</span>
              {isActive && <motion.span layoutId="nav-dot" className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_10px_#22d3ee]" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Link to="/profile" className="glass mt-4 flex items-center gap-3 p-3 transition hover:bg-white/[0.07]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">
        {initials(user.name)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
    </Link>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.06] bg-bg-elevated/60 px-4 py-5 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-8 flex flex-1 flex-col">
          <NavList />
          <UserCard />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/10 bg-bg-elevated/95 px-4 py-5 backdrop-blur-2xl"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-2">
                <Logo />
                <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-8 flex flex-1 flex-col">
                <NavList onNavigate={onClose} />
                <UserCard />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
