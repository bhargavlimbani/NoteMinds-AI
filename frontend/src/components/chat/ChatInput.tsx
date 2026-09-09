import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { SendHorizonal } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="glass-strong gradient-border flex items-end gap-2 p-2 pl-4">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? 'Ask anything about your notes, progress or what to study next…'}
        className="max-h-[180px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition', value.trim() && !disabled ? 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-glow hover:scale-105' : 'bg-white/5 text-slate-500')}
        aria-label="Send message"
      >
        <SendHorizonal className="h-5 w-5" />
      </button>
    </div>
  );
}
