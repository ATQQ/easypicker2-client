/**
 * MySQL：按配置 CREATE DATABASE IF NOT EXISTS，并在「业务库无核心表 user」时执行 bundled auto_create.sql
 */
import fs from 'node:fs'
import mysql from 'mysql'

import { isMysqlAutoCreateDatabase } from '@/utils/mysql-features'
import { getAutoCreateSqlPath } from '@/utils/mysql-paths'
import LocalUserDB from '@/utils/user-local-db'

async function pingConnection(connection: mysql.Connection): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    connection.query('SELECT 1', (err) => {
      if (err)
        reject(err)
      else
        resolve()
    })
  })
}

async function execMulti(
  connection: mysql.Connection,
  sql: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    connection.query(sql, (err) => {
      if (err)
        reject(err)
      else
        resolve()
    })
  })
}

async function existsTable(schema: string, table: string): Promise<boolean> {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const conn = mysql.createConnection({
    host: cfg.host,
    port: +cfg.port,
    user: cfg.user,
    password: `${cfg.password || ''}`,
    database: schema,
    multipleStatements: false,
    charset: 'utf8mb4',
  })

  await new Promise<void>((resolve, reject) => {
    conn.connect(err => err ? reject(err) : resolve())
  })

  const rows = await new Promise<Array<{ cnt: number }>>((resolve, reject) => {
    conn.query(
      'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
      [schema, table],
      (err, res) => (err ? reject(err) : resolve(res as any)),
    )
  })
  conn.end()
  return Number(rows?.[0]?.cnt || 0) > 0
}

/**
 * 建库并在「业务库无核心表」时导入 auto_create.sql
 */
export async function ensureMysqlBootstrap(): Promise<{ createdDb: boolean, importedSql: boolean }> {
  if (!isMysqlAutoCreateDatabase()) {
    return { createdDb: false, importedSql: false }
  }

  const cfg = LocalUserDB.getUserConfigByType('mysql')
  const dbName = `${cfg.database || ''}`
  const host = cfg.host || 'localhost'
  const port = +cfg.port || 3306
  const user = cfg.user || 'root'
  const password = `${cfg.password || ''}`

  if (!dbName)
    throw new Error('MySQL database 不能为空')

  const bare = mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: false,
    charset: 'utf8mb4',
  })

  await new Promise<void>((resolve, reject) => {
    bare.connect(err => err ? reject(err) : resolve())
  })
  await pingConnection(bare)

  await new Promise<void>((resolve, reject) => {
    bare.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, '``')}\` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci`,
      (err) => {
        err ? reject(err) : resolve()
      },
    )
  })
  bare.end()

  const importSqlPath = getAutoCreateSqlPath()
  const hasUserTable = await existsTable(dbName, 'user')
  if (hasUserTable)
    return { createdDb: true, importedSql: false }

  const sql = fs.readFileSync(importSqlPath, 'utf-8')
  const withDb = mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    multipleStatements: true,
    charset: 'utf8mb4',
  })
  await new Promise<void>((resolve, reject) => {
    withDb.connect(err => err ? reject(err) : resolve())
  })
  try {
    await execMulti(withDb, sql)
  }
  finally {
    withDb.end()
  }

  return { createdDb: true, importedSql: true }
}
