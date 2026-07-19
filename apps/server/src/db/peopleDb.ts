import type { OkPacket } from 'mysql'
import type { People } from './model/people'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  deleteTableByModel,
  insertTableByModelMany,
  selectTableByModel,
  updateTableByModel,
} from '@/utils/sqlUtil'
import { AppDataSource, BaseRepository } from '.'
import { People as PeopleEntity } from './entity'

export function selectPeople(
  options: V2Array<People>,
  columns: string[] = ['name'],
) {
  const { sql, params } = selectTableByModel('people', {
    data: options,
    columns,
  })

  return query<People[]>(sql, ...params)
}

export function insertPeople(people: People[], defaultData: People = {}) {
  people.forEach((p) => {
    Object.assign(p, defaultData, p)
  })
  const { sql, params } = insertTableByModelMany('people', people)
  return query<OkPacket>(sql, ...params)
}

export function deletePeople(people: V2Array<People>) {
  const { sql, params } = deleteTableByModel('people', people)
  return query<OkPacket>(sql, ...params)
}

export function updatePeople(people: People, q: People) {
  const { sql, params } = updateTableByModel('people', people, q)
  return query<OkPacket>(sql, ...params)
}

@Provide()
export class PeopleRepository extends BaseRepository<PeopleEntity> {
  protected createRepository() {
    return AppDataSource.getRepository(PeopleEntity)
  }

  protected entityName = PeopleEntity.name

  /** 公开查看页名单分页：仅返回当前页，避免一次拉全表 */
  async findPageForTask(options: {
    userId: number
    taskKey: string
    pageIndex: number
    pageSize: number
    onlySubmitted?: boolean
  }) {
    const { userId, taskKey, pageIndex, pageSize, onlySubmitted } = options
    const qb = this.repository
      .createQueryBuilder('people')
      .where('people.userId = :userId', { userId })
      .andWhere('people.taskKey = :taskKey', { taskKey })

    if (onlySubmitted) {
      qb.andWhere('people.status = :status', { status: 1 })
    }

    const [people, total] = await qb
      .orderBy('people.id', 'ASC')
      .skip((pageIndex - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount()

    return { people, total }
  }
}
