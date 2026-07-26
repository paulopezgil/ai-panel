import { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

interface Props {
  lines: string[]
  onClose?: () => void
}

export default function TerminalPanel({ lines, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Terminal</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Close
          </button>
        )}
      </div>
      <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs leading-relaxed space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="text-zinc-400 whitespace-pre-wrap">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
