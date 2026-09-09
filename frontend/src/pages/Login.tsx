import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { errorMessage } from '../services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@studymcp.ai');
    setPassword('demo1234');
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">Welcome back</p>
      <h2 className="mt-2 text-2xl font-bold">Sign in to your workspace</h2>
      <p className="mt-1 text-sm text-slate-400">Continue where you left off - notes, quizzes and AI chat are waiting.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@college.edu"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="relative">
          <Input
            label="Password"
            name="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            icon={<LockKeyhole className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] text-slate-500 hover:text-white" aria-label="Toggle password">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}

        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <button type="button" onClick={fillDemo} className="mt-4 w-full rounded-xl border border-dashed border-white/15 px-4 py-2.5 text-xs text-slate-400 transition hover:border-primary-400/40 hover:text-primary-200">
        Use demo account (demo@studymcp.ai / demo1234)
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{' '}
        <Link to="/register" className="font-semibold text-primary-300 hover:text-primary-200">
          Create an account
        </Link>
      </p>
    </div>
  );
}
