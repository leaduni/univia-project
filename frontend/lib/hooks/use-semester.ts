import { useMemo } from 'react'

export function useSemesterRecurrence(startDateStr: string, endDateStr: string) {
  const dates = useMemo(() => {
    if (!startDateStr || !endDateStr) return { semesterStart: null, semesterEnd: null, isDateInSemester: () => false, generateRecurringDates: () => [] }
    
    const start = new Date(startDateStr)
    const end = new Date(endDateStr)
    
    return {
      semesterStart: start,
      semesterEnd: end,
      isDateInSemester: (dateStr: string) => {
        const d = new Date(dateStr)
        return d >= start && d <= end
      },
      generateRecurringDates: (dayOfWeek: number) => { // 0 = Sun, 1 = Mon...
        const generated: Date[] = []
        let current = new Date(start)
        
        // Find first occurrence of dayOfWeek
        const diff = (dayOfWeek + 7 - current.getDay()) % 7
        current.setDate(current.getDate() + diff)
        
        while (current <= end) {
          generated.push(new Date(current))
          current.setDate(current.getDate() + 7)
        }
        
        return generated
      }
    }
  }, [startDateStr, endDateStr])

  return dates
}
