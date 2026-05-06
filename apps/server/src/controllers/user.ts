import type {
  Context,
} from 'flash-wolves'
import {
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  Response,
  RouterController,
} from 'flash-wolves'
import { UserError } from '@/constants/errorMsg'

import { findAction } from '@/db/actionDb'
import { User } from '@/db/entity'
import { ActionType } from '@/db/model/action'
import { USER_POWER } from '@/db/model/user'
import { UserRepository } from '@/db/userDb'
import {
  BehaviorService,
  FileService,
  TokenService,
  UserService,
} from '@/service'
import { wrapperCatchError } from '@/utils/context'
import { isCodeLoginSupported, isEmailCodeLoginSupported } from '@/utils/siteConfig'
import { formatSize } from '@/utils/stringUtil'
import LocalUserDB from '@/utils/user-local-db'

@RouterController('user')
export default class UserController {
  @Inject(UserService)
  private userService: UserService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TokenService)
  private tokenService: TokenService

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(FileService)
  private fileService: FileService

  @InjectCtx()
  private Ctx: Context

  @Post('register')
  async register(@ReqBody() body: any) {
    try {
      // 判断路由是否禁用
      const [action] = await findAction<{
        status: boolean
      }>({
        'type': ActionType.DisabledRoute,
        'data.route': '/register',
      })
      if (action?.data?.status) {
        this.behaviorService.add('user', `禁止注册 ${body?.account}`, {
          account: body?.account,
        })
        throw UserError.system.ban
      }
      const user = await this.userService.register(body)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token,
      }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('login')
  async login(
    @ReqBody('account') account: string,
    @ReqBody('pwd') pwd: string,
  ) {
    // 先判断是否系统账号
    const isSystemAccount
      = LocalUserDB.findUserConfig({
        type: 'server',
        key: 'USER',
        value: account,
      }).length !== 0
    if (isSystemAccount) {
      const isRightPwd
        = LocalUserDB.findUserConfig({ type: 'server', key: 'PWD', value: pwd })
          .length !== 0
      if (isRightPwd) {
        const u = new User()
        u.account = account
        u.power = USER_POWER.SYSTEM
        return {
          token: await this.tokenService.createTokenByUser(u),
          system: true,
        }
      }
      return Response.failWithError(UserError.account.fault)
    }

    try {
      const user = await this.userService.login(account, pwd)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token,
      }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('logout', { needLogin: true })
  async logout() {
    const { account } = this.Ctx.req.userInfo
    this.behaviorService.add('user', `退出登录 ${account}`, {
      account,
    })
    this.tokenService.expiredToken(this.Ctx.req.headers.token as string)
  }

  @Post('login/code')
  async loginByCode(@ReqBody() body) {
    try {
      if (!isCodeLoginSupported()) {
        this.behaviorService.add('user', `验证码登录被关闭 手机号:${body?.phone?.slice(-4)}`, {
          phone: body?.phone?.slice(-4),
        })
        return Response.failWithError(UserError.system.codeLoginDisabled)
      }
      const { code, phone } = body
      const user = await this.userService.loginByCode(phone, code)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token,
      }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('login/email-code')
  async loginByEmailCode(@ReqBody() body: { email?: string, code?: string }) {
    try {
      if (!isEmailCodeLoginSupported()) {
        return Response.failWithError(UserError.system.emailCodeLoginDisabled)
      }
      const { code, email } = body
      const user = await this.userService.loginByEmailCode(email || '', code || '')
      const token = await this.tokenService.createTokenByUser(user)
      return { token }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Put('password')
  async updatePassword(@ReqBody() body) {
    try {
      const user = await this.userService.updatePassword(body)
      const token = await this.tokenService.createTokenByUser(user)
      return {
        token,
      }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('power/super', { needLogin: true })
  async isSuperPower() {
    const { power, account } = this.Ctx.req.userInfo
    this.tokenService.refreshToken(this.Ctx.req.headers.token as string)
    return {
      power: power === USER_POWER.SUPER,
      name: account,
      system: power === USER_POWER.SYSTEM,
    }
  }

  @Get('login', { needLogin: true })
  async isLogin() {
    return !!this.Ctx.req.userInfo
  }

  @Get('usage', { needLogin: true })
  async getUsage() {
    const user = await this.userRepository.findOne({
      id: this.Ctx.req.userInfo.id,
    })
    const userOverview = await this.fileService.getUserOverview(user)
    const { maxSize, usage, limitUpload, wallet, cost, limitSpace, limitWallet, price } = userOverview
    if (limitSpace) {
      this.behaviorService.add('user', `用户 ${user.account} 超出容量限制`, {
        space: formatSize(maxSize),
        usage: formatSize(usage),
      })
    }
    if (limitWallet) {
      this.behaviorService.add('user', `用户 ${user.account} 余额不足`, {
        wallet,
        cost,
      })
    }
    return {
      size: maxSize,
      usage,
      limitUpload,
      wallet,
      cost: cost.toFixed(2),
      limitSpace,
      limitWallet,
      price: {
        storage: price.ossPrice,
        download: (+price.backhaulTrafficPrice + +price.cdnPrice + +price.compressPrice).toFixed(2),
      },
    }
  }

  @Get('profile', { needLogin: true })
  async getProfile() {
    const u = await this.userRepository.findOne({ id: this.Ctx.req.userInfo.id })
    if (!u) {
      return { email: '', emailVerified: false, notifyOnSubmit: false }
    }
    return {
      email: u.email || '',
      emailVerified: Number(u.emailVerified) === 1,
      notifyOnSubmit: Number(u.notifyOnSubmit) === 1,
    }
  }

  @Put('profile/notify', { needLogin: true })
  async setNotify(@ReqBody('notifyOnSubmit') notifyOnSubmit: boolean) {
    const u = await this.userRepository.findOne({ id: this.Ctx.req.userInfo.id })
    if (!u)
      return Response.failWithError(UserError.account.notExist)
    u.notifyOnSubmit = notifyOnSubmit ? 1 : 0
    await this.userRepository.update(u)
    return { ok: true }
  }

  @Put('profile/email', { needLogin: true })
  async bindProfileEmail(@ReqBody() body: { email?: string, code?: string }) {
    try {
      const addr = body.email?.trim().toLowerCase() || ''
      if (!addr)
        throw UserError.email.fault
      const v = await this.tokenService.getVerifyCode('email', addr)
      if (body.code !== v)
        throw UserError.code.fault
      const exist = await this.userRepository.findOne({ email: addr })
      if (exist && exist.id !== this.Ctx.req.userInfo.id)
        throw UserError.email.exist
      const u = await this.userRepository.findOne({ id: this.Ctx.req.userInfo.id })
      u.email = addr
      u.emailVerified = 1
      await this.userRepository.update(u)
      this.tokenService.expiredVerifyCode('email', addr)
      return { ok: true }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }
}
