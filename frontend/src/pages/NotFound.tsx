import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { AuroraBackground } from '../layouts/AppLayout';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <AuroraBackground />
      <div className="glass-strong max-w-md p-10 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-glow">
          <Compass className="h-8 w-8" />
        </div>
        <p className="font-display text-6xl font-bold gradient-text">404</p>
        <h1 className="mt-2 text-xl font-semibold">This page wandered off</h1>
        <p className="mt-2 text-sm text-slate-400">The page you are looking for does not exist or has moved.</p>
        <Link to="/dashboard" className="btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
