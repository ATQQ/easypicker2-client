import type {
  Db,
  FilterQuery,
  InsertOneWriteOpResult,
  MongoClientOptions,
  UpdateQuery,
  UpdateWriteOpResult,
  WithId,
} from 'mongodb'
import {
  MongoClient,
} from 'mongodb'
import { mongodbConfig } from '@/config'
import LocalUserDB from '@/utils/user-local-db'

const { host, port, user, password, database, auth } = mongodbConfig

let url = auth
  ? `mongodb://${user}:${password}@${host}:${port}/${database}`
  : `mongodb://${host}:${port}/${database}?wtimeoutMS=2000`
let currentDatabase = database

const baseConnectOptions: MongoClientOptions = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 5000,
}

const statusConnectOptions: MongoClientOptions = {
  ...baseConnectOptions,
  connectTimeoutMS: 2000,
  serverSelectionTimeoutMS: 2000,
  socketTimeoutMS: 2000,
}

interface Res {
  db: MongoClient
  Db: Db
}
export function refreshMongoDb() {
  const cfg = LocalUserDB.getUserConfigByType('mongo')
  const { host, port, user, password, database, auth } = cfg
  currentDatabase = database
  url = auth
    ? `mongodb://${user}:${password}@${host}:${port}/${database}`
    : `mongodb://${host}:${port}/${database}?wtimeoutMS=2000`
}

export function getDBConnection(options: MongoClientOptions = baseConnectOptions): Promise<Res> {
  return new Promise((res, rej) => {
    MongoClient.connect(url, options)
      .then((db) => {
        res({
          db,
          Db: db.db(currentDatabase),
        })
      })
      .catch((err) => {
        rej(err)
      })
  })
}

export function getMongoDBStatus() {
  return new Promise<ServiceStatus>((res) => {
    let client: MongoClient
    getDBConnection(statusConnectOptions)
      .then(async (r) => {
        client = r.db
        await r.Db.command({ ping: 1 })
        res({
          type: 'mongodb',
          status: true,
        })
      })
      .catch((err) => {
        res({
          errMsg: err?.message || 'MongoDB 连接超时',
          type: 'mongodb',
          status: false,
        })
      })
      .finally(() => client?.close())
  })
}

type Callback<T> = (
  db: Db,
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: any) => void,
) => void

function warnMongoError(action: string, error: any) {
  console.warn(`[mongodb] ${action} failed:`, error?.message || error)
}

export function query<T>(callback: Callback<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let client: MongoClient
    let finished = false
    const closeClient = () => {
      client?.close()
    }
    const resolveAndClose = (value: T | PromiseLike<T>) => {
      if (finished) {
        return
      }
      finished = true
      resolve(value)
      closeClient()
    }
    const rejectAndClose = (reason?: any) => {
      if (finished) {
        return
      }
      finished = true
      reject(reason)
      closeClient()
    }
    getDBConnection()
      .then(({ db, Db }) => {
        client = db
        try {
          callback(Db, resolveAndClose, rejectAndClose)
        }
        catch (error) {
          rejectAndClose(error)
        }
      })
      .catch(rejectAndClose)
  })
}

export const mongoDbQuery = query
export function updateCollection<T>(
  collection: string,
  query: FilterQuery<T>,
  data: UpdateQuery<T>,
  many = false,
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
  many = false,
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
  }).catch((err) => {
    warnMongoError(`insert ${collection}`, err)
    return null
  })
}
export function findCollection<T>(
  collection: string,
  query: FilterQuery<T>,
): Promise<T[]> {
  return mongoDbQuery<T[]>((db, resolve) => {
    db.collection<T>(collection).find(query).toArray().then(resolve)
  })
}

export function findCollectionCount<T>(
  collection: string,
  query: FilterQuery<T>,
): Promise<number> {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<T>(collection).countDocuments(query).then(resolve)
  })
}
