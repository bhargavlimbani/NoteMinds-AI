import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit, History, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../services/chat.service';
import { errorMessage } from '../services/api';
import { ChatMessage, TypingIndicator } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { ConversationList } from '../components/chat/ConversationList';
import { ConfirmDialog } from '../components/ui/Modal';
import type { ConversationSummary, Message } from '../types';

const SUGGESTIONS = [
  'Explain 3NF from my notes',
  'What should I study next?',
  'Give me important points from DBMS Unit 3',
  'Generate 5 MCQs from Normalization',
  'What is deadlock? Use my OS notes',
  'Which of my subjects is weakest?',
];

export default function ChatPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await chatApi.conversations());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    chatApi
      .conversation(conversationId)
      .then((c) => !cancelled && setMessages(c.messages))
      .catch((err) => {
        toast.error(errorMessage(err));
        navigate('/chat');
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text: string) => {
    const optimistic: Message = { id: `tmp-${Date.now()}`, role: 'USER', content: text, toolCalls: null, createdAt: new Date().toISOString(), pending: true };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await chatApi.send(text, conversationId ?? null);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), res.userMessage, { ...res.assistantMessage, toolCalls: res.toolCalls }]);
      if (!conversationId) navigate(`/chat/${res.conversation.id}`, { replace: true });
      void loadConversations();
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await chatApi.remove(deleting.id);
      toast.success('Conversation deleted');
      if (deleting.id === conversationId) navigate('/chat');
      setDeleting(null);
      void loadConversations();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const select = (id: string) => {
    navigate(`/chat/${id}`);
    setHistoryOpen(false);
  };

  const sidebar = (
    <ConversationList conversations={conversations} activeId={conversationId ?? null} onSelect={select} onNew={() => { navigate('/chat'); setHistoryOpen(false); }} onDelete={setDeleting} loading={listLoading} />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* History sidebar (desktop) */}
      <aside className="glass hidden w-72 shrink-0 flex-col p-3 lg:flex">
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <History className="h-4 w-4" /> Chat history
        </div>
        {sidebar}
      </aside>

      {/* Mobile history drawer */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 flex w-80 flex-col bg-bg-elevated/95 p-4 backdrop-blur-2xl" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Chat history</span>
                <button onClick={() => setHistoryOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat area */}
      <section className="glass relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button onClick={() => setHistoryOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden" aria-label="History">
            <History className="h-5 w-5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
            <BrainCircuit className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{conversations.find((c) => c.id === conversationId)?.title ?? 'StudyMCP assistant'}</p>
            <p className="text-[11px] text-slate-500">Gemini · tools via Model Context Protocol · answers from your own notes</p>
          </div>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> MCP connected
          </span>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && !sending && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative mb-5">
                <div className="absolute inset-0 animate-pulse-soft rounded-3xl bg-primary-500/30 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 text-white shadow-glow">
                  <Sparkles className="h-9 w-9" />
                </div>
              </motion.div>
              <h2 className="text-xl font-bold">Hi {user?.name.split(' ')[0]}, what are we studying today?</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">I can explain topics from your notes, quiz you, track progress and tell you what to study next - all using your own data.</p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => send(s)}
                    className="glass glass-hover px-4 py-3 text-left text-sm text-slate-200"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} userName={user?.name ?? 'You'} />
          ))}
          {sending && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-3 sm:p-4">
          <ChatInput onSend={send} disabled={sending} />
          <p className="mt-2 text-center text-[11px] text-slate-500">Shift + Enter for a new line · AI answers can make mistakes, verify with your notes.</p>
        </div>
      </section>

      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} danger title="Delete this conversation?" description="All messages in it will be removed." confirmLabel="Delete" />
    </div>
  );
}
