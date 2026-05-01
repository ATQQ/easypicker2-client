import { test, expect } from 'vitest'
import { encryption, getUniqueKey, getKeyInfo } from '../src/utils/stringUtil'

test('encode 66666 = rotaomo64xYS7sHR9v+86Q==', () => {
  expect(encryption('66666')).toBe('rotaomo64xYS7sHR9v+86Q==')
})

test('getUniqueKey', () => {
  console.log(getUniqueKey(), getUniqueKey())
  expect(getUniqueKey() !== getUniqueKey()).toBe(true)
})

test('getKeyName', () => {
  expect(getKeyInfo('easypicker2/60707030785935137d00c3ee/8557451cfb21ff0dbda5e6c950678aa8/小明-123.json').base).toBe('小明-123.json')
})
