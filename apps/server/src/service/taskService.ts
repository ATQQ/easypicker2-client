import type { Context } from 'flash-wolves'
import type { Task } from '@/db/entity'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { taskError } from '@/constants/errorMsg'
import { CategoryRepository } from '@/db/categoryDb'
import { TaskInfo } from '@/db/entity'
import { BOOLEAN } from '@/db/model/public'
import { TaskRepository } from '@/db/taskDb'
import { BehaviorService, TaskInfoService } from '@/service'
import { getUniqueKey } from '@/utils/stringUtil'
import FileService from './fileService'

@Provide()
export default class TaskService {
  @InjectCtx()
  private Ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(CategoryRepository)
  private categoryRepository: CategoryRepository

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

  private async resolveSubmitNavTasks(task: Task) {
    if (!task?.categoryKey) {
      return []
    }

    const cat = await this.categoryRepository.findOne({
      k: task.categoryKey,
      userId: task.userId,
    })
    if (!cat?.submitNavTaskKeys) {
      return []
    }

    try {
      const navKeys = JSON.parse(cat.submitNavTaskKeys) as unknown
      if (!Array.isArray(navKeys) || !navKeys.length) {
        return []
      }
      const ks = navKeys.map(String)
      const tasks = await this.taskRepository.findMany({
        k: In(ks),
        userId: task.userId,
        del: BOOLEAN.FALSE,
        categoryKey: task.categoryKey,
      })
      const order = new Map(ks.map((k, i) => [k, i]))
      return tasks
        .sort((a, b) => (order.get(a.k) ?? 0) - (order.get(b.k) ?? 0))
        .map(t => ({ key: t.k, name: t.name }))
    }
    catch {
      return []
    }
  }

  private async mapTasksWithRecentLogs(tasks: {
    name: string
    category: string
    key: string
    recentLog: { filename: string, date: Date }[]
  }[], withRecentLog: boolean) {
    if (!withRecentLog || tasks.length === 0) {
      return tasks
    }

    const recentSubmitLogCount = 4
    const recentMap = await this.fileService.selectRecentLogsByTaskKeys(
      tasks.map(t => t.key),
      recentSubmitLogCount,
    )
    for (const t of tasks) {
      const files = recentMap.get(t.key) ?? []
      t.recentLog = files.map(v => ({ filename: v.name, date: v.date }))
    }
    return tasks
  }

  async getTasks(userId: number, account: string, options: { recent?: boolean } = {}) {
    const withRecentLog = options.recent !== false
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
        recentLog: [] as { filename: string, date: Date }[],
      }
    })
    await this.mapTasksWithRecentLogs(tasks, withRecentLog)

    this.behaviorService.add('task', `获取任务列表 用户:${account}`, {
      account,
    })

    return { tasks }
  }

  async getTasksByCategory(userId: number, account: string, category: string, options: { recent?: boolean } = {}) {
    const withRecentLog = options.recent !== false
    const data = await this.taskRepository.findWithSpecifyColumn(
      {
        userId,
        del: BOOLEAN.FALSE,
        categoryKey: category,
      },
      ['name', 'categoryKey', 'k'],
    )

    const tasks = data.map((t) => {
      const { name, categoryKey: category, k: key } = t
      return {
        name,
        category,
        key,
        recentLog: [] as { filename: string, date: Date }[],
      }
    })
    await this.mapTasksWithRecentLogs(tasks, withRecentLog)

    this.behaviorService.add('task', `按分类获取任务列表 用户:${account} 分类:${category}`, {
      account,
      category,
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
      submitNavTasks: await this.resolveSubmitNavTasks(task),
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
