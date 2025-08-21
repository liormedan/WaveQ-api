'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/components/language-provider'
import { 
  FileAudio, 
  FileText, 
  Calendar, 
  Clock, 
  Download, 
  Trash2, 
  Upload as UploadIcon,
  Music,
  Volume2,
  File
} from 'lucide-react'

interface UploadedFile {
  id: string
  name: string
  originalName: string
  uploadedAt: Date
  size: number
  type: string
  status: 'uploaded' | 'processed' | 'error'
  fileType: string
  duration?: string
  quality?: string
  operations?: string[]
  downloadUrl?: string
}

interface UploadsSectionProps {
  theme?: 'dark' | 'light'
}

export function UploadsSection({ theme = 'light' }: UploadsSectionProps) {
  const { t, lang } = useTranslation()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | 'uploaded' | 'processed' | 'error'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadUploadedFiles()
    // Listen for new uploads
    const handleStorageChange = () => loadUploadedFiles()
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const loadUploadedFiles = () => {
    const stored = localStorage.getItem('WAVEQ_UPLOADED_FILES')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const filesWithDates = parsed.map((file: any) => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        }))
        setUploadedFiles(filesWithDates)
      } catch (error) {
        console.error('Error loading uploaded files:', error)
        setUploadedFiles([])
      }
    }
  }

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(file => file.id !== fileId)
    setUploadedFiles(updatedFiles)
    localStorage.setItem('WAVEQ_UPLOADED_FILES', JSON.stringify(updatedFiles))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US'
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US'
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('audio')) return <Music className="w-5 h-5" />
    if (fileType.includes('text')) return <FileText className="w-5 h-5" />
    return <File className="w-5 h-5" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{t('statusUploaded')}</span>
      case 'processed':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">{t('statusProcessed')}</span>
      case 'error':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">{t('statusError')}</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{t('statusUnknown')}</span>
    }
  }

  const getFilteredAndSortedFiles = () => {
    let filtered = uploadedFiles
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(file => file.status === filterStatus)
    }
    
    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.fileType.localeCompare(b.fileType)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }

  const filteredFiles = getFilteredAndSortedFiles()

  if (uploadedFiles.length === 0) {
    return (
      <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardContent className="p-8 text-center">
          <UploadIcon className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            {t('noUploadedFiles')}
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('uploadPrompt')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t('uploadedFiles')}
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('totalFiles', { count: uploadedFiles.length })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">{t('filterAll')}</option>
            <option value="uploaded">{t('filterUploaded')}</option>
            <option value="processed">{t('filterProcessed')}</option>
            <option value="error">{t('filterError')}</option>
          </select>
          
          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-3 py-2 rounded-lg border text-sm ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="date">תאריך</option>
            <option value="name">שם</option>
            <option value="size">גודל</option>
            <option value="type">סוג</option>
          </select>
          
          {/* Sort Order */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`${theme === 'dark' ? 'border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>

      {/* Files Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredFiles.map((file) => (
          <Card 
            key={file.id} 
            className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} hover:shadow-lg transition-shadow`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {file.name}
                    </CardTitle>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                      {file.originalName}
                    </p>
                  </div>
                </div>
                {getStatusBadge(file.status)}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* File Info */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>גודל:</span>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{formatFileSize(file.size)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>סוג:</span>
                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{file.fileType.toUpperCase()}</span>
                  </div>
                  
                  {file.duration && (
                    <div className="flex items-center justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>משך:</span>
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{file.duration}</span>
                    </div>
                  )}
                  
                  {file.quality && (
                    <div className="flex items-center justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>איכות:</span>
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{file.quality}</span>
                    </div>
                  )}
                </div>
                
                {/* Upload Time */}
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3 h-3" />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    {formatDate(file.uploadedAt)}
                  </span>
                  <Clock className="w-3 h-3" />
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                    {formatTime(file.uploadedAt)}
                  </span>
                </div>
                
                {/* Operations */}
                {file.operations && file.operations.length > 0 && (
                  <div className="space-y-1">
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      פעולות שבוצעו:
                    </span>
                    <div className="flex flex-wrap gap-1">
                                             {file.operations.slice(0, 2).map((op, index) => (
                         <span key={index} className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-full">
                           {op}
                         </span>
                       ))}
                       {file.operations.length > 2 && (
                         <span className="px-2 py-1 text-xs font-medium border border-gray-300 rounded-full">
                           +{file.operations.length - 2}
                         </span>
                       )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {file.downloadUrl && (
                    <Button asChild size="sm" className="flex-1">
                      <a href={file.downloadUrl} download={file.name}>
                        <Download className="w-4 h-4 mr-2" />
                        הורד
                      </a>
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-500 hover:text-red-700 hover:border-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Empty State for Filtered Results */}
      {filteredFiles.length === 0 && uploadedFiles.length > 0 && (
        <Card className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <CardContent className="p-8 text-center">
            <FileAudio className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-300'}`} />
            <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              לא נמצאו קבצים עם הפילטר הנוכחי
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              נסה לשנות את הפילטרים או לחזור ל"כל הקבצים"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
