const DEFAULT_TIME_ZONE = 'Asia/Shanghai'

export function getLocalDateString(date: Date = new Date(), timeZone: string = DEFAULT_TIME_ZONE): string {
  const localDate = new Date(date.toLocaleString('en-US', { timeZone }))
  const year = localDate.getFullYear()
  const month = `${localDate.getMonth() + 1}`.padStart(2, '0')
  const day = `${localDate.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const DEFAULT_DECISION_TIME_ZONE = DEFAULT_TIME_ZONE
