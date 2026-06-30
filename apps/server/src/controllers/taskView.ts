import {
  Get,
  Inject,
  Post,
  ReqBody,
  ReqParams,
  ReqQuery,
  RouterController,
} from 'flash-wolves'
import { TaskViewService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

@RouterController('public/task-view')
export default class TaskViewController {
  @Inject(TaskViewService)
  private taskViewService: TaskViewService

  @Get('/:key')
  async getMeta(@ReqParams('key') key: string) {
    try {
      return await this.taskViewService.getMeta(key)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Post('/:key/verify')
  async verify(
    @ReqParams('key') key: string,
    @ReqBody('password') password: string,
  ) {
    try {
      return await this.taskViewService.verify(key, password)
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('/:key/progress')
  async getProgress(
    @ReqParams('key') key: string,
    @ReqQuery('tab') tab: string,
    @ReqQuery('pageIndex') pageIndex: string,
    @ReqQuery('pageSize') pageSize: string,
  ) {
    try {
      return await this.taskViewService.getProgress(key, {
        tab,
        pageIndex: pageIndex ? Number(pageIndex) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      })
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }
}
