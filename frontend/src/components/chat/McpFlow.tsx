import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Database, Plug, Server, Wrench } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ToolCall } from '../../types';

/**
 * Visualises the MCP round-trip for a message:
 * Gemini -> MCP client -> MCP server -> tool -> PostgreSQL -> Gemini -> answer
 */
export function McpFlow({ toolCalls }: { toolCalls: ToolCall[] }) {
  const steps = [
    { icon: BrainCircuit, label: 'Gemini', hint: 'decides a tool is needed' },
    { icon: Plug, label: 'MCP client', hint: 'sends tools/call' },
    { icon: Server, label: 'MCP server', hint: 'validates input' },
    { icon: Wrench, label: toolCalls.map((t) => t.tool).join(', '), hint: 'runs the tool' },
    { icon: Database, label: 'PostgreSQL', hint: 'your data only' },
    { icon: BrainCircuit, label: 'Gemini', hint: 'writes the answer' },
  ];

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 overflow-hidden">
      <div className="glass p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((step, i) => (
            <div key={`${step.label}-${i}`} className="flex items-center gap-1.5">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px]', i === 3 ? 'border-accent-400/40 bg-accent-500/10 text-accent-200' : 'border-white/10 bg-white/5 text-slate-300')}
                title={step.hint}
              >
                <step.icon className="h-3 w-3" />
                <span className="font-medium">{step.label}</span>
              </motion.div>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-600" />}
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {toolCalls.map((call, i) => (
            <details key={`${call.tool}-${i}`} className="rounded-lg border border-white/10 bg-black/20 text-xs">
              <summary className="cursor-pointer px-3 py-2 text-slate-300">
                <span className="font-semibold text-white">{call.tool}</span>
                <span className="text-slate-500"> · input {JSON.stringify(call.input)} · {call.durationMs} ms · {call.ok ? 'ok' : 'error'}</span>
              </summary>
              <pre className="max-h-56 overflow-auto border-t border-white/10 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-400">
                {JSON.stringify(call.output, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
