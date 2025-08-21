import { NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function GET() {
  const res = await fetch(`${API_BASE}/api/stats`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
