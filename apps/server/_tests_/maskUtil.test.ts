import { describe, expect, it } from 'vitest'
import { applyMask, isValidMask } from '../src/utils/maskUtil'

describe('isValidMask', () => {
  it('合法枚举返回 true', () => {
    expect(isValidMask('none')).toBe(true)
    expect(isValidMask('head1')).toBe(true)
    expect(isValidMask('tail4')).toBe(true)
    expect(isValidMask('mask_all')).toBe(true)
  })
  it('非法值返回 false', () => {
    expect(isValidMask('foo')).toBe(false)
    expect(isValidMask('')).toBe(false)
    expect(isValidMask(undefined)).toBe(false)
    expect(isValidMask(null)).toBe(false)
    expect(isValidMask(123)).toBe(false)
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

describe('applyMask - tail4', () => {
  it('保留末 4 位 前面 *', () => {
    expect(applyMask('13812345678', 'tail4')).toBe('*******5678')
    expect(applyMask('123456789', 'tail4')).toBe('*****6789')
  })
  it('长度 <=4 原样返回', () => {
    expect(applyMask('1234', 'tail4')).toBe('1234')
    expect(applyMask('12', 'tail4')).toBe('12')
    expect(applyMask('A', 'tail4')).toBe('A')
  })
})

describe('applyMask - mask_all', () => {
  it('全部 *', () => {
    expect(applyMask('abc', 'mask_all')).toBe('***')
    expect(applyMask('张三', 'mask_all')).toBe('**')
    expect(applyMask('A', 'mask_all')).toBe('*')
  })
})

describe('applyMask - 边界', () => {
  it('空值返回空串', () => {
    expect(applyMask('', 'head1')).toBe('')
    expect(applyMask(null, 'head1')).toBe('')
    expect(applyMask(undefined, 'tail4')).toBe('')
  })
  it('非法 mask 退化为 none', () => {
    expect(applyMask('张三', 'unknown' as any)).toBe('张三')
    expect(applyMask('张三', undefined)).toBe('张三')
    expect(applyMask('张三', null)).toBe('张三')
  })
  it('数字 / 布尔等非字符串先转 String', () => {
    expect(applyMask(12345, 'tail4')).toBe('*2345')
    expect(applyMask(true, 'mask_all')).toBe('****')
  })
})
