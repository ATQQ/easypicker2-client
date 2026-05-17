import type { OkPacket } from 'mysql'
import type { File } from './model/file'
import { Provide } from 'flash-wolves'
import { Brackets } from 'typeorm'
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

/** 每个 task_key 各取最近 perTaskLimit 条（del=0），一次查询；需 MySQL 8+ 窗口函数 */
export function selectRecentFilesPerTaskKeys(
  taskKeys: string[],
  perTaskLimit: number,
) {
  if (taskKeys.length === 0 || perTaskLimit <= 0) {
    return Promise.resolve([] as { task_key: string, name: string, date: Date }[])
  }
  const placeholders = taskKeys.map(() => '?').join(',')
  const sql = `
SELECT task_key, name, date FROM (
  SELECT task_key, name, date,
    ROW_NUMBER() OVER (PARTITION BY task_key ORDER BY id DESC) AS rn
  FROM files
  WHERE del = 0 AND task_key IN (${placeholders})
) ranked
WHERE rn <= ?
ORDER BY task_key, rn
  `.trim()
  return query<{ task_key: string, name: string, date: Date }[]>(
    sql,
    ...taskKeys,
    perTaskLimit,
  )
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
  protected createRepository() {
    return AppDataSource.getRepository(Files)
  }

  protected entityName = Files.name

  // 这里存放独有方法
  async findPage(options: {
    userId: number
    pageIndex: number
    pageSize: number
    taskKey?: string
    taskKeys?: string[]
    excludeTaskKeys?: string[]
    keyword?: string
  }) {
    const {
      userId,
      pageIndex,
      pageSize,
      taskKey,
      taskKeys,
      excludeTaskKeys,
      keyword,
    } = options
    const qb = this.createFileQueryBuilder(userId)

    this.applyFileFilters(qb, {
      taskKey,
      taskKeys,
      excludeTaskKeys,
      keyword,
    })

    const [files, total] = await qb
      .clone()
      .orderBy('file.id', 'DESC')
      .skip((pageIndex - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    const [{ totalSize }, { filterSize }] = await Promise.all([
      this.getFileSizeSum(this.createFileQueryBuilder(userId)),
      this.getFileSizeSum(qb),
    ])

    return {
      files,
      total,
      totalSize,
      filterSize,
    }
  }

  async findIds(options: {
    userId: number
    taskKey?: string
    taskKeys?: string[]
    excludeTaskKeys?: string[]
    keyword?: string
  }) {
    const {
      userId,
      taskKey,
      taskKeys,
      excludeTaskKeys,
      keyword,
    } = options
    const qb = this.createFileQueryBuilder(userId)
      .select('file.id', 'id')

    this.applyFileFilters(qb, {
      taskKey,
      taskKeys,
      excludeTaskKeys,
      keyword,
    })

    const rows = await qb.getRawMany<{ id: number }>()
    return rows.map(row => Number(row.id))
  }

  private createFileQueryBuilder(userId: number) {
    return this.repository
      .createQueryBuilder('file')
      .where('file.userId = :userId', { userId })
      .andWhere('file.del = 0')
  }

  private applyFileFilters(
    qb: ReturnType<typeof this.createFileQueryBuilder>,
    options: {
      taskKey?: string
      taskKeys?: string[]
      excludeTaskKeys?: string[]
      keyword?: string
    },
  ) {
    const { taskKey, taskKeys, excludeTaskKeys, keyword } = options

    if (taskKey) {
      qb.andWhere('file.taskKey = :taskKey', { taskKey })
    }
    else if (taskKeys) {
      if (taskKeys.length === 0) {
        qb.andWhere('1 = 0')
      }
      else {
        qb.andWhere('file.taskKey IN (:...taskKeys)', { taskKeys })
      }
    }
    else if (excludeTaskKeys?.length) {
      qb.andWhere('file.taskKey NOT IN (:...excludeTaskKeys)', { excludeTaskKeys })
    }

    if (keyword) {
      const likeKeyword = `%${keyword}%`
      qb.andWhere(new Brackets((builder) => {
        builder
          .where('file.name LIKE :keyword', { keyword: likeKeyword })
          .orWhere('file.taskName LIKE :keyword', { keyword: likeKeyword })
          .orWhere('file.people LIKE :keyword', { keyword: likeKeyword })
          .orWhere('CAST(file.info AS CHAR(16383)) LIKE :keyword', {
            keyword: likeKeyword,
          })
          .orWhere('file.originName LIKE :keyword', { keyword: likeKeyword })
      }))
    }
  }

  private async getFileSizeSum(qb: ReturnType<typeof this.createFileQueryBuilder>) {
    const row = await qb
      .clone()
      .select('COALESCE(SUM(file.size), 0)', 'size')
      .getRawOne<{ size: string | number }>()

    return {
      totalSize: Number(row?.size || 0),
      filterSize: Number(row?.size || 0),
    }
  }

  async sumActiveSizeByUser(userId: number) {
    const row = await this.createFileQueryBuilder(userId)
      .select('COALESCE(SUM(file.size), 0)', 'size')
      .getRawOne<{ size: string | number }>()

    return Number(row?.size || 0)
  }

  findRecentFilesByTaskKeys(taskKeys: string[], perTaskLimit: number) {
    return selectRecentFilesPerTaskKeys(taskKeys, perTaskLimit)
  }
}
