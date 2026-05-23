import type { Context } from 'flash-wolves'
import type { FindOptionsWhere } from 'typeorm'
import type { Files, User } from '@/db/entity'
import type { DownloadActionData } from '@/db/model/action'
import type { File } from '@/db/model/file'
import type { Log } from '@/db/model/log'
import type { DownloadLogAnalyzeItem } from '@/types'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { TextEncoder } from 'node:util'
import dayjs from 'dayjs'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { ObjectID, ObjectId } from 'mongodb'
import { In } from 'typeorm'
import { qiniuConfig } from '@/config'
import { publicError } from '@/constants/errorMsg'
import { addDownloadAction, findAction, updateAction } from '@/db/actionDb'
import { FileRepository } from '@/db/fileDb'
import { findLog, timeToObjId } from '@/db/logDb'
import { ActionType, DownloadStatus } from '@/db/model/action'
import { BOOLEAN } from '@/db/model/public'
import { USER_POWER } from '@/db/model/user'
import { PeopleRepository } from '@/db/peopleDb'
import { expiredRedisKey, getRedisVal, setRedisValue } from '@/db/redisDb'
import { TaskRepository } from '@/db/taskDb'
import { UserRepository } from '@/db/userDb'
import { localObjectAbsPath } from '@/utils/localFilePath'
import { sendMail } from '@/utils/mail'
import { batchFileStatus, createDownloadUrl, deleteObjByKey, judgeFileIsExist, makeZipWithKeys } from '@/utils/qiniuUtil'
import { B2GB, formatPrice, formatSize, getUniqueKey, isSameInfo, normalizeFileName, percentageValue, shortLink } from '@/utils/stringUtil'
import { diffMonth } from '@/utils/time-utils'
import LocalUserDB from '@/utils/user-local-db'
import { calculateSize, getQiniuFileUrlExpiredTime } from '@/utils/userUtil'
import BehaviorService from './behaviorService'
import QiniuService from './qiniuService'
import TaskInfoService from './taskInfoService'
import TokenService from './tokenService'

interface FilePageOptions {
  pageIndex?: number
  pageSize?: number
  categoryKey?: string
  taskKey?: string
  keyword?: string
}

type StoredFileLocation
  = | { storage: 'local', relPath: string, size: number }
    | { storage: 'qiniu', key: string, size: number }

const DOWNLOAD_COUNT_REFRESH_INTERVAL_MS = 1000 * 60 * 10
const DOWNLOAD_COUNT_CACHE_SECONDS = 60 * 60 * 24 * 7

@Provide()
export default class FileService {
  private refreshingDownloadCountKeys = new Set<string>()

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

  /** 批量拉取多任务的最近提交记录，避免 N+1 */
  async selectRecentLogsByTaskKeys(taskKeys: string[], perTaskLimit: number) {
    const rows = await this.fileRepository.findRecentFilesByTaskKeys(
      taskKeys,
      perTaskLimit,
    )
    const map = new Map<string, { name: string, date: Date }[]>()
    for (const row of rows) {
      const list = map.get(row.task_key) ?? []
      list.push({ name: row.name, date: row.date })
      map.set(row.task_key, list)
    }
    return map
  }

  getOssKey(file: File) {
    return `easypicker2/${file.task_key || file.taskKey}/${file.hash}/${
      file.name
    }`
  }

  private getFileStorage(file: Pick<Files, 'storage'>) {
    return file.storage === 'local' ? 'local' : 'qiniu'
  }

  private getLocalRelPath(file: Pick<Files, 'taskKey' | 'hash' | 'name' | 'categoryKey'>) {
    return file.categoryKey?.startsWith('easypicker')
      ? file.categoryKey
      : `easypicker2/${file.taskKey}/${file.hash}/${file.name}`
  }

  private getLocalLocation(file: Files): StoredFileLocation | null {
    const relPath = this.getLocalRelPath(file)
    const abs = localObjectAbsPath(relPath)
    if (!fs.existsSync(abs)) {
      return null
    }
    return {
      storage: 'local',
      relPath,
      size: fs.statSync(abs).size,
    }
  }

  private async getQiniuLocation(file: Files): Promise<StoredFileLocation | null> {
    const key = this.getOssKey(file)
    if (file.categoryKey && await judgeFileIsExist(file.categoryKey)) {
      return {
        storage: 'qiniu',
        key: file.categoryKey,
        size: +file.size || 0,
      }
    }
    if (await judgeFileIsExist(key)) {
      return {
        storage: 'qiniu',
        key,
        size: +file.size || 0,
      }
    }
    return null
  }

  private async resolveStoredFile(file: Files): Promise<StoredFileLocation | null> {
    const storage = this.getFileStorage(file)
    if (storage === 'local') {
      return this.getLocalLocation(file) || await this.getQiniuLocation(file)
    }
    return await this.getQiniuLocation(file) || this.getLocalLocation(file)
  }

  private async deleteStoredObject(file: Files) {
    const storage = this.getFileStorage(file)
    if (storage === 'local') {
      const local = this.getLocalLocation(file)
      if (local?.storage === 'local') {
        fs.unlinkSync(localObjectAbsPath(local.relPath))
        return
      }
    }

    const qiniu = await this.getQiniuLocation(file)
    if (qiniu?.storage === 'qiniu') {
      deleteObjByKey(qiniu.key)
      return
    }

    const local = this.getLocalLocation(file)
    if (local?.storage === 'local') {
      fs.unlinkSync(localObjectAbsPath(local.relPath))
    }
  }

  private getDownloadCountCacheKey(userId: number, fileId: number) {
    return `file:download-count:${userId}:${fileId}`
  }

  private async setDownloadCountCache(userId: number, fileId: number, count: number) {
    await setRedisValue(
      this.getDownloadCountCacheKey(userId, fileId),
      JSON.stringify({
        count,
        updatedAt: Date.now(),
      }),
      DOWNLOAD_COUNT_CACHE_SECONDS,
    )
  }

  private parseDownloadCountCache(value: string | null) {
    if (!value) {
      return {
        count: 0,
        needRefresh: true,
      }
    }

    try {
      const data = JSON.parse(value)
      const updatedAt = Number(data.updatedAt || 0)
      return {
        count: Number(data.count || 0),
        needRefresh: Date.now() - updatedAt > DOWNLOAD_COUNT_REFRESH_INTERVAL_MS,
      }
    }
    catch {
      const count = Number(value)
      return {
        count: Number.isFinite(count) ? count : 0,
        needRefresh: true,
      }
    }
  }

  async expireDownloadCountCache(userId: number | string, idList: number[] = []) {
    if (!userId || idList.length === 0) {
      return
    }
    await Promise.all(
      idList.map(id => expiredRedisKey(this.getDownloadCountCacheKey(Number(userId), id))),
    )
  }

  private async refreshDownloadCountCache(userId: number, idList: number[]) {
    const ids = [...new Set(idList)].filter(id => Number.isFinite(id))
    const refreshKeys = ids.map(id => this.getDownloadCountCacheKey(userId, id))
    const needRefreshIds = ids.filter((_, idx) => {
      const key = refreshKeys[idx]
      if (this.refreshingDownloadCountKeys.has(key)) {
        return false
      }
      this.refreshingDownloadCountKeys.add(key)
      return true
    })

    if (needRefreshIds.length === 0) {
      return
    }

    try {
      const counts = await this.downloadCountByUser(userId, needRefreshIds)
      await Promise.all(
        needRefreshIds.map((id, idx) => this.setDownloadCountCache(userId, id, counts[idx] || 0)),
      )
    }
    catch (error) {
      console.warn('刷新文件下载次数缓存失败', error)
    }
    finally {
      needRefreshIds.forEach((id) => {
        this.refreshingDownloadCountKeys.delete(this.getDownloadCountCacheKey(userId, id))
      })
    }
  }

  private async getCachedDownloadCount(userId: number, idList: number[]) {
    if (idList.length === 0) {
      return []
    }

    const cachedValues = await Promise.all(
      idList.map(id => getRedisVal(this.getDownloadCountCacheKey(userId, id))),
    )
    const refreshIds: number[] = []
    const counts = cachedValues.map((value, idx) => {
      const cache = this.parseDownloadCountCache(value)
      if (cache.needRefresh) {
        refreshIds.push(idList[idx])
      }
      return cache.count
    })

    // 下载次数允许短暂不实时，分页接口不等待 Mongo 日志统计。
    void this.refreshDownloadCountCache(userId, refreshIds)
    return counts
  }

  private normalizeFileForClient(file: Files) {
    return {
      ...file,
      category_key: file.categoryKey,
      origin_name: file.originName,
      task_name: file.taskName,
      task_key: file.taskKey,
      size: +file.size,
    }
  }

  private async getTaskKeysByCategory(userId: number, categoryKey: string) {
    const tasks = await this.taskRepository.findMany({
      userId,
      del: BOOLEAN.FALSE,
      categoryKey,
    })
    return tasks.map(task => task.k)
  }

  private async getAllTaskKeys(userId: number) {
    const tasks = await this.taskRepository.findMany({
      userId,
      del: BOOLEAN.FALSE,
    })
    return tasks.map(task => task.k)
  }

  private async resolveFileQueryOptions(options: FilePageOptions) {
    const { id: userId } = this.ctx.req.userInfo
    const taskKey = options.taskKey && options.taskKey !== 'all'
      ? options.taskKey
      : undefined

    if (taskKey) {
      return {
        userId,
        taskKey,
        keyword: options.keyword?.trim(),
      }
    }

    if (options.categoryKey === 'no-task') {
      return {
        userId,
        excludeTaskKeys: await this.getAllTaskKeys(userId),
        keyword: options.keyword?.trim(),
      }
    }

    if (
      options.categoryKey
      && options.categoryKey !== 'all'
      && options.categoryKey !== 'trash'
    ) {
      return {
        userId,
        taskKeys: await this.getTaskKeysByCategory(userId, options.categoryKey),
        keyword: options.keyword?.trim(),
      }
    }

    if (options.categoryKey === 'trash') {
      return {
        userId,
        taskKeys: [],
        keyword: options.keyword?.trim(),
      }
    }

    return {
      userId,
      keyword: options.keyword?.trim(),
    }
  }

  private async getFilePreviewMap(files: Files[]) {
    if (files.length === 0) {
      return new Map<number, { cover: string, preview: string }>()
    }

    const keys = files.map(file => this.getOssKey(file))
    const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
    const filesStatus = await batchFileStatus(keys)
    const previewMap = new Map<number, { cover: string, preview: string }>()

    filesStatus.forEach((status, idx) => {
      const file = files[idx]
      if (status.code === 200 && status.data?.mimeType?.includes('image')) {
        previewMap.set(file.id, {
          cover: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imageCoverStyle}`,
            expiredTime,
          ),
          preview: createDownloadUrl(
            `${keys[idx]}${qiniuConfig.imagePreviewStyle}`,
            expiredTime,
          ),
        })
        return
      }
      previewMap.set(file.id, {
        cover: '',
        preview: 'https://img.cdn.sugarat.top/mdImg/MTY0OTkwMDMxNTY4NA==649900315684',
      })
    })

    return previewMap
  }

  async getUserFilesPage(options: FilePageOptions) {
    const pageIndex = Math.max(1, Number(options.pageIndex || 1))
    const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || 6)))
    const queryOptions = await this.resolveFileQueryOptions(options)
    const { files, total, totalSize, filterSize } = await this.fileRepository.findPage({
      ...queryOptions,
      pageIndex,
      pageSize,
    })
    const ids = files.map(file => file.id)
    const [downloadCounts, previewMap] = await Promise.all([
      this.getCachedDownloadCount(queryOptions.userId, ids),
      this.getFilePreviewMap(files),
    ])

    return {
      files: files.map((file, idx) => ({
        ...this.normalizeFileForClient(file),
        downloadCount: downloadCounts[idx] || 0,
        ...(previewMap.get(file.id) || {}),
      })),
      pageIndex,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      totalSize,
      filterSize,
    }
  }

  async getUserFileIdsByQuery(options: FilePageOptions) {
    const queryOptions = await this.resolveFileQueryOptions(options)
    return this.fileRepository.findIds(queryOptions)
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

    const location = await this.resolveStoredFile(file)
    if (!location) {
      this.behaviorService.add('file', `下载文件失败 用户:${logAccount} 文件:${file.name} 已从存储中移除`, {
        account: logAccount,
        name: file.name,
        storage: file.storage,
      })
      throw publicError.file.notExist
    }

    if (location.storage === 'local') {
      const mimeType = 'application/octet-stream'
      const expiredTime = getQiniuFileUrlExpiredTime(LocalUserDB.getSiteConfig()?.downloadOneExpired || 1)
      const result = await addDownloadAction({
        userId,
        type: ActionType.Download,
        thingId: file.id,
      })
      const link = shortLink(result.insertedId, this.ctx.req)
      const data: DownloadActionData = {
        url: link,
        originUrl: '',
        storage: 'local',
        localRelPath: location.relPath,
        status: DownloadStatus.SUCCESS,
        ids: [file.id],
        tip: file.name,
        name: file.name,
        size: location.size || file.size,
        account: logAccount,
        mimeType,
        expiredTime: expiredTime * 1000,
      }
      await updateAction<DownloadActionData>(
        { _id: ObjectID(result.insertedId) },
        { $set: { data } },
      )
      return { link, mimeType }
    }

    const k = location.key
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

  private getArchiveEntryName(file: Files, usedNames: Set<string>) {
    const raw = normalizeFileName(file.name || `${file.id}`) || `${file.id}`
    const dotIndex = raw.lastIndexOf('.')
    const name = dotIndex > 0 ? raw.slice(0, dotIndex) : raw
    const ext = dotIndex > 0 ? raw.slice(dotIndex) : ''
    let entryName = raw
    let idx = 1
    while (usedNames.has(entryName)) {
      entryName = `${name}_${idx}${ext}`
      idx += 1
    }
    usedNames.add(entryName)
    return entryName
  }

  private getCrc32Table() {
    const table: number[] = []
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      }
      table[i] = c >>> 0
    }
    return table
  }

  private crc32(bytes: Uint8Array) {
    const table = this.getCrc32Table()
    let crc = 0xFFFFFFFF
    for (let i = 0; i < bytes.length; i++) {
      crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  private writeUint16(view: DataView, offset: number, value: number) {
    view.setUint16(offset, value, true)
  }

  private writeUint32(view: DataView, offset: number, value: number) {
    view.setUint32(offset, value >>> 0, true)
  }

  private concatBytes(chunks: Uint8Array[]) {
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const res = new Uint8Array(size)
    let offset = 0
    chunks.forEach((chunk) => {
      res.set(chunk, offset)
      offset += chunk.length
    })
    return res
  }

  private toByteArray(data: ArrayLike<number>) {
    const bytes = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data[i]
    }
    return bytes
  }

  private createZipBytes(entries: { name: string, data: Uint8Array }[]) {
    const localParts: Uint8Array[] = []
    const centralParts: Uint8Array[] = []
    const encoder = new TextEncoder()
    let offset = 0

    entries.forEach((entry) => {
      const nameBytes = encoder.encode(entry.name)
      const checksum = this.crc32(entry.data)

      const local = new Uint8Array(30 + nameBytes.length)
      const localView = new DataView(local.buffer)
      this.writeUint32(localView, 0, 0x04034B50)
      this.writeUint16(localView, 4, 20)
      this.writeUint16(localView, 6, 0x0800)
      this.writeUint16(localView, 8, 0)
      this.writeUint32(localView, 10, 0)
      this.writeUint32(localView, 14, checksum)
      this.writeUint32(localView, 18, entry.data.length)
      this.writeUint32(localView, 22, entry.data.length)
      this.writeUint16(localView, 26, nameBytes.length)
      local.set(nameBytes, 30)
      localParts.push(local, entry.data)

      const central = new Uint8Array(46 + nameBytes.length)
      const centralView = new DataView(central.buffer)
      this.writeUint32(centralView, 0, 0x02014B50)
      this.writeUint16(centralView, 4, 20)
      this.writeUint16(centralView, 6, 20)
      this.writeUint16(centralView, 8, 0x0800)
      this.writeUint16(centralView, 10, 0)
      this.writeUint32(centralView, 12, 0)
      this.writeUint32(centralView, 16, checksum)
      this.writeUint32(centralView, 20, entry.data.length)
      this.writeUint32(centralView, 24, entry.data.length)
      this.writeUint16(centralView, 28, nameBytes.length)
      this.writeUint32(centralView, 42, offset)
      central.set(nameBytes, 46)
      centralParts.push(central)

      offset += local.length + entry.data.length
    })

    const centralDir = this.concatBytes(centralParts)
    const end = new Uint8Array(22)
    const endView = new DataView(end.buffer)
    this.writeUint32(endView, 0, 0x06054B50)
    this.writeUint16(endView, 8, entries.length)
    this.writeUint16(endView, 10, entries.length)
    this.writeUint32(endView, 12, centralDir.length)
    this.writeUint32(endView, 16, offset)

    return this.concatBytes([...localParts, centralDir, end])
  }

  private downloadBuffer(url: string) {
    return new Promise<Uint8Array>((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          this.downloadBuffer(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download failed: ${res.statusCode}`))
          return
        }
        const chunks: Uint8Array[] = []
        res.on('data', chunk => chunks.push(this.toByteArray(chunk)))
        res.on('end', () => resolve(this.concatBytes(chunks)))
      }).on('error', reject)
    })
  }

  private async makeLocalZip(
    files: Files[],
    locations: StoredFileLocation[],
    zipName: string,
  ) {
    const usedNames = new Set<string>()
    const entries = await Promise.all(files.map(async (file, idx) => {
      const location = locations[idx]
      const data = location.storage === 'local'
        ? this.toByteArray(fs.readFileSync(localObjectAbsPath(location.relPath)))
        : await this.downloadBuffer(createDownloadUrl(location.key))
      return {
        name: this.getArchiveEntryName(file, usedNames),
        data,
      }
    }))
    const relPath = `easypicker2/temp_package/${Date.now()}/${normalizeFileName(zipName)}.zip`
    const absPath = localObjectAbsPath(relPath)
    fs.mkdirSync(path.dirname(absPath), { recursive: true })
    fs.writeFileSync(absPath, this.createZipBytes(entries))
    return relPath
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
    const resolved = await Promise.all(files.map(file => this.resolveStoredFile(file)))
    const validFiles: Files[] = []
    const locations: StoredFileLocation[] = []
    resolved.forEach((location, idx) => {
      if (location) {
        validFiles.push(files[idx])
        locations.push(location)
      }
    })

    if (locations.length === 0) {
      this.behaviorService.add('file', `批量下载文件失败 用户:${logAccount} 文件均已从存储中移除`, {
        account: logAccount,
      })
      throw publicError.file.notExist
    }

    const validIds = validFiles.map(file => file.id)
    const filename = normalizeFileName(zipName || `${getUniqueKey()}`)
    const size = locations.reduce((sum, location) => sum + (+location.size || 0), 0)
    const hasLocalFile = locations.some(location => location.storage === 'local')

    if (hasLocalFile) {
      const relPath = await this.makeLocalZip(validFiles, locations, filename)
      const result = await addDownloadAction({
        userId,
        type: ActionType.Compress,
      })
      const link = shortLink(result.insertedId, this.ctx.req)
      await updateAction<DownloadActionData>(
        { _id: ObjectID(result.insertedId) },
        {
          $set: {
            data: {
              url: link,
              originUrl: '',
              storage: 'local',
              localRelPath: relPath,
              status: DownloadStatus.SUCCESS,
              ids: validIds,
              tip: `${filename}.zip (${locations.length}个文件)`,
              name: `${filename}.zip`,
              size,
              account: logAccount,
              mimeType: 'application/zip',
            },
          },
        },
      )
      this.behaviorService.add('file', `本机批量下载任务 用户:${logAccount} 文件数量:${locations.length} 压缩文件:${relPath}`, {
        account: logAccount,
        length: locations.length,
        size,
      })
      return {
        k: relPath,
        url: link,
      }
    }

    const keys = locations
      .filter((location): location is Extract<StoredFileLocation, { storage: 'qiniu' }> => location.storage === 'qiniu')
      .map(location => location.key)
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
        ids: validIds,
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
    const userId = this.ctx.req.userInfo.id
    const counts = await this.downloadCountByUser(userId, idList)
    await Promise.all(
      idList.map((id, idx) => this.setDownloadCountCache(userId, id, counts[idx] || 0)),
    )
    return counts
  }

  async downloadCountByUser(userId: number, idList: number[]) {
    // 先获取 downloadAction
    // 筛选状态，不包含失败的
    const actions = await findAction({
      'userId': userId,
      'data.status': {
        $in: [DownloadStatus.ARCHIVE, DownloadStatus.SUCCESS, DownloadStatus.EXPIRED],
      },
      'data.ids': {
        $in: idList,
      },
    })

    // 再获取 action 对应的日志条数
    // 有日志就按照日志计算
    // @ts-expect-error mongodb action id is available at runtime
    const actionsIds = actions.map(v => v._id.toHexString())
    const logs = await findLog({
      'type': 'behavior',
      'data.info.data.downloadActionId': { $in: actionsIds },
    })

    const values = idList.map((fileId) => {
      const baseCount = actions
        .filter(v => v.data.ids?.includes(fileId))
        .reduce((pre, action) => {
          // @ts-expect-error mongodb action id is available at runtime
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

  async getFastUploadLimit(user: User) {
    const fileSize = await this.fileRepository.sumActiveSizeByUser(user.id)
    const limitSize = calculateSize((user.power === USER_POWER.SUPER
      ? Math.max(1024, user?.size)
      : user?.size) ?? 2)
    const limitSpace = this.limitUploadBySpace(limitSize, fileSize)
    const isAdmin = user.power === USER_POWER.SUPER
    const limitWallet = this.limitUploadByWallet(Number(user.wallet || 0))

    return {
      maxSize: limitSize,
      usage: fileSize,
      limitUpload: isAdmin ? false : (limitSpace || limitWallet),
      limitSpace,
      limitWallet,
      wallet: user.wallet || 0,
    }
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

  async addFile(file: Files) {
    file.name = normalizeFileName(file.name)
    file.storage = file.storage === 'local' ? 'local' : 'qiniu'
    file.date = new Date()
    const saved = await this.fileRepository.insert(file)
    void this.notifyOwnerOnSubmit(file)
    return saved
  }

  private async notifyOwnerOnSubmit(file: Files) {
    try {
      const owner = await this.userRepository.findOne({ id: file.userId })
      if (!owner?.email || Number(owner.notifyOnSubmit) !== 1 || Number(owner.emailVerified) !== 1)
        return
      const site = LocalUserDB.getSiteConfig()
      await sendMail({
        to: owner.email,
        subject: `${site?.appName || 'EasyPicker'} 新文件提交`,
        text: `任务：${file.taskName}\n文件：${file.name}\n时间：${new Date().toLocaleString('zh-CN')}`,
      })
    }
    catch (e) {
      console.error('[notifyOwnerOnSubmit]', e)
    }
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
    const sameRecord = await this.fileRepository.findMany({
      taskKey: file.taskKey,
      hash: file.hash,
      name: file.name,
      del: BOOLEAN.FALSE,
    })

    const isRepeat = sameRecord.length > 1

    // 存在相同文件时，存储上共用一份数据，不能删除OSS资源
    if (!isRepeat) {
      await this.deleteStoredObject(file)
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
      await this.deleteStoredObject(passFiles[0])
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
      const { name, taskKey, hash } = file
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
        const location = await this.resolveStoredFile(file)
        if (location?.storage === 'qiniu') {
          keys.add(location.key)
        }
        else if (location?.storage === 'local') {
          const abs = localObjectAbsPath(location.relPath)
          if (fs.existsSync(abs))
            fs.unlinkSync(abs)
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
