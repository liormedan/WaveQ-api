import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function DELETE(req: NextRequest, { params }: { params: { requestId: string } }) {
  const res = await fetch(`${API_BASE}/api/audio/requests/${params.requestId}`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
