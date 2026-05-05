import type {
  FindManyOptions,
  FindOneOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm'
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import process from 'node:process'
import {
  DataSource,
} from 'typeorm'
import LocalUserDB from '@/utils/user-local-db'
import { entities } from './entity'
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
    /** 与 utf8mb4 列一致，避免驱动层按 utf8 送 4 字节字符失败 */
    charset: 'utf8mb4',
  })

  await AppDataSource.initialize()
}

/** MySQL / TypeORM 未就绪时不要调用 getRepository，否则会在启动阶段或未配置库时抛出 EntityMetadataNotFoundError */
export function assertMysqlDataSourceReady(): void {
  if (!AppDataSource?.isInitialized) {
    throw new Error(
      'MySQL 尚未连接成功：请先在服务配置中填写数据库并保存，或检查启动日志中的数据库错误后重启服务。',
    )
  }
}

/**
 * 实现一个公共的Repository类用于子类继承，已达封装方法复用的目的
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  private __repository: Repository<T> | null = null

  protected abstract createRepository(): Repository<T>

  protected entityName: string

  protected get repository(): Repository<T> {
    assertMysqlDataSourceReady()
    if (!this.__repository) {
      this.__repository = this.createRepository()
    }
    return this.__repository
  }

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
