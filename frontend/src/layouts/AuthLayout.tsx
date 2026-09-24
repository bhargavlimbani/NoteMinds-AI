import { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Database, FileSearch, Sparkles } from 'lucide-react';
import { AuroraBackground } from './AppLayout';

const HeroScene = lazy(() => import('../components/three/HeroScene'));

const features = [
  { icon: FileSearch, title: 'Answers from your notes', text: 'Upload PDFs and ask questions - the AI reads your own material.' },
  { icon: Database, title: 'MCP-powered tools', text: 'Gemini calls MCP tools to securely fetch subjects, notes and progress.' },
  { icon: Sparkles, title: 'Personal recommendations', text: 'Quizzes, progress tracking and a study plan built around your weak spots.' },
];

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AuroraBackground />
      <div className="mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-2">
        {/* Left: 3D hero */}
        <section className="relative hidden flex-col justify-between p-10 lg:flex">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 shadow-glow">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-white">
                NoteMinds <span className="gradient-text">AI</span>
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">GenAI + Model Context Protocol</p>
            </div>
          </motion.div>

          <div className="relative h-[380px]">
            <Suspense fallback={<div className="h-full w-full animate-pulse-soft rounded-3xl bg-white/[0.03]" />}>
              <HeroScene />
            </Suspense>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-balance text-4xl font-bold leading-tight">
              Your study assistant that actually <span className="gradient-text">knows your syllabus</span>.
            </h1>
            <ul className="mt-6 space-y-3">
              {features.map(({ icon: Icon, title, text }, i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="glass flex items-start gap-3 p-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400">{text}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Right: form */}
        <section className="flex items-center justify-center p-6 sm:p-10">
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45 }} className="w-full max-w-md">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500">
                <BrainCircuit className="h-5 w-5 text-white" />
              </div>
              <p className="font-display text-lg font-bold text-white">
                NoteMinds <span className="gradient-text">AI</span>
              </p>
            </div>
            <div className="glass-strong gradient-border p-7 sm:p-8">
              <Outlet />
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
