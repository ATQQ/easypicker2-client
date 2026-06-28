import type {
  Context,
  FWRequest,
} from 'flash-wolves'
import type { Files } from '@/db/entity'
import type { DownloadActionData } from '@/db/model/action'
import type { User } from '@/db/model/user'
import fs, { createReadStream } from 'node:fs'
import { pipeline as streamPipeline } from 'node:stream'
import { promisify } from 'node:util'
import {
  Delete,
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  ReqParams,
  ReqQuery,
  Response,
  RouterController,
} from 'flash-wolves'
import { ObjectID } from 'mongodb'
import sharp from 'sharp'
import { fileError, publicError } from '@/constants/errorMsg'
import { findAction } from '@/db/actionDb'
import { selectFiles, updateFileInfo } from '@/db/fileDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import { ActionType } from '@/db/model/action'
import { ReqUserInfo } from '@/decorator'
import { BehaviorService, FileService, TaskService } from '@/service'
import { wrapperCatchError } from '@/utils/context'
import { localObjectAbsPath, verifyLocalFileAccess } from '@/utils/localFilePath'
import {
  checkFopTaskStatus,
  createDownloadUrl,
  getUploadToken,
  judgeFileIsExist,
  mvOssFile,
} from '@/utils/qiniuUtil'
import { getMaxUploadBytes, getStorageMode, isLocalStorageMode } from '@/utils/storageMode'
// TODO: 优化上传逻辑

const power = {
  needLogin: true,
}

const noLogin = {
  needLogin: false,
}
const pipeline = promisify(streamPipeline)
const localImageTransformOptions = {
  cover: {
    size: 320,
    quality: 70,
  },
  preview: {
    size: 1600,
    quality: 82,
  },
}

@RouterController('file', power)
export default class FileController {
  @InjectCtx()
  private ctx: Context

  @Inject(FileService)
  private fileService: FileService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TaskService)
  private taskService: TaskService

  private async sendLocalFile(
    absPath: string,
    options: {
      mimeType?: string
      name?: string
      disposition?: 'attachment' | 'inline'
      cacheControl?: string
    },
  ) {
    const stat = fs.statSync(absPath)
    const name = options.name || 'file'
    this.ctx.res.setHeader(
      'Content-Type',
      options.mimeType || 'application/octet-stream',
    )
    this.ctx.res.setHeader('Content-Length', stat.size)
    this.ctx.res.setHeader('Accept-Ranges', 'bytes')
    this.ctx.res.setHeader(
      'Content-Disposition',
      `${options.disposition || 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`,
    )
    if (options.cacheControl) {
      this.ctx.res.setHeader('Cache-Control', options.cacheControl)
    }
    await pipeline(createReadStream(absPath), this.ctx.res)
  }

  private async sendLocalImage(
    file: {
      absPath: string
      mimeType: string
      name: string
    },
    type: 'cover' | 'preview',
  ) {
    const options = localImageTransformOptions[type]
    try {
      const data = await sharp(file.absPath, { animated: false })
        .rotate()
        .resize({
          width: options.size,
          height: options.size,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: options.quality })
        .toBuffer()
      this.ctx.res.setHeader('Content-Type', 'image/webp')
      this.ctx.res.setHeader('Content-Length', data.length)
      this.ctx.res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(file.name)}.webp`,
      )
      this.ctx.res.setHeader('Cache-Control', 'private, max-age=300')
      this.ctx.res.end(data)
    }
    catch {
      await this.sendLocalFile(file.absPath, {
        mimeType: file.mimeType,
        name: file.name,
        disposition: 'inline',
        cacheControl: 'private, max-age=60',
      })
    }
  }

  /**
   * 获取图片的预览图
   */
  @Post('/image/preview')
  async getPreviewURL(
    @ReqBody('ids') idList: number[],
    @ReqUserInfo() user: User,
    req: FWRequest,
  ) {
    addBehavior(req, {
      module: 'file',
      msg: `获取图片预览链接 用户:${user.account}`,
      data: {
        account: user.account,
        idList,
      },
    })
    return this.fileService.getImagePreviewByIds(idList, user.id)
  }

  @Get('/image/local/:id', noLogin)
  async getLocalImagePreview(
    @ReqParams('id') id: string,
    @ReqQuery('type') type = 'preview',
    @ReqQuery('expires') expires: string,
    @ReqQuery('sign') sign: string,
  ) {
    const fileId = Number(id)
    const previewType = type === 'cover' ? 'cover' : 'preview'
    if (!Number.isFinite(fileId) || !verifyLocalFileAccess(fileId, expires, sign, previewType)) {
      return Response.failWithError(publicError.request.errorParams)
    }
    const file = await this.fileService.getLocalImagePreviewFile(fileId)
    if (!file) {
      return Response.failWithError(publicError.file.notExist)
    }
    await this.sendLocalImage(file, previewType)
  }

  @Post('/download/count')
  async downloadCount(
    @ReqBody('ids') idList: number[],
  ) {
    return this.fileService.downloadCount(idList)
  }

  @Post('/page')
  async getUserFilesPage(
    @ReqBody() body,
    @ReqUserInfo() user: User,
    req: FWRequest,
  ) {
    const result = await this.fileService.getUserFilesPage(body)
    addBehavior(req, {
      module: 'file',
      msg: `分页获取文件列表 用户:${user.account} 成功`,
      data: {
        account: user.account,
        pageIndex: result.pageIndex,
        pageSize: result.pageSize,
        total: result.total,
      },
    })
    return result
  }

  @Put('/name/rewrite')
  async rewriteFilename(
    @ReqBody('id') id: number,
    @ReqBody('name') newName: string,
    @ReqUserInfo() user: User,
    req: FWRequest,
  ) {
    const file = (await selectFiles({ id, userId: user.id }))[0]
    if (!file) {
      addBehavior(req, {
        module: 'file',
        msg: `重命名文件失败 用户:${user.account} 文件id:${id} 新文件名:${newName}`,
      })
      return Response.failWithError(fileError.noPower)
    }
    // 重命名OSS资源
    const ossKey = `easypicker2/${file.task_key}/${file.hash}/${file.name}`
    const newOssKey = `easypicker2/${file.task_key}/${file.hash}/${newName}`
    if (isLocalStorageMode() || file.storage === 'local') {
      const oldAbs = localObjectAbsPath(ossKey)
      const newAbs = localObjectAbsPath(newOssKey)
      if (!fs.existsSync(oldAbs)) {
        return Response.failWithError(fileError.noOssFile)
      }
      if (fs.existsSync(newAbs)) {
        return Response.failWithError(fileError.ossFileRepeat)
      }
      fs.renameSync(oldAbs, newAbs)
      await updateFileInfo({ id, userId: user.id }, { name: newName })
      addBehavior(req, {
        module: 'file',
        msg: `重命名本机资源成功 用户:${user.account} 文件id:${id} 新文件名:${newName}`,
      })
      return
    }
    const isOldExist = await judgeFileIsExist(ossKey)
    const isNewExist = await judgeFileIsExist(newOssKey)
    if (!isOldExist) {
      return Response.failWithError(fileError.noOssFile)
    }
    if (isNewExist) {
      return Response.failWithError(fileError.ossFileRepeat) // 文件重名
    }
    // 重命名OSS资源
    await mvOssFile(ossKey, newOssKey, req)
    // 更新数据库
    await updateFileInfo({ id, userId: user.id }, { name: newName })
    addBehavior(req, {
      module: 'file',
      msg: `重命名文件成功 用户:${user.account} 文件id:${id} 新文件名:${newName}`,
    })
  }

  /**
   * 获取文件列表(带下载链接)
   */
  @Get('/list/withUrl')
  async listWithUrl() {
    const { id: userId } = this.ctx.req.userInfo
    const files = await selectFiles({
      userId,
    })
    return {
      files: files.map(v => ({
        ...v,
        download: (isLocalStorageMode() || v.storage === 'local')
          ? ''
          : createDownloadUrl(this.fileService.getOssKey(v)),
      })),
    }
  }

  @Get('/one')
  async downloadOne(@ReqQuery('id') id: string) {
    try {
      return await this.fileService.downloadOne(+id)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 文件重定向下载，记录下载日志，便于统计单文件真实被下载次数
   */
  @Get('/download/:key', noLogin)
  async downloadFile(@ReqParams('key') key: string) {
    // 302重定向到OSS下载地址
    try {
      ObjectID(key)
    }
    catch {
      this.behaviorService.add('file', `非法文件下载参数: ${key}`)
      return Response.failWithError(publicError.request.errorParams)
    }
    const [download] = await findAction<DownloadActionData>({
      _id: ObjectID(key),
    })
    if (!download) {
      return Response.failWithError(publicError.request.errorParams)
    }
    const { account: logAccount, tip: fileName, mimeType, size: fileSize } = download.data

    const logMap = {
      [ActionType.Download]: '下载文件成功',
      [ActionType.Compress]: '归档下载文件成功',
      [ActionType.TemplateDownload]: '下载模板文件',
    }

    this.behaviorService.add('file', `${logMap[download.type]} 用户:${logAccount} 文件:${fileName} 类型:${mimeType}`, {
      account: logAccount,
      downloadType: download.type,
      name: fileName,
      size: fileSize,
      mimeType,
      downloadActionId: key,
    })
    void this.fileService.expireDownloadCountCache(download.userId, download.data.ids)

    if (
      download.data.storage === 'local'
      && download.data.localRelPath
    ) {
      const abs = localObjectAbsPath(download.data.localRelPath)
      if (!fs.existsSync(abs)) {
        this.behaviorService.add('file', `本机下载文件不存在 ${download.data.localRelPath}`)
        return Response.failWithError(publicError.file.notExist)
      }
      await this.sendLocalFile(abs, {
        mimeType: download.data.mimeType || 'application/octet-stream',
        name: download.data.name || fileName || 'file',
        disposition: 'attachment',
      })
      return
    }

    this.ctx.res.statusCode = 302
    this.ctx.res.setHeader('Location', download.data.originUrl)
    this.ctx.res.end()
  }

  @Post('/batch/down')
  async batchDownload(@ReqBody() body) {
    const { ids, zipName } = body
    try {
      return await this.fileService.batchDownload(ids, zipName)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('/batch/down/query')
  async batchDownloadByQuery(@ReqBody() body) {
    const { zipName, ...query } = body
    try {
      const ids = await this.fileService.getUserFileIdsByQuery(query)
      return await this.fileService.batchDownload(ids, zipName)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 模板文件下载
   */
  @Get('/template', noLogin)
  async downloadTemplate(@ReqQuery() query) {
    const { template, key } = query
    try {
      return await this.fileService.downloadTemplate(template, key)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 获取上传令牌
   */
  @Get('/token', noLogin)
  getUploadToken() {
    if (getStorageMode() === 'local') {
      this.behaviorService.add('file', '本机存储上传参数')
      return {
        token: '',
        storageMode: 'local' as const,
        maxUploadBytes: getMaxUploadBytes(),
      }
    }
    const token = getUploadToken()
    this.behaviorService.add('file', '获取文件上传令牌')
    return { token, storageMode: 'qiniu' as const }
  }

  @Post('/info', noLogin)
  async submitInfo(@ReqBody() data: Files & { submitPassword?: string }) {
    try {
      const task = await this.taskService.getTaskByKey(data.taskKey)
      if (!task) {
        this.behaviorService.add('file', '提交文件: 参数错误', data)
        throw publicError.request.errorParams
      }

      const { userId } = task
      const { submitPassword, ...fileData } = data
      Object.assign<Files, Partial<Files>>(fileData, {
        userId,
        categoryKey: '',
        people: fileData.people || '',
        originName: fileData.originName || '',
        storage: fileData.storage === 'local' ? 'local' : 'qiniu',
      })
      await this.fileService.addFile(fileData, submitPassword)
      this.behaviorService.add('file', `提交文件: 文件名:${fileData.name} 成功`, fileData)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('/list')
  async getAllUserFiles() {
    const { account: logAccount } = this.ctx.req.userInfo
    const files = await this.fileService.getUserFiles()
    this.behaviorService.add('file', `获取文件列表 用户:${logAccount} 成功`, {
      logAccount,
    })
    return {
      files: files.map(v => ({
        ...v,
        // 兼容逻辑
        category_key: v.categoryKey,
        origin_name: v.originName,
        task_name: v.taskName,
        task_key: v.taskKey,
        size: +v.size,
      })),
    }
  }

  @Delete('/one')
  async deleteOneFile(@ReqBody('id') id) {
    const { id: userId } = this.ctx.req.userInfo
    try {
      const file = await this.fileService.findOneFile({
        id,
        userId,
      })
      await this.fileService.deleteOneFile(file)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Delete('/withdraw', noLogin)
  async withdrawFile(@ReqBody() body) {
    try {
      await this.fileService.withdrawFile(body)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Delete('/batch/del')
  async batchDelete(@ReqBody('ids') ids: number[]) {
    try {
      await this.fileService.batchDelete(ids)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 查询文件归档进度，已下线
   */
  @Post('/compress/status')
  async compressStatus(@ReqBody('id') id: string, req: FWRequest) {
    if (isLocalStorageMode()) {
      return Response.fail(400, '本机存储模式不使用七牛云归档任务')
    }
    const data = await checkFopTaskStatus(id)
    if (data.code === 3) {
      addErrorLog(req, data.desc + data.error)
      return Response.fail(500, data.desc + data.error)
    }
    return data
  }

  @Post('submit/people', noLogin)
  async checkSubmitInfo(@ReqBody() body) {
    try {
      const result = await this.fileService.checkSubmitInfo(body)
      return result
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }
}
