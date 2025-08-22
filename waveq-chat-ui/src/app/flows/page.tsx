'use client'

import React, { useEffect, useState } from 'react'
import FlowStarter from '@/components/FlowStarter'

export default function FlowsPage() {
  const [flows, setFlows] = useState<string[]>([])

  useEffect(() => {
    const loadFlows = async () => {
      try {
        const res = await fetch('/api/flows')
        const data = await res.json()
        const list = data.flows || data
        if (Array.isArray(list)) {
          setFlows(list)
        }
      } catch (e) {
        console.error('Failed to fetch flows', e)
        setFlows(['example'])
      }
    }
    loadFlows()
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Flows</h1>
      <ul className="space-y-4">
        {flows.map(flow => (
          <li key={flow} className="border p-4 rounded">
            <div className="mb-2 font-medium">{flow}</div>
            <FlowStarter flowName={flow} />
          </li>
        ))}
      </ul>
    </div>
  )
}
