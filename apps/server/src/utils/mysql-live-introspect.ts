/**
 * 从当前连接的库读取实时表结构（information_schema + SHOW CREATE TABLE）
 */
import { Buffer } from 'node:buffer'

import { query } from '@/lib/dbConnect/mysql'
import LocalUserDB from '@/utils/user-local-db'

function escapeIdent(id: string) {
  return `\`${String(id).replace(/`/g, '``')}\``
}

function serializeDefault(v: unknown): string | null {
  if (v === null || v === undefined)
    return null
  if (Buffer.isBuffer(v))
    return v.toString('utf8')
  return String(v)
}

export interface MysqlLiveColumn {
  ordinal: number
  name: string
  columnType: string
  nullable: boolean
  key: string
  default: string | null
  extra: string
  comment: string
}

export interface MysqlLiveIndexColumn {
  seq: number
  column: string
  subPart: number | null
}

export interface MysqlLiveIndex {
  name: string
  unique: boolean
  indexType: string
  columns: MysqlLiveIndexColumn[]
}

export interface MysqlLiveTable {
  name: string
  engine: string | null
  collation: string | null
  comment: string
  rowEstimate: number | null
  dataLength: number | null
  indexLength: number | null
  createSql: string
  columns: MysqlLiveColumn[]
  indexes: MysqlLiveIndex[]
}

export interface MysqlLiveIntrospection {
  database: string
  mysqlVersion: string
  tables: MysqlLiveTable[]
  error?: string
}

export async function getMysqlLiveIntrospection(): Promise<MysqlLiveIntrospection> {
  const database = LocalUserDB.getUserConfigByType('mysql').database as string
  try {
    const verRows = await query<Array<{ v: string }>>('SELECT VERSION() as v')
    const mysqlVersion = verRows[0]?.v ?? ''

    const tableRows = await query<
      Array<{
        TABLE_NAME: string
        ENGINE: string | null
        TABLE_COLLATION: string | null
        TABLE_COMMENT: string
        TABLE_ROWS: number | null
        DATA_LENGTH: number | null
        INDEX_LENGTH: number | null
      }>
    >(
      `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_COMMENT, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      database,
    )

    const colRows = await query<
      Array<{
        TABLE_NAME: string
        ORDINAL_POSITION: number
        COLUMN_NAME: string
        COLUMN_TYPE: string
        IS_NULLABLE: string
        COLUMN_KEY: string
        COLUMN_DEFAULT: string | Buffer | null
        EXTRA: string
        COLUMN_COMMENT: string
      }>
    >(
      `SELECT TABLE_NAME, ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE,
              COLUMN_KEY, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      database,
    )

    const statRows = await query<
      Array<{
        TABLE_NAME: string
        INDEX_NAME: string
        NON_UNIQUE: number
        SEQ_IN_INDEX: number
        COLUMN_NAME: string
        SUB_PART: number | null
        INDEX_TYPE: string
      }>
    >(
      `SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      database,
    )

    const colsByTable = new Map<string, MysqlLiveColumn[]>()
    for (const r of colRows) {
      const list = colsByTable.get(r.TABLE_NAME) ?? []
      list.push({
        ordinal: r.ORDINAL_POSITION,
        name: r.COLUMN_NAME,
        columnType: r.COLUMN_TYPE,
        nullable: r.IS_NULLABLE === 'YES',
        key: r.COLUMN_KEY,
        default: serializeDefault(r.COLUMN_DEFAULT),
        extra: r.EXTRA,
        comment: r.COLUMN_COMMENT ?? '',
      })
      colsByTable.set(r.TABLE_NAME, list)
    }

    const idxMap = new Map<
      string,
      Map<string, { unique: boolean, indexType: string, cols: MysqlLiveIndexColumn[] }>
    >()

    for (const r of statRows) {
      if (!idxMap.has(r.TABLE_NAME))
        idxMap.set(r.TABLE_NAME, new Map())
      const byName = idxMap.get(r.TABLE_NAME)!
      if (!byName.has(r.INDEX_NAME)) {
        byName.set(r.INDEX_NAME, {
          unique: r.NON_UNIQUE === 0,
          indexType: r.INDEX_TYPE,
          cols: [],
        })
      }
      byName.get(r.INDEX_NAME)!.cols.push({
        seq: r.SEQ_IN_INDEX,
        column: r.COLUMN_NAME,
        subPart: r.SUB_PART,
      })
    }

    const tables: MysqlLiveTable[] = []
    for (const tr of tableRows) {
      const tname = tr.TABLE_NAME
      const idxGroups = idxMap.get(tname) ?? new Map()
      const indexes: MysqlLiveIndex[] = []
      for (const [name, spec] of idxGroups) {
        indexes.push({
          name,
          unique: spec.unique,
          indexType: spec.indexType,
          columns: [...spec.cols].sort((a, b) => a.seq - b.seq),
        })
      }
      indexes.sort((a, b) => a.name.localeCompare(b.name))

      let createSql = ''
      try {
        const cr = await query<Array<Record<string, string>>>(
          `SHOW CREATE TABLE ${escapeIdent(tname)}`,
        )
        const row = cr[0] || {}
        createSql = row['Create Table'] ?? row['CREATE TABLE'] ?? ''
      }
      catch {
        createSql = ''
      }

      tables.push({
        name: tname,
        engine: tr.ENGINE,
        collation: tr.TABLE_COLLATION,
        comment: tr.TABLE_COMMENT ?? '',
        rowEstimate: tr.TABLE_ROWS != null ? Number(tr.TABLE_ROWS) : null,
        dataLength: tr.DATA_LENGTH != null ? Number(tr.DATA_LENGTH) : null,
        indexLength: tr.INDEX_LENGTH != null ? Number(tr.INDEX_LENGTH) : null,
        createSql,
        columns: colsByTable.get(tname) ?? [],
        indexes,
      })
    }

    return { database, mysqlVersion, tables }
  }
  catch (err: unknown) {
    return {
      database,
      mysqlVersion: '',
      tables: [],
      error: err instanceof Error ? err.message : '无法读取库表信息',
    }
  }
}
