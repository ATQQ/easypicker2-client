export type MaskMode = 'none' | 'head1' | 'tail4' | 'mask_all'

const ALLOWED_MASK: MaskMode[] = ['none', 'head1', 'tail4', 'mask_all']

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
    case 'tail4':
      if (str.length <= 4) {
        return str
      }
      return '*'.repeat(str.length - 4) + str.slice(-4)
    case 'mask_all':
      return '*'.repeat(str.length)
    default:
      return str
  }
}
