import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const res = await fetch(`${API_BASE}/api/audio/edit`, {
    method: 'POST',
    body: formData
  })

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  }
  const blob = await res.blob()
  return new NextResponse(blob, { status: res.status })
}
