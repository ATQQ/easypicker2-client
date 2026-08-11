export type MaskMode = 'none' | 'head1' | 'head_tail' | 'tail' | 'mask_all'

const ALLOWED_MASK: MaskMode[] = ['none', 'head1', 'head_tail', 'tail', 'mask_all']

/** 旧枚举兼容：tail4 → tail；非法值返回 null（由调用方决定 fallback） */
export function normalizeLegacyMask(mask: unknown): MaskMode | null {
  if (typeof mask !== 'string')
    return null
  if (mask === 'tail4')
    return 'tail'
  if ((ALLOWED_MASK as string[]).includes(mask))
    return mask as MaskMode
  return null
}

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
  // 未迁移的旧配置直接命中时仍按旧语义处理，避免变明文
  if (mask === 'tail4') {
    if (str.length <= 4)
      return str
    return '*'.repeat(str.length - 4) + str.slice(-4)
  }
  const resolved = normalizeLegacyMask(mask)
  const m: MaskMode = resolved ?? 'none'
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
    case 'mask_all':
      return '*'.repeat(str.length)
    default:
      return str
  }
}
