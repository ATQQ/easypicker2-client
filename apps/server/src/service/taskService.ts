import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import FileService from './fileService'
import { TaskRepository } from '@/db/taskDb'
import type { Task } from '@/db/entity'
import { TaskInfo } from '@/db/entity'
import { getUniqueKey } from '@/utils/stringUtil'
import { BehaviorService, TaskInfoService } from '@/service'
import { BOOLEAN } from '@/db/model/public'
import { taskError } from '@/constants/errorMsg'

@Provide()
export default class TaskService {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(TaskInfoService)
  private taskInfoService: TaskInfoService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(FileService)
  private fileService: FileService

  async createTask(task: Task) {
    task.k = getUniqueKey()
    // 新增taskInfo
    const taskInfo = new TaskInfo()
    taskInfo.taskKey = task.k
    taskInfo.userId = task.userId
    await this.taskInfoService.createTaskInfo(taskInfo)
    await this.taskRepository.insert(task)
  }

  async getTasks(userId: number, account: string) {
    const data = await this.taskRepository.findWithSpecifyColumn(
      {
        userId,
        del: BOOLEAN.FALSE,
      },
      ['name', 'categoryKey', 'k'],
    )

    const tasks = data.map((t) => {
      const { name, categoryKey: category, k: key } = t
      return {
        name,
        category,
        key,
        recentLog: [],
      }
    })
    const recentSubmitLogCount = 4
    for (const t of tasks) {
      const files = await this.fileService.selectFilesLimitCount(
        {
          taskKey: t.key,
        },
        recentSubmitLogCount,
      )

      t.recentLog = files.map(v => ({ filename: v.name, date: v.date }))
    }

    this.behaviorService.add('task', `获取任务列表 用户:${account}`, {
      account,
    })

    return { tasks }
  }

  async getTaskByKey(key: string) {
    const task = await this.taskRepository.findOne({
      k: key,
      del: BOOLEAN.FALSE,
    })

    if (!task) {
      this.behaviorService.add('task', '获取任务详细信息, 任务不存在', {
        key,
      })
      throw taskError.noExist
    }
    this.behaviorService.add('task', `获取任务详细信息, ${task.name}`, {
      name: task.name,
    })

    return {
      name: task.name,
      category: task.categoryKey,
      userId: task.userId,
    }
  }

  async delTask(key: string) {
    const { id, account: logAccount } = this.Ctx.req.userInfo
    const task = await this.taskRepository.findOne({
      userId: id,
      k: key,
      del: BOOLEAN.FALSE,
    })

    if (task) {
      // 首次删除，移动至回收站
      if (task.categoryKey !== 'trash') {
        task.categoryKey = 'trash'
      }
      else {
        // 二次删除，真滴移除（软删）
        task.del = BOOLEAN.TRUE
      }
      await this.taskRepository.update(task)
    }

    // 不删除该任务下已经提交的文件
    const logTaskName = task?.name
    this.behaviorService.add(
      'task',
      `删除指定任务 用户:${logAccount} 任务名:${logTaskName}`,
      {
        account: logAccount,
        name: logTaskName,
      },
    )
  }

  async updateTask(key: string, payload: { name?: string, category?: string }) {
    const { name, category } = payload
    const { id, account: logAccount } = this.Ctx.req.userInfo

    const task = await this.taskRepository.findOne({
      userId: id,
      k: key,
    })
    if (task) {
      if (name) {
        task.name = name
      }
      if (category !== undefined) {
        task.categoryKey = category
      }
      if (name || category !== undefined) {
        await this.taskRepository.update(task)
      }
    }
    this.behaviorService.add(
      'task',
      `更新任务分类/名称 用户:${logAccount} 原:${task.name} 新:${task.name}`,
      {
        account: logAccount,
        oldName: task.name,
        newName: task.name,
      },
    )
  }
}
