import { test, expect } from 'vitest'
import { rAccount } from '../src/utils/regExp'

test('1234 is ok', () => {
  expect(rAccount.test('1234')).toBe(true)
})

test('12 is not ok', () => {
  expect(rAccount.test('12')).toBe(false)
})
test('_123 is not ok', () => {
  expect(rAccount.test('_123')).toBe(false)
})
test('admin is ok', () => {
  expect(rAccount.test('admin')).toBe(true)
})

test('1_a_ is not ok', () => {
  expect(rAccount.test('1_a_')).toBe(false)
})

test('a1d2 is ok', () => {
  expect(rAccount.test('a1d2')).toBe(true)
})
test('a1d2a1d2 is ok', () => {
  expect(rAccount.test('a1d2a1d2')).toBe(true)
})
test('a1d2a1d2a1d2a1d2 is not ok', () => {
  expect(rAccount.test('a1d2a1d2a1d2a1d2')).toBe(false)
})
