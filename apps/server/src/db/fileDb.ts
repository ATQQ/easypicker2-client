import type { OkPacket } from 'mysql'
import type { File } from './model/file'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  insertTableByModel,
  selectTableByModel,
  updateTableByModel,
} from '@/utils/sqlUtil'
import { AppDataSource, BaseRepository } from '.'
import { Files } from './entity'

export function insertFile(file: File) {
  const { sql, params } = insertTableByModel('files', file)
  return query<OkPacket>(sql, ...params)
}

export function selectFilesNew(options: File, columns: string[] = []) {
  const { sql, params } = selectTableByModel('files', {
    data: options,
    columns,
    // 逆序
    order: 'order by id desc',
  })
  return query<File[]>(sql, ...params)
}

export async function getFileOverviewCount(start: Date) {
  const [row] = await query<{
    sum: number
    recent: number
    size: number
  }[]>(
    'select count(*) as sum, sum(case when date > ? then 1 else 0 end) as recent, coalesce(sum(size), 0) as size from files',
    formatMysqlDate(start),
  )
  return {
    sum: Number(row?.sum || 0),
    recent: Number(row?.recent || 0),
    size: Number(row?.size || 0),
  }
}

function formatMysqlDate(date: Date) {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function selectFiles(options: File, columns: string[] = []) {
  const { sql, params } = selectTableByModel('files', {
    data: {
      del: 0,
      ...options,
    },
    columns,
    // 逆序
    order: 'order by id desc',
  })
  return query<File[]>(sql, ...params)
}

export function selectFilesLimitCount(options: File, count: number) {
  const { sql, params } = selectTableByModel('files', {
    data: options,
    limit: count,
    // 逆序
    order: 'order by id desc',
  })
  return query<File[]>(sql, ...params)
}

export function updateFileInfo(_query: File, file: File) {
  const { sql, params } = updateTableByModel('files', file, _query)
  return query<OkPacket>(sql, ...params)
}
export function deleteFileRecord(file: File) {
  // 逻辑删
  // const originData = JSON.stringify({
  //   userId: file.user_id,
  //   categoryKey: file.category_key,
  //   taskKey: file.task_key
  // })
  // const { sql, params } = updateTableByModel(
  //   'files',
  //   {
  //     userId: 0,
  //     taskKey: 'local_trash',
  //     categoryKey: originData
  //   },
  //   {
  //     id: file.id
  //   }
  // )
  const { sql, params } = updateTableByModel(
    'files',
    {
      del: 1,
    },
    {
      id: file.id,
    },
  )
  // 物理删
  // const { sql, params } = deleteTableByModel('files', file)
  return query<OkPacket>(sql, ...params)
}

export function deleteFiles(files: File[]) {
  const ids = files.map(v => v.id)
  // 逻辑删
  // const { sql, params } = updateTableByModel(
  //   'files',
  //   {
  //     userId: 0,
  //     taskKey: 'local_trash'
  //   },
  //   {
  //     id: ids
  //   }
  // )
  const { sql, params } = updateTableByModel(
    'files',
    {
      del: 1,
    },
    {
      id: ids,
    },
  )
  // 异步办事
  ;(async () => {
    for (const f of files) {
      await deleteFileRecord(f)
    }
  })()
  return query<OkPacket>(sql, ...params)
}

@Provide()
export class FileRepository extends BaseRepository<Files> {
  protected repository = AppDataSource.getRepository(Files)

  protected entityName = Files.name

  // 这里存放独有方法
}
