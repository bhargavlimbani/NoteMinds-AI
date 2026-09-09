import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Cpu, Database, HardDrive, KeyRound, LogOut, Plug, Save, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';
import { authApi } from '../services/auth.service';
import { systemApi } from '../services/progress.service';
import { errorMessage } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatDate, initials } from '../utils/format';
import { cn } from '../utils/cn';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const status = useFetch(() => systemApi.status(), []);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    try {
      updateUser(await authApi.updateProfile({ name }));
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) return toast.error('New passwords do not match');
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      toast.success('Password changed');
      setPasswords({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const mcp = status.data?.mcp;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Profile & system" subtitle="Manage your account and see how the AI + MCP layer is wired for the demo." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/25 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 font-display text-xl font-bold text-white shadow-glow">
                {user ? initials(user.name) : '?'}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{user?.name}</h2>
                <p className="truncate text-sm text-slate-400">{user?.email}</p>
                <p className="text-xs text-slate-500">Member since {formatDate(user?.createdAt)}</p>
              </div>
            </div>
            <form onSubmit={saveName} className="relative mt-6 space-y-3">
              <Input label="Display name" icon={<UserRound className="h-4 w-4" />} value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={60} required />
              <Button type="submit" loading={savingName} icon={<Save className="h-4 w-4" />} disabled={name.trim() === user?.name}>
                Save name
              </Button>
            </form>
          </motion.section>

          <section className="glass p-6">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <KeyRound className="h-4 w-4 text-amber-300" /> Change password
            </h3>
            <form onSubmit={savePassword} className="mt-4 space-y-3">
              <Input label="Current password" type="password" autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="New password" type="password" autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required minLength={6} />
                <Input label="Confirm" type="password" autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required minLength={6} />
              </div>
              <Button type="submit" variant="secondary" loading={savingPassword}>
                Update password
              </Button>
            </form>
          </section>

          <section className="glass flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-white">Sign out</p>
              <p className="text-xs text-slate-400">Your token is removed from this browser.</p>
            </div>
            <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
              Log out
            </Button>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-strong gradient-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Model Context Protocol status</h3>
                <p className="text-xs text-slate-400">Live view of the MCP server the AI agent talks to</p>
              </div>
            </div>

            {status.loading ? (
              <div className="mt-5">
                <CardSkeleton lines={4} />
              </div>
            ) : status.error ? (
              <p className="mt-5 text-sm text-rose-300">{status.error}</p>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">MCP server</p>
                    <p className={cn('mt-1 flex items-center gap-1.5 text-sm font-semibold', mcp?.connected ? 'text-emerald-300' : 'text-rose-300')}>
                      <span className={cn('h-2 w-2 rounded-full', mcp?.connected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400')} />
                      {mcp?.connected ? 'Connected' : 'Offline'}
                    </p>
                    <p className="text-[11px] text-slate-500">{mcp?.server ? `${mcp.server.name} v${mcp.server.version}` : '—'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Transport</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                      <Cpu className="h-3.5 w-3.5 text-accent-300" /> {mcp?.transport === 'stdio' ? 'stdio (separate process)' : 'in-memory'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Gemini</p>
                    <p className={cn('mt-1 flex items-center gap-1.5 text-sm font-semibold', status.data?.ai.configured ? 'text-emerald-300' : 'text-amber-300')}>
                      <BrainCircuit className="h-3.5 w-3.5" /> {status.data?.ai.configured ? 'Configured' : 'Add API key'}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">{status.data?.ai.model}</p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Wrench className="h-3.5 w-3.5" /> Tools exposed by the MCP server ({mcp?.tools.length ?? 0})
                  </p>
                  <ul className="space-y-2">
                    {mcp?.tools.map((t) => (
                      <li key={t.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="font-mono text-xs font-semibold text-accent-200">{t.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge tone="emerald"><ShieldCheck className="h-3 w-3" /> JWT auth · ownership checks</Badge>
                  <Badge tone="cyan"><Database className="h-3 w-3" /> PostgreSQL + Prisma</Badge>
                  <Badge tone={status.data?.storage.persistent ? 'violet' : 'slate'}><HardDrive className="h-3 w-3" /> files: {status.data?.storage.provider}</Badge>
                </div>
              </div>
            )}
          </section>

          <section className="glass p-6">
            <h3 className="text-base font-semibold">How a question flows</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-300">
              {['You ask a question in AI Chat', 'Gemini decides whether a tool is needed', 'The MCP client calls the MCP server (JSON-RPC)', 'The tool reads only your data from PostgreSQL', 'Gemini turns the result into a personalised answer'].map((s, i) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold text-white">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
