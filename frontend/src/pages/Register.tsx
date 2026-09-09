import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { errorMessage } from '../services/api';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const strength = Math.min(4, Math.floor(form.password.length / 3) + (/[A-Z]/.test(form.password) ? 1 : 0) + (/\d/.test(form.password) ? 1 : 0));
  const strengthLabel = ['Too short', 'Weak', 'Okay', 'Good', 'Strong'][strength];
  const strengthColor = ['bg-rose-500', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-400'][strength];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form.name, form.email, form.password);
      toast.success(`Account created. Welcome, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">Get started</p>
      <h2 className="mt-2 text-2xl font-bold">Create your student account</h2>
      <p className="mt-1 text-sm text-slate-400">Free, private and built for exam preparation.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Input label="Full name" name="name" placeholder="User Name" icon={<UserRound className="h-4 w-4" />} value={form.name} onChange={update('name')} required minLength={2} />
        <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@college.edu" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={update('email')} required />
        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            icon={<LockKeyhole className="h-4 w-4" />}
            value={form.password}
            onChange={update('password')}
            required
            minLength={6}
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength ? strengthColor : 'bg-white/10'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-400">{strengthLabel}</span>
            </div>
          )}
        </div>
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          icon={<LockKeyhole className="h-4 w-4" />}
          value={form.confirm}
          onChange={update('confirm')}
          required
          error={form.confirm && form.confirm !== form.password ? 'Passwords do not match' : undefined}
        />

        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}

        <Button type="submit" className="w-full" size="lg" loading={loading} icon={<ArrowRight className="h-4 w-4" />}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-300 hover:text-primary-200">
          Sign in
        </Link>
      </p>
    </div>
  );
}
