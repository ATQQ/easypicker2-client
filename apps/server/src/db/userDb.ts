import type { OkPacket } from 'mysql'
import type { User } from './model/user'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  insertTableByModel,
  selectTableByModel,
  updateTableByModel,
} from '@/utils/sqlUtil'
import { User as UserEntity } from './entity'
import { AppDataSource, BaseRepository } from './index'
import { USER_STATUS } from './model/user'

export function selectUserByAccount(account: string): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      account,
    },
  })
  return query<User[]>(sql, ...params)
}

export function selectUserByPhone(phone: string): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      phone,
    },
  })
  return query<User[]>(sql, ...params)
}

export function selectUserById(id: number): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {
      id,
    },
  })
  return query<User[]>(sql, ...params)
}

export function insertUser(options: User): Promise<OkPacket> {
  const { sql, params } = insertTableByModel('user', {
    status: USER_STATUS.NORMAL,
    ...options,
  })
  return query<OkPacket>(sql, ...params)
}

export function updateUser(options: User, q: User): Promise<OkPacket> {
  const { sql, params } = updateTableByModel('user', options, q)
  return query<OkPacket>(sql, ...params)
}

export function selectAllUser(columns: string[]): Promise<User[]> {
  const { sql, params } = selectTableByModel('user', {
    data: {},
    columns,
    order: 'order by id desc',
  })
  return query<User[]>(sql, ...params)
}

export async function getUserOverviewCount(start: Date) {
  const [row] = await query<{
    sum: number
    recent: number
  }[]>(
    'select count(*) as sum, sum(case when join_time > ? then 1 else 0 end) as recent from user',
    formatMysqlDate(start),
  )
  return {
    sum: Number(row?.sum || 0),
    recent: Number(row?.recent || 0),
  }
}

function formatMysqlDate(date: Date) {
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

@Provide()
export class UserRepository extends BaseRepository<UserEntity> {
  protected entityName = UserEntity.name

  protected createRepository() {
    return AppDataSource.getRepository(UserEntity)
  }
}
