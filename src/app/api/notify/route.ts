import { execFile } from 'node:child_process'
import { NextResponse } from 'next/server'

/**
 * POST /api/notify — Send a macOS notification via osascript.
 * Body: { title: string, message: string }
 */
export async function POST(request: Request) {
  const body = await request.json() as { title?: string; message?: string }
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : 'Dashboard'
  const message = typeof body.message === 'string' ? body.message.slice(0, 500) : ''

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // osascript display notification (macOS only)
  const script = `display notification "${escapeAppleScript(message)}" with title "${escapeAppleScript(title)}"`

  try {
    await new Promise<void>((resolve, reject) => {
      execFile('osascript', ['-e', script], { timeout: 5000 }, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'notification failed' }, { status: 500 })
  }
}

function escapeAppleScript(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
