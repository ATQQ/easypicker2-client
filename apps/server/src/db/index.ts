import process from 'node:process'
import type {
  FindManyOptions,
  FindOneOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from 'typeorm'
import {
  DataSource,
} from 'typeorm'
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { entities } from './entity'
import LocalUserDB from '@/utils/user-local-db'
// eslint-disable-next-line import/no-mutable-exports
export let AppDataSource: DataSource

export async function initTypeORM() {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  AppDataSource = new DataSource({
    type: 'mysql',
    host: cfg.host,
    port: cfg.port,
    username: cfg.user,
    password: cfg.password,
    database: cfg.database,
    entities,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  })

  await AppDataSource.initialize()
}

/**
 * 实现一个公共的Repository类用于子类继承，已达封装方法复用的目的
 */
export class BaseRepository<T> {
  protected repository: Repository<T>

  protected entityName: string

  findOne(where: FindOneOptions<T>['where']) {
    return this.repository.findOne({
      where,
    })
  }

  findMany(where: FindManyOptions<T>['where'], ops?: FindManyOptions<T>) {
    return this.repository.find({
      where,
      ...ops,
    })
  }

  findWithSpecifyColumn(
    where: FindOneOptions<T>['where'],
    columns: (keyof T)[],
  ) {
    return this.repository
      .createQueryBuilder(this.entityName)
      .select(columns.map(v => `${this.entityName}.${String(v)}`))
      .where(where)
      .getMany()
  }

  findWithLimitCount(
    where: FindOneOptions<T>['where'],
    limit: number,
    order?: FindOptionsOrder<T>,
  ) {
    return this.repository.find({
      where,
      take: limit,
      order,
    })
  }

  insert(options: T) {
    return this.repository.save(options)
  }

  update(options: T) {
    return this.repository.save(options)
  }

  insertMany(options: T[]) {
    return this.repository.save(options)
  }

  updateSpecifyFields(
    where: FindOneOptions<T>['where'],
    value: QueryDeepPartialEntity<T>,
  ) {
    return this.repository
      .createQueryBuilder(this.entityName)
      .update()
      .set(value)
      .where(where)
      .execute()
  }

  delete(options: FindOptionsWhere<T>) {
    return this.repository.delete(options)
  }

  count(where: FindOptionsWhere<T>) {
    return this.repository.count({
      where,
    })
  }
}
