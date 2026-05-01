import { OkPacket } from 'mysql'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  deleteTableByModel,
  insertTableByModelMany,
  selectTableByModel,
  updateTableByModel
} from '@/utils/sqlUtil'
import { People } from './model/people'
import { People as PeopleEntity } from './entity'
import { BaseRepository, AppDataSource } from '.'

export function selectPeople(
  options: V2Array<People>,
  columns: string[] = ['name']
) {
  const { sql, params } = selectTableByModel('people', {
    data: options,
    columns
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
  protected repository = AppDataSource.getRepository(PeopleEntity)

  protected entityName = PeopleEntity.name
}
