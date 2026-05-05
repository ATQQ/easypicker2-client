import {
  Get,
  Inject,
  Post,
  ReqBody,
  ReqQuery,
  RouterController,
} from 'flash-wolves'

import { PublicService, TokenService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

@RouterController('public')
export default class PublicController {
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
}
