import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { subjectApi } from '../../services/subject.service';
import { errorMessage } from '../../services/api';
import { SUBJECT_COLORS, colorStyles } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { SubjectColor, SubjectSummary } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: { id: string; name: string; code: string | null; description: string | null; color: SubjectColor } | null;
  onSaved: (subject: SubjectSummary) => void;
}

export function SubjectFormModal({ open, onClose, initial, onSaved }: Props) {
  const [form, setForm] = useState({ name: '', code: '', description: '', color: 'violet' as SubjectColor });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        code: initial?.code ?? '',
        description: initial?.description ?? '',
        color: initial?.color ?? 'violet',
      });
    }
  }, [open, initial]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name: form.name, code: form.code || null, description: form.description || null, color: form.color };
      const saved = initial ? await subjectApi.update(initial.id, payload) : await subjectApi.create(payload);
      toast.success(initial ? 'Subject updated' : 'Subject created');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit subject' : 'New subject'}
      description={initial ? 'Update the subject details.' : 'Add a subject you are studying this semester.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="subject-form" loading={loading}>
            {initial ? 'Save changes' : 'Create subject'}
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={submit} className="space-y-4">
        <Input label="Subject name" name="name" placeholder="e.g. Database Management Systems" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} autoFocus />
        <Input label="Subject code (optional)" name="code" placeholder="e.g. CS301 or DBMS" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={30} />
        <Textarea label="Description (optional)" name="description" placeholder="What does this subject cover?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
        <div>
          <span className="label">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  'h-8 w-8 rounded-full bg-gradient-to-br transition',
                  colorStyles[c].gradient,
                  form.color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-bg' : 'opacity-70 hover:opacity-100',
                )}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
