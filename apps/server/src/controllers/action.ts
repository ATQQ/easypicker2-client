import path from 'node:path'
import type { Context, FWRequest } from 'flash-wolves'
import { InjectCtx, Post, ReqBody, RouterController } from 'flash-wolves'
import type { FilterQuery } from 'mongodb'
import {
  findActionCount,
  findActionWithPageOffset,
  updateAction,
} from '@/db/actionDb'
import type {
  Action,
  DownloadAction,
  DownloadActionData,
} from '@/db/model/action'
import {
  ActionType,
  DownloadStatus,
} from '@/db/model/action'
import {
  checkFopTaskStatus,
  createDownloadUrl,
  getOSSFiles,
} from '@/utils/qiniuUtil'
import LocalUserDB from '@/utils/user-local-db'
import { getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import { shortLink } from '@/utils/stringUtil'

@RouterController('action', {
  needLogin: true,
})
export default class ActionController {
  @InjectCtx()
  ctx!: Context

  @Post('download/list')
  async getDownloadActionList(
    @ReqBody('pageSize') size: number,
    @ReqBody('pageIndex') index: number,
    @ReqBody('extraIds') ids: string[],
  ) {
    const pageIndex = +(index ?? 1)
    const extraIds = ids ?? []
    const pageSize = Math.max(+(size ?? 3), extraIds.length)
    const user = this.ctx.req.userInfo
    const query: FilterQuery<Action> = {
      $or: [
        ...extraIds.map(e => ({ id: e })),
        { type: ActionType.Download },
        { type: ActionType.Compress },
      ],
      userId: user.id,
    }
    const count = await findActionCount(query)
    const actions: DownloadAction[] = await findActionWithPageOffset(
      (pageIndex - 1) * pageSize,
      pageSize,
      query,
    )
    // 校验是否有效
    const now = Date.now()
    const expiredHours = 12
    const oneHour = 1000 * 60 * 60
    for (const action of actions) {
      let needUpdate = false
      // 检查是否过期
      if (action.data.status === DownloadStatus.SUCCESS) {
        const pass = Math.floor((now - +action.date) / oneHour)
        if (action.data.expiredTime && now > action.data.expiredTime) {
          action.data.status = DownloadStatus.EXPIRED
          needUpdate = true
        }
        else if (pass >= expiredHours) {
          action.data.status = DownloadStatus.EXPIRED
          needUpdate = true
        }
      }

      // 检查归档是否完成
      if (action.data.status === DownloadStatus.ARCHIVE) {
        const data = await checkFopTaskStatus(action.data.archiveKey)
        if (data.error) {
          action.data.status = DownloadStatus.FAIL
          action.data.error = data.error
          needUpdate = true
        }
        if (data.code === 0) {
          const [fileInfo] = await getOSSFiles(data.key)
          action.data.status = DownloadStatus.SUCCESS
          // 获取过期时间
          const expiredTime
            = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadCompressExpired || 60)

          action.data.originUrl = createDownloadUrl(
            data.key,
            expiredTime,
          )
          // @ts-expect-error
          action.data.url = shortLink(action._id, this.ctx.req)
          action.data.size = fileInfo.fsize
          action.data.expiredTime = expiredTime * 1000
          const filename = path.parse(fileInfo.key).name
          action.data.name = filename
          action.data.account = user.account
          action.data.mimeType = fileInfo.mimeType
          // 归档完成，常理上前端会触发下载，记录一下
          // 移动至，真正下载位置记录
          needUpdate = true
        }
      }
      // 异步更新落库
      if (needUpdate) {
        updateAction<DownloadActionData>(
          { id: action.id },
          {
            $set: {
              data: {
                ...action.data,
              },
            },
          },
        )
      }
    }

    // 获取文件信息
    return {
      sum: count,
      pageIndex: index,
      pageSize: size,
      actions: actions.map(v => ({
        id: v.id,
        type: v.type,
        status: v.data.status,
        url: v.data.url,
        tip: v.data.tip,
        date: +v.date,
        size: v.data.size,
        error: v.data.error,
      })),
    }
  }
}
