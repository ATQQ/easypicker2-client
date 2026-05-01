import { test, expect } from 'vitest'
import {
  selectTableByModel, deleteTableByModel,
  insertTableByModel, updateTableByModel,
  insertTableByModelMany, createWhereSql,
} from '../src/utils/sqlUtil'

test('selectTableByModel("user")', () => {
  const { sql, params } = selectTableByModel('user')
  expect(sql).toBe('select * from user')
  expect(params).toEqual([])
})

test('selectTableByModel("user",{})', () => {
  const { sql, params } = selectTableByModel('user', {})
  expect(sql).toBe('select * from user')
  expect(params).toEqual([])
})

test('selectTableByModel("user",{name:"xm"})', () => {
  const { sql, params } = selectTableByModel('user', { data: { name: 'xm' } })
  expect(sql).toBe('select * from user where name = ?')
  expect(params).toEqual(['xm'])
})

test('selectTableByModel("user",{name:"xm"},["id","birthday"])', () => {
  const { sql, params } = selectTableByModel('user', {
    data: { name: 'xm' },
    columns: ['id', 'birthday'],
  })
  expect(sql).toBe('select id,birthday from user where name = ?')
  expect(params).toEqual(['xm'])
})

test('selectTableByModel("user",{name:"xm",id:1})', () => {
  const { sql, params } = selectTableByModel('user', {
    data: { name: 'xm', id: 1 },
  })
  expect(sql).toBe('select * from user where name = ? and id = ?')
  expect(params).toEqual(['xm', 1])
})

test('selectTableByModel("user",{},[])', () => {
  const { sql, params } = selectTableByModel('user', {
    data: {},
    columns: [],
  })
  expect(sql).toBe('select * from user')
  expect(params).toEqual([])
})

test('selectTableByModel("user",{},["id", "name"])', () => {
  const { sql, params } = selectTableByModel('user', {
    data: {},
    columns: ['id', 'name'],
  })
  expect(sql).toBe('select id,name from user')
  expect(params).toEqual([])
})

test('selectTableByModel("user",{pwd:"123456",taskName:"task1"},["id", "name"])', () => {
  const { sql, params } = selectTableByModel('user', {
    data: { pwd: '123456', taskName: 'task1' },
    columns: ['id', 'name'],
  })
  expect(sql).toBe('select id,name from user where pwd = ? and task_name = ?')
  expect(params).toEqual(['123456', 'task1'])
})

test('selectTableByModelLimit', () => {
  const { sql, params } = selectTableByModel('user', {
    data: { pwd: '123456', taskName: 'task1' },
    columns: ['id', 'name'],
    limit: 100,
  })
  expect(sql).toBe('select id,name from user where pwd = ? and task_name = ?  limit 100')
  expect(params).toEqual(['123456', 'task1'])
})

test('selectTableByModelLimit', () => {
  const { sql, params } = selectTableByModel('user', {
    data: { id: 1 },
  })
  expect(sql).toBe('select * from user where id = ?')
  expect(params).toEqual([1])
})

test('deleteTableByModel("user",{pwd:"123456",taskName:"task1"})', () => {
  const { sql, params } = deleteTableByModel('user', { pwd: '123456', taskName: 'task1' })
  expect(sql).toBe('delete from user where pwd = ? and task_name = ?')
  expect(params).toEqual(['123456', 'task1'])
})

test('deleteTableByModel("user","")', () => {
  const { sql, params } = deleteTableByModel('user', '')
  expect(sql).toBe('')
  expect(params).toEqual([])
})

test('deleteTableByModel', () => {
  const { sql, params } = deleteTableByModel('user', {
    id: [1, 2, 3],
    userId: 5,
  })
  expect(sql).toBe('delete from user where id in (?,?,?) and user_id = ?')
  expect(params).toEqual([1, 2, 3, 5])
})

test('insertTableByModel("user","")', () => {
  const { sql, params } = insertTableByModel('user', '')
  expect(sql).toBe('')
  expect(params).toEqual([])
})

test('insertTableByModel("user",{name:"xm",age:18})', () => {
  const { sql, params } = insertTableByModel('user', { name: 'xm', age: 18 })
  expect(sql).toBe('insert into user (name,age) values (?,?)')
  expect(params).toEqual(['xm', 18])
})

test('updateTableByModel("user",{name:"xm",age:18},{id:1})', () => {
  const { sql, params } = updateTableByModel('user', { name: 'xm', age: 18 }, { id: 1 })
  expect(sql).toBe('update user set name = ?,age = ? where id = ?')
  expect(params).toEqual(['xm', 18, 1])
})

test('updateTableByModel', () => {
  const { sql, params } = updateTableByModel('user', { name: 'xm', age: 18 }, { id: [1, 2, 3] })
  expect(sql).toBe('update user set name = ?,age = ? where id in (?,?,?)')
  expect(params).toEqual(['xm', 18, 1, 2, 3])
})

test('insertMany', () => {
  const { sql, params } = insertTableByModelMany('people', [{ name: 'xm', age: 18 }, { name: 'kk', age: 19 }, { name: 'ds', age: 20 }])
  expect(sql).toBe('insert into people (name,age) values (?,?),(?,?),(?,?)')
  expect(params).toEqual(['xm', 18, 'kk', 19, 'ds', 20])
})
test('createWhereSql', () => {
  const sql = createWhereSql('ids', [1, 2, 34])
  expect(sql).toBe('ids in (?,?,?)')
})
