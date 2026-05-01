import { Inject, InjectCtx, Context, Provide } from 'flash-wolves'
import { CategoryRepository } from '@/db/categoryDb'
import BehaviorService from './behaviorService'
import { CategoryError } from '@/constants/errorMsg'
import { Category } from '@/db/entity'
import { getUniqueKey } from '@/utils/stringUtil'
import { TaskRepository } from '@/db/taskDb'

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
      name
    })

    // 分类已存在
    if (categories.length !== 0) {
      this.behaviorService.add(
        'category',
        `创建分类失败(已存在) 用户:${logAccount} 名称:${name}`,
        {
          name,
          account: logAccount
        }
      )
      throw CategoryError.exist
    }
    this.behaviorService.add(
      'category',
      `创建分类成功 用户:${logAccount} 名称:${name}`,
      {
        name,
        account: logAccount
      }
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
      account: logAccount
    })

    const categories = await this.categoryRepository.findMany({
      userId
    })
    categories.forEach((v) => {
      delete v.userId
    })
    return {
      categories
    }
  }

  async deleteCategory(key: string) {
    const { id: userId, account: logAccount } = this.ctx.req.userInfo
    const c = await this.categoryRepository.findOne({
      userId,
      k: key
    })
    if (c) {
      await this.categoryRepository.delete({
        id: c.id
      })
      // 删掉的分类下的所有任务变为默认分类
      await this.taskRepository.updateSpecifyFields(
        {
          categoryKey: key
        },
        {
          categoryKey: 'default'
        }
      )
      // 记录日志
      this.behaviorService.add(
        'category',
        `删除指定分类 用户:${logAccount} 名称:${c.name}`,
        {
          account: logAccount,
          name: c.name
        }
      )
    }
  }
}
