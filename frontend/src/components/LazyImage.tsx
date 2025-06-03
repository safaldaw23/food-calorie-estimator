import { useState, useRef, useEffect } from 'react'
import { Box, Skeleton } from '@mui/material'

interface LazyImageProps {
  src: string
  alt: string
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
  fallback?: string
  className?: string
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 'auto',
  style,
  fallback = '/placeholder.jpg',
  className
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  return (
    <Box
      ref={imgRef}
      sx={{
        width,
        height: isLoaded ? 'auto' : height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1,
      }}
    >
      {!isLoaded && (
        <Skeleton
          variant="rectangular"
          width={width}
          height={height}
          sx={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      
      {isInView && (
        <img
          src={hasError ? fallback : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: 'auto',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            ...style,
          }}
          className={className}
        />
      )}
    </Box>
  )
}

export default LazyImage 