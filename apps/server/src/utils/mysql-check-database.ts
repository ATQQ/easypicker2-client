/**
 * 使用给定（或与本地已保存合并）的连接参数检测：能否连上实例、目标 schema 是否已存在。
 */
import mysql from 'mysql'

import LocalUserDB from '@/utils/user-local-db'

export type MysqlCheckDatabaseInput = Partial<{
  host: string
  port: number | string
  user: string
  password: string
  database: string
}>

export interface MysqlCheckDatabaseResult {
  canConnect: boolean
  databaseExists: boolean
  error?: string
}

function resolveMysqlParams(input: MysqlCheckDatabaseInput) {
  const saved = LocalUserDB.getUserConfigByType('mysql') as Record<string, unknown>
  const host = (input.host ?? saved.host ?? 'localhost') as string
  const port = +(input.port ?? saved.port ?? 3306)
  const user = (input.user ?? saved.user ?? 'root') as string
  const rawPwd = input.password
  const password
    = rawPwd !== undefined && rawPwd !== null && `${rawPwd}` !== ''
      ? `${rawPwd}`
      : `${saved.password ?? ''}`
  const database = `${input.database ?? saved.database ?? ''}`.trim()
  return { host, port, user, password, database }
}

export async function checkMysqlDatabaseExists(
  input: MysqlCheckDatabaseInput = {},
): Promise<MysqlCheckDatabaseResult> {
  const { host, port, user, password, database } = resolveMysqlParams(input)
  if (!database) {
    return {
      canConnect: false,
      databaseExists: false,
      error: '请先填写数据库名',
    }
  }

  const bare = mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
    charset: 'utf8mb4',
  })

  try {
    await new Promise<void>((resolve, reject) => {
      bare.connect(err => (err ? reject(err) : resolve()))
    })
  }
  catch (e: unknown) {
    bare.destroy()
    return {
      canConnect: false,
      databaseExists: false,
      error: e instanceof Error ? e.message : '无法连接 MySQL',
    }
  }

  try {
    const rows = await new Promise<Array<{ c: number }>>((resolve, reject) => {
      bare.query(
        'SELECT COUNT(*) as c FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
        [database],
        (err, res) => (err ? reject(err) : resolve(res as any)),
      )
    })
    const databaseExists = Number(rows[0]?.c || 0) > 0
    return { canConnect: true, databaseExists }
  }
  catch (e: unknown) {
    return {
      canConnect: true,
      databaseExists: false,
      error: e instanceof Error ? e.message : '查询 information_schema 失败',
    }
  }
  finally {
    bare.end()
  }
}
