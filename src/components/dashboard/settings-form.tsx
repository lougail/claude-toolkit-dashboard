'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, FolderOpen, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardConfig } from '@/lib/types'

interface SettingsFormProps {
  initialConfig: DashboardConfig
}

export function SettingsForm({ initialConfig }: SettingsFormProps) {
  const [config, setConfig] = useState<DashboardConfig>(initialConfig)
  const [newDir, setNewDir] = useState('')
  const [newExclude, setNewExclude] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved: DashboardConfig = await res.json()
      setConfig(saved)
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  function addDir() {
    const dir = newDir.trim()
    if (!dir || !dir.startsWith('/') || config.projectDirs.includes(dir)) return
    setConfig({ ...config, projectDirs: [...config.projectDirs, dir] })
    setNewDir('')
  }

  function removeDir(index: number) {
    setConfig({
      ...config,
      projectDirs: config.projectDirs.filter((_, i) => i !== index),
    })
  }

  function addExclude() {
    const pattern = newExclude.trim()
    if (!pattern || config.excludePatterns.includes(pattern)) return
    setConfig({ ...config, excludePatterns: [...config.excludePatterns, pattern] })
    setNewExclude('')
  }

  function removeExclude(index: number) {
    setConfig({
      ...config,
      excludePatterns: config.excludePatterns.filter((_, i) => i !== index),
    })
  }

  function handleReset() {
    setConfig(initialConfig)
    setStatus('idle')
  }

  const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Project directories */}
      <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-200">Project Directories</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Directories to scan for git repositories (one level deep). Projects already registered in ~/.claude/projects/ are always included.
        </p>

        <div className="space-y-2 mb-3">
          {config.projectDirs.map((dir, i) => (
            <div
              key={`${dir}-${i}`}
              className="flex items-center gap-2 rounded-md border border-white/[0.04] bg-zinc-900/30 px-3 py-2"
            >
              <span className="text-sm text-zinc-300 font-mono flex-1 truncate">{dir}</span>
              <button
                type="button"
                onClick={() => removeDir(i)}
                className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                aria-label={`Remove ${dir}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="new-dir">New directory path</label>
          <input
            id="new-dir"
            type="text"
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDir()}
            placeholder="/absolute/path/to/directory"
            className="flex-1 rounded-md border border-white/[0.06] bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={addDir}
            disabled={!newDir.trim().startsWith('/')}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </section>

      {/* Exclude patterns */}
      <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-200 mb-1">Exclude Patterns</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Directory names to skip when scanning for projects.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {config.excludePatterns.map((pattern, i) => (
            <span
              key={`${pattern}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.04] bg-zinc-900/30 px-2.5 py-1 text-xs text-zinc-400 font-mono"
            >
              {pattern}
              <button
                type="button"
                onClick={() => removeExclude(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
                aria-label={`Remove pattern ${pattern}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <label className="sr-only" htmlFor="new-exclude">New exclude pattern</label>
          <input
            id="new-exclude"
            type="text"
            value={newExclude}
            onChange={(e) => setNewExclude(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExclude()}
            placeholder="pattern_name"
            className="flex-1 rounded-md border border-white/[0.06] bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={addExclude}
            disabled={!newExclude.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </section>

      {/* Scan options */}
      <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-200 mb-4">Scan Options</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.scanClaudeProjects}
            onChange={(e) =>
              setConfig({ ...config, scanClaudeProjects: e.target.checked })
            }
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-blue-500 focus:ring-blue-500/20 focus:ring-offset-0"
          />
          <div>
            <span className="text-sm text-zinc-200">Scan ~/.claude/projects/</span>
            <p className="text-xs text-zinc-500 mt-0.5">
              Include projects registered by Claude Code automatically
            </p>
          </div>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
            hasChanges
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          )}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}

        {status === 'saved' && (
          <span className="text-xs text-emerald-400">Configuration saved</span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-400">Failed to save</span>
        )}
      </div>
    </div>
  )
}
