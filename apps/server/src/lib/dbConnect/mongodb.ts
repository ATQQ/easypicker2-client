import {
  Db,
  FilterQuery,
  InsertOneWriteOpResult,
  MongoClient,
  UpdateQuery,
  UpdateWriteOpResult,
  WithId
} from 'mongodb'
import { mongodbConfig } from '@/config'
import LocalUserDB from '@/utils/user-local-db'

const { host, port, user, password, database, auth } = mongodbConfig

let url = auth
  ? `mongodb://${user}:${password}@${host}:${port}/${database}`
  : `mongodb://${host}:${port}/${database}?wtimeoutMS=2000`

interface Res {
  db: MongoClient
  Db: Db
}
export function refreshMongoDb() {
  const cfg = LocalUserDB.getUserConfigByType('mongo')
  const { host, port, user, password, database, auth } = cfg
  url = auth
    ? `mongodb://${user}:${password}@${host}:${port}/${database}`
    : `mongodb://${host}:${port}/${database}?wtimeoutMS=2000`
}

export function getDBConnection(): Promise<Res> {
  return new Promise((res, rej) => {
    MongoClient.connect(url, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    })
      .then((db) => {
        res({
          db,
          Db: db.db(database)
        })
      })
      .catch((err) => {
        rej(err)
      })
  })
}

export function getMongoDBStatus() {
  return new Promise<ServiceStatus>((res) => {
    getDBConnection()
      .then((r) => {
        r.db.close()
        res({
          type: 'mongodb',
          status: true
        })
      })
      .catch((err) => {
        res({
          errMsg: err.message,
          type: 'mongodb',
          status: false
        })
      })
  })
}

type Callback<T> = (
  db: Db,
  resolve: (value: T | PromiseLike<T>) => void
) => void

export function query<T>(callback: Callback<T>): Promise<T> {
  const p = new Promise<T>((resolve, rej) => {
    getDBConnection().then(({ db, Db }) => {
      // 执行回调
      callback(Db, resolve)
      // resolve后关闭
      p.catch((e) => rej(e)).finally(() => {
        db.close()
      })
    })
  })
  return p
}

export const mongoDbQuery = query
export function updateCollection<T>(
  collection: string,
  query: FilterQuery<T>,
  data: UpdateQuery<T>,
  many = false
) {
  return mongoDbQuery<UpdateWriteOpResult>((db, resolve) => {
    if (many) {
      db.collection<T>(collection).updateMany(query, data).then(resolve)
      return
    }
    db.collection<T>(collection).updateOne(query, data).then(resolve)
  })
}

export function insertCollection<T>(
  collection: string,
  data: T[] | T,
  many = false
) {
  return mongoDbQuery<InsertOneWriteOpResult<WithId<T>>>((db, resolve) => {
    if (many && Array.isArray(data)) {
      db.collection<T>(collection)
        .insertMany(data as any)
        .then(resolve as any)
      return
    }
    db.collection<T>(collection)
      .insertOne(data as any)
      .then(resolve)
  })
}
export function findCollection<T>(
  collection: string,
  query: FilterQuery<T>
): Promise<T[]> {
  return mongoDbQuery<T[]>((db, resolve) => {
    db.collection<T>(collection).find(query).toArray().then(resolve)
  })
}

export function findCollectionCount<T>(
  collection: string,
  query: FilterQuery<T>
): Promise<number> {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<T>(collection).countDocuments(query).then(resolve)
  })
}
