import type {
  FWRequest,
} from 'flash-wolves'
import {
  Delete,
  Get,
  Post,
  ReqBody,
  ReqParams,
  ReqQuery,
  RouterController,
} from 'flash-wolves'
import type { FilterQuery } from 'mongodb'
import { ObjectId } from 'mongodb'
import { selectFilesNew } from '@/db/fileDb'
import {
  addBehavior,
  findLog,
  findLogCount,
  findLogReserve,
  findLogWithPageOffset,
  findLogWithTimeRange,
  findPvLogWithRange,
} from '@/db/logDb'
import type {
  Log,
  LogBehaviorData,
  LogErrorData,
  LogRequestData,
  LogType,
  PvData,
} from '@/db/model/log'
import { USER_POWER } from '@/db/model/user'
import { selectAllUser } from '@/db/userDb'
import { batchDeleteFiles, getFileKeys } from '@/utils/qiniuUtil'
import { formatSize } from '@/utils/stringUtil'
import SuperService from '@/service/super'
import { addAction, findAction, updateAction } from '@/db/actionDb'
import { ActionType } from '@/db/model/action'
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
    const users = await selectAllUser(['join_time'])
    const userRecent = users.filter(
      u => new Date(u.join_time) > nowDate,
    ).length

    const files = await selectFilesNew({}, ['date', 'size'])
    const fileRecent = files.filter(f => new Date(f.date) > nowDate).length

    // redis做一层缓存
    const ossFiles = await SuperService.getOssFiles()

    const logCount = await findLogCount({})
    const logRecent = await findLogWithTimeRange(nowDate)

    // 总
    const pvList = await findLogReserve({
      type: 'pv',
    })
    const uv = new Set(pvList.map(pv => pv.data.ip)).size
    // 当日
    const todayPv = await findPvLogWithRange(nowDate)
    const todayUv = new Set(todayPv.map(pv => pv.data.ip)).size

    // redis做一层缓存
    const compressData = await getFileKeys('easypicker2/temp_package')
    const tempTxtFilesData = await getFileKeys('1').then(v =>
      v.filter(v => tempTxtFileReg.test(v.key)),
    )

    return {
      user: {
        sum: users.length,
        recent: userRecent,
      },
      file: {
        server: {
          sum: files.length,
          recent: fileRecent,
          size: formatSize(files.reduce((sum, f) => sum + f.size, 0)),
        },
        oss: {
          sum: ossFiles.length,
          size: formatSize(ossFiles.reduce((sum, f) => sum + f.fsize, 0)),
        },
      },
      log: {
        sum: logCount,
        recent: logRecent.length,
      },
      pv: {
        today: {
          sum: todayPv.length,
          uv: todayUv,
        },
        all: {
          sum: pvList.length,
          uv,
        },
      },
      compress: {
        all: {
          sum: compressData.length + tempTxtFilesData.length,
          size: formatSize(
            compressData
              .concat(tempTxtFilesData)
              .reduce((sum, item) => sum + item.fsize, 0),
          ),
        },
        expired: {
          sum: compressData
            .concat(tempTxtFilesData)
            .filter(item =>
              this.isExpiredCompressSource(item.putTime / 10000),
            ).length,
          size: formatSize(
            compressData
              .concat(tempTxtFilesData)
              .filter(item =>
                this.isExpiredCompressSource(item.putTime / 10000),
              )
              .reduce((sum, item) => sum + item.fsize, 0),
          ),
        },
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
    @ReqBody('search') search = '',
  ) {
    let query: FilterQuery<Log> = {
      type,
    }
    if (search) {
      switch (type) {
        case 'behavior':
          query = {
            ...query,
            $or: [
              {
                'data.info.msg': {
                  $regex: `.*${search}.*`,
                },
              },
              {
                'data.req.ip': {
                  $regex: `.*${search}.*`,
                },
              },
            ],
          }
          break
        case 'request':
          query = {
            ...query,
            $or: [
              {
                'data.method': {
                  $regex: `.*${search}.*`,
                },
              },
              {
                'data.url': {
                  $regex: `.*${search}.*`,
                },
              },
              {
                'data.ip': {
                  $regex: `.*${search}.*`,
                },
              },
            ],
          }
          break
        case 'pv':
          query = {
            ...query,
            $or: [
              {
                'data.path': {
                  $regex: `.*${search}.*`,
                },
              },
              {
                'data.ip': {
                  $regex: `.*${search}.*`,
                },
              },
            ],
          }
          break
        case 'error':
          query = {
            ...query,
            $or: [
              {
                'data.req.ip': {
                  $regex: `.*${search}.*`,
                },
              },
              {
                'data.msg': {
                  $regex: `.*${search}.*`,
                },
              },
            ],
          }
          break
        default:
          break
      }
    }
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
