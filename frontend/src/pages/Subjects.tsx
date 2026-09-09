import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFetch } from '../hooks/useFetch';
import { subjectApi } from '../services/subject.service';
import { errorMessage } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/Modal';
import { SubjectCard } from '../components/subjects/SubjectCard';
import { SubjectFormModal } from '../components/subjects/SubjectFormModal';
import type { SubjectSummary } from '../types';

export default function SubjectsPage() {
  const { data, loading, error, reload } = useFetch(() => subjectApi.list(), []);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectSummary | null>(null);
  const [deleting, setDeleting] = useState<SubjectSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const subjects = (data ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q);
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await subjectApi.remove(deleting.id);
      toast.success(`Deleted ${deleting.name}`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Subjects"
        subtitle="Organise your semester into subjects, units and topics. The AI uses this structure to personalise everything."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
            New subject
          </Button>
        }
      />

      <div className="mb-6 max-w-sm">
        <Input placeholder="Search subjects…" icon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="glass mb-6 p-4 text-sm text-rose-300">{error}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} lines={4} />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title={search ? 'No subjects match your search' : 'No subjects yet'}
          description={search ? 'Try a different name or code.' : 'Create your first subject - for example DBMS, Operating Systems or Computer Networks.'}
          action={
            !search && (
              <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
                Create subject
              </Button>
            )
          }
        />
      ) : (
        <motion.div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
          {subjects.map((subject) => (
            <motion.div key={subject.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <SubjectCard subject={subject} onEdit={(s) => { setEditing(s); setFormOpen(true); }} onDelete={setDeleting} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <SubjectFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => reload()} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        danger
        title={`Delete ${deleting?.name}?`}
        description="All units, topics, notes, quizzes and progress of this subject will be removed permanently."
        confirmLabel="Delete subject"
      />
    </div>
  );
}
