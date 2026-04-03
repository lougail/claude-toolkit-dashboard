import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertCircle className="h-10 w-10 text-zinc-500 mb-4" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-zinc-100">Project not found</h1>
      <p className="text-sm text-zinc-500 mt-2 max-w-md">
        This project does not exist or is no longer registered in Claude Code.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-md border border-white/[0.06] bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        Back to overview
      </Link>
    </div>
  )
}
