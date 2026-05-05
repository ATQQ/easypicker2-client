import { expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { timeToObjId } from '../src/utils/stringUtil'

it('timeToObjId creates a valid ObjectId string for dates with milliseconds', () => {
  const value = timeToObjId(new Date(1717200000123))

  expect(value).toMatch(/^[\da-f]{24}$/)
  expect(ObjectId.isValid(value)).toBe(true)
})
