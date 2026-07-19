import { describe, expect, it } from 'vitest'
import { applyMask, isValidMask, normalizeLegacyMask } from '../src/utils/maskUtil'

describe('isValidMask', () => {
  it('合法枚举返回 true', () => {
    expect(isValidMask('none')).toBe(true)
    expect(isValidMask('head1')).toBe(true)
    expect(isValidMask('head_tail')).toBe(true)
    expect(isValidMask('tail')).toBe(true)
    expect(isValidMask('mask_all')).toBe(true)
  })
  it('非法值返回 false', () => {
    expect(isValidMask('foo')).toBe(false)
    expect(isValidMask('')).toBe(false)
    expect(isValidMask('tail4')).toBe(false)
    expect(isValidMask(undefined)).toBe(false)
    expect(isValidMask(null)).toBe(false)
    expect(isValidMask(123)).toBe(false)
  })
})

describe('normalizeLegacyMask', () => {
  it('tail4 映射为 tail', () => {
    expect(normalizeLegacyMask('tail4')).toBe('tail')
  })
  it('合法值原样返回', () => {
    expect(normalizeLegacyMask('mask_all')).toBe('mask_all')
    expect(normalizeLegacyMask('head_tail')).toBe('head_tail')
  })
})

describe('applyMask - none', () => {
  it('完整展示', () => {
    expect(applyMask('张三', 'none')).toBe('张三')
    expect(applyMask('sugar', 'none')).toBe('sugar')
  })
})

describe('applyMask - head1', () => {
  it('保留首字符 其余 *', () => {
    expect(applyMask('张三', 'head1')).toBe('张*')
    expect(applyMask('张三丰', 'head1')).toBe('张**')
    expect(applyMask('sugar', 'head1')).toBe('s****')
  })
  it('单字符原样返回', () => {
    expect(applyMask('A', 'head1')).toBe('A')
  })
})

describe('applyMask - head_tail', () => {
  it('首尾可见', () => {
    expect(applyMask('张三丰', 'head_tail')).toBe('张*丰')
    expect(applyMask('sugar', 'head_tail')).toBe('s***r')
  })
})

describe('applyMask - tail', () => {
  it('自适应保留尾部', () => {
    expect(applyMask('13812345678', 'tail')).toBe('*******5678')
    expect(applyMask('12345', 'tail')).toBe('***45')
    expect(applyMask('12', 'tail')).toBe('*2')
  })
})

describe('applyMask - mask_all', () => {
  it('全部 *', () => {
    expect(applyMask('abc', 'mask_all')).toBe('***')
    expect(applyMask('张三', 'mask_all')).toBe('**')
    expect(applyMask('A', 'mask_all')).toBe('*')
  })
})

describe('applyMask - 旧枚举兼容', () => {
  it('tail4 按末 4 位脱敏，不退化为明文', () => {
    expect(applyMask('13812345678', 'tail4')).toBe('*******5678')
    expect(applyMask('1234', 'tail4')).toBe('1234')
    expect(applyMask('12', 'tail4')).toBe('12')
  })
})

describe('applyMask - 边界', () => {
  it('空值返回空串', () => {
    expect(applyMask('', 'head1')).toBe('')
    expect(applyMask(null, 'head1')).toBe('')
    expect(applyMask(undefined, 'tail')).toBe('')
  })
  it('非法 mask 退化为 none', () => {
    expect(applyMask('张三', 'unknown' as any)).toBe('张三')
    expect(applyMask('张三', undefined)).toBe('张三')
    expect(applyMask('张三', null)).toBe('张三')
  })
  it('数字 / 布尔等非字符串先转 String', () => {
    expect(applyMask(12345, 'tail')).toBe('***45')
    expect(applyMask(true, 'mask_all')).toBe('****')
  })
})
