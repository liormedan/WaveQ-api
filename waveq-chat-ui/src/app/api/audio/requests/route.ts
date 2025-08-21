import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const res = await fetch(`${API_BASE}/api/audio/requests${url.search}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
