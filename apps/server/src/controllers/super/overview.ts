import type {
  FWRequest,
} from 'flash-wolves'
import type { FilterQuery } from 'mongodb'
import type {
  Log,
  LogBehaviorData,
  LogErrorData,
  LogRequestData,
  LogType,
  PvData,
} from '@/db/model/log'
import {
  Delete,
  Get,
  Post,
  ReqBody,
  ReqParams,
  ReqQuery,
  RouterController,
} from 'flash-wolves'
import { ObjectId } from 'mongodb'
import { addAction, findAction, updateAction } from '@/db/actionDb'
import { getFileOverviewCount } from '@/db/fileDb'
import {
  addBehavior,
  findLog,
  findLogCount,
  findLogCountWithTimeRange,
  findLogDistinctCount,
  findLogReserve,
  findLogWithPageOffset,
  findMonitorMetricLogs,
  findRequestMetricLogs,
} from '@/db/logDb'
import { ActionType } from '@/db/model/action'
import { USER_POWER } from '@/db/model/user'
import { getUserOverviewCount } from '@/db/userDb'
import SuperService from '@/service/super'
import { batchDeleteFiles, getFileKeys } from '@/utils/qiniuUtil'
import { escapeRegexForMongo, formatSize } from '@/utils/stringUtil'
import LocalUserDB from '@/utils/user-local-db'

const power = {
  userPower: USER_POWER.SUPER,
  needLogin: true,
}

const tempTxtFileReg = /\d+-\d+.txt$/
@RouterController('super/overview')
export default class OverviewController {
  private cacheLogs: Log[] = []

  private filterLog(logs: Log[]) {
    return logs.map((log) => {
      const { type, data, id } = log
      const date = new ObjectId(id).getTimestamp()
      if (type === 'request') {
        const d = data as LogRequestData

        return {
          id,
          date,
          type,
          ip: d.ip,
          msg: `${d.method} ${d.url} ${`${d.duration || 0}ms`}`,
        }
      }
      if (type === 'behavior') {
        const d = data as LogBehaviorData

        return {
          id,
          date,
          type,
          msg:
            (d?.info?.msg || '未知')
            // 特殊展示提交的文件大小
            + ((d.info?.data?.size && ` ${formatSize(d.info?.data?.size)}`)
              || ''),
          ip: d?.req?.ip || '未知',
        }
      }

      if (type === 'pv') {
        const d = data as PvData

        return {
          id,
          date,
          type,
          ip: d.ip,
          msg: `${d.path}`,
        }
      }
      const d = data as LogErrorData

      // 默认是错误
      return {
        id,
        date,
        type,
        ip: d?.req?.ip || '未知',
        msg: d?.msg || '未知',
      }
    })
  }

  private isExpiredCompressSource(putTime: number) {
    const { downloadCompressExpired } = LocalUserDB.getSiteConfig()
    return Date.now() - putTime > 1000 * 60 * (downloadCompressExpired || 60)
  }

  private getPercentile(sorted: number[], percentile: number) {
    if (sorted.length === 0) {
      return 0
    }
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil(sorted.length * percentile) - 1),
    )
    return sorted[idx]
  }

  private getMetricBucketMs(start: Date, end: Date) {
    const range = end.getTime() - start.getTime()
    if (range <= 1000 * 60 * 60 * 12) {
      return 1000 * 60 * 30
    }
    if (range <= 1000 * 60 * 60 * 24 * 2) {
      return 1000 * 60 * 60
    }
    if (range <= 1000 * 60 * 60 * 24 * 14) {
      return 1000 * 60 * 60 * 6
    }
    return 1000 * 60 * 60 * 24
  }

  private getRequestMetricsSeries(
    logs: Awaited<ReturnType<typeof findRequestMetricLogs>>,
    start: Date,
    end: Date,
  ) {
    const bucketMs = this.getMetricBucketMs(start, end)
    const buckets = new Map<number, number[]>()
    const first = Math.floor(start.getTime() / bucketMs) * bucketMs
    const last = Math.floor(end.getTime() / bucketMs) * bucketMs

    for (let time = first; time <= last; time += bucketMs) {
      buckets.set(time, [])
    }

    for (const log of logs) {
      const time = Math.floor(log.date.getTime() / bucketMs) * bucketMs
      buckets.get(time)?.push(log.duration)
    }

    return {
      bucketMs,
      series: [...buckets.entries()].map(([time, durations]) => {
        const sorted = durations.sort((a, b) => a - b)
        const sum = sorted.reduce((acc, cur) => acc + cur, 0)
        return {
          time,
          count: sorted.length,
          tp9999: this.getPercentile(sorted, 0.9999),
          tp999: this.getPercentile(sorted, 0.999),
          tp99: this.getPercentile(sorted, 0.99),
          tp95: this.getPercentile(sorted, 0.95),
          avg: sorted.length ? Math.round(sum / sorted.length) : 0,
        }
      }),
    }
  }

  private getRequestMetricsGroups(
    logs: Awaited<ReturnType<typeof findRequestMetricLogs>>,
    start: Date,
    end: Date,
  ) {
    const groups = new Map<string, Awaited<ReturnType<typeof findRequestMetricLogs>>>()
    for (const log of logs) {
      const key = `${log.method} ${log.path}`
      const group = groups.get(key) || []
      group.push(log)
      groups.set(key, group)
    }

    return [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
      .map(([key, list]) => {
        const [method, ...path] = key.split(' ')
        return {
          key,
          label: key,
          method,
          path: path.join(' '),
          total: list.length,
          series: this.getRequestMetricsSeries(list, start, end).series,
        }
      })
  }

  private getRequestPathOptions(logs: Awaited<ReturnType<typeof findRequestMetricLogs>>) {
    const map = new Map<string, {
      path: string
      count: number
    }>()
    for (const log of logs) {
      const key = log.path
      const item = map.get(key) || {
        path: log.path,
        count: 0,
      }
      item.count += 1
      map.set(key, item)
    }
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([key, item]) => ({
        label: `${key} (${item.count})`,
        value: item.path,
        method: '',
        count: item.count,
      }))
  }

  private getCountMetricSeries(
    logs: Awaited<ReturnType<typeof findMonitorMetricLogs>>,
    start: Date,
    end: Date,
    type: 'error' | 'pv',
  ) {
    const bucketMs = this.getMetricBucketMs(start, end)
    const buckets = new Map<number, Awaited<ReturnType<typeof findMonitorMetricLogs>>>()
    const first = Math.floor(start.getTime() / bucketMs) * bucketMs
    const last = Math.floor(end.getTime() / bucketMs) * bucketMs

    for (let time = first; time <= last; time += bucketMs) {
      buckets.set(time, [])
    }

    for (const log of logs) {
      if (log.type !== type) {
        continue
      }
      const time = Math.floor(log.date.getTime() / bucketMs) * bucketMs
      buckets.get(time)?.push(log)
    }

    return {
      bucketMs,
      series: [...buckets.entries()].map(([time, list]) => ({
        time,
        count: list.length,
        uv: new Set(list.map(item => item.ip).filter(Boolean)).size,
      })),
    }
  }

  private getTopMonitorItems(
    logs: Awaited<ReturnType<typeof findMonitorMetricLogs>>,
    type: 'error' | 'pv',
  ) {
    const map = new Map<string, {
      path: string
      msg: string
      count: number
    }>()

    for (const log of logs) {
      if (log.type !== type) {
        continue
      }
      const key = type === 'error'
        ? `${log.path}__${log.msg || '未知错误'}`
        : log.path
      const item = map.get(key) || {
        path: log.path,
        msg: log.msg || '',
        count: 0,
      }
      item.count += 1
      map.set(key, item)
    }

    return [...map.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  /**
   * 查询某条日志的详细信息
   * TODO:针对不同类型过滤
   */
  @Get('log/:id', power)
  async getLogDetail(@ReqParams('id') id: string) {
    const [log] = await findLog({ id })
    delete log.data.userId
    return log.data
  }

  @Get('count', power)
  async getDataOverview() {
    const now = new Date()
    const nowDate = new Date(
      `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} GMT+8`,
    )
    const [
      userCount,
      fileCount,
      ossFiles,
      logCount,
      logRecent,
      pvCount,
      todayPvCount,
      uv,
      todayUv,
      compressData,
      tempTxtFilesData,
    ] = await Promise.all([
      getUserOverviewCount(nowDate),
      getFileOverviewCount(nowDate),
      SuperService.getOssFiles(),
      findLogCount({}),
      findLogCountWithTimeRange({}, nowDate),
      findLogCount({ type: 'pv' }),
      findLogCountWithTimeRange({ type: 'pv' }, nowDate),
      findLogDistinctCount('data.ip', { type: 'pv' }),
      findLogDistinctCount('data.ip', { type: 'pv' }, nowDate),
      SuperService.getCachedFileKeys('easypicker2/temp_package'),
      SuperService.getCachedFileKeys('1').then(v => v.filter(v => tempTxtFileReg.test(v.key))),
    ])
    const tempFiles = compressData.concat(tempTxtFilesData)
    const expiredFiles = tempFiles.filter(item =>
      this.isExpiredCompressSource(item.putTime / 10000),
    )

    return {
      user: {
        sum: userCount.sum,
        recent: userCount.recent,
      },
      file: {
        server: {
          sum: fileCount.sum,
          recent: fileCount.recent,
          size: formatSize(fileCount.size),
        },
        oss: {
          sum: ossFiles.length,
          size: formatSize(ossFiles.reduce((sum, f) => sum + f.fsize, 0)),
        },
      },
      log: {
        sum: logCount,
        recent: logRecent,
      },
      pv: {
        today: {
          sum: todayPvCount,
          uv: todayUv,
        },
        all: {
          sum: pvCount,
          uv,
        },
      },
      compress: {
        all: {
          sum: tempFiles.length,
          size: formatSize(tempFiles.reduce((sum, item) => sum + item.fsize, 0)),
        },
        expired: {
          sum: expiredFiles.length,
          size: formatSize(expiredFiles.reduce((sum, item) => sum + item.fsize, 0)),
        },
      },
    }
  }

  @Post('request-metrics', power)
  async getRequestMetrics(
    @ReqBody('startTime') startTime?: number,
    @ReqBody('endTime') endTime?: number,
    @ReqBody('method') method = '',
    @ReqBody('path') path = '',
  ) {
    const end = endTime ? new Date(endTime) : new Date()
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 1000 * 60 * 60 * 12)
    const pathOptionLogsPromise = path
      ? findRequestMetricLogs(start, end, {
          method: method || undefined,
        })
      : undefined
    const logs = await findRequestMetricLogs(start, end, {
      method: method || undefined,
      path: path ? path.trim() : undefined,
    })
    const { bucketMs, series } = this.getRequestMetricsSeries(logs, start, end)
    const endpointGroups = this.getRequestMetricsGroups(logs, start, end)
    const groups = [
      {
        key: 'all',
        label: '全部接口',
        method: '',
        path: '',
        total: logs.length,
        series,
      },
      ...(path ? [] : endpointGroups),
    ]
    const pathOptionLogs = pathOptionLogsPromise
      ? await pathOptionLogsPromise
      : logs
    return {
      startTime: start.getTime(),
      endTime: end.getTime(),
      bucketMs,
      total: logs.length,
      series,
      groups,
      paths: this.getRequestPathOptions(pathOptionLogs),
    }
  }

  @Post('monitor-metrics', power)
  async getMonitorMetrics(
    @ReqBody('startTime') startTime?: number,
    @ReqBody('endTime') endTime?: number,
  ) {
    const end = endTime ? new Date(endTime) : new Date()
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 1000 * 60 * 60 * 12)
    const logs = await findMonitorMetricLogs(start, end)
    const pvLogs = logs.filter(log => log.type === 'pv')
    const errorLogs = logs.filter(log => log.type === 'error')
    const pvMetric = this.getCountMetricSeries(logs, start, end, 'pv')
    const errorMetric = this.getCountMetricSeries(logs, start, end, 'error')

    return {
      startTime: start.getTime(),
      endTime: end.getTime(),
      bucketMs: pvMetric.bucketMs,
      pv: {
        total: pvLogs.length,
        uv: new Set(pvLogs.map(log => log.ip).filter(Boolean)).size,
        series: pvMetric.series,
        top: this.getTopMonitorItems(logs, 'pv'),
      },
      error: {
        total: errorLogs.length,
        affectedIp: new Set(errorLogs.map(log => log.ip).filter(Boolean)).size,
        series: errorMetric.series,
        top: this.getTopMonitorItems(logs, 'error'),
      },
    }
  }

  @Delete('compress', power)
  async clearExpiredCompress(req: FWRequest) {
    // 清理过期压缩文件
    const compressData = await getFileKeys('easypicker2/temp_package')
    const expired = compressData
      .filter(item => this.isExpiredCompressSource(item.putTime / 10000))
      .map(v => v.key)
    await batchDeleteFiles(expired, req)

    // 清理txt临时文件
    const txtFiles = (await getFileKeys('1')).filter(v =>
      tempTxtFileReg.test(v.key),
    )
    const expiredTxt = txtFiles
      .filter(item => this.isExpiredCompressSource(item.putTime / 10000))
      .map(v => v.key)
    await batchDeleteFiles(expiredTxt, req)
    addBehavior(req, {
      module: 'super',
      msg: `清理无用文件 ${expired.length + expiredTxt.length}个`,
      data: {
        keys: expired.concat(expiredTxt),
      },
    })
  }

  /**
   * 一次性全查
   */
  @Get('log', power)
  async getAllLog() {
    let logs = []
    if (this.cacheLogs) {
      logs = this.cacheLogs
      findLogReserve({}).then((data) => {
        this.cacheLogs = data
      })
    }
    else {
      logs = await findLogReserve({})
      this.cacheLogs = logs
    }
    const result = this.filterLog(logs)

    return {
      logs: result,
    }
  }

  /**
   * 分页查询
   */
  @Post('log', power)
  async getPartLog(
    @ReqBody('type') type: LogType,
    @ReqBody('pageSize') size = 6,
    @ReqBody('pageIndex') index = 1,
    /** 关键词：仅匹配文案/路径/method/url 等，不匹配 IP */
    @ReqBody('search') search = '',
    /** 单独按 IP 筛选（与 search 可同时使用） */
    @ReqBody('ipSearch') ipSearch = '',
  ) {
    const term = typeof search === 'string' ? search.trim() : ''
    const ipTerm = typeof ipSearch === 'string' ? ipSearch.trim() : ''

    const clauses: FilterQuery<Log>[] = []

    if (term) {
      const rx = escapeRegexForMongo(term)
      const match = { $regex: rx, $options: 'i' as const }
      switch (type) {
        case 'behavior':
          clauses.push({ 'data.info.msg': match })
          break
        case 'request':
          clauses.push({
            $or: [
              { 'data.method': match },
              { 'data.url': match },
            ],
          })
          break
        case 'pv':
          clauses.push({ 'data.path': match })
          break
        case 'error':
          clauses.push({ 'data.msg': match })
          break
        default:
          break
      }
    }

    if (ipTerm) {
      const rx = escapeRegexForMongo(ipTerm)
      const ipMatch = { $regex: rx, $options: 'i' as const }
      switch (type) {
        case 'behavior':
          clauses.push({ 'data.req.ip': ipMatch })
          break
        case 'request':
          clauses.push({ 'data.ip': ipMatch })
          break
        case 'pv':
          clauses.push({ 'data.ip': ipMatch })
          break
        case 'error':
          clauses.push({ 'data.req.ip': ipMatch })
          break
        default:
          break
      }
    }

    const query: FilterQuery<Log>
      = clauses.length > 0
        ? { $and: [{ type }, ...clauses] }
        : { type }

    const logCount = await findLogCount(query)
    const logs = await findLogWithPageOffset((index - 1) * size, size, query)
    return {
      logs: this.filterLog(logs),
      sum: logCount,
    }
  }

  @Post('route/disabled', power)
  async changeDisabledRoute(
    @ReqBody('route') route: string,
    @ReqBody('status') status: boolean,
  ) {
    const actions = await findAction({
      type: ActionType.DisabledRoute,
    })
    const action = actions.find(v => v.data.route === route)
    if (!action) {
      await addAction({
        type: ActionType.DisabledRoute,
        data: {
          route,
          status,
        },
      })
      return
    }
    await updateAction(
      {
        id: action.id,
      },
      {
        $set: {
          data: {
            route,
            status,
          },
        },
      },
    )
  }

  @Get('route/disabled')
  async checkDisabledRoute(@ReqQuery('route') route: string) {
    const actions = await findAction<{
      route: string
      status: boolean
    }>({
      type: ActionType.DisabledRoute,
    })
    const action = actions.find(v => v.data.route === route)
    return {
      status: action?.data?.status || false,
    }
  }
}
