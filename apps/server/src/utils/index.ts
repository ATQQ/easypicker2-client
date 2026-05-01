export function throttle(func, delay: number) {
  const timers = {}

  return function (flag, ...args) {
    if (!timers[flag]) {
      func.apply(this, args)
      timers[flag] = setTimeout(() => {
        delete timers[flag]
      }, delay)
    }
  }
}
