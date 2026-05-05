import type { Middleware } from 'flash-wolves'
import { publicError } from '@/constants/errorMsg'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import tokenUtil from '@/utils/tokenUtil'
import { getUserInfo } from '@/utils/userUtil'

const systemWhiteList = ['/user/logout', '/user/power/super']

/** 与实际路由一致：含 /api 前缀时也能命中白名单 */
function canonicalReqPath(rawUrl: string): string {
  let p = rawUrl.split(/[?#]/)[0]
  if (p.startsWith('/api/')) {
    p = `/${p.slice(5)}`
  }
  else if (p === '/api' || p === '/api/') {
    p = '/'
  }
  if (!p.startsWith('/'))
    return `/${p}`
  return p || '/'
}

function isNormalizedLoginPower(power: unknown): power is USER_POWER.SUPER | USER_POWER.SYSTEM | USER_POWER.NORMAL {
  if (power === undefined || power === null || power === '')
    return false
  const n = typeof power === 'string' ? Number(power) : power
  if (typeof n !== 'number' || Number.isNaN(n))
    return false
  return [USER_POWER.SUPER, USER_POWER.SYSTEM, USER_POWER.NORMAL].includes(n)
}

const interceptor: Middleware = async (req, res) => {
  const { meta } = req.route
  if (!meta || Object.keys(meta).length === 0)
    return
  const { needLogin, userPower, CORS } = meta
  if (CORS) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  const loginUserInfo = await getUserInfo(req)
  if (
    needLogin
    && (!req.headers.token || !isNormalizedLoginPower(loginUserInfo?.power))
  ) {
    addBehavior(req, {
      module: 'interceptor',
      msg: `非法操作,未登录 path:${req.url}`,
      data: {
        url: req.url,
      },
    })
    res.failWithError(publicError.request.notLogin)
    return
  }

  // 权限校验（userPower / loginUser.power 可能来自 JSON·string）
  if ([USER_POWER.SUPER, USER_POWER.SYSTEM].includes(userPower as USER_POWER)) {
    const p = typeof loginUserInfo?.power === 'string' ? Number(loginUserInfo.power) : loginUserInfo?.power
    if (p !== userPower) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `非法操作,权限不足 path:${req.url} `,
        data: {
          url: req.url,
        },
      })
      res.failWithError(publicError.request.notLogin)
      return
    }
  }

  if (needLogin) {
    // 系统账号只能操作指定的几个接口，不能操作用户接口
    const reqPath = canonicalReqPath(req.url)
    if (
      loginUserInfo?.power === USER_POWER.SYSTEM
      && userPower !== USER_POWER.SYSTEM
      && !systemWhiteList.includes(reqPath)
    ) {
      addBehavior(req, {
        module: 'interceptor',
        msg: `系统账号,越权操作 path:${req.url} `,
        data: {
          url: req.url,
        },
      })
      res.failWithError(publicError.request.notLogin)
      return
    }

    // 未登录
    if (!loginUserInfo) {
      res.failWithError(publicError.request.notLogin)
      return
    }
    // 传递登录用户信息（Redis 中为实体结构，此处与 FWRequest.userInfo 声明对齐）
    req.userInfo = loginUserInfo as unknown as NonNullable<(typeof req)['userInfo']>

    if (loginUserInfo?.power !== USER_POWER.SYSTEM) {
      // 异步Check，不阻塞逻辑
      tokenUtil.checkOnlineUser(
        loginUserInfo.account,
        loginUserInfo,
        req.headers.token as string,
      )
    }
  }
}
export default interceptor
