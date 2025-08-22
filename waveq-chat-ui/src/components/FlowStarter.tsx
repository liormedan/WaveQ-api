'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

export type StepState = 'queued' | 'running' | 'completed'

interface StepStatus {
  name: string
  status: StepState
}

interface FlowStarterProps {
  flowName: string
}

export function FlowStarter({ flowName }: FlowStarterProps) {
  const [steps, setSteps] = useState<StepStatus[]>([])
  const [requestId, setRequestId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const startFlow = async () => {
    try {
      const res = await fetch(`/api/workflows/${flowName}`, { method: 'POST' })
      const data = await res.json()
      const id = data.request_id || data.id
      if (!id) return
      setRequestId(id)
      connectSocket(id)
    } catch (err) {
      console.error('Failed to start flow', err)
    }
  }

  const connectSocket = (id: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws/status/${id}`)
    wsRef.current = ws
    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data)
        const step = msg.step || msg.name
        const status: StepState = msg.status
        if (!step || !status) return
        setSteps(prev => {
          const existing = prev.find(s => s.name === step)
          if (existing) {
            return prev.map(s => (s.name === step ? { ...s, status } : s))
          }
          return [...prev, { name: step, status }]
        })
      } catch (e) {
        console.error('Bad message', e)
      }
    }
    ws.onclose = () => {
      wsRef.current = null
    }
  }

  const statusColor = (status: StepState) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={startFlow}>Start</Button>
      {requestId && (
        <ul className="space-y-1">
          {steps.map(step => (
            <li key={step.name} className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${statusColor(step.status)}`}></span>
              <span>{step.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FlowStarter
