import type {
  Context,
} from 'flash-wolves'
import {
  Delete,
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  ReqParams,
  ReqQuery,
  RouterController,
} from 'flash-wolves'
import { Task } from '@/db/entity'
import { UserRepository } from '@/db/userDb'
import { BehaviorService, FileService, TaskService } from '@/service'
import { wrapperCatchError } from '@/utils/context'
import { formatSize } from '@/utils/stringUtil'

const needLogin = {
  needLogin: true,
}
@RouterController('task', needLogin)
export default class TaskController {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskService)
  private taskService: TaskService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(UserRepository)
  private userRepository: UserRepository

  @Inject(FileService)
  private fileService: FileService

  /**
   * 创建任务
   */
  @Post('create')
  async createTask(@ReqBody() payload) {
    const { name, category } = payload
    const { id, account: logAccount } = this.Ctx.req.userInfo
    const task = new Task()
    task.name = name
    task.categoryKey = category || ''
    task.userId = id

    await this.taskService.createTask(task)
    this.behaviorService.add(
      'task',
      `创建任务 用户:${logAccount} 任务:${name} 成功`,
      {
        account: logAccount,
        name,
      },
    )
  }

  @Get('')
  async getTasks(@ReqQuery('recent') recent?: string) {
    const { id, account } = this.Ctx.req.userInfo
    return this.taskService.getTasks(id, account, {
      recent: recent !== 'false',
    })
  }

  @Get('/grouped')
  async getGroupedTasks(@ReqQuery('recent') recent?: string) {
    const { id, account } = this.Ctx.req.userInfo
    return this.taskService.getGroupedTasks(id, account, {
      recent: recent !== 'false',
    })
  }

  @Get('/category/:categoryKey')
  async getTasksByCategory(
    @ReqParams('categoryKey') categoryKey: string,
    @ReqQuery('recent') recent?: string,
  ) {
    const { id, account } = this.Ctx.req.userInfo
    return this.taskService.getTasksByCategory(id, account, categoryKey, {
      recent: recent !== 'false',
    })
  }

  @Get('/:key', { needLogin: false })
  async getTaskByKey(@ReqParams('key') key: string) {
    try {
      const data = await this.taskService.getTaskByKey(key)
      const user = await this.userRepository.findOne({
        id: data.userId,
      })

      const userOverview = await this.fileService.getFastUploadLimit(user)
      const { maxSize, usage, limitUpload, wallet, limitSpace, limitWallet } = userOverview
      if (limitSpace) {
        this.behaviorService.add('user', `用户 ${user.account} 超出容量限制`, {
          space: formatSize(maxSize),
          usage: formatSize(usage),
        })
      }
      if (limitWallet) {
        this.behaviorService.add('user', `用户 ${user.account} 余额不足`, {
          wallet,
        })
      }
      return {
        ...data,
        limitUpload,
      }
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Delete('/:key')
  delTask(@ReqParams('key') key: string) {
    return this.taskService.delTask(key)
  }

  @Put('/:key')
  updateTask(@ReqParams('key') key: string, @ReqBody() payload) {
    return this.taskService.updateTask(key, payload)
  }
}
