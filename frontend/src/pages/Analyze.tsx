import { useState, useEffect } from 'react'
import {
  Typography,
  Box,
  Paper,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material'
import { useDropzone } from 'react-dropzone'
import LazyImage from '../components/LazyImage'
import { makeApiRequest, getApiBaseUrl } from '../config/api'

interface PredictionResult {
  food: string
  calories: number
  protein: number
  carbs: number
  fat: number
  image_url: string
  server_port?: number
}

const Analyze = () => {
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setError('No file selected')
      return
    }

    const file = acceptedFiles[0]
    console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Create preview URL
    setPreviewUrl(URL.createObjectURL(file))

    setLoading(true)
    setError(null)
    setPrediction(null)

    const formData = new FormData()
    formData.append('image', file)

    try {
      console.log('🚀 Starting prediction request via Load Balancer...')
      
      const response = await makeApiRequest('/predict', {
        method: 'POST',
        body: formData,
        headers: {} // Don't set Content-Type for FormData
      })
      
      const data = await response.json()
      console.log('✅ Response received:', data)
      
      // Extract first prediction from the predictions array
      if (data.predictions && data.predictions.length > 0) {
        setPrediction(data.predictions[0])
      } else {
        setPrediction(data)
      }
      
      // Log load balancer info
      if (data.load_balancer_info) {
        console.log(`🎯 Request handled by: ${data.load_balancer_info.handled_by}`)
        console.log(`📊 Load Balancer Port: ${data.load_balancer_info.load_balancer_port}`)
      }
      
    } catch (error: any) {
      console.error('❌ Prediction failed:', error)
      let errorMessage = 'Failed to analyze image. Please try again.'
      
      if (error.message?.includes('Load Balancer')) {
        errorMessage = 'Load Balancer is currently unavailable. Please try again later.'
      } else if (error.message?.includes('backend servers')) {
        errorMessage = 'All backend servers are currently down. Please try again later.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    multiple: false,
  })

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography 
        variant="h4" 
        gutterBottom
        sx={{
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
          textAlign: 'center',
          mb: { xs: 2, sm: 3, md: 4 },
        }}
      >
        Analyze Food Image
      </Typography>

      <Paper
        {...getRootProps()}
        sx={{
          p: { xs: 3, sm: 4, md: 6 },
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? '#f0f9ff' : 'white',
          border: '2px dashed #90caf9',
          borderRadius: 2,
          minHeight: { xs: 120, sm: 150, md: 200 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '800px',
          mx: 'auto',
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <CircularProgress />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
            }}
          >
            {isDragActive
              ? 'Drop the image here'
              : 'Drag and drop an image here, or click to select'}
          </Typography>
        )}
      </Paper>

      {error && (
        <Typography 
          color="error" 
          sx={{ 
            mt: 2, 
            textAlign: 'center',
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }}
        >
          {error}
        </Typography>
      )}

      {(previewUrl || (prediction && prediction.image_url)) && (
        <Box 
          sx={{ 
            mt: { xs: 3, sm: 4 }, 
            textAlign: 'center',
            maxWidth: '600px',
            mx: 'auto',
          }}
        >
          <LazyImage
            src={previewUrl || `${getApiBaseUrl()}${prediction?.image_url}`}
            alt="Uploaded food"
            style={{
              width: '100%',
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
        </Box>
      )}

      {prediction && (
        <Box 
          sx={{ 
            mt: { xs: 3, sm: 4 },
            maxWidth: '1000px',
            mx: 'auto',
          }}
        >
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
              textAlign: 'center',
              mb: { xs: 2, sm: 3 },
            }}
          >
            Results for {prediction.food}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: { xs: 2, sm: 2, md: 3 },
              justifyContent: 'center',
            }}
          >
            <Card sx={{ minWidth: { xs: 140, sm: 160, md: 200 }, flex: '1 1 auto', maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                >
                  Calories
                </Typography>
                <Typography 
                  variant="h5"
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {prediction.calories} kcal
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: { xs: 140, sm: 160, md: 200 }, flex: '1 1 auto', maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                >
                  Protein
                </Typography>
                <Typography 
                  variant="h5"
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {prediction.protein}g
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: { xs: 140, sm: 160, md: 200 }, flex: '1 1 auto', maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                >
                  Carbs
                </Typography>
                <Typography 
                  variant="h5"
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {prediction.carbs}g
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: { xs: 140, sm: 160, md: 200 }, flex: '1 1 auto', maxWidth: { xs: 'calc(50% - 8px)', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                >
                  Fat
                </Typography>
                <Typography 
                  variant="h5"
                  sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {prediction.fat}g
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default Analyze 