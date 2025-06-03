import React, { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
} from '@mui/material'
import {
  CloudUpload,
  CheckCircle,
  Error,
  Delete,
  Close,
  FileUpload,
  Analytics,
  History,
} from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { makeApiRequest } from '../config/api'

interface BatchFile {
  file: File
  preview: string
  status: 'waiting' | 'processing' | 'completed' | 'error'
}

interface BatchResult {
  filename: string
  predicted_food: string
  confidence: number
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  error?: string
}

interface BatchStatus {
  batch_id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  completed: number
  results?: BatchResult[]
  error?: string
}

const BatchAnalyze = () => {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [batchHistory, setBatchHistory] = useState<any[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'waiting' as const
    }))
    setFiles(prev => [...prev, ...newFiles])
    setError(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxFiles: 20,
    multiple: true
  })

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      URL.revokeObjectURL(newFiles[index].preview)
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const clearAll = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview))
    setFiles([])
    setBatchStatus(null)
    setError(null)
  }

  const uploadBatch = async () => {
    if (files.length === 0) {
      setError('Please select at least one image')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('images', file)
      })

      console.log('🚀 Starting batch upload...')
      const response = await makeApiRequest('/batch/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Don't set Content-Type for FormData
      })

      const responseData = await response.json()
      console.log('✅ Batch upload response:', responseData)
      
      const { batch_id } = responseData
      setBatchStatus({
        batch_id,
        status: 'queued',
        progress: 0,
        total: files.length,
        completed: 0
      })

      // Start polling for status updates
      pollBatchStatus(batch_id)

    } catch (err: any) {
      console.error('❌ Batch upload failed:', err)
      let errorMessage = 'Failed to upload batch. Please try again.'
      
      if (err.message?.includes('Load Balancer')) {
        errorMessage = 'Load Balancer is currently unavailable. Please try again later.'
      } else if (err.message?.includes('backend servers')) {
        errorMessage = 'All backend servers are currently down. Please try again later.'
      }
      
      setError(errorMessage)
      setIsUploading(false)
    }
  }

  const pollBatchStatus = async (batchId: string) => {
    const maxPolls = 300 // 5 minutes at 1-second intervals
    let pollCount = 0

    const poll = async () => {
      try {
        console.log(`🔍 Polling batch status: ${batchId}`)
        const response = await makeApiRequest(`/batch/status/${batchId}`)
        const status = await response.json()
        console.log('📊 Batch status:', status)
        setBatchStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          setIsUploading(false)
          return
        }

        if (pollCount < maxPolls && (status.status === 'queued' || status.status === 'processing')) {
          pollCount++
          setTimeout(poll, 1000)
        } else {
          setIsUploading(false)
          setError('Batch processing timed out')
        }
      } catch (err) {
        console.error('❌ Batch status polling failed:', err)
        setIsUploading(false)
        setError('Failed to check batch status')
      }
    }

    poll()
  }

  const loadBatchHistory = async () => {
    try {
      console.log('📚 Loading batch history...')
      const response = await makeApiRequest('/batch/history')
      const responseData = await response.json()
      console.log('✅ Batch history loaded:', responseData)
      setBatchHistory(responseData.batches || [])
      setShowHistory(true)
    } catch (err: any) {
      console.error('❌ Failed to load batch history:', err)
      let errorMessage = 'Failed to load batch history'
      
      if (err.message?.includes('Load Balancer')) {
        errorMessage = 'Load Balancer is currently unavailable. Please try again later.'
      }
      
      setError(errorMessage)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'failed': return 'error'
      default: return 'info'
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(file.preview))
    }
  }, [])

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1200,
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Analytics color="primary" />
          🚀 Batch Image Analysis
        </Typography>
        
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={loadBatchHistory}
          sx={{ minWidth: 120 }}
        >
          History
        </Button>
      </Box>

      {/* Upload Area */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop images here...' : 'Drag & drop images here'}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              or click to select files
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supports: JPG, PNG, GIF, BMP, WebP (Max 20 files)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {files.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Selected Files ({files.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Delete />}
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<FileUpload />}
                  onClick={uploadBatch}
                  disabled={isUploading || files.length === 0}
                >
                  Start Analysis
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {files.map((file, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    flex: '0 1 300px',
                    minWidth: 250
                  }}
                >
                  <Paper 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 8
                      }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        noWrap 
                        title={file.file.name}
                        sx={{ fontWeight: 'medium' }}
                      >
                        {file.file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.file.size)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                      color="error"
                    >
                      <Close />
                    </IconButton>
                  </Paper>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Batch Status */}
      {batchStatus && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Batch Processing Status
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip 
                label={batchStatus.status.toUpperCase()}
                color={getStatusColor(batchStatus.status) as any}
                size="small"
              />
              <Typography variant="body2">
                {batchStatus.completed} / {batchStatus.total} completed
              </Typography>
            </Box>

            <LinearProgress 
              variant="determinate" 
              value={batchStatus.progress || 0}
              sx={{ mb: 2, height: 8, borderRadius: 4 }}
            />

            <Typography variant="body2" color="text.secondary">
              Batch ID: {batchStatus.batch_id}
            </Typography>

            {batchStatus.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {batchStatus.error}
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {batchStatus?.status === 'completed' && batchStatus.results && batchStatus.results.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analysis Results
            </Typography>
            
            <List>
              {batchStatus.results.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {result.error ? (
                        <Error color="error" />
                      ) : (
                        <CheckCircle color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={result.filename}
                      secondary={
                        result.error ? (
                          <Typography color="error" variant="body2">
                            Error: {result.error}
                          </Typography>
                        ) : (
                          <Box>
                            <Typography variant="body2">
                              <strong>{result.predicted_food}</strong> ({(result.confidence * 100).toFixed(1)}% confidence)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Calories: {result.nutrition.calories} | 
                              Protein: {result.nutrition.protein}g | 
                              Carbs: {result.nutrition.carbs}g | 
                              Fat: {result.nutrition.fat}g
                            </Typography>
                          </Box>
                        )
                      }
                    />
                  </ListItem>
                  {index < batchStatus.results!.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* History Dialog */}
      <Dialog 
        open={showHistory} 
        onClose={() => setShowHistory(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Batch Processing History
        </DialogTitle>
        <DialogContent>
          {batchHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No batch history found
            </Typography>
          ) : (
            <List>
              {batchHistory.map((batch, index) => (
                <React.Fragment key={batch.batch_id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            Batch {batch.batch_id.slice(-8)}
                          </Typography>
                          <Chip 
                            label={batch.status}
                            color={getStatusColor(batch.status) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {batch.completed || 0} / {batch.total || 0} files processed
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Created: {batch.created_at ? new Date(batch.created_at).toLocaleString() : 'Unknown'}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < batchHistory.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default BatchAnalyze 