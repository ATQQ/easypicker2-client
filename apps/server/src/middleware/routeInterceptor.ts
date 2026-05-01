import { Middleware } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import { getUserInfo } from '@/utils/userUtil'
import tokenUtil from '@/utils/tokenUtil'

const systemWhiteList = ['/user/logout', '/user/power/super']

const interceptor: Middleware = async (req, res) => {
  const { meta } = req.route
  if (!meta || Object.keys(meta).length === 0) return
  const { needLogin, userPower, CORS } = meta
  if (CORS) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  const loginUserInfo = await getUserInfo(req)
  if (
    needLogin &&
    (!req.headers.token ||
      ![USER_POWER.SUPER, USER_POWER.SYSTEM, USER_POWER.NORMAL].includes(
        loginUserInfo?.power
      ))
  ) {
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,未登录 path:${req.url}`,
      data: {
        url: req.url
      }
    })
    res.failWithError(publicError.request.notLogin)
    return
  }

  // 权限校验
  if ([USER_POWER.SUPER, USER_POWER.SYSTEM].includes(userPower)) {
    if (loginUserInfo?.power !== userPower) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `非法操作,权限不足 path:${req.url} `,
        data: {
          url: req.url
        }
      })
      res.failWithError(publicError.request.notLogin)
      return
    }
  }

  if (needLogin) {
    // 系统账号只能操作指定的几个接口，不能操作用户接口
    if (
      loginUserInfo?.power === USER_POWER.SYSTEM &&
      userPower !== USER_POWER.SYSTEM &&
      // 白名单接口不做校验
      !systemWhiteList.includes(req.url)
    ) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `系统账号,越权操作 path:${req.url} `,
        data: {
          url: req.url
        }
      })
      res.failWithError(publicError.request.notLogin)
      return
    }

    // 未登录
    if (!loginUserInfo) {
      res.failWithError(publicError.request.notLogin)
      return
    }
    // 传递登录用户信息
    req.userInfo = loginUserInfo

    if (loginUserInfo?.power !== USER_POWER.SYSTEM) {
      // 异步Check，不阻塞逻辑
      tokenUtil.checkOnlineUser(
        loginUserInfo.account,
        loginUserInfo,
        req.headers.token as string
      )
    }
  }
}
export default interceptor
