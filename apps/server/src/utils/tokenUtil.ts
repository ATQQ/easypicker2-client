import { TokenService } from '@/service'
/**
 * Token(身份令牌)工具类
 */
class TokenUtil extends TokenService {
  static instance: TokenUtil = null

  static getInstance() {
    if (!this.instance) {
      this.instance = new TokenUtil()
    }
    return this.instance
  }
}

export default TokenUtil.getInstance()
