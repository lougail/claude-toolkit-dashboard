'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X, GitBranch, FileText, Shield, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FEATURE_STATUS_CONFIG } from '@/lib/constants'
import type { Feature } from '@/lib/types'

interface FeatureModalProps {
  feature: Feature | null
  projectName: string | null
  onClose: () => void
}

export function FeatureModal({ feature, projectName, onClose }: FeatureModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const handleClose = useCallback(() => {
    dialogRef.current?.close()
    onClose()
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (feature) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      dialog.close()
    }
  }, [feature])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    function onCancel(e: Event) {
      e.preventDefault()
      handleClose()
    }

    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [handleClose])

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) {
      handleClose()
    }
  }

  const statusConfig = feature ? FEATURE_STATUS_CONFIG[feature.status] : null
  const progress =
    feature && feature.ralph.storiesTotal > 0
      ? Math.round((feature.ralph.storiesDone / feature.ralph.storiesTotal) * 100)
      : 0

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      role="dialog"
      aria-label={feature ? `Feature details: ${feature.slug}` : 'Feature details'}
      onClick={handleBackdropClick}
      className="backdrop:bg-black/60 backdrop:backdrop-blur-sm bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full overflow-visible open:flex items-center justify-center"
    >
      {feature && (
        <div className="w-full max-w-lg mx-auto rounded-xl border border-white/[0.06] bg-zinc-900 p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-100 truncate">
                {feature.slug}
              </h2>
              {projectName && (
                <p className="text-xs text-zinc-500 mt-0.5">{projectName}</p>
              )}
            </div>

            <button
              onClick={handleClose}
              aria-label="Close dialog"
              className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Status badge */}
          {statusConfig && (
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
                  statusConfig.color
                )}
              >
                {statusConfig.label}
              </span>
            </div>
          )}

          <div className="space-y-3">
            {/* PRD */}
            {feature.prd && (
              <div className="flex items-start gap-2.5">
                <FileText className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500">PRD</p>
                  <p className="text-xs text-zinc-300 font-mono truncate">{feature.prd}</p>
                </div>
              </div>
            )}

            {/* Audit */}
            <div className="flex items-start gap-2.5">
              <Shield className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">Audit</p>
                {feature.audit.score !== null ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        feature.audit.score >= 80
                          ? 'text-emerald-400'
                          : feature.audit.score >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                      )}
                    >
                      {feature.audit.score}%
                    </span>
                    {feature.audit.lastDate && (
                      <span className="text-[11px] text-zinc-500">{feature.audit.lastDate}</span>
                    )}
                    {feature.audit.blockers > 0 && (
                      <span className="text-[11px] text-red-400">
                        {feature.audit.blockers} blocker{feature.audit.blockers > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-0.5">No audit yet</p>
                )}
              </div>
            </div>

            {/* Ralph */}
            <div className="flex items-start gap-2.5">
              <Bot className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-zinc-500">Ralph</p>
                <div className="mt-0.5">
                  <span
                    className={cn(
                      'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                      feature.ralph.active
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-zinc-500/10 text-zinc-500'
                    )}
                  >
                    {feature.ralph.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {feature.ralph.branch && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <GitBranch className="h-3 w-3 text-zinc-500" aria-hidden="true" />
                    <span className="text-xs text-zinc-300 font-mono truncate">
                      {feature.ralph.branch}
                    </span>
                  </div>
                )}
                {feature.ralph.storiesTotal > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                      <span>Stories</span>
                      <span>
                        {feature.ralph.storiesDone}/{feature.ralph.storiesTotal}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* PR */}
            {feature.pr !== null && (
              <div className="flex items-start gap-2.5">
                <GitBranch className="h-3.5 w-3.5 text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[11px] text-zinc-500">Pull Request</p>
                  <p className="text-xs text-zinc-300 mt-0.5">#{feature.pr}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
