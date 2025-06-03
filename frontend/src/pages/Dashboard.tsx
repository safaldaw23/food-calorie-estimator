import { useState, useEffect } from 'react'
import {
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { makeApiRequest } from '../config/api'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
)

interface DashboardData {
  totalAnalyses: number
  avgCaloriesPerDay: number
  totalCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  caloriesTrend: { date: string; calories: number }[]
  topFoods: { food: string; count: number; calories: number }[]
  macronutrients: { protein: number; carbs: number; fat: number }
  dailyBreakdown: { date: string; breakfast: number; lunch: number; dinner: number }[]
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [timeRange, setTimeRange] = useState('7') // days

  const fetchDashboardData = async () => {
    console.log('🔍 Dashboard: Starting to fetch data...')
    setLoading(true)
    setError(null)
    try {
      console.log(`🔍 Dashboard: Fetching dashboard data for ${timeRange} days`)
      const response = await makeApiRequest(`/dashboard?days=${timeRange}`)
      const responseData = await response.json()
      console.log('🔍 Dashboard: Response received:', responseData)
      setData(responseData)
      
      // Log load balancer info if available
      if (responseData.load_balancer_info) {
        console.log(`🎯 Dashboard request handled by: ${responseData.load_balancer_info.handled_by}`)
      }
      
    } catch (err: any) {
      console.error('🔍 Dashboard: Error fetching data:', err)
      let errorMessage = 'Error fetching dashboard data. Please try again later.'
      
      if (err.message?.includes('Load Balancer')) {
        errorMessage = 'Load Balancer is currently unavailable. Please try again later.'
      } else if (err.message?.includes('backend servers')) {
        errorMessage = 'All backend servers are currently down. Please try again later.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      console.log('🔍 Dashboard: Loading complete')
    }
  }

  useEffect(() => {
    console.log('🔍 Dashboard: useEffect triggered for fetchDashboardData, timeRange:', timeRange)
    fetchDashboardData()
  }, [timeRange])

  // Chart configurations
  const getCalorieTrendChart = () => {
    if (!data?.caloriesTrend?.length) return null

    return {
      labels: data.caloriesTrend.map(item => item.date),
      datasets: [
        {
          label: 'Daily Calories',
          data: data.caloriesTrend.map(item => item.calories),
          borderColor: '#3f51b5',
          backgroundColor: 'rgba(63, 81, 181, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }

  const getMacronutrientsChart = () => {
    if (!data?.macronutrients) return null

    return {
      labels: ['Protein', 'Carbohydrates', 'Fat'],
      datasets: [
        {
          data: [
            data.macronutrients.protein,
            data.macronutrients.carbs,
            data.macronutrients.fat,
          ],
          backgroundColor: [
            '#ff6384',
            '#36a2eb',
            '#ffcd56',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    }
  }

  const getTopFoodsChart = () => {
    if (!data?.topFoods?.length) return null

    const topFoods = data.topFoods.slice(0, 5)
    return {
      labels: topFoods.map(food => food.food),
      datasets: [
        {
          label: 'Number of Analyses',
          data: topFoods.map(food => food.count),
          backgroundColor: [
            '#ff6384',
            '#36a2eb',
            '#ffcd56',
            '#4bc0c0',
            '#9966ff',
          ],
          borderWidth: 1,
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: false,
      },
    },
  }

  // Debug section
  console.log('🔍 Dashboard render state:', { loading, error, hasData: !!data, timeRange })

  if (loading) {
    console.log('🔍 Dashboard: Rendering loading state')
    return (
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Box>
    )
  }

  if (error) {
    console.log('🔍 Dashboard: Rendering error state', { error, hasData: !!data })
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  if (!data) {
    console.log('🔍 Dashboard: No data available')
    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 2, sm: 3, md: 4 },
        }}
      >
        <Alert severity="warning" sx={{ mb: 2 }}>
          No dashboard data available
        </Alert>
        <Typography>No data to display</Typography>
      </Box>
    )
  }

  console.log('🔍 Dashboard: Rendering main content with data:', data)

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1400,
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Success Banner */}
      <Alert severity="success" sx={{ mb: 3 }}>
        📊 Dashboard loaded successfully! Total analyses: {data.totalAnalyses}
      </Alert>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 'bold',
          }}
        >
          📈 Nutrition Analytics Dashboard
        </Typography>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="14">Last 2 weeks</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 3 months</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {data.totalAnalyses}
              </Typography>
              <Typography color="text.secondary">
                Total Analyses
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {Math.round(data.avgCaloriesPerDay)}
              </Typography>
              <Typography color="text.secondary">
                Avg Calories/Day
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {Math.round(data.totalCalories)}
              </Typography>
              <Typography color="text.secondary">
                Total Calories
              </Typography>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {Math.round(data.avgProtein)}g
              </Typography>
              <Typography color="text.secondary">
                Avg Protein/Day
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
        {/* Calorie Trends Chart */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📈 Daily Calorie Trends
            </Typography>
            <Box sx={{ height: 400 }}>
              {getCalorieTrendChart() && (
                <Line data={getCalorieTrendChart()!} options={chartOptions} />
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Second Row - Macronutrients and Top Foods */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Macronutrients Distribution */}
          <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🥗 Macronutrients Distribution
                </Typography>
                <Box sx={{ height: 400 }}>
                  {getMacronutrientsChart() && (
                    <Doughnut data={getMacronutrientsChart()!} options={doughnutOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Top Foods Chart */}
          <Box sx={{ flex: '1 1 400px', minWidth: 400 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🏆 Most Analyzed Foods
                </Typography>
                <Box sx={{ height: 400 }}>
                  {getTopFoodsChart() && (
                    <Bar data={getTopFoodsChart()!} options={chartOptions} />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Quick Insights */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              💡 Quick Insights & Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h5" color="primary">
                  {data.topFoods[0]?.food || 'No data'}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Most Popular Food
                </Typography>
              </Box>
              
              <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h5" color="secondary">
                  {Math.round((data.avgCaloriesPerDay / 2000) * 100)}%
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Daily Goal Progress
                </Typography>
                <Typography variant="body2">
                  {Math.round(data.avgCaloriesPerDay)}/2000 kcal
                </Typography>
              </Box>
              
              <Box sx={{ flex: '1 1 200px', textAlign: 'center', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h5" color="success.main">
                  {(data.totalAnalyses / parseInt(timeRange)).toFixed(1)}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Analyses per Day
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Summary Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">Average Macronutrients per Day</Typography>
                <Typography>Protein: {Math.round(data.avgProtein)}g</Typography>
                <Typography>Carbohydrates: {Math.round(data.avgCarbs)}g</Typography>
                <Typography>Fat: {Math.round(data.avgFat)}g</Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">Total Nutrition Intake</Typography>
                <Typography>Total Protein: {Math.round(data.macronutrients.protein)}g</Typography>
                <Typography>Total Carbs: {Math.round(data.macronutrients.carbs)}g</Typography>
                <Typography>Total Fat: {Math.round(data.macronutrients.fat)}g</Typography>
              </Box>
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography variant="body2" color="text.secondary">Analysis Overview</Typography>
                <Typography>Time Period: {timeRange} days</Typography>
                <Typography>Foods Analyzed: {data.topFoods.length}</Typography>
                <Typography>Avg Daily Analyses: {(data.totalAnalyses / parseInt(timeRange)).toFixed(1)}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default Dashboard