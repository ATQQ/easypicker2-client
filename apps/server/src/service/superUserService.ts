import { Inject, Provide } from 'flash-wolves'
import TokenService from './tokenService'

@Provide()
export default class SuperUserService {
  @Inject(TokenService)
  private tokenService: TokenService

  async logout(account: string) {
    const tokens = await this.tokenService.getAllTokens(account)
    for (const token of tokens) {
      this.tokenService.expiredRedisKey(token)
    }
    this.tokenService.expiredRedisKey(this.tokenService.onlineTokenKey(account))
    return account
  }
}
