import { OkPacket } from 'mysql'
import { Provide } from 'flash-wolves'
import { query } from '@/lib/dbConnect/mysql'
import {
  deleteTableByModel,
  insertTableByModel,
  selectTableByModel
} from '@/utils/sqlUtil'
import { getUniqueKey } from '@/utils/stringUtil'
import { Category } from './model/category'
import { AppDataSource, BaseRepository } from '.'
import { Category as CategoryEntity } from './entity'

export function selectCategory(options: Category) {
  const { sql, params } = selectTableByModel('category', {
    data: options
  })
  return query<Category[]>(sql, ...params)
}

export function insertCategory(category: Category) {
  Object.assign(category, {
    k: getUniqueKey()
  })
  const { sql, params } = insertTableByModel('category', category)
  return query<OkPacket>(sql, ...params)
}

export function deleteCategory(category: Category) {
  const { sql, params } = deleteTableByModel('category', category)
  return query<OkPacket>(sql, ...params)
}

@Provide()
export class CategoryRepository extends BaseRepository<CategoryEntity> {
  protected repository = AppDataSource.getRepository(CategoryEntity)

  protected entityName = CategoryEntity.name
}
