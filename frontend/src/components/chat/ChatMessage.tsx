import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { BrainCircuit, ChevronDown, Wrench } from 'lucide-react';
import { cn } from '../../utils/cn';
import { initials, timeAgo, toolMeta } from '../../utils/format';
import { McpFlow } from './McpFlow';
import type { Message } from '../../types';

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <Avatar />
      <div className="glass flex items-center gap-1.5 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-2 w-2 rounded-full bg-primary-300" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
        ))}
        <span className="ml-2 text-xs text-slate-400">Gemini is thinking · checking your data through MCP</span>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-indigo-500 to-accent-500 text-white shadow-glow">
      <BrainCircuit className="h-4.5 w-4.5" />
    </div>
  );
}

export function ChatMessage({ message, userName }: { message: Message; userName: string }) {
  const isUser = message.role === 'USER';
  const [showFlow, setShowFlow] = useState(false);
  const toolCalls = message.toolCalls ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-3', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-bold text-white ring-1 ring-white/10">{initials(userName)}</div>
      ) : (
        <Avatar />
      )}

      <div className={cn('max-w-[85%] sm:max-w-[75%]', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-3 text-left text-sm shadow-lg',
            isUser
              ? 'rounded-br-md bg-gradient-to-br from-primary-600 to-indigo-600 text-white'
              : 'glass rounded-bl-md text-slate-200',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="chat-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && toolCalls.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {toolCalls.map((call, i) => (
                <span key={`${call.tool}-${i}`} className={cn('chip', call.ok ? 'border-accent-400/30 bg-accent-500/10 text-accent-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300')} title={toolMeta[call.tool]?.description}>
                  <Wrench className="h-3 w-3" /> MCP · {call.tool}
                  <span className="text-[10px] opacity-70">{call.durationMs}ms</span>
                </span>
              ))}
              <button onClick={() => setShowFlow((s) => !s)} className="chip border-white/10 bg-white/5 text-slate-400 hover:text-white">
                How it worked <ChevronDown className={cn('h-3 w-3 transition-transform', showFlow && 'rotate-180')} />
              </button>
            </div>
            {showFlow && <McpFlow toolCalls={toolCalls} />}
          </div>
        )}

        <p className={cn('mt-1 text-[11px] text-slate-500', isUser ? 'pr-1' : 'pl-1')}>{timeAgo(message.createdAt)}</p>
      </div>
    </motion.div>
  );
}
