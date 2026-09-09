import { MessageSquareText, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { timeAgo } from '../../utils/format';
import type { ConversationSummary } from '../../types';

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (conversation: ConversationSummary) => void;
  loading?: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, onNew, onDelete, loading }: Props) {
  return (
    <div className="flex h-full flex-col">
      <button onClick={onNew} className="btn-primary mb-3 w-full">
        <Plus className="h-4 w-4" /> New chat
      </button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {loading && conversations.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-500">Loading history…</p>}
        {!loading && conversations.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-500">No conversations yet.</p>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn('group flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition', c.id === activeId ? 'nav-item-active' : 'hover:bg-white/5')}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquareText className={cn('mt-0.5 h-4 w-4 shrink-0', c.id === activeId ? 'text-primary-200' : 'text-slate-500')} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{c.title}</p>
              <p className="truncate text-[11px] text-slate-500">
                {c.messageCount} msgs · {timeAgo(c.updatedAt)}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c);
              }}
              className="rounded-md p-1 text-slate-600 opacity-0 transition hover:text-rose-300 group-hover:opacity-100"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
