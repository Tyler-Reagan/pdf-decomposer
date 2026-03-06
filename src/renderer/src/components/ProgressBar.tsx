import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number // 0-1
  className?: string
  color?: string
}

export function ProgressBar({ value, className = '', color = '#6366f1' }: ProgressBarProps) {
  const pct = Math.min(1, Math.max(0, value)) * 100

  return (
    <div
      className={`relative h-2 rounded-full bg-slate-700/60 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  )
}
