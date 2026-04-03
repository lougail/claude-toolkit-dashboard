'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TokenUsageChartProps {
  data: { date: string; input: number; output: number }[]
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        No token usage data available
      </div>
    )
  }

  return (
    <div role="img" aria-label="Token usage over 30 days">
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="inputGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outputGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickFormatter={(v: string) => v.slice(5)}
          axisLine={{ stroke: '#27272a' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
          axisLine={{ stroke: '#27272a' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#a1a1aa' }}
        />
        <Area
          type="monotone"
          dataKey="input"
          stroke="#3b82f6"
          fill="url(#inputGradient)"
          strokeWidth={1.5}
          name="Input tokens"
        />
        <Area
          type="monotone"
          dataKey="output"
          stroke="#8b5cf6"
          fill="url(#outputGradient)"
          strokeWidth={1.5}
          name="Output tokens"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
  )
}
