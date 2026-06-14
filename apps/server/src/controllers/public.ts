import type { Context } from 'flash-wolves'
import fs, { createReadStream } from 'node:fs'
import { pipeline as streamPipeline } from 'node:stream'
import { promisify } from 'node:util'
import {

  Get,
  Inject,
  InjectCtx,
  Post,
  ReqBody,
  ReqQuery,
  Response,
  RouterController,
} from 'flash-wolves'

import { publicError } from '@/constants/errorMsg'
import { PublicService, TokenService } from '@/service'
import { wrapperCatchError } from '@/utils/context'
import { getLocalImageMimeType, localObjectAbsPath, verifyLocalFileAccess } from '@/utils/localFilePath'

const pipeline = promisify(streamPipeline)

@RouterController('public')
export default class PublicController {
  @InjectCtx()
  private ctx: Context

  @Inject(PublicService)
  private publicService: PublicService

  @Inject(TokenService)
  private tokenService: TokenService

  @Get('code')
  async getVerCode(@ReqQuery('phone') phone: string) {
    try {
      await this.publicService.getVerifyCode(phone)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('code/email')
  async getEmailVerCode(@ReqQuery('email') email: string) {
    try {
      await this.publicService.getVerifyCodeByEmail(email)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('report/pv', {
    CORS: true,
  })
  @Post('report/pv')
  reportPv() {
    return this.publicService.reportPV()
  }

  @Get('check/phone')
  async checkPhoneIsExist(@ReqQuery('phone') phone: string) {
    try {
      await this.publicService.checkPhoneIsExist(phone)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('tip/image')
  getTipImage(
    @ReqBody('key') key: string,
    @ReqBody('data')
    data: {
      uid: number
      name: string
    }[],
  ) {
    return this.publicService.getTipImage(key, data)
  }

  @Get('tip/image/local')
  async getLocalTipImage(
    @ReqQuery('path') rawPath: string,
    @ReqQuery('type') type = 'preview',
    @ReqQuery('expires') expires: string,
    @ReqQuery('sign') sign: string,
  ) {
    const previewType = type === 'cover' ? 'cover' : 'preview'
    let relPath = ''
    try {
      relPath = decodeURIComponent(String(rawPath || ''))
    }
    catch {
      relPath = String(rawPath || '')
    }
    if (
      !relPath.startsWith('easypicker2/tip/')
      || !verifyLocalFileAccess(relPath, expires, sign, previewType)
    ) {
      return Response.failWithError(publicError.request.errorParams)
    }
    const abs = localObjectAbsPath(relPath)
    if (!fs.existsSync(abs)) {
      return Response.failWithError(publicError.file.notExist)
    }
    const stat = fs.statSync(abs)
    this.ctx.res.setHeader('Content-Type', getLocalImageMimeType(relPath) || 'application/octet-stream')
    this.ctx.res.setHeader('Content-Length', stat.size)
    this.ctx.res.setHeader('Cache-Control', 'private, max-age=300')
    await pipeline(createReadStream(abs), this.ctx.res)
  }
}
