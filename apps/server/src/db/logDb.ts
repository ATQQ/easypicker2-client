import { Buffer } from 'node:buffer'
import type { FWRequest, FWResponse } from 'flash-wolves'
import type { FilterQuery } from 'mongodb'
import { ObjectId } from 'mongodb'
import type {
  Log,
  LogBehaviorData,
  LogData,
  LogErrorData,
  LogRequestData,
  LogType,
  PvData,
} from './model/log'
import { insertCollection, mongoDbQuery } from '@/lib/dbConnect/mongodb'
import { timeToObjId as getTimeObjectId, getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

function getLogData(type: LogType, data: LogData): Log {
  return {
    id: getUniqueKey(),
    type,
    data,
  }
}

/**
 * 记录请求日志
 */
export async function addRequestLog(req: FWRequest, res: FWResponse) {
  const { query = {}, params = {}, method, url } = req
  let { body = {} } = req
  if ((method !== 'GET' && !body) || body instanceof Buffer) {
    body = {}
  }
  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const user = await getUserInfo(req)
  let userId = 0
  if (user?.id) {
    userId = user.id
  }
  const data: LogRequestData = {
    method,
    url,
    query,
    params,
    body,
    userAgent,
    refer,
    ip,
    userId,
    startTime: req.startTime,
    endTime: Date.now(),
    duration: Date.now() - req.startTime,
  }
  res.on('close', () => {
    insertCollection('log', getLogData('request', data))
  })
}

/**
 * 记录用户行为日志
 */
export async function addBehavior(req: FWRequest, info: LogBehaviorData.Info) {
  const { url } = req

  const { headers, method } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const user = await getUserInfo(req)
  let userId = 0
  if (user?.id) {
    userId = user.id
  }
  const data: LogBehaviorData = {
    req: {
      method,
      path: url,
      userAgent,
      refer,
      ip,
    },
    user: {
      userId,
    },
    info,
  }
  insertCollection('log', getLogData('behavior', data))
}

/**
 * 记录服务端错误日志
 */
export async function addErrorLog(
  req: FWRequest,
  msg: string,
  stack: any = {},
) {
  const { query = {}, params = {}, method, url } = req
  let { body = {} } = req
  if ((method !== 'GET' && !body) || body instanceof Buffer) {
    body = {}
  }
  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const user = await getUserInfo(req)
  let userId = 0
  if (user?.id) {
    userId = user.id
  }
  const data: LogErrorData = {
    req: {
      method,
      url,
      query,
      params,
      body,
      userAgent,
      refer,
      ip,
      userId,
    },
    msg,
    stack,
  }
  insertCollection('log', getLogData('error', data))
}

/**
 * 记录页面访问日志
 */
export function addPvLog(req: FWRequest, path: string) {
  const { headers } = req
  const userAgent = headers['user-agent']
  const refer = headers.referer
  const ip = getClientIp(req)
  const data: PvData = {
    userAgent,
    refer,
    ip,
    path,
  }
  insertCollection('log', getLogData('pv', data))
}

export function getClientIp(req: FWRequest): string {
  return (req.headers['x-forwarded-for']
    || req.connection.remoteAddress
    || req.socket.remoteAddress) as string
}

export function timeToObjId(d: Date) {
  return getTimeObjectId(d)
}

export function findLogCount(q: FilterQuery<Log>) {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<Log>('log').countDocuments(q).then(resolve)
  })
}
export function findLogWithTimeRange(start: Date, end?: Date) {
  if (end) {
    return mongoDbQuery<Log[]>((db, resolve) => {
      db.collection<Log>('log')
        .find({
          _id: {
            $gt: new ObjectId(timeToObjId(start)),
            $lt: new ObjectId(timeToObjId(end)),
          },
        })
        .toArray()
        .then(resolve)
    })
  }
  return mongoDbQuery<Log[]>((db, resolve) => {
    db.collection<Log>('log')
      .find({
        _id: {
          $gt: new ObjectId(timeToObjId(start)),
        },
      })
      .toArray()
      .then(resolve)
  })
}

export function findLogWithPageOffset(
  startIdx: number,
  pageSize: number,
  query: FilterQuery<Log>,
) {
  return mongoDbQuery<Log[]>((db, resolve) => {
    db.collection<Log>('log')
      .find(query)
      .sort({ _id: -1 })
      .skip(startIdx)
      .limit(pageSize)
      .toArray()
      .then(resolve)
  })
}
export function findLog(query: FilterQuery<Log>) {
  return mongoDbQuery<Log[]>((db, resolve) => {
    db.collection<Log>('log').find(query).toArray().then(resolve)
  })
}

export function findLogReserve(q: Log) {
  return mongoDbQuery<Log[]>((db, resolve) => {
    db.collection<Log>('log')
      .find(q)
      .sort({ $natural: -1 })
      .toArray()
      .then(resolve)
  })
}

export function findPvLogWithRange(start: Date, end?: Date) {
  if (end) {
    return mongoDbQuery<Log[]>((db, resolve) => {
      db.collection<Log>('log')
        .find({
          type: 'pv',
          _id: {
            $gt: new ObjectId(timeToObjId(start)),
            $lt: new ObjectId(timeToObjId(end)),
          },
        })
        .toArray()
        .then(resolve)
    })
  }
  return mongoDbQuery<Log[]>((db, resolve) => {
    db.collection<Log>('log')
      .find({
        type: 'pv',
        _id: {
          $gt: new ObjectId(timeToObjId(start)),
        },
      })
      .toArray()
      .then(resolve)
  })
}
