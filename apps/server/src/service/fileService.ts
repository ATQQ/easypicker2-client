import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { ObjectID, ObjectId } from 'mongodb'
import type { FindOptionsWhere } from 'typeorm'
import { In } from 'typeorm'
import dayjs from 'dayjs'
import QiniuService from './qiniuService'
import BehaviorService from './behaviorService'
import TokenService from './tokenService'
import TaskInfoService from './taskInfoService'
import type { Files, User } from '@/db/entity'
import { FileRepository } from '@/db/fileDb'
import type { File } from '@/db/model/file'
import { publicError } from '@/constants/errorMsg'
import { batchFileStatus, createDownloadUrl, deleteObjByKey, judgeFileIsExist, makeZipWithKeys } from '@/utils/qiniuUtil'
import { calculateSize, getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import LocalUserDB from '@/utils/user-local-db'
import { addDownloadAction, findAction, updateAction } from '@/db/actionDb'
import type { DownloadActionData } from '@/db/model/action'
import { ActionType, DownloadStatus } from '@/db/model/action'
import { B2GB, formatPrice, formatSize, getUniqueKey, isSameInfo, normalizeFileName, percentageValue, shortLink } from '@/utils/stringUtil'
import { TaskRepository } from '@/db/taskDb'
import { UserRepository } from '@/db/userDb'
import { BOOLEAN } from '@/db/model/public'
import { findLog, timeToObjId } from '@/db/logDb'
import type { Log } from '@/db/model/log'
import type { DownloadLogAnalyzeItem } from '@/types'
import { diffMonth } from '@/utils/time-utils'
import { USER_POWER } from '@/db/model/user'
import { PeopleRepository } from '@/db/peopleDb'

@Provide()
export default class FileService {
  @InjectCtx()
  private ctx: Context

  @Inject(FileRepository)
  private fileRepository: FileRepository

  @Inject(QiniuService)
  private qiniuService: QiniuService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(TokenService)
  private tokenService: TokenService

  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  @Inject(PeopleRepository)
  private peopleRepository: PeopleRepository

  async selectFilesLimitCount(options: Partial<Files>, count: number) {
    return this.fileRepository.findWithLimitCount(options, count, {
      id: 'DESC',
    })
  }

  getOssKey(file: File) {
    return `easypicker2/${file.task_key || file.taskKey}/${file.hash}/${
      file.name
    }`
  }

  /**
   * 实际文件用了
   */
  async getFileUsage(userId: number) {
    // 获取用户实际的文件
    const files = await this.fileRepository.findMany({
      userId,
    })

    // 获取 OSS
    const ossFilesMap = await this.qiniuService.getFilesMap(files)

    return files.reduce((pre, file) => {
      const ossKey = this.getOssKey(file)
      const { categoryKey } = file

      return (
        pre
        + ((ossFilesMap.get(ossKey) || ossFilesMap.get(categoryKey))?.fsize || 0)
      )
    }, 0)
  }

  async downloadOne(fileId: number) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    // TODO: 后端限制超容量下载上传
    const file = await this.fileRepository.findOne({
      userId,
      id: fileId,
    })

    if (!file) {
      this.behaviorService.add('file', `下载文件失败 用户:${logAccount} 文件记录不存在`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }
    let k = this.getOssKey(file)
    let isExist = false
    // 兼容旧路径的逻辑
    if (file.categoryKey) {
      isExist = await judgeFileIsExist(file.categoryKey)
    }

    if (!isExist) {
      isExist = await judgeFileIsExist(k)
    }
    else {
      k = file.categoryKey
    }

    if (!isExist) {
      this.behaviorService.add('file', `下载文件失败 用户:${logAccount} 文件:${file.name} 已从云上移除`, {
        account: logAccount,
        name: file.name,
      })

      throw publicError.file.notExist
    }

    const status = await batchFileStatus([k])
    const mimeType = status[0]?.data?.mimeType
    // 新日志记录在重定向链接中

    // 单个文件链接默认 1 分钟有效期，避免频繁重复下载
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
    const originUrl = createDownloadUrl(k, expiredTime)

    const result = await addDownloadAction({
      userId,
      type: ActionType.Download,
      thingId: file.id,
    })

    const link = shortLink(result.insertedId, this.ctx.req)
    const data: DownloadActionData = {
      url: link,
      originUrl,
      status: DownloadStatus.SUCCESS,
      ids: [file.id],
      tip: file.name,
      name: file.name,
      size: file.size,
      account: logAccount,
      mimeType,
      expiredTime: expiredTime * 1000,
    }

    await updateAction<DownloadActionData>(
      { _id: ObjectID(result.insertedId) },
      {
        $set: {
          data,
        },
      },
    )
    return {
      link,
      mimeType,
    }
  }

  async batchDownload(ids: number[], zipName: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const files = await this.fileRepository.findMany({
      id: In(ids),
      userId,
    })
    if (files.length === 0) {
      this.behaviorService.add('file', `批量下载文件失败 用户:${logAccount}`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }
    let keys = []
    for (const file of files) {
      const { categoryKey } = file
      const key = this.getOssKey(file)
      if (!categoryKey) {
        keys.push(key)
      }
      // 兼容老板平台数据
      if (categoryKey) {
        const isOldExist = await judgeFileIsExist(categoryKey)
        if (isOldExist) {
          keys.push(categoryKey)
        }
        else {
          keys.push(key)
        }
      }
    }

    const filesStatus = await batchFileStatus(keys)
    let size = 0
    keys = keys.filter((_, idx) => {
      const { code } = filesStatus[idx]
      if (code === 200) {
        size += filesStatus[idx].data.fsize || 0
      }
      return code === 200
    })
    if (keys.length === 0) {
      this.behaviorService.add('file', `批量下载文件失败 用户:${logAccount} 文件均已从云上移除`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }

    const filename = normalizeFileName(zipName) ?? `${getUniqueKey()}`
    const value = await makeZipWithKeys(keys, filename)
    this.behaviorService.add('file', `批量下载任务 用户:${logAccount} 文件数量:${keys.length} 压缩任务名${value}`, {
      account: logAccount,
      length: keys.length,
      size,
    })

    await addDownloadAction({
      userId,
      type: ActionType.Compress,
      data: {
        status: DownloadStatus.ARCHIVE,
        ids,
        tip: `${filename}.zip (${keys.length}个文件)`,
        archiveKey: value,
      },
    })
    return {
      k: value,
    }
  }

  async downloadTemplate(filename: string, taskKey: string) {
    const k = `easypicker2/${taskKey}_template/${filename}`
    const isExist = await judgeFileIsExist(k)
    if (!isExist) {
      this.behaviorService.add('file', '下载模板文件 参数错误', {
        data: this.ctx.req.query,
      })
      throw publicError.file.notExist
    }

    const task = await this.taskRepository.findOne({
      k: taskKey,
      del: BOOLEAN.FALSE,
    })

    if (!task) {
      this.behaviorService.add('file', '下载模板文件 参数错误', {
        data: this.ctx.req.query,
      })
      throw publicError.file.notExist
    }

    const user = await this.userRepository.findOne({
      id: task.userId,
    })

    const [fileInfo] = await batchFileStatus([k])
    const { mimeType, fsize } = fileInfo?.data || {}

    // 单个文件链接默认 1 分钟有效期，避免频繁重复下载
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
    const originUrl = createDownloadUrl(k, expiredTime)

    const result = await addDownloadAction({
      userId: task.userId,
      type: ActionType.TemplateDownload,
      thingId: taskKey,
    })

    const link = shortLink(result.insertedId, this.ctx.req)
    const data: DownloadActionData = {
      url: link,
      originUrl,
      status: DownloadStatus.SUCCESS,
      ids: [],
      tip: filename,
      name: filename,
      size: fsize,
      account: user.account,
      mimeType,
      expiredTime: expiredTime * 1000,
    }

    await updateAction<DownloadActionData>(
      { _id: ObjectID(result.insertedId) },
      {
        $set: {
          data,
        },
      },
    )

    return {
      link,
      mimeType,
    }
  }

  async downloadCount(idList: number[]) {
    // 先获取 downloadAction
    // 筛选状态，不包含失败的
    const actions = await findAction({
      'userId': this.ctx.req.userInfo.id,
      'data.status': {
        $in: [DownloadStatus.ARCHIVE, DownloadStatus.SUCCESS, DownloadStatus.EXPIRED],
      },
      'data.ids': {
        $in: idList,
      },
    })

    // 再获取 action 对应的日志条数
    // 有日志就按照日志计算
    // @ts-expect-error
    const actionsIds = actions.map(v => v._id.toHexString())
    const logs = await findLog({
      'type': 'behavior',
      'data.info.data.downloadActionId': { $in: actionsIds },
    })

    const values = idList.map((fileId) => {
      const baseCount = actions
        .filter(v => v.data.ids?.includes(fileId))
        .reduce((pre, action) => {
          // @ts-expect-error
          const logCount = logs.filter(v => v.data?.info?.data?.downloadActionId === action._id.toHexString()).length
          return pre + (logCount || 1)
        }, 0)
      return baseCount
    })
    return values
  }

  async downloadLog(account = '', ops?: {
    startTime?: Date
    endTime?: Date
  }) {
    const { startTime, endTime } = ops || {}
    return findLog({
      ...(startTime || endTime) && {
        _id: {
          ...startTime && { $gte: new ObjectId(timeToObjId(startTime)) },
          ...endTime && { $lte: new ObjectId(timeToObjId(endTime)) },
        },
      },
      'type': 'behavior',
      'data.info.msg': { $regex: new RegExp(`^(下载文件成功 用户:${account}|归档下载文件成功 用户:${account}|下载模板文件 用户:${account})`) },
    })
  }

  getOSSFileSizeUntilNow(
    fileList: Files[],
    filesMap: Map<string, Qiniu.ItemInfo>,
    ops?: {
      startTime?: Date
    },
  ) {
    const { startTime } = ops || {}
    const sum = fileList.reduce((pre, file) => {
      const ossKey = this.getOssKey(file)
      const { categoryKey } = file
      const fileSize = +file.size
      const ossSize = (filesMap.get(ossKey) || filesMap.get(categoryKey))?.fsize || 0
      // 文件已经被删除
      if (!ossSize) {
        const { ossDelTime } = file
        // 不存在 删除时间 为存量数据，不计算
        if (!ossDelTime) {
          return pre
        }
        // 删除时间在统计时间之前，不计算
        if (ossDelTime < startTime) {
          return pre
        }
        // 存在 删除时间 说明是删除数据，按实际月数计算
        return pre + diffMonth(ossDelTime, startTime) * fileSize
      }
      // 文件没有被删除，按实际存在时间计算
      return pre + diffMonth(Date.now(), Math.max(+new Date(file.date), +startTime)) * fileSize
    }, 0)
    return Math.round(sum)
  }

  analyzeDownloadLog(logs: Log[]) {
    const oneFile = {
      count: 0,
      size: 0,
    }
    const compressFile = {
      count: 0,
      size: 0,
    }

    const templateFile = {
      count: 0,
      size: 0,
    }

    logs.forEach((v) => {
      const { info } = v.data
      const { msg } = info
      const size = +info.data.size || 0
      if (msg.startsWith('下载文件成功 用户:')) {
        oneFile.count += 1
        oneFile.size += size
      }
      else if (msg.startsWith('归档下载文件成功 用户:')) {
        compressFile.count += 1
        compressFile.size += size
      }
      else if (msg.startsWith('下载模板文件 用户:')) {
        templateFile.count += 1
        templateFile.size += size
      }
    })
    return {
      oneFile,
      compressFile,
      templateFile,
    }
  }

  /**
   * 通过空间判断是否限制上传
   * @param limitSize 可用空间
   * @param fileSize 已用空间
   */
  limitUploadBySpace(limitSize: number, fileSize: number) {
    const { limitSpace } = LocalUserDB.getSiteConfig()
    return limitSpace && (limitSize === 0 || limitSize < fileSize)
  }

  limitUploadByWallet(balance: number) {
    const { limitWallet } = LocalUserDB.getSiteConfig()
    return limitWallet && balance <= 0
  }

  calculateQiniuPrice(download: {
    one: DownloadLogAnalyzeItem
    compress: DownloadLogAnalyzeItem
    template: DownloadLogAnalyzeItem
  }, ossSize: number) {
    const { qiniuBackhaulTrafficPercentage, qiniuCompressPrice, qiniuBackhaulTrafficPrice, qiniuOSSPrice, qiniuCDNPrice } = LocalUserDB.getSiteConfig()
    // 存储费用
    const OSSPrice = B2GB(ossSize) * qiniuOSSPrice
    // 压缩费用
    const compressPrice = B2GB(download.compress.size) * qiniuCompressPrice
    const downloadSize = B2GB(
      download.one.size
      + download.compress.size
      + download.template.size,
    )
    // 回源费用
    const backhaulTrafficPrice = downloadSize * qiniuBackhaulTrafficPercentage * qiniuBackhaulTrafficPrice
    // CDN 费用
    const cdnPrice = downloadSize * qiniuCDNPrice

    return {
      ossPrice: formatPrice(OSSPrice),
      compressPrice: formatPrice(compressPrice),
      backhaulTrafficPrice: formatPrice(backhaulTrafficPrice),
      cdnPrice: formatPrice(cdnPrice),
      total: formatPrice(
        +formatPrice(OSSPrice)
        + +formatPrice(compressPrice)
        + +formatPrice(backhaulTrafficPrice)
        + +formatPrice(cdnPrice),
      ),
    }
  }

  addFile(file: Files) {
    file.name = normalizeFileName(file.name)
    file.date = new Date()
    return this.fileRepository.insert(file)
  }

  async getUserFiles() {
    const { id } = this.ctx.req.userInfo
    const files = await this.fileRepository.findMany({
      userId: id,
      del: BOOLEAN.FALSE,
    }, { order: { id: 'DESC' } })
    return files
  }

  async findOneFile(ops: FindOptionsWhere<Files>) {
    return this.fileRepository.findOne({
      del: BOOLEAN.FALSE,
      ...ops,
    })
  }

  async deleteOneFile(file: Files) {
    const { account: logAccount } = this.ctx.req.userInfo
    if (!file) {
      this.behaviorService.add('file', `删除文件失败 用户:${logAccount} 文件记录不存在`, {
        account: logAccount,
        fileId: file.id,
      })
      throw publicError.file.notExist
    }
    let k = `easypicker2/${file.taskKey}/${file.hash}/${file.name}`
    // 兼容旧路径的逻辑
    if (file.categoryKey) {
      k = file.categoryKey
    }
    const sameRecord = await this.fileRepository.findMany({
      taskKey: file.taskKey,
      hash: file.hash,
      name: file.name,
      del: BOOLEAN.FALSE,
    })

    const isRepeat = sameRecord.length > 1

    // 存在相同文件时，存储上共用一份数据，不能删除OSS资源
    if (!isRepeat) {
      // 删除OSS上文件
      deleteObjByKey(k)
    }
    if (!file.ossDelTime) {
      file.ossDelTime = new Date()
    }
    file.del = BOOLEAN.TRUE
    file.delTime = new Date()
    await this.fileRepository.update(file)
    this.behaviorService.add('file', `删除文件提交记录成功 用户:${logAccount} 文件:${file.name} ${
        isRepeat ? `还存在${sameRecord.length - 1}个重复文件` : '删除OSS资源'
      }`, {
      account: logAccount,
      name: file.name,
      taskKey: file.taskKey,
      hash: file.hash,
    })
  }

  async getUserOverview(user: User, options?: Partial<{
    files: Files[]
    filesMap: Map<string, Qiniu.ItemInfo>
    downloadLog: Log[]
  }>) {
    let { files, filesMap, downloadLog } = options || {}
    const { moneyStartDay } = LocalUserDB.getSiteConfig()
    if (!files) {
      files = await this.fileRepository.findMany({
        userId: user.id,
      })
    }
    if (!filesMap) {
      filesMap = await this.qiniuService.getFilesMap(files)
    }
    if (!downloadLog) {
      downloadLog = await this.downloadLog(user.account, {
        startTime: new Date(moneyStartDay),
      })
    }
    const fileInfo = files
    let ossCount = 0
    let originFileSize = 0
    let AMonthAgoSize = 0
    let AQuarterAgoSize = 0
    let AHalfYearAgoSize = 0
    const fileSize = fileInfo.reduce((pre, v) => {
      const { date } = v
      originFileSize += (+v.size || 0)
      const ossKey = this.getOssKey(v)
      const { fsize = 0 }
          = filesMap.get(ossKey) || filesMap.get(v.categoryKey) || {}

      if (fsize) {
        ossCount += 1
      }
      if (dayjs(date).isBefore(dayjs().subtract(1, 'month'))) {
        AMonthAgoSize += fsize
      }
      if (dayjs(date).isBefore(dayjs().subtract(3, 'month'))) {
        AQuarterAgoSize += fsize
      }
      if (dayjs(date).isBefore(dayjs().subtract(6, 'month'))) {
        AHalfYearAgoSize += fsize
      }

      return pre + fsize
    }, 0)

    const userTokens = await this.tokenService.getAllTokens(user.account)
    if (!userTokens.length) {
      this.tokenService.checkAllToken(userTokens, user.account)
    }

    const limitSize = calculateSize((user.power === USER_POWER.SUPER
      ? Math.max(1024, user?.size)
      : user?.size) ?? 2)

    // 空间为 0 也不允许上传
    const limitUpload = this.limitUploadBySpace(limitSize, fileSize)
    const percentage
        = percentageValue(fileSize, limitSize)

    const { oneFile, compressFile, templateFile } = this.analyzeDownloadLog(
      downloadLog,
    )

    // TODO：累计费用 = 实时消费 + 已结算费用
    // 实时消费
    const price = this.calculateQiniuPrice({
      one: oneFile,
      compress: compressFile,
      template: templateFile,
    }, this.getOSSFileSizeUntilNow(fileInfo, filesMap, {
      startTime: new Date(moneyStartDay),
    }))

    const balance = +user.wallet - +price.total
    const isAdmin = user.power === USER_POWER.SUPER
    const limitWallet = this.limitUploadByWallet(balance)
    return {
      fileCount: fileInfo.length,
      originFileSize,
      ossCount,
      limitSize:
          user.power === USER_POWER.SUPER ? '无限制' : formatSize(limitSize),
      maxSize: limitSize,
      limitUpload: isAdmin ? false : (limitWallet || limitUpload),
      limitSpace: limitUpload,
      limitWallet,
      percentage,
      resources: formatSize(fileSize),
      monthAgoSize: formatSize(AMonthAgoSize),
      quarterAgoSize: formatSize(AQuarterAgoSize),
      halfYearSize: formatSize(AHalfYearAgoSize),
      onlineCount: userTokens.length,
      // 便于排序
      usage: fileSize,
      lastLoginTime: +new Date(user.loginTime) || 0,
      oneFile,
      compressFile,
      templateFile,
      downloadCount: oneFile.count + compressFile.count + templateFile.count,
      downloadSize: oneFile.size + compressFile.size + templateFile.size,
      price,
      cost: +price.total,
      wallet: user.wallet || 0,
      // 剩余
      balance: balance.toFixed(2),
    }
  }

  async withdrawFile(data) {
    const { taskKey, taskName, filename, hash, peopleName, info } = data
    const taskInfo = await this.taskInfoService.getTaskInfo(taskKey)
    const limitPeople = taskInfo.people === BOOLEAN.TRUE

    // 内容完全一致的提交记录，不包含限制的名字
    let files = await this.fileRepository.findMany({
      del: BOOLEAN.FALSE,
      taskKey,
      taskName,
      name: filename,
      hash,
    })

    files = files.filter(file => isSameInfo(file.info, info))

    const passFiles = files.filter(file => file.people === peopleName)

    if (!passFiles.length) {
      this.behaviorService.add('file', `撤回文件失败 ${peopleName} 文件:${filename} 信息不匹配`, {
        filename,
        peopleName,
        data,
      })
      throw publicError.file.notExist
    }
    const isDelOss = passFiles.length === files.length
    // 删除提交记录
    // 删除文件
    if (isDelOss) {
      const key = `easypicker2/${taskKey}/${hash}/${filename}`
      deleteObjByKey(key)
    }
    await this.fileRepository.updateSpecifyFields({
      id: In(passFiles.map(file => file.id)),
    }, {
      del: BOOLEAN.TRUE,
      ossDelTime: new Date(),
      delTime: new Date(),
    })
    this.behaviorService.add('file', `撤回文件成功 文件:${filename} 删除记录:${
      passFiles.length
    } 删除OSS资源:${isDelOss ? '是' : '否'}`, {
      limitPeople,
      isDelOss,
      filesCount: files.length,
      passFilesCount: passFiles.length,
      filename,
      peopleName,
      data,
    })

    // 更新人员提交状态
    if (peopleName) {
      const people = await this.peopleRepository.findOne({
        name: peopleName,
        status: 1,
        taskKey,
      })

      if (!people) {
        this.behaviorService.add('file', `姓名:${peopleName} 不存在`, {
          filename,
          peopleName,
          data,
        })
        throw publicError.file.notExist
      }
      people.status = (await this.fileRepository.findMany({
        del: BOOLEAN.FALSE,
        people: peopleName,
        taskKey,
      })).length
        ? 1
        : 0
      people.submitDate = new Date()
      await this.peopleRepository.update(people)
    }
  }

  async batchDelete(ids: number[]) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const files = await this.fileRepository.findMany({
      del: BOOLEAN.FALSE,
      userId,
      id: In(ids),
    })

    if (files.length === 0) {
      return
    }
    const keys = new Set<string>()

    // TODO：上传时尽力保持每个文件的独立性
    // TODO：O(n²)的复杂度，观察一下实际操作频率优化，会导致接口时间变长
    for (const file of files) {
      const { name, taskKey, hash, categoryKey } = file
      // 兼容旧逻辑
      if (categoryKey) {
        keys.add(categoryKey)
      }
      else {
        // 文件一模一样的记录避免误删
        const dbCount = await this.fileRepository.count({
          del: BOOLEAN.FALSE,
          taskKey,
          hash,
          name,
        })

        const delCount = files.filter(
          v => v.taskKey === taskKey && v.hash === hash && v.name === name,
        ).length
        if (dbCount <= delCount) {
          keys.add(this.getOssKey(file))
        }
      }
    }

    // 删除OSS上文件
    // TODO: 优化重复代码
    this.qiniuService.batchDeleteFiles([...keys])
    await this.fileRepository.updateSpecifyFields({
      id: In(files.map(file => file.id)),
    }, {
      del: BOOLEAN.TRUE,
      ossDelTime: new Date(),
      delTime: new Date(),
    })

    this.behaviorService.add('file', `批量删除文件成功 用户:${logAccount} 文件记录数量:${files.length} OSS资源数量:${keys.size}`, {
      account: logAccount,
      length: files.length,
      ossCount: keys.size,
    })
  }

  // TODO：利用 cookie 优化
  async checkSubmitInfo(data) {
    const { taskKey, info, name = '' } = data

    let files = await this.fileRepository.findMany({
      del: BOOLEAN.FALSE,
      taskKey,
      people: name,
    })
    files = files.filter(v => isSameInfo(v.info, JSON.stringify(info)))
    ;(async () => {
      const task = await this.taskRepository.findOne({
        k: taskKey,
      })
      if (task) {
        this.behaviorService.add('file', `查询是否提交过文件: ${files.length > 0 ? '是' : '否'} 任务:${
          task.name
        } 数量:${files.length}`, {
          taskKey,
          taskName: task.name,
          info,
          count: files.length,
        })
      }
      else {
        this.behaviorService.add('file', `查询是否提交过文件: 任务 ${taskKey} 不存在`, {
          taskKey,
          taskName: task.name,
          info,
        })
      }
    })()

    return {
      isSubmit: files.length > 0,
      txt: '',
    }
  }
}
