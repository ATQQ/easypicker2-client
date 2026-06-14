import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { CategoryError, publicError } from '@/constants/errorMsg'
import { CategoryRepository } from '@/db/categoryDb'
import { Category } from '@/db/entity'
import { BOOLEAN } from '@/db/model/public'
import { TaskRepository } from '@/db/taskDb'
import { getUniqueKey } from '@/utils/stringUtil'
import BehaviorService from './behaviorService'

@Provide()
export default class CategoryService {
  @InjectCtx()
  private ctx: Context

  @Inject(CategoryRepository)
  private categoryRepository: CategoryRepository

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  async createCategory(name: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const categories = await this.categoryRepository.findMany({
      userId,
      name,
    })

    // 分类已存在
    if (categories.length !== 0) {
      this.behaviorService.add(
        'category',
        `创建分类失败(已存在) 用户:${logAccount} 名称:${name}`,
        {
          name,
          account: logAccount,
        },
      )
      throw CategoryError.exist
    }
    this.behaviorService.add(
      'category',
      `创建分类成功 用户:${logAccount} 名称:${name}`,
      {
        name,
        account: logAccount,
      },
    )
    const category = new Category()
    category.userId = userId
    category.name = name
    category.k = getUniqueKey()
    await this.categoryRepository.insert(category)
  }

  async getList() {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    this.behaviorService.add('category', `获取分类列表 用户:${logAccount}`, {
      account: logAccount,
    })

    const categories = await this.categoryRepository.findMany({
      userId,
    })
    const taskRows = await this.taskRepository.findWithSpecifyColumn(
      {
        userId,
        del: BOOLEAN.FALSE,
      },
      ['categoryKey'],
    )
    const taskCounts = taskRows.reduce((pre, task) => {
      const key = task.categoryKey || 'default'
      pre[key] = (pre[key] || 0) + 1
      return pre
    }, {} as Record<string, number>)
    const mapped = categories.map((v) => {
      const { userId: _u, submitNavTaskKeys, ...rest } = v
      let submitNavKeys: string[] = []
      if (submitNavTaskKeys) {
        try {
          const parsed = JSON.parse(submitNavTaskKeys) as unknown
          if (Array.isArray(parsed))
            submitNavKeys = parsed.map(String)
        }
        catch {
          /* ignore */
        }
      }
      return {
        ...rest,
        submitNavTaskKeys,
        submitNavKeys,
      }
    })
    return {
      categories: mapped,
      taskCounts,
    }
  }

  async deleteCategory(key: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const c = await this.categoryRepository.findOne({
      userId,
      k: key,
    })
    if (c) {
      await this.categoryRepository.delete({
        id: c.id,
      })
      // 删掉的分类下的所有任务变为默认分类
      await this.taskRepository.updateSpecifyFields(
        {
          categoryKey: key,
        },
        {
          categoryKey: 'default',
        },
      )
      // 记录日志
      this.behaviorService.add(
        'category',
        `删除指定分类 用户:${logAccount} 名称:${c.name}`,
        {
          account: logAccount,
          name: c.name,
        },
      )
    }
  }

  async updateSubmitNav(categoryKey: string, taskKeys: string[]) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const cat = await this.categoryRepository.findOne({
      userId,
      k: categoryKey,
    })
    if (!cat) {
      this.behaviorService.add('category', `更新提交导航 分类不存在 ${categoryKey}`)
      throw publicError.request.errorParams
    }
    const keys = Array.isArray(taskKeys) ? taskKeys.map(String) : []
    const tasks = await this.taskRepository.findMany({
      userId,
      categoryKey,
      del: BOOLEAN.FALSE,
    })
    const allowed = new Set(tasks.map(t => t.k))
    for (const k of keys) {
      if (!allowed.has(k))
        throw publicError.request.errorParams
    }
    cat.submitNavTaskKeys = JSON.stringify(keys)
    await this.categoryRepository.update(cat)
    this.behaviorService.add(
      'category',
      `更新提交导航 用户:${logAccount} 分类:${categoryKey} keys:${keys.length}`,
    )
  }
}
