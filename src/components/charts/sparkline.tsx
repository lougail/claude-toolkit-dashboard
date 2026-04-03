'use client'

import { cn } from '@/lib/utils'

interface SparklineProps {
  /** Array of numeric data points */
  data: number[]
  /** SVG width */
  width?: number
  /** SVG height */
  height?: number
  /** Stroke color class (tailwind) */
  color?: string
  /** Accessible label */
  label: string
  className?: string
}

/**
 * Lightweight SVG sparkline — no dependencies, just a polyline.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'stroke-blue-400',
  label,
  className,
}: SparklineProps) {
  if (data.length < 2) return null

  const max = Math.max(...data, 1) // avoid division by zero
  const padding = 2
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * innerW
      const y = padding + innerH - (val / max) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn('shrink-0', className)}
    >
      <polyline
        points={points}
        fill="none"
        className={cn(color, 'opacity-80')}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
