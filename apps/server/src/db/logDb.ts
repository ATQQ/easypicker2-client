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
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import { ObjectId } from 'mongodb'
import { insertCollection, mongoDbQuery } from '@/lib/dbConnect/mongodb'
import { escapeRegexForMongo, timeToObjId as getTimeObjectId, getUniqueKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

export interface RequestMetricLog {
  id: string
  date: Date
  method: string
  url: string
  path: string
  duration: number
  statusCode: number
}

export interface RequestStatusLog {
  id: string
  date: Date
  method: string
  url: string
  path: string
  duration: number
  statusCode: number
  businessCode?: string | number
  ip: string
  userId: number
}

export interface RequestStatusLogDetail extends RequestStatusLog {
  query: any
  params: any
  body: any
  userAgent: string
  refer: string
  response?: LogRequestData['response']
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
        { key: { 'type': 1, 'data.statusCode': 1, '_id': -1 }, name: 'log_type_status_code_id_desc' },
        { key: { 'type': 1, 'data.businessCode': 1, '_id': -1 }, name: 'log_type_business_code_id_desc' },
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

const maxResponseBodyBytes = 64 * 1024

function responseChunkToBuffer(chunk: unknown, encoding?: unknown) {
  const enc = typeof encoding === 'string' ? encoding as BufferEncoding : undefined
  if (Buffer.isBuffer(chunk)) {
    return chunk
  }
  if (typeof chunk === 'string') {
    return Buffer.from(chunk, enc)
  }
  if (chunk instanceof ArrayBuffer) {
    return Buffer.from(chunk)
  }
  if (ArrayBuffer.isView(chunk)) {
    return Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)
  }
  return Buffer.from(String(chunk), enc)
}

function bufferToUint8Array(buffer: Buffer) {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

function concatResponseChunks(chunks: Buffer[]) {
  return Buffer.concat(chunks.map(bufferToUint8Array))
}

function decodeResponseBuffer(buffer: Buffer, contentEncoding?: string | number | string[]) {
  const encoding = Array.isArray(contentEncoding)
    ? contentEncoding[0]
    : contentEncoding
  if (typeof encoding !== 'string' || !encoding) {
    return buffer
  }
  try {
    if (encoding.includes('br')) {
      return brotliDecompressSync(bufferToUint8Array(buffer))
    }
    if (encoding.includes('gzip')) {
      return gunzipSync(bufferToUint8Array(buffer))
    }
    if (encoding.includes('deflate')) {
      return inflateSync(bufferToUint8Array(buffer))
    }
  }
  catch {
    return buffer
  }
  return buffer
}

function parseResponseBodyFromBuffer(buffer: Buffer) {
  const text = buffer.toString('utf8')
  if (!text) {
    return undefined
  }
  try {
    return JSON.parse(text)
  }
  catch {
    return text
  }
}

function getBusinessCodeFromResponseBody(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined
  }
  const code = body.code
  if (typeof code === 'number' || typeof code === 'string') {
    return code
  }
  return undefined
}

function createRequestLogQuery(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
  } = {},
) {
  const { method, path } = options
  const pathRegex = path ? `^${escapeRegexForMongo(path)}(?:\\?|$)` : ''
  return {
    type: 'request',
    _id: {
      $gt: new ObjectId(timeToObjId(start)),
      $lt: new ObjectId(timeToObjId(end)),
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
  } as FilterQuery<Log>
}

function mapRequestStatusLog(log: Log): RequestStatusLog {
  const data = log.data as LogRequestData
  return {
    id: log.id || String((log as any)._id),
    date: (log as any)._id.getTimestamp(),
    method: data.method,
    url: data.url,
    path: data.path || getPathnameFromUrl(data.url),
    duration: data.duration || 0,
    statusCode: Number(data.statusCode || 0),
    businessCode: data.businessCode ?? getBusinessCodeFromResponseBody(data.response?.body),
    ip: data.ip || '',
    userId: data.userId || 0,
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
  const responseChunks: Buffer[] = []
  let logicalResponseBody: any
  let capturedResponseBytes = 0
  let responseBodyTruncated = false
  const captureResponseChunk = (chunk: unknown, encoding?: unknown) => {
    if (chunk === undefined || chunk === null || capturedResponseBytes >= maxResponseBodyBytes) {
      return
    }
    const buffer = responseChunkToBuffer(chunk, encoding)
    const remaining = maxResponseBodyBytes - capturedResponseBytes
    if (buffer.length > remaining) {
      responseChunks.push(buffer.subarray(0, remaining))
      capturedResponseBytes += remaining
      responseBodyTruncated = true
      return
    }
    responseChunks.push(buffer)
    capturedResponseBytes += buffer.length
  }
  const rawWrite = (res as any).write
  const rawEnd = (res as any).end
  const rawJson = (res as any).json
  if (typeof rawJson === 'function') {
    ;(res as any).json = function (body: any, ...args: any[]) {
      logicalResponseBody = body
      return rawJson.apply(this, [body, ...args])
    }
  }
  if (typeof rawWrite === 'function') {
    ;(res as any).write = function (chunk: unknown, ...args: any[]) {
      captureResponseChunk(chunk, args[0])
      return rawWrite.apply(this, [chunk, ...args])
    }
  }
  if (typeof rawEnd === 'function') {
    ;(res as any).end = function (chunk?: unknown, ...args: any[]) {
      captureResponseChunk(chunk, args[0])
      return rawEnd.apply(this, [chunk, ...args])
    }
  }
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
    const contentEncoding = res.getHeader('Content-Encoding') || (res as any).contentEncoding
    const responseBody = logicalResponseBody === undefined
      ? parseResponseBodyFromBuffer(decodeResponseBuffer(concatResponseChunks(responseChunks), contentEncoding))
      : logicalResponseBody
    const data: LogRequestData = {
      ...base,
      statusCode: res.statusCode,
      businessCode: getBusinessCodeFromResponseBody(responseBody),
      startTime,
      endTime,
      duration: Math.max(0, endTime - startTime),
      response: {
        body: responseBody,
        truncated: responseBodyTruncated,
      },
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
 * 记录无请求上下文的系统行为日志
 */
export function addSystemBehavior(info: LogBehaviorData.Info) {
  const data: LogBehaviorData = {
    req: {
      method: 'SYSTEM',
      path: 'system',
      userAgent: '',
      refer: '',
      ip: 'system',
    },
    user: {
      userId: 0,
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

export function findLogCount(q: FilterQuery<Log>, maxTimeMS?: number) {
  return mongoDbQuery<number>((db, resolve) => {
    db.collection<Log>('log')
      .countDocuments(q, maxTimeMS ? { maxTimeMS } : undefined)
      .then(resolve)
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
    minDuration?: number
  } = {},
) {
  const { minDuration = 5, ...queryOptions } = options
  const query: FilterQuery<Log> = {
    ...createRequestLogQuery(start, end, queryOptions),
    ...(minDuration > 0 && {
      'data.duration': {
        $gte: minDuration,
      },
    }),
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
          'data.statusCode': 1,
          'data.businessCode': 1,
        },
      })
      .sort({ _id: 1 })
      .toArray()
      .then((logs) => {
        resolve(logs.map((log) => {
          const data = log.data as LogRequestData
          return {
            id: log.id || String((log as any)._id),
            date: (log as any)._id.getTimestamp(),
            method: data.method,
            url: data.url,
            path: data.path || getPathnameFromUrl(data.url),
            duration: data.duration || 0,
            statusCode: Number(data.statusCode || 0),
            businessCode: data.businessCode ?? getBusinessCodeFromResponseBody(data.response?.body),
          }
        }))
      })
  })
}

export function findRequestStatusMetricLogs(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
  } = {},
) {
  return mongoDbQuery<RequestStatusLog[]>((db, resolve) => {
    db.collection<Log>('log')
      .find(createRequestLogQuery(start, end, options), {
        projection: {
          '_id': 1,
          'id': 1,
          'data.method': 1,
          'data.path': 1,
          'data.url': 1,
          'data.duration': 1,
          'data.statusCode': 1,
          'data.businessCode': 1,
          'data.ip': 1,
          'data.userId': 1,
        },
      })
      .sort({ _id: 1 })
      .toArray()
      .then(logs => resolve(logs.map(mapRequestStatusLog)))
  })
}

export function findRequestStatusLogs(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
    statusCode?: number
    non200Only?: boolean
    pageIndex?: number
    pageSize?: number
  } = {},
) {
  const pageIndex = Math.max(1, Number(options.pageIndex || 1))
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 10)))
  const statusQuery: FilterQuery<Log> = {}
  if (typeof options.statusCode === 'number' && Number.isFinite(options.statusCode)) {
    statusQuery['data.statusCode'] = options.statusCode
  }
  else if (options.non200Only) {
    statusQuery['data.statusCode'] = {
      $exists: true,
      $ne: 200,
    }
  }
  const query: FilterQuery<Log> = {
    ...createRequestLogQuery(start, end, {
      method: options.method,
      path: options.path,
    }),
    ...statusQuery,
  }

  return mongoDbQuery<{
    logs: RequestStatusLogDetail[]
    sum: number
    pageIndex: number
    pageSize: number
  }>((db, resolve) => {
    Promise.all([
      db.collection<Log>('log').countDocuments(query),
      db.collection<Log>('log')
        .find(query, {
          projection: {
            '_id': 1,
            'id': 1,
            'data.method': 1,
            'data.path': 1,
            'data.url': 1,
            'data.duration': 1,
            'data.statusCode': 1,
            'data.ip': 1,
            'data.userId': 1,
            'data.query': 1,
            'data.params': 1,
            'data.body': 1,
            'data.userAgent': 1,
            'data.refer': 1,
            'data.response': 1,
          },
        })
        .sort({ _id: -1 })
        .skip((pageIndex - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
    ]).then(([sum, logs]) => {
      resolve({
        logs: logs.map((log) => {
          const data = log.data as LogRequestData
          return {
            ...mapRequestStatusLog(log),
            query: data.query,
            params: data.params,
            body: data.body,
            userAgent: data.userAgent,
            refer: data.refer,
            response: data.response,
          }
        }),
        sum,
        pageIndex,
        pageSize,
      })
    })
  })
}

export function findRequestBusinessStatusMetricLogs(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
  } = {},
) {
  return mongoDbQuery<RequestStatusLog[]>((db, resolve) => {
    db.collection<Log>('log')
      .find(createRequestLogQuery(start, end, options), {
        projection: {
          '_id': 1,
          'id': 1,
          'data.method': 1,
          'data.path': 1,
          'data.url': 1,
          'data.duration': 1,
          'data.statusCode': 1,
          'data.businessCode': 1,
          'data.response.body.code': 1,
          'data.ip': 1,
          'data.userId': 1,
        },
      })
      .sort({ _id: 1 })
      .toArray()
      .then(logs => resolve(logs.map(mapRequestStatusLog)))
  })
}

export function findRequestBusinessStatusLogs(
  start: Date,
  end: Date,
  options: {
    method?: string
    path?: string
    businessCode?: string | number
    nonZeroOnly?: boolean
    pageIndex?: number
    pageSize?: number
  } = {},
) {
  const pageIndex = Math.max(1, Number(options.pageIndex || 1))
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 10)))
  const query = createRequestLogQuery(start, end, {
    method: options.method,
    path: options.path,
  })

  return mongoDbQuery<{
    logs: RequestStatusLogDetail[]
    sum: number
    pageIndex: number
    pageSize: number
  }>((db, resolve) => {
    db.collection<Log>('log')
      .find(query, {
        projection: {
          '_id': 1,
          'id': 1,
          'data.method': 1,
          'data.path': 1,
          'data.url': 1,
          'data.duration': 1,
          'data.statusCode': 1,
          'data.businessCode': 1,
          'data.ip': 1,
          'data.userId': 1,
          'data.query': 1,
          'data.params': 1,
          'data.body': 1,
          'data.userAgent': 1,
          'data.refer': 1,
          'data.response': 1,
        },
      })
      .sort({ _id: -1 })
      .toArray()
      .then((logs) => {
        const filteredLogs = logs.filter((log) => {
          const data = log.data as LogRequestData
          const code = data.businessCode ?? getBusinessCodeFromResponseBody(data.response?.body)
          if (code === undefined) {
            return false
          }
          if (options.businessCode !== undefined) {
            return String(code) === String(options.businessCode)
          }
          if (options.nonZeroOnly) {
            return String(code) !== '0'
          }
          return true
        })
        const pageLogs = filteredLogs.slice((pageIndex - 1) * pageSize, pageIndex * pageSize)
        resolve({
          logs: pageLogs.map((log) => {
            const data = log.data as LogRequestData
            return {
              ...mapRequestStatusLog(log),
              query: data.query,
              params: data.params,
              body: data.body,
              userAgent: data.userAgent,
              refer: data.refer,
              response: data.response,
            }
          }),
          sum: filteredLogs.length,
          pageIndex,
          pageSize,
        })
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
  maxTimeMS?: number,
) {
  return mongoDbQuery<Log[]>((db, resolve) => {
    const cursor = db.collection<Log>('log')
      .find(query)
      .sort({ _id: -1 })
      .skip(startIdx)
      .limit(pageSize)
    if (maxTimeMS) {
      cursor.maxTimeMS(maxTimeMS)
    }
    cursor.toArray().then(resolve)
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
