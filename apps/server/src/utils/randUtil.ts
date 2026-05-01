const { random, round } = Math

/**
 * 随机生成一个指定长度的数字串
 * @param length
 */
export function randomNumStr(length: number): string {
  let str = ''
  let i = 0
  while (i < length) {
    i += 1
    str += round(random() * 100) % 10
  }
  return str
}
