/* eslint-disable no-throw-literal */
import { Inject, Provide } from 'flash-wolves'
import { UserError } from '@/constants/errorMsg'
import { UserRepository } from '@/db/userDb'
import { rAccount, rMobilePhone, rPassword } from '@/utils/regExp'
import { encryption, formatDate, getUniqueKey } from '@/utils/stringUtil'
import { User } from '@/db/entity'
import { BehaviorService, TokenService } from '@/service'
import { USER_STATUS } from '@/db/model/user'
import { randomNumStr } from '@/utils/randUtil'
import LocalUserDB from '@/utils/user-local-db'

@Provide()
export default class UserService {
  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(TokenService)
  private tokenService: TokenService

  async register(payload: any) {
    const { account, pwd, bindPhone, phone, code } = payload
    const { needBindPhone } = LocalUserDB.getSiteConfig()
    // 注册必须绑定手机号卡控
    if (needBindPhone && !bindPhone) {
      throw UserError.account.bindPhone
    }

    // TODO：参数校验可优化使用zod
    if (!rAccount.test(account)) {
      this.behaviorService.add('user', `新用户注册 账号:${account} 格式错误`, {
        account,
      })
      throw UserError.account.fault
    }
    if (!rPassword.test(pwd)) {
      this.behaviorService.add(
        'user',
        `新用户注册 账号:${account} 密码格式不正确`,
        {
          account,
        },
      )
      throw UserError.pwd.fault
    }
    // 检查账号是否存在
    let user = await this.userRepository.findOne({ account })
    // 账号是手机号格式，那么该手机号不能已经是被注册的
    if (rMobilePhone.test(account) && !user) {
      user = await this.userRepository.findOne({ phone: account })
    }
    // 存在返回错误
    if (user) {
      this.behaviorService.add('user', `新用户注册 账号:${account} 已存在`, {
        account,
      })
      throw UserError.account.exist
    }

    // 绑定手机
    if (bindPhone) {
      if (!rMobilePhone.test(phone)) {
        this.behaviorService.add(
          'user',
          `新用户注册 手机号:${phone} 格式错误`,
          {
            phone,
          },
        )
        throw UserError.mobile.fault
      }
      const rightCode = await this.tokenService.getVerifyCode(phone)
      if (!code || code !== rightCode) {
        this.behaviorService.add('user', `新用户注册 验证码错误:${code}`, {
          code,
          rightCode,
        })
        throw UserError.code.fault
      }
      // 检查手机号是否存在
      user = await this.userRepository.findOne({ phone })
      // 检查该手机号是否出现在账号中
      if (!user) {
        user = await this.userRepository.findOne({ account: phone })
      }
      // 存在返回错误
      if (user) {
        this.behaviorService.add('user', `新用户注册 手机号:${phone} 已存在`)
        throw UserError.mobile.exist
      }
      // 过期验证码
      this.tokenService.expiredToken(phone)
    }

    this.behaviorService.add(
      'user',
      `新用户注册 账号:${account} 绑定手机:${bindPhone ? '是' : '否'} 注册成功`,
      {
        account,
        bindPhone,
      },
    )
    // 不存在则加入
    const u = new User()
    u.account = account
    u.password = encryption(pwd)
    if (bindPhone) {
      u.phone = phone
    }

    return this.userRepository.insert(u)
  }

  async login(account: string, pwd: string) {
    const isPhone = rMobilePhone.test(account)
    // 密码格式不正确
    if (!rPassword.test(pwd)) {
      this.behaviorService.add(
        'user',
        `用户登录 账号:${account} 密码格式不正确`,
        {
          account,
        },
      )

      throw UserError.pwd.fault
    }
    // 规避注册时逻辑导致的问题

    // 先当做账号处理
    let user = await this.userRepository.findOne({ account })
    // 不存在&&不是手机号
    if (!user && !isPhone) {
      this.behaviorService.add('user', `用户登录 账号:${account} 不存在`, {
        account,
      })
      throw UserError.account.fault
    }

    // 不存在&&是手机号
    if (!user && isPhone) {
      user = await this.userRepository.findOne({ phone: account })
    }
    if (!user) {
      this.behaviorService.add('user', `用户登录 账号:${account} 不存在`, {
        account,
      })

      throw isPhone ? UserError.mobile.fault : UserError.account.fault
    }
    if (user.password !== encryption(pwd)) {
      this.behaviorService.add('user', `用户登录 账号:${account} 密码不正确`, {
        account,
      })

      throw UserError.pwd.fault
    }
    this.checkUserStatus(user)
    this.behaviorService.add('user', `用户登录 账号:${account} 登录成功`, {
      account,
    })
    return this.userRepository.update(user)
  }

  async loginByCode(phone: string, code: string) {
    const logPhone = phone?.slice(-4)
    const v = await this.tokenService.getVerifyCode(phone)
    if (code !== v) {
      this.behaviorService.add('user', `验证码登录 验证码错误:${code}`, {
        code,
        rightCode: v,
      })
      throw UserError.code.fault
    }
    let user = await this.userRepository.findOne({ phone })

    if (!user) {
      this.behaviorService.add('user', `验证码登录 手机号:${logPhone} 不存在`, {
        phone: logPhone,
      })

      user = new User()
      user.phone = phone
      // 随机生成一个谁也不知的密码,用户后续只能通过找回密码重置
      user.password = encryption(randomNumStr(6) + getUniqueKey().slice(6))
      // 默认账号就为手机号
      user.account = phone
      user.loginCount = 0
      // 不存在则直接创建
      user = await this.userRepository.insert(user)
    }

    this.checkUserStatus(user)
    this.behaviorService.add('user', `验证码登录 手机号:${logPhone} 登录成功`, {
      phone: logPhone,
    })
    this.tokenService.expiredVerifyCode(phone)
    return this.userRepository.update(user)
  }

  async updatePassword(payload) {
    const { code, phone, pwd } = payload

    const logPhone = phone?.slice(-4)
    const v = await this.tokenService.getVerifyCode(phone)
    if (code !== v) {
      this.behaviorService.add(
        'user',
        `重置密码 手机号:${logPhone} 验证码不正确: ${code}`,
        {
          phone: logPhone,
          code,
          rightCode: v,
        },
      )
      throw UserError.code.fault
    }
    const user = await this.userRepository.findOne({ phone })

    if (!user) {
      this.behaviorService.add('user', `重置密码 手机号:${logPhone} 不存在`, {
        phone: logPhone,
      })
      throw UserError.mobile.noExist
    }
    if (!rPassword.test(pwd)) {
      this.behaviorService.add(
        'user',
        `重置密码 手机号:${logPhone} 密码格式不正确`,
        {
          phone: logPhone,
        },
      )
      throw UserError.pwd.fault
    }
    user.password = encryption(pwd)
    this.tokenService.expiredVerifyCode(phone)
    this.behaviorService.add('user', `重置密码 手机号:${logPhone} 重置成功`, {
      phone: logPhone,
    })

    this.checkUserStatus(user)
    return this.userRepository.update(user)
  }

  /**
   * 登录前用户状态检查
   */
  checkUserStatus(user: User) {
    const { account } = user
    // 权限校验
    if (user.status === USER_STATUS.BAN) {
      this.behaviorService.add(
        'user',
        `用户登录失败 账号:${account} 已被封禁`,
        {
          account,
        },
      )

      throw UserError.account.ban
    }
    if (user.status === USER_STATUS.FREEZE) {
      const openDate = new Date(user.openTime)
      if (openDate.getTime() > Date.now()) {
        this.behaviorService.add(
          'user',
          `用户登录失败 账号:${account} 已被冻结 解冻时间${formatDate(
            openDate,
          )}`,
          {
            account,
            openDate,
          },
        )
        throw {
          code: UserError.account.freeze.code,
          msg: UserError.account.freeze.msg,
          data: {
            openTime: user.openTime,
          },
        }
      }
      user.status = USER_STATUS.NORMAL
      user.openTime = null
    }

    // 校验通过，将会登录
    user.loginCount += 1
    user.loginTime = new Date()
  }
}
