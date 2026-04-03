import { NextResponse } from 'next/server'
import { readDashboardConfig, writeDashboardConfig } from '@/lib/config'

export async function GET() {
  const config = await readDashboardConfig()
  return NextResponse.json(config)
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid config' }, { status: 400 })
    }
    await writeDashboardConfig(body as Parameters<typeof writeDashboardConfig>[0])
    const saved = await readDashboardConfig()
    return NextResponse.json(saved)
  } catch {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
