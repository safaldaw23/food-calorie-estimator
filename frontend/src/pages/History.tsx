import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Skeleton,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Alert
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { makeApiRequest } from '../config/api'

interface PredictionHistory {
  id: number
  food: string
  calories: number
  protein: number
  carbs: number
  fat: number
  timestamp: string
}

interface SearchResult {
  id: number
  food: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: number
  timestamp: string
  image_url?: string
}

const History = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [history, setHistory] = useState<PredictionHistory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading] = useState(false)

  const ITEMS_PER_PAGE = 10

  const observer = useRef<IntersectionObserver | null>(null)

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    }, { threshold: 0.1 })
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  const fetchHistory = async (pageNum: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response = await makeApiRequest(`/history?page=${pageNum}&limit=${ITEMS_PER_PAGE}`)
      const data = await response.json()
      const newItems = data.items || data
      
      if (pageNum === 1) {
        setHistory(newItems)
      } else {
        setHistory(prev => [...prev, ...newItems])
      }

      // Check if there are more items
      setHasMore(newItems.length === ITEMS_PER_PAGE)
      
      // Log load balancer info
      if (data.load_balancer_info) {
        console.log(`🎯 History request handled by: ${data.load_balancer_info.handled_by}`)
      }
      
    } catch (error: any) {
      console.error('❌ History fetch failed:', error)
      let errorMessage = 'Error fetching history. Please try again later.'
      
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchHistory()
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await makeApiRequest(`/api/predictions/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data.results || [])
      setIsSearchMode(true)
    } catch (error: any) {
      console.error('❌ Search failed:', error)
      setError('Error searching predictions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setIsSearchMode(false)
    setSearchResults([])
    setError(null)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  useEffect(() => {
    if (!isSearchMode) {
      fetchHistory(1)
    }
  }, [isSearchMode])

  useEffect(() => {
    if (page > 1 && !isSearchMode) {
      fetchHistory(page)
    }
  }, [page, isSearchMode])

  const SkeletonCard = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="40%" height={24} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ minWidth: 80 }}>
              <Skeleton variant="text" width="100%" height={20} />
              <Skeleton variant="text" width="60%" height={24} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  )

  if (loading && history.length === 0) {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 800,
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
          Analysis History
        </Typography>
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 800,
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 2, sm: 3, md: 4 },
          textAlign: 'center',
        }}
      >
        <Typography color="error" sx={{ mt: 4 }}>
          {error}
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 800,
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
        Analysis History
      </Typography>

      {/* Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search for food predictions (e.g., pizza, ice cream)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton onClick={handleClearSearch} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        
        {isSearchMode && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip 
              label={`Search: "${searchQuery}"`} 
              onDelete={handleClearSearch}
              variant="outlined"
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              {searchResults.length} results found
            </Typography>
          </Box>
        )}
      </Box>

      {/* Loading state for search */}
      {searchLoading && (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress />
        </Box>
      )}

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {isSearchMode ? (
        // Search Results
        searchResults.length === 0 && !searchLoading ? (
          <Typography 
            color="text.secondary"
            sx={{ textAlign: 'center', fontSize: { xs: '0.9rem', sm: '1rem' } }}
          >
            No predictions found for "{searchQuery}". Try a different search term.
          </Typography>
        ) : (
          searchResults.map((item) => (
            <Card 
              key={item.id}
              sx={{ mb: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
            >
              <CardContent>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    gap: 2 
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography 
                      variant="h6"
                      sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                    >
                      {item.food}
                    </Typography>
                    <Typography 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                    >
                      {new Date(item.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: { xs: 1, sm: 2 },
                    mt: 2 
                  }}
                >
                  <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Calories
                    </Typography>
                    <Typography 
                      variant="body2"
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.9rem', sm: '1rem' }
                      }}
                    >
                      {item.calories}
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Protein
                    </Typography>
                    <Typography 
                      variant="body2"
                      sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                    >
                      {item.protein}g
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Carbs
                    </Typography>
                    <Typography 
                      variant="body2"
                      sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                    >
                      {item.carbs}g
                    </Typography>
                  </Box>
                  <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    >
                      Fat
                    </Typography>
                    <Typography 
                      variant="body2"
                      sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                    >
                      {item.fat}g
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )
      ) : (
        // Regular History
        history.length === 0 ? (
          <Typography 
            color="text.secondary"
            sx={{ textAlign: 'center', fontSize: { xs: '0.9rem', sm: '1rem' } }}
          >
            No food analysis history yet. Try analyzing some food images!
          </Typography>
        ) : (
          <>
            {history.map((item, index) => {
              const isLast = history.length === index + 1
              return (
                <Card 
                  key={item.id} 
                  ref={isLast ? lastElementRef : null}
                  sx={{ mb: 2, transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
                >
                  <CardContent>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        gap: 2 
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6"
                          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                        >
                          {item.food}
                        </Typography>
                        <Typography 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}
                        >
                          {new Date(item.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        gap: { xs: 1, sm: 2 },
                        mt: 2 
                      }}
                    >
                      <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          Calories
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.9rem', sm: '1rem' }
                          }}
                        >
                          {item.calories}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          Protein
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                        >
                          {item.protein}g
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          Carbs
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                        >
                          {item.carbs}g
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: { xs: 70, sm: 80 }, textAlign: 'center' }}>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                        >
                          Fat
                        </Typography>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                        >
                          {item.fat}g
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )
      )}
    </Box>
  )
}

export default History 