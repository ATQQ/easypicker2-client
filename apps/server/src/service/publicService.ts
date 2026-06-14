import type { Context } from 'flash-wolves'
import fs from 'node:fs'
import process from 'node:process'
import { Inject, InjectCtx, Provide, Response } from 'flash-wolves'
import { qiniuConfig } from '@/config'
import { UserError } from '@/constants/errorMsg'
import { UserRepository } from '@/db/userDb'
import { BehaviorService, TokenService } from '@/service'
import { localObjectAbsPath, signLocalFileAccess } from '@/utils/localFilePath'
import { sendVerifyCodeMail } from '@/utils/mail'
import { createDownloadUrl, judgeFileIsExist } from '@/utils/qiniuUtil'
import { randomNumStr } from '@/utils/randUtil'
import { rEmail, rMobilePhone } from '@/utils/regExp'
import { isEmailCodeLoginSupported } from '@/utils/siteConfig'
import { isLocalStorageMode } from '@/utils/storageMode'
import { getTipImageKey } from '@/utils/stringUtil'
import { sendMessage } from '@/utils/tencent'

@Provide()
export default class PublicService {
  @InjectCtx()
  private ctx: Context

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TokenService)
  private tokenService: TokenService

  @Inject(UserRepository)
  private userRepository: UserRepository

  async getVerifyCode(phone: string) {
    // 手机号不正确,直接返回
    if (!rMobilePhone.test(phone)) {
      this.behaviorService.add(
        'public',
        `获取验证码 手机号:${phone} 格式不正确`,
        {
          phone,
        },
      )
      throw UserError.mobile.fault
    }
    const code = randomNumStr(4)
    const logPhone = phone.slice(-4)
    this.behaviorService.add(
      'public',
      `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`,
      {
        phone: logPhone,
        code,
      },
    )
    if (process.env.NODE_ENV !== 'development') {
      sendMessage(phone, code, 2)
    }
    console.log(
      new Date().toLocaleString(),
      `获取验证码 手机尾号:${logPhone}  验证码:${code} 成功`,
    )
    this.tokenService.setVerifyCode('phone', phone, code)
  }

  async getVerifyCodeByEmail(email: string) {
    const addr = email.trim().toLowerCase()
    if (!rEmail.test(addr)) {
      this.behaviorService.add('public', `获取邮箱验证码 邮箱:${email} 格式不正确`, { email })
      throw UserError.email.fault
    }
    if (!isEmailCodeLoginSupported()) {
      this.behaviorService.add('public', '获取邮箱验证码 功能未开启')
      throw UserError.system.emailCodeLoginDisabled
    }
    const code = randomNumStr(4)
    const r = await sendVerifyCodeMail(addr, code)
    if (!r.ok) {
      this.behaviorService.add('public', `获取邮箱验证码 邮箱:${addr} 失败:${r.error || 'send mail failed'}`, {
        email: addr,
        code,
        error: r.error || 'send mail failed',
      })
      const err = Object.assign(new Error(r.error || 'send mail failed'), {
        code: 500,
        msg: r.error || 'send mail failed',
      })
      throw err
    }
    this.behaviorService.add('public', `获取邮箱验证码 邮箱:${addr} 成功`, {
      email: addr,
      code,
    })
    this.tokenService.setVerifyCode('email', addr, code)
  }

  reportPV() {
    const { req } = this.ctx
    if (req.method === 'GET') {
      const { path } = req.query
      this.behaviorService.addPV(path)
      return Response.plain('<h1>ok</h1>', 'text/html;charset=utf-8')
    }
    const { path } = req.body
    this.behaviorService.addPV(path)
  }

  async checkPhoneIsExist(phone: string) {
    if (!rMobilePhone.test(phone)) {
      this.behaviorService.add(
        'public',
        `检查手机号是否存在 手机号:${phone} 格式不正确`,
        {
          phone,
        },
      )

      return Response.failWithError(UserError.mobile.fault)
    }
    let user = await this.userRepository.findOne({ phone })

    if (!user) {
      user = await this.userRepository.findOne({ account: phone })
    }
    if (user) {
      this.behaviorService.add(
        'public',
        `检查手机号是否存在 手机号:${phone} 已存在`,
        {
          phone,
        },
      )
      throw UserError.mobile.exist
    }
    this.behaviorService.add(
      'public',
      `检查手机号是否存在 手机号:${phone} 不存在`,
      {
        phone,
      },
    )
  }

  async getTipImage(
    key: string,
    data: {
      uid: number
      name: string
    }[],
  ) {
    return await Promise.all(data.map(async (v) => {
      const relPath = getTipImageKey(key, v.name, v.uid)
      const storage = await this.resolveTipImageStorage(relPath)
      if (storage === 'local') {
        return {
          cover: this.getLocalTipImageUrl(relPath, 'cover'),
          preview: this.getLocalTipImageUrl(relPath, 'preview'),
        }
      }
      const allowInLocalMode = isLocalStorageMode()
      return {
        cover: createDownloadUrl(
          `${relPath}${qiniuConfig.imageCoverStyle}`,
          undefined,
          { allowInLocalMode },
        ),
        preview: createDownloadUrl(
          `${relPath}${qiniuConfig.imagePreviewStyle}`,
          undefined,
          { allowInLocalMode },
        ),
      }
    }))
  }

  private hasLocalObject(relPath: string) {
    try {
      return fs.existsSync(localObjectAbsPath(relPath))
    }
    catch {
      return false
    }
  }

  private async resolveTipImageStorage(relPath: string) {
    if (isLocalStorageMode()) {
      if (this.hasLocalObject(relPath)) {
        return 'local' as const
      }
      if (await judgeFileIsExist(relPath, { allowInLocalMode: true })) {
        return 'qiniu' as const
      }
      return 'local' as const
    }
    if (await judgeFileIsExist(relPath)) {
      return 'qiniu' as const
    }
    if (this.hasLocalObject(relPath)) {
      return 'local' as const
    }
    return 'qiniu' as const
  }

  private getRequestOrigin() {
    const { headers } = this.ctx.req
    if (headers.origin) {
      return headers.origin
    }
    if (headers.referer) {
      try {
        return new URL(headers.referer).origin
      }
      catch {}
    }
    return `http://${headers.host}`
  }

  private getLocalTipImageUrl(relPath: string, type: 'cover' | 'preview') {
    const expires = Date.now() + 5 * 60 * 1000
    const sign = signLocalFileAccess(relPath, expires, type)
    return `${this.getRequestOrigin()}/api/public/tip/image/local?path=${encodeURIComponent(relPath)}&type=${type}&expires=${expires}&sign=${sign}`
  }
}
