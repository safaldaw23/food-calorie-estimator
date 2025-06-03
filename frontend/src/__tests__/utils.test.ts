/**
 * @jest-environment jsdom
 */

describe('Utility Functions', () => {
  test('should format file sizes correctly', () => {
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1048576)).toBe('1 MB')
  })

  test('should validate image file extensions', () => {
    const isValidImageFile = (filename: string): boolean => {
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
      const extension = filename.split('.').pop()?.toLowerCase()
      return validExtensions.includes(extension || '')
    }

    expect(isValidImageFile('image.jpg')).toBe(true)
    expect(isValidImageFile('image.png')).toBe(true)
    expect(isValidImageFile('image.gif')).toBe(true)
    expect(isValidImageFile('document.pdf')).toBe(false)
    expect(isValidImageFile('noextension')).toBe(false)
  })

  test('should format nutrition values', () => {
    const formatNutrition = (value: number, unit: string): string => {
      return `${value.toFixed(1)}${unit}`
    }

    expect(formatNutrition(285.7, 'kcal')).toBe('285.7kcal')
    expect(formatNutrition(12.345, 'g')).toBe('12.3g')
  })

  test('should calculate calorie distribution', () => {
    const calculateMacroDistribution = (protein: number, carbs: number, fat: number) => {
      const proteinCal = protein * 4
      const carbsCal = carbs * 4
      const fatCal = fat * 9
      const total = proteinCal + carbsCal + fatCal

      return {
        protein: Math.round((proteinCal / total) * 100),
        carbs: Math.round((carbsCal / total) * 100),
        fat: Math.round((fatCal / total) * 100),
        total
      }
    }

    const result = calculateMacroDistribution(25, 30, 10)
    expect(result.total).toBe(310) // 25*4 + 30*4 + 10*9
    expect(result.protein).toBe(32) // (100/310)*100 ≈ 32%
    expect(result.carbs).toBe(39)   // (120/310)*100 ≈ 39%
    expect(result.fat).toBe(29)     // (90/310)*100 ≈ 29%
  })

  test('should handle API error responses', () => {
    const parseApiError = (error: any): string => {
      if (error.response?.data?.error) {
        return error.response.data.error
      }
      if (error.message) {
        return error.message
      }
      return 'An unexpected error occurred'
    }

    expect(parseApiError({ response: { data: { error: 'Custom error' } } })).toBe('Custom error')
    expect(parseApiError({ message: 'Network error' })).toBe('Network error')
    expect(parseApiError({})).toBe('An unexpected error occurred')
  })
}) 