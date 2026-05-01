import process from 'node:process'
import { Provide } from 'flash-wolves'
import { User } from '@/db/entity'
import { encryption } from '@/utils/stringUtil'
import { expiredRedisKey, getRedisVal, setRedisValue } from '@/db/redisDb'
import { AppDataSource } from '@/db'
import { USER_STATUS } from '@/db/model/user'
import { throttle } from '@/utils'

@Provide()
export default class TokenService {
  realToken(token) {
    return process.env.TOKEN_PREFIX + token
  }

  onlineTokenKey(account) {
    return `${process.env.TOKEN_PREFIX}-online-${account}`
  }

  async createTokenByUser(user: User, timeout = 60 * 60 * 24 * 7) {
    const { account, power } = user
    const token = encryption([account, power, Date.now()].join())
    const realToken = this.realToken(token)
    // 存储单个
    setRedisValue(realToken, JSON.stringify(user), timeout)
    // 更新所有在线的数量
    const onlineTokens = await this.getAllTokens(account)
    onlineTokens.push(realToken)
    setRedisValue(this.onlineTokenKey(account), JSON.stringify(onlineTokens))
    return token
  }

  expiredToken(token: string) {
    console.log('清理token', token)
    expiredRedisKey(this.realToken(token))
  }

  expiredRedisKey(key: string) {
    expiredRedisKey(key)
  }

  async getAllTokens(account: string): Promise<string[]> {
    const onlineTokenKey = this.onlineTokenKey(account)
    const str = await getRedisVal(onlineTokenKey)
    try {
      if (str) {
        return JSON.parse(str)
      }
      return []
    }
    catch (e) {
      return []
    }
  }

  async getUserInfo(token: string): Promise<User> {
    if (!token) {
      return null
    }
    const v = await getRedisVal(this.realToken(token))
    if (v) {
      return JSON.parse(v)
    }
    return null
  }

  // TODO: 合理的时候刷新token
  async refreshToken(token: string, timeout = 60 * 60 * 24 * 7) {
    const user = await this.getUserInfo(token)
    setRedisValue(this.realToken(token), JSON.stringify(user), timeout)
  }

  setVerifyCode(phone: string, code: string, timeout = 60 * 2) {
    setRedisValue(`${process.env.TOKEN_PREFIX}-code-${phone}`, code, timeout)
  }

  getVerifyCode(phone: string) {
    return getRedisVal(`${process.env.TOKEN_PREFIX}-code-${phone}`)
  }

  expiredVerifyCode(phone: string) {
    return expiredRedisKey(`${process.env.TOKEN_PREFIX}-code-${phone}`)
  }

  /**
   * 生成token
   */
  createToken(user: User, timeout = 60 * 60 * 24 * 7) {
    const { account, power } = user
    const token = encryption([account, power, Date.now()].join())
    setRedisValue(this.realToken(token), JSON.stringify(user), timeout)
    return token
  }

  checkOnlineUser = throttle(async (cacheUser: User, token: string) => {
    // 查询库中的用户信息
    const userInfo = await AppDataSource.manager.findOne(User, {
      where: {
        id: cacheUser.id,
      },
    })
    // 清理脏数据
    if (!userInfo) {
      this.expiredToken(token)
      return
    }
    const onlineTokens = await this.getAllTokens(userInfo.account)
    // 判断账号状态
    if ([USER_STATUS.BAN, USER_STATUS.FREEZE].includes(userInfo.status)) {
      this.expiredToken(token)
      // 清除所有线上token
      console.log('清理账号', userInfo.account, '所有在线token')
      onlineTokens.forEach((token) => {
        expiredRedisKey(token)
      })
      return
    }

    // 检查当前账号所有token
    const values = await Promise.all(
      onlineTokens.map(token => getRedisVal(token)),
    )
    const newTokenList = onlineTokens.filter((_, idx) => {
      return values[idx]
    })
    if (newTokenList.length !== onlineTokens.length) {
      setRedisValue(
        this.onlineTokenKey(userInfo.account),
        JSON.stringify(newTokenList),
      )
    }
  }, 500)

  async checkAllToken(onlineTokens: string[], account: string) {
    // 检查当前账号所有token
    const values = await Promise.all(
      onlineTokens.map(token => getRedisVal(token)),
    )
    const newTokenList = onlineTokens.filter((_, idx) => {
      return values[idx]
    })
    if (newTokenList.length !== onlineTokens.length) {
      await setRedisValue(
        this.onlineTokenKey(account),
        JSON.stringify(newTokenList),
      )
    }
  }
}
