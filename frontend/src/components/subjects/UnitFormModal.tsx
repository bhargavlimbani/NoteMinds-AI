import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { subjectApi, unitApi } from '../../services/subject.service';
import { errorMessage } from '../../services/api';
import type { Unit } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  subjectId: string;
  initial?: Unit | null;
  onSaved: (unit: Unit) => void;
}

export function UnitFormModal({ open, onClose, subjectId, initial, onSaved }: Props) {
  const [form, setForm] = useState({ name: '', description: '', topics: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ name: initial?.name ?? '', description: initial?.description ?? '', topics: '' });
  }, [open, initial]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const topics = form.topics
        .split(/\n|,/)
        .map((t) => t.trim())
        .filter(Boolean);
      const saved = initial
        ? await unitApi.update(initial.id, { name: form.name, description: form.description || null })
        : await subjectApi.createUnit(subjectId, { name: form.name, description: form.description || null, topics });
      toast.success(initial ? 'Unit updated' : 'Unit created');
      onSaved({ ...initial, ...saved, topics: saved.topics ?? initial?.topics ?? [] } as Unit);
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
      title={initial ? 'Edit unit' : 'Add unit'}
      description={initial ? 'Rename or describe this unit.' : 'Units break a subject into syllabus chapters. Add topics now or later.'}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="unit-form" loading={loading}>
            {initial ? 'Save changes' : 'Add unit'}
          </Button>
        </>
      }
    >
      <form id="unit-form" onSubmit={submit} className="space-y-4">
        <Input label="Unit name" name="name" placeholder="e.g. Unit 3: Normalization" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} autoFocus />
        <Textarea label="Description (optional)" name="description" placeholder="Short summary of what this unit covers" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
        {!initial && (
          <Textarea
            label="Topics (one per line)"
            name="topics"
            placeholder={'Functional dependency\n1NF and 2NF\n3NF\nBCNF'}
            value={form.topics}
            onChange={(e) => setForm({ ...form, topics: e.target.value })}
            hint="Topics become a checklist - completing them updates the unit progress automatically."
            className="min-h-[120px]"
          />
        )}
      </form>
    </Modal>
  );
}
