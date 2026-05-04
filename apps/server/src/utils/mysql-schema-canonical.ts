/**
 * docs/schema/mysql-schema.json — 期望表结构与列定义；
 * ADD / MODIFY（按 JSON 漂移）与导出完整建表脚本。
 */
import fs from 'node:fs'

import { query } from '@/lib/dbConnect/mysql'
import { getMysqlCanonicalSchemaJsonPath } from '@/utils/mysql-paths'
import LocalUserDB from '@/utils/user-local-db'

export interface MysqlSchemaColumnSpec {
  name: string
  ddl: string
}

export interface MysqlSchemaTableSpec {
  name: string
  createOptions: string
  columns: MysqlSchemaColumnSpec[]
}

export interface MysqlCanonicalSchemaFile {
  version: number
  description?: string
  exportHeader?: string[]
  tables: MysqlSchemaTableSpec[]
  postStatements?: string[]
}

export function loadMysqlCanonicalSchema(): MysqlCanonicalSchemaFile {
  const p = getMysqlCanonicalSchemaJsonPath()
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as MysqlCanonicalSchemaFile
}

function escapeMysqlIdent(ident: string): string {
  return `\`${String(ident).replace(/`/g, '``')}\``
}

/** information_schema.COLUMN_TYPE ↔ JSON 片段中的「纯类型」比较 */
export function normalizeMysqlColumnTypeComparable(ft: string): string {
  return ft
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^(bigint|int|tinyint|smallint|mediumint)(\(\d+\))?/i, (_, base: string) => base.toLowerCase())
}

function ddlSansComment(ddl: string): string {
  const s = ddl.trim()
  const idx = /\sCOMMENT\b/i.exec(s)?.index ?? -1
  return idx >= 0 ? s.slice(0, idx).trim() : s
}

function stripTrailingNullability(rest: string): string {
  let s = rest
  while (/\s+(?:NOT\s+NULL|NULL)$/i.test(s))
    s = s.replace(/\s+(?:NOT\s+NULL|NULL)$/i, '').trim()
  return s
}

function extractExpectedMysqlColumnTypeComparable(ddl: string): string {
  let body = ddlSansComment(ddl).replace(/^`[^`]+`\s+/u, '').trim()

  body = body.replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\d*\))?/i, '').trim()
  body = body.replace(/\s+AUTO_INCREMENT\b/i, '').trim()

  const defaultRx
    = /\s+DEFAULT\b\s*(CURRENT_TIMESTAMP(?:\(\d*\))?|NULL|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[+-]?\d+(?:\.\d+)?)/i

  // 最多摘掉若干段 DEFAULT（一般仅一段；循环防止极端写法）
  for (let i = 0; i < 6; i++) {
    const next = body.replace(defaultRx, '').trim()
    if (next === body)
      break
    body = next
  }

  body = stripTrailingNullability(body)

  return normalizeMysqlColumnTypeComparable(body)
}

function getDbSchemaName(): string {
  return LocalUserDB.getUserConfigByType('mysql').database as string
}

async function mysqlTableExists(tableName: string): Promise<boolean> {
  const db = getDbSchemaName()
  const row = (
    await query<Array<{ cnt: number }>>(
      `SELECT COUNT(*) as cnt FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      db,
      tableName,
    )
  )[0]
  return Number(row?.cnt || 0) > 0
}

async function fetchActualInformationSchemaColumnType(
  tableName: string,
  columnName: string,
): Promise<string | undefined> {
  const db = getDbSchemaName()
  const rows = await query<Array<{ COLUMN_TYPE: string }>>(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    db,
    tableName,
    columnName,
  )
  const t = rows[0]?.COLUMN_TYPE
  return t ?? undefined
}

async function mysqlColumnMissing(tableName: string, columnName: string): Promise<boolean> {
  const ct = await fetchActualInformationSchemaColumnType(tableName, columnName)
  return ct === undefined
}

/** 拼装可复制的 CREATE + 后置索引 / AUTO_INCREMENT 脚本（与 canonical JSON 一致） */
export function buildMysqlCanonicalSchemaExportSql(schema: MysqlCanonicalSchemaFile): string {
  const chunks: string[] = []
  if (schema.exportHeader?.length)
    chunks.push(schema.exportHeader.join('\n'))

  for (const t of schema.tables ?? []) {
    if (!t.name || !t.createOptions?.trim() || !t.columns?.length)
      continue
    const tn = escapeMysqlIdent(t.name)
    chunks.push(`CREATE TABLE IF NOT EXISTS ${tn} (`)
    chunks.push(t.columns.map(c => `  ${c.ddl}`).join(',\n'))
    chunks.push(`) ${t.createOptions};`)
    chunks.push('')
  }

  const post = schema.postStatements ?? []
  for (const line of post) {
    const s = String(line ?? '')
    chunks.push(/^\s*$/.test(s) ? '' : s)
  }
  return `${chunks.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export async function getMysqlCanonicalSchemaExportSqlSafe(): Promise<{
  sql: string
  description?: string
}> {
  const schema = loadMysqlCanonicalSchema()
  return {
    sql: buildMysqlCanonicalSchemaExportSql(schema),
    description: schema.description,
  }
}

export interface MysqlCanonicalSchemaDrift {
  pending: boolean
  missingTables: string[]
  missingColumns: Array<{ table: string, column: string }>
  typeMismatches: Array<{ table: string, column: string, expectedComparable: string, actualComparable: string }>
}

export async function getMysqlCanonicalSchemaDrift(): Promise<MysqlCanonicalSchemaDrift> {
  const schema = loadMysqlCanonicalSchema()

  const missingTables: string[] = []
  const missingColumns: Array<{ table: string, column: string }> = []
  const typeMismatches: MysqlCanonicalSchemaDrift['typeMismatches'] = []

  for (const table of schema.tables ?? []) {
    if (!table.name)
      continue
    const exists = await mysqlTableExists(table.name)
    if (!exists) {
      missingTables.push(table.name)
      continue
    }

    for (const col of table.columns ?? []) {
      if (!col.name?.trim())
        continue
      if (await mysqlColumnMissing(table.name, col.name)) {
        missingColumns.push({ table: table.name, column: col.name })
        continue
      }

      const actualRaw = await fetchActualInformationSchemaColumnType(table.name, col.name)
      if (!actualRaw)
        continue
      const actualNorm = normalizeMysqlColumnTypeComparable(actualRaw)
      const expectedNorm = extractExpectedMysqlColumnTypeComparable(col.ddl)
      if (actualNorm !== expectedNorm) {
        typeMismatches.push({
          table: table.name,
          column: col.name,
          expectedComparable: expectedNorm,
          actualComparable: actualNorm,
        })
      }
    }
  }

  const pending
    = missingTables.length > 0
      || missingColumns.length > 0
      || typeMismatches.length > 0

  return { pending, missingTables, missingColumns, typeMismatches }
}

export async function applyMysqlCanonicalSchemaAdds(): Promise<string[]> {
  const schema = loadMysqlCanonicalSchema()
  const applied: string[] = []

  for (const table of schema.tables ?? []) {
    if (!table?.name || !(await mysqlTableExists(table.name)))
      continue

    const tblEsc = escapeMysqlIdent(table.name)
    for (const col of table.columns ?? []) {
      if (!col?.ddl || !col.name)
        continue
      if (!(await mysqlColumnMissing(table.name, col.name)))
        continue
      const stmt = `ALTER TABLE ${tblEsc} ADD COLUMN ${col.ddl}`
      await query(stmt)
      applied.push(`${table.name}.${col.name}`)
    }
  }

  return applied
}

export async function applyMysqlCanonicalSchemaModifies(): Promise<string[]> {
  const schema = loadMysqlCanonicalSchema()
  const drift = await getMysqlCanonicalSchemaDrift()
  const applied: string[] = []

  for (const mm of drift.typeMismatches) {
    const tableSpec = schema.tables?.find(t => t.name === mm.table)
    const colSpec = tableSpec?.columns?.find(c => c.name === mm.column)
    if (!colSpec?.ddl?.trim())
      continue
    const tblEsc = escapeMysqlIdent(mm.table)
    const stmt = `ALTER TABLE ${tblEsc} MODIFY COLUMN ${colSpec.ddl}`
    await query(stmt)
    applied.push(`${mm.table}.${mm.column}`)
  }

  return applied
}
