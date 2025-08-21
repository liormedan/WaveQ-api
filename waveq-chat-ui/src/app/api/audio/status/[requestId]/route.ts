import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function GET(req: NextRequest, { params }: { params: { requestId: string } }) {
  const res = await fetch(`${API_BASE}/api/audio/status/${params.requestId}`)
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
