import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:8002'

export async function GET(req: NextRequest, { params }: { params: { requestId: string } }) {
  const res = await fetch(`${API_BASE}/api/audio/download/${params.requestId}`)
  const arrayBuffer = await res.arrayBuffer()
  const headers: Record<string, string> = {}
  const contentType = res.headers.get('content-type')
  if (contentType) headers['Content-Type'] = contentType
  const disposition = res.headers.get('content-disposition')
  if (disposition) headers['Content-Disposition'] = disposition
  return new NextResponse(arrayBuffer, { status: res.status, headers })
}
