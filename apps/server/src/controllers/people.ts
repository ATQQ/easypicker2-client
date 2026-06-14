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
  ReqParams,
  RouterController,
} from 'flash-wolves'
import { BehaviorService, PeopleService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

const power = {
  needLogin: true,
}

@RouterController('people')
export default class PeopleController {
  @InjectCtx()
  ctx: Context

  @Inject(BehaviorService)
  behaviorService: BehaviorService

  @Inject(PeopleService)
  peopleService: PeopleService

  @Post('/add/:key', power)
  async addPeople(
    // TODO:需要装饰器支持校验参数
    @ReqParams('key') key: string,
    @ReqBody('name') name: string | string[],
    @ReqBody('names') names?: string[],
  ) {
    try {
      return await this.peopleService.addPeople(key, names || name)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 检查是否有提交权限
   */
  @Post('/check/:key')
  async checkPeopleIsExist(
    @ReqBody('name') name: string,
    @ReqParams('key') key: string,
  ) {
    const exist = await this.peopleService.checkPeopleIsExist(key, name)
    return {
      exist,
    }
  }

  @Get('/template/:key', power)
  async getUsefulTemplate(@ReqParams('key') taskKey: string) {
    return this.peopleService.getUsefulTemplate(taskKey)
  }

  @Put('/template/:key', power)
  async importPeopleFromTpl(
    @ReqParams('key') taskKey: string,
    @ReqBody('key') tplKey,
    @ReqBody('type') type: 'override' | 'add',
  ) {
    return this.peopleService.importPeopleFromTpl(taskKey, tplKey, type)
  }
}
