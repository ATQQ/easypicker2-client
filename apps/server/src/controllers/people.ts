import {
  RouterController,
  Post,
  ReqBody,
  ReqParams,
  FWRequest,
  Get,
  Put,
  InjectCtx,
  Context,
  Inject
} from 'flash-wolves'
import { selectTasks } from '@/db/taskDb'
import { deletePeople, insertPeople, selectPeople } from '@/db/peopleDb'
import { addBehavior, addErrorLog } from '@/db/logDb'
import { getUserInfo } from '@/utils/userUtil'
import { selectTaskInfo } from '@/db/taskInfoDb'
import { ReqUserInfo } from '@/decorator'
import type { User } from '@/db/model/user'
import { BehaviorService, PeopleService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

const power = {
  needLogin: true
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
    @ReqBody('name') name: string
  ) {
    try {
      await this.peopleService.addPeople(key, name)
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  /**
   * 检查是否有提交权限
   */
  @Post('/check/:key')
  async checkPeopleIsExist(
    @ReqBody('name') name: string,
    @ReqParams('key') key: string
  ) {
    const exist = await this.peopleService.checkPeopleIsExist(key, name)
    return {
      exist
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
    @ReqBody('type') type: 'override' | 'add'
  ) {
    return this.peopleService.importPeopleFromTpl(taskKey, tplKey, type)
  }
}
