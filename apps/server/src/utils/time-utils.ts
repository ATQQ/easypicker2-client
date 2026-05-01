import dayjs from 'dayjs'

export function diffMonth(end: any, start: any) {
  return dayjs(new Date(end)).diff(dayjs(new Date(start)), 'month', true)
}
