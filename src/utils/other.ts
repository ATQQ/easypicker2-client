/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
export function debounce(func, wait = 1000, immediate = false) {
  let timeout
  let count = 0
  return function () {
    count += 1
    const context = this
    const args = arguments
    const later = function () {
      timeout = null
      if (count > 0) {
        func.apply(context, args)
        count = 0
      }
    }
    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) {
      func.apply(context, args)
      count = 0
    }
  }
}
