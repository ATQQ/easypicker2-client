import fs from 'node:fs'
import path from 'node:path'

/**
 * 发布包运行时 cwd 为项目根目录；开发时也可能为 apps/server。
 * tsup bundle 单文件 __dirname 在 dist。
 */
export function resolveServerAsset(relSegments: string[]): string {
  const attempts: string[] = []
  const seen = new Set<string>()
  function pushCandidates(segments: string[]) {
    attempts.push(path.join(process.cwd(), ...segments))
    attempts.push(path.join(process.cwd(), 'apps', 'server', ...segments))
    if (typeof __dirname !== 'undefined') {
      attempts.push(path.join(__dirname, '..', ...segments))
      attempts.push(path.join(__dirname, '..', '..', ...segments))
    }
  }

  pushCandidates(relSegments)
  const distinct = attempts.filter((p) => {
    if (seen.has(p))
      return false
    seen.add(p)
    return true
  })

  const found = distinct.find(p => fs.existsSync(p))
  if (!found) {
    throw new Error(
      `找不到资源文件: ${relSegments.join('/')}。已查找: ${distinct.join('; ')}`,
    )
  }
  return found
}

export function getAutoCreateSqlPath(): string {
  return resolveServerAsset(['docs', 'sql', 'auto_create.sql'])
}

export function getMysqlCanonicalSchemaJsonPath(): string {
  return resolveServerAsset(['docs', 'schema', 'mysql-schema.json'])
}
