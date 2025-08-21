'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/components/language-provider'

interface Stats {
  total_requests: number
  pending_requests: number
  completed_requests: number
  success_rate: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const { t } = useTranslation()

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats) {
    return <p className="p-4">{t('loading')}</p>
  }

  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-bold mb-4">{t('dashboardTitle')}</h1>
      <ul className="space-y-1">
        <li>{t('totalRequests')}: {stats.total_requests}</li>
        <li>{t('pendingRequests')}: {stats.pending_requests}</li>
        <li>{t('completedRequests')}: {stats.completed_requests}</li>
        <li>{t('successRate')}: {stats.success_rate}%</li>
      </ul>
    </div>
  )
}
