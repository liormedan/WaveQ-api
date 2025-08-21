export const translations = {
  he: {
    uploadedFiles: 'קבצים שהועלו',
    noUploadedFiles: 'אין קבצים שהועלו עדיין',
    uploadPrompt: 'העלה קובץ אודיו כדי לראות אותו כאן',
    totalFiles: '{count} קובץ הועלה בסך הכל',
    filterAll: 'כל הקבצים',
    filterUploaded: 'הועלו',
    filterProcessed: 'עובדו',
    filterError: 'שגיאות',
    statusUploaded: 'הועלה',
    statusProcessed: 'עובד',
    statusError: 'שגיאה',
    statusUnknown: 'לא ידוע',
    dashboardTitle: 'לוח בקרה',
    totalRequests: 'סה"כ בקשות',
    pendingRequests: 'בקשות ממתינות',
    completedRequests: 'בקשות שהושלמו',
    successRate: 'אחוז הצלחה',
    loading: 'טוען...'
  },
  en: {
    uploadedFiles: 'Uploaded Files',
    noUploadedFiles: 'No files uploaded yet',
    uploadPrompt: 'Upload an audio file to see it here',
    totalFiles: '{count} files uploaded',
    filterAll: 'All files',
    filterUploaded: 'Uploaded',
    filterProcessed: 'Processed',
    filterError: 'Errors',
    statusUploaded: 'Uploaded',
    statusProcessed: 'Processed',
    statusError: 'Error',
    statusUnknown: 'Unknown',
    dashboardTitle: 'Dashboard',
    totalRequests: 'Total Requests',
    pendingRequests: 'Pending Requests',
    completedRequests: 'Completed Requests',
    successRate: 'Success Rate',
    loading: 'Loading...'
  }
} as const;

export type Lang = keyof typeof translations;
