import {
  Delete,
  Get,
  Inject,
  Put,
  ReqBody,
  ReqParams,
  RouterController,
} from 'flash-wolves'

import { TaskInfoService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

const power = {
  needLogin: true,
}

const notLogin = {
  needLogin: false,
}

@RouterController('task_info', power)
export default class TaskInfoController {
  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  @Get('/template/:key')
  async getUsefulTemplate(@ReqParams('key') taskKey: string) {
    return this.taskInfoService.getUseFullTemplate(taskKey)
  }

  // TODO：预览图片流量统计
  @Delete('/tip/image/:key')
  async delTipImage(
    @ReqBody('uid') uid: number,
    @ReqBody('name') name: string,
    @ReqParams('key') key: string,
  ) {
    try {
      await this.taskInfoService.delTipImage({ uid, name, key })
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('/:key', notLogin)
  getTaskInfo(@ReqParams('key') key: string) {
    return this.taskInfoService.getTaskInfo(key)
  }

  @Put('/:key')
  async updateTaskInfo(@ReqBody() body, @ReqParams('key') key: string) {
    return this.taskInfoService.updateTaskInfo(body, key)
  }
}
