export function debounce(func, wait = 1000, immediate = false) {
  let timeout
  let count = 0
  return function (this: unknown, ...args: any[]) {
    count += 1
    const later = () => {
      timeout = null
      if (count > 0) {
        func.apply(this, args)
        count = 0
      }
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) {
      func.apply(this, args)
      count = 0
    }
  }
}
