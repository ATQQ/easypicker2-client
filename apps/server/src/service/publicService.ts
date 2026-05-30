import type { Context } from 'flash-wolves'
import process from 'node:process'
import { Inject, InjectCtx, Provide, Response } from 'flash-wolves'
import { qiniuConfig } from '@/config'
import { UserError } from '@/constants/errorMsg'
import { UserRepository } from '@/db/userDb'
import { BehaviorService, TokenService } from '@/service'
import { sendVerifyCodeMail } from '@/utils/mail'
import { createDownloadUrl } from '@/utils/qiniuUtil'
import { randomNumStr } from '@/utils/randUtil'
import { rEmail, rMobilePhone } from '@/utils/regExp'
import { isEmailCodeLoginSupported } from '@/utils/siteConfig'
import { isLocalStorageMode } from '@/utils/storageMode'
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
    if (isLocalStorageMode()) {
      return data.map(() => ({
        cover: '',
        preview: '',
      }))
    }
    return data.map(v => ({
      cover: createDownloadUrl(
        `easypicker2/tip/${key}/${v.uid}/${v.name}${qiniuConfig.imageCoverStyle}`,
      ),
      preview: createDownloadUrl(
        `easypicker2/tip/${key}/${v.uid}/${v.name}${qiniuConfig.imagePreviewStyle}`,
      ),
    }))
  }
}
