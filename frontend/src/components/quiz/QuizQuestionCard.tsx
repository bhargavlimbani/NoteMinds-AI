import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { GradedQuestion, QuizQuestion } from '../../types';

interface Props {
  question: QuizQuestion | GradedQuestion;
  index: number;
  selected: string | null;
  onSelect?: (option: string) => void;
  graded?: GradedQuestion;
}

const letters = ['A', 'B', 'C', 'D'];

export function QuizQuestionCard({ question, index, selected, onSelect, graded }: Props) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className={cn('glass p-5', graded && (graded.isCorrect ? 'border-emerald-400/30' : 'border-rose-400/30'))}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-xs font-bold text-white">{index + 1}</span>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{question.type === 'MCQ' ? 'Multiple choice' : 'True / False'}</p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-white">{question.question}</p>
        </div>
        {graded && (
          <span className={cn('chip', graded.isCorrect ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300')}>
            {graded.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            {graded.isCorrect ? 'Correct' : 'Wrong'}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option, i) => {
          const isSelected = selected === option;
          const isCorrect = graded ? graded.correctAnswer === option : false;
          const wrongPick = graded ? isSelected && !isCorrect : false;
          return (
            <button
              key={option}
              type="button"
              disabled={Boolean(graded)}
              onClick={() => onSelect?.(option)}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition',
                !graded && (isSelected ? 'border-primary-400/70 bg-primary-500/15 text-white shadow-glow' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]'),
                graded && isCorrect && 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
                graded && wrongPick && 'border-rose-400/60 bg-rose-500/15 text-rose-100',
                graded && !isCorrect && !wrongPick && 'border-white/5 text-slate-500',
              )}
            >
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold', isSelected || isCorrect ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400')}>
                {question.type === 'MCQ' ? letters[i] : option[0]}
              </span>
              <span className="flex-1">{option}</span>
              {graded && isCorrect && <Check className="h-4 w-4 text-emerald-300" />}
              {graded && wrongPick && <X className="h-4 w-4 text-rose-300" />}
            </button>
          );
        })}
      </div>

      {graded && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          {!graded.selected && <p className="mb-1 text-xs text-amber-300">Not answered</p>}
          <p className="text-slate-300">
            <span className="font-semibold text-white">Explanation: </span>
            {graded.explanation ?? `The correct answer is "${graded.correctAnswer}".`}
          </p>
        </div>
      )}
    </motion.div>
  );
}
