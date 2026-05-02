import type { FWRequest, FWResponse } from 'flash-wolves'
import type { FilterQuery } from 'mongodb'
import type {
  Log,
  LogBehaviorData,
  LogData,
  LogErrorData,
  LogRequestData,
  LogType,
  PvData,
} from './model/log'
import { Buffer } from 'node:buffer'
import { ObjectId } from 'mongodb'
import { insertCollection, mongoDbQuery } from '@/lib/dbConnect/mongodb'
import { escapeRegexForMongo, timeToObjId as getTimeObjectId, getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

export interface RequestMetricLog {
  date: Date
  method: string
  url: string
  path: string
  duration: number
}

export interface MonitorMetricLog {
  date: Date
  type: 'error' | 'pv'
  path: string
  ip: string
  msg?: string
}

/** 启动时创建常用索引，加速按 type 分页与时间排序 */
export function ensureLogIndexes() {
  return mongoDbQuery<void>((db, resolve) => {
    db.collection('log')
      .createIndexes([
        { key: { type: 1, _id: -1 }, name: 'log_type_id_desc' },
        { key: { 'type': 1, 'data.method': 1, '_id': -1 }, name: 'log_type_method_id_desc' },
        { key: { 'type': 1, 'data.path': 1, '_id': -1 }, name: 'log_type_path_id_desc' },
      ])
      .then(() => resolve())
      .catch((err) => {
        console.warn('[mongodb] ensureLogIndexes failed:', err?.message || err)
        resolve()
      })
  })
}

function getLogData(type: LogType, data: LogData): Log {
  return {
    id: getUniqueKey(),
    type,
    data,
  }
}

function getPathnameFromUrl(url = '') {
  try {
    return new URL(url, 'http://easypicker.local').pathname
  }
  catch {
    return url.split('?')[0] || url
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
  const startTime = req.startTime ?? Date.now()
  const base = {
    method,
    url,
    path: getPathnameFromUrl(url),
    query,
    params,
    body,
    userAgent,
    refer,
    ip,
    userId,
  }
  let persisted = false
  const persistRequestLog = () => {
    if (persisted) {
      return
    }
    persisted = true
    const endTime = Date.now()
    const data: LogRequestData = {
      ...base,
      startTime,
      endTime,
      duration: Math.max(0, endTime - startTime),
    }
    insertCollection('log', getLogData('request', data))
  }
  // finish：响应体已发送完毕，耗时更接近真实接口处理时间
  res.once('finish', persistRequestLog)
  // close：异常断开等可能不会触发 finish，保证仍会落一条日志
  res.once('close', persistRequestLog)
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

export function findLogCountWithTimeRange(query: FilterQuery<Log>, start: Date, end?: Date) {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<Log>('log')
      .countDocuments({
        ...query,
        _id: {
          $gt: new ObjectId(timeToObjId(start)),
          ...end && { $lt: new ObjectId(timeToObjId(end)) },
        },
      })
      .then(resolve)
  })
}

export function findLogDistinctCount(
  field: string,
  query: FilterQuery<Log>,
  start?: Date,
  end?: Date,
) {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<Log>('log')
      .distinct(field, {
        ...query,
        ...start && {
          _id: {
            $gt: new ObjectId(timeToObjId(start)),
            ...end && { $lt: new ObjectId(timeToObjId(end)) },
          },
        },
      })
      .then(list => resolve(list.filter(Boolean).length))
  })
}

export function findRequestMetricLogs(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
  } = {},
) {
  const { method, path } = options
  const pathRegex = path ? `^${escapeRegexForMongo(path)}(?:\\?|$)` : ''
  const query: FilterQuery<Log> = {
    'type': 'request',
    '_id': {
      $gt: new ObjectId(timeToObjId(start)),
      $lt: new ObjectId(timeToObjId(end)),
    },
    'data.duration': {
      $gte: 5,
    },
    ...method && { 'data.method': method },
    ...path && {
      $or: [
        { 'data.path': path },
        {
          'data.url': {
            $regex: pathRegex,
            $options: 'i',
          },
        },
      ],
    },
  }

  return mongoDbQuery<RequestMetricLog[]>((db, resolve) => {
    db.collection<Log>('log')
      .find(query, {
        projection: {
          '_id': 1,
          'data.method': 1,
          'data.path': 1,
          'data.url': 1,
          'data.duration': 1,
        },
      })
      .sort({ _id: 1 })
      .toArray()
      .then((logs) => {
        resolve(logs.map((log) => {
          const data = log.data as LogRequestData
          return {
            date: (log as any)._id.getTimestamp(),
            method: data.method,
            url: data.url,
            path: data.path || getPathnameFromUrl(data.url),
            duration: data.duration || 0,
          }
        }))
      })
  })
}

export function findMonitorMetricLogs(start: Date, end: Date) {
  return mongoDbQuery<MonitorMetricLog[]>((db, resolve) => {
    db.collection<Log>('log')
      .find({
        type: {
          $in: ['error', 'pv'],
        },
        _id: {
          $gt: new ObjectId(timeToObjId(start)),
          $lt: new ObjectId(timeToObjId(end)),
        },
      }, {
        projection: {
          '_id': 1,
          'type': 1,
          'data.path': 1,
          'data.ip': 1,
          'data.msg': 1,
          'data.req.url': 1,
          'data.req.ip': 1,
        },
      })
      .sort({ _id: 1 })
      .toArray()
      .then((logs) => {
        resolve(logs.map((log) => {
          const date = (log as any)._id.getTimestamp()
          if (log.type === 'pv') {
            const data = log.data as PvData
            return {
              date,
              type: 'pv',
              path: data.path || '/',
              ip: data.ip || '未知',
            }
          }
          const data = log.data as LogErrorData
          return {
            date,
            type: 'error',
            path: getPathnameFromUrl(data.req?.url),
            ip: data.req?.ip || '未知',
            msg: data.msg || '未知错误',
          }
        }))
      })
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
