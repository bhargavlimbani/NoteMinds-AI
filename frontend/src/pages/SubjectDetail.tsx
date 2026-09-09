import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, BrainCircuit, FileText, Layers, MessageSquareText, Pencil, Plus, Trash2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch';
import { subjectApi, unitApi } from '../services/subject.service';
import { errorMessage } from '../services/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/ProgressRing';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/Modal';
import { SubjectFormModal } from '../components/subjects/SubjectFormModal';
import { UnitFormModal } from '../components/subjects/UnitFormModal';
import { UnitAccordion } from '../components/subjects/UnitAccordion';
import { colorOf } from '../utils/format';
import { cn } from '../utils/cn';
import type { Unit } from '../types';

export default function SubjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: subject, loading, error, reload, setData } = useFetch(() => subjectApi.get(id), [id]);
  const [editSubject, setEditSubject] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState(false);
  const [unitForm, setUnitForm] = useState<{ open: boolean; unit: Unit | null }>({ open: false, unit: null });
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && !subject) return <PageLoader label="Loading subject…" />;
  if (error || !subject) {
    return (
      <EmptyState title="Subject not found" description={error ?? 'This subject does not exist or you do not have access to it.'} action={<Link to="/subjects" className="btn-primary">Back to subjects</Link>} />
    );
  }

  const color = colorOf(subject.color);
  const totalTopics = subject.units.reduce((n, u) => n + u.topics.length, 0);
  const doneTopics = subject.units.reduce((n, u) => n + u.topics.filter((t) => t.completed).length, 0);

  const updateUnit = (updated: Unit) => {
    setData((prev) => {
      if (!prev) return prev;
      const units = prev.units.map((u) => (u.id === updated.id ? { ...u, ...updated } : u));
      const progress = units.length ? Math.round(units.reduce((n, u) => n + u.completion, 0) / units.length) : 0;
      return { ...prev, units, progress };
    });
  };

  const confirmDeleteUnit = async () => {
    if (!deleteUnit) return;
    setBusy(true);
    try {
      await unitApi.remove(deleteUnit.id);
      toast.success('Unit deleted');
      setDeleteUnit(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteSubject = async () => {
    setBusy(true);
    try {
      await subjectApi.remove(subject.id);
      toast.success('Subject deleted');
      navigate('/subjects');
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/subjects" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All subjects
      </Link>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative overflow-hidden p-6 sm:p-8">
        <div className={cn('pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br opacity-30 blur-3xl', color.gradient)} />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg', color.gradient)}>
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('text-xs font-semibold uppercase tracking-[0.2em]', color.text)}>{subject.code || 'Subject'}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{subject.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">{subject.description || 'No description added yet.'}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="inline-flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary-300" /> {subject.units.length} units</span>
              <span className="inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-accent-400" /> {subject.noteCount} notes</span>
              <span className="inline-flex items-center gap-1.5"><BrainCircuit className="h-4 w-4 text-amber-300" /> {subject.quizCount} quizzes</span>
              <span className="inline-flex items-center gap-1.5">{doneTopics}/{totalTopics} topics done</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setUnitForm({ open: true, unit: null })}>
                Add unit
              </Button>
              <Link to={`/notes?subjectId=${subject.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                <UploadCloud className="h-4 w-4" /> Upload notes
              </Link>
              <Link to={`/quiz?subjectId=${subject.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                <BrainCircuit className="h-4 w-4" /> Generate quiz
              </Link>
              <Link to="/chat" className="btn-secondary px-3 py-1.5 text-xs">
                <MessageSquareText className="h-4 w-4" /> Ask AI
              </Link>
              <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditSubject(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-rose-300" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteSubject(true)}>
                Delete
              </Button>
            </div>
          </div>
          <ProgressRing value={subject.progress} label="progress" tone="gradient" size={124} />
        </div>
      </motion.section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Units &amp; topics</h2>
          <span className="text-xs text-slate-500">Tick topics to update progress automatically</span>
        </div>
        {subject.units.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-7 w-7" />}
            title="No units yet"
            description="Break the subject into units such as 'Unit 1: Introduction' and list the topics under each one."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setUnitForm({ open: true, unit: null })}>Add first unit</Button>}
          />
        ) : (
          <div className="space-y-3">
            {subject.units.map((unit, index) => (
              <UnitAccordion
                key={unit.id}
                unit={unit}
                defaultOpen={index === 0}
                onChange={updateUnit}
                onEdit={(u) => setUnitForm({ open: true, unit: u })}
                onDelete={setDeleteUnit}
              />
            ))}
          </div>
        )}
      </section>

      <SubjectFormModal open={editSubject} onClose={() => setEditSubject(false)} initial={subject} onSaved={() => reload()} />
      <UnitFormModal open={unitForm.open} onClose={() => setUnitForm({ open: false, unit: null })} subjectId={subject.id} initial={unitForm.unit} onSaved={() => reload()} />
      <ConfirmDialog open={Boolean(deleteUnit)} onClose={() => setDeleteUnit(null)} onConfirm={confirmDeleteUnit} loading={busy} danger title={`Delete ${deleteUnit?.name}?`} description="Its topics, progress and quiz links will be removed. Notes stay in the subject." confirmLabel="Delete unit" />
      <ConfirmDialog open={deleteSubject} onClose={() => setDeleteSubject(false)} onConfirm={confirmDeleteSubject} loading={busy} danger title={`Delete ${subject.name}?`} description="Everything inside this subject will be permanently deleted." confirmLabel="Delete subject" />
    </div>
  );
}
