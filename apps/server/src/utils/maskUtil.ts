export type MaskMode = 'none' | 'head1' | 'head_tail' | 'tail'

const ALLOWED_MASK: MaskMode[] = ['none', 'head1', 'head_tail', 'tail']

export function isValidMask(mask: unknown): mask is MaskMode {
  return typeof mask === 'string' && (ALLOWED_MASK as string[]).includes(mask)
}

export function applyMask(value: unknown, mask: MaskMode | string | undefined | null): string {
  if (value === undefined || value === null) {
    return ''
  }
  const str = String(value)
  if (str.length === 0) {
    return ''
  }
  const m: MaskMode = isValidMask(mask) ? mask : 'none'
  switch (m) {
    case 'none':
      return str
    case 'head1':
      return str.length <= 1 ? str : str[0] + '*'.repeat(str.length - 1)
    case 'head_tail': {
      if (str.length <= 1) {
        return str
      }
      if (str.length === 2) {
        return `${str[0]}*`
      }
      return `${str[0]}${'*'.repeat(str.length - 2)}${str[str.length - 1]}`
    }
    case 'tail': {
      const n = str.length
      let keep: number
      if (n <= 1)
        keep = 0
      else if (n === 2)
        keep = 1
      else if (n <= 5)
        keep = 2
      else if (n <= 10)
        keep = 3
      else
        keep = 4
      const tailPart = keep === 0 ? '' : str.slice(-keep)
      return '*'.repeat(n - keep) + tailPart
    }
    default:
      return str
  }
}
