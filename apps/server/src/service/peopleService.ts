import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { peopleError } from '@/constants/errorMsg'
import { People } from '@/db/entity'
import { PeopleRepository } from '@/db/peopleDb'
import { TaskRepository } from '@/db/taskDb'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { BehaviorService } from '@/service'

@Provide()
export default class PeopleService {
  @InjectCtx()
  private ctx: Context

  @Inject(PeopleRepository)
  private peopleRepository: PeopleRepository

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

  private normalizePeopleNames(name: string | string[]) {
    const names = Array.isArray(name) ? name : [name]
    const exists = new Set<string>()
    return names
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .filter((v) => {
        if (exists.has(v))
          return false
        exists.add(v)
        return true
      })
  }

  async addPeople(key: string, name: string | string[]) {
    const user = this.ctx.req.userInfo
    const names = this.normalizePeopleNames(name)
    const isSingle = !Array.isArray(name)
    if (!names.length) {
      return {
        success: [],
        fail: [],
      }
    }
    const existPeople = await this.peopleRepository.findWithSpecifyColumn({
      taskKey: key,
      userId: user.id,
      name: In(names),
    }, ['name'])
    const existNames = new Set(existPeople.map(v => v.name).filter(Boolean))
    const insertNames = names.filter(v => !existNames.has(v))
    const fail = names.filter(v => existNames.has(v))

    this.behaviorService.add(
      'people',
      `直接添加成员 成功:${insertNames.length} 失败:${fail.length}`,
      {
        names,
        success: insertNames,
        fail,
      },
    )
    if (isSingle && fail.length) {
      throw peopleError.exist
    }
    if (insertNames.length) {
      await this.peopleRepository.insertMany(
        insertNames.map((v) => {
          const people = new People()
          people.name = v
          people.taskKey = key
          people.userId = user.id
          return people
        }),
      )
    }

    return {
      success: insertNames,
      fail,
    }
  }

  async checkPeopleIsExist(key: string, name: string) {
    const task = await this.taskRepository.findOne({
      k: key,
    })
    if (!task) {
      return false
    }
    const people = await this.peopleRepository.findOne({
      taskKey: key,
      name,
    })

    const exist = !!people
    this.behaviorService.add(
      'people',
      `查询是否拥有提交权限 任务:${task.name} 成员姓名:${name} 权限:${
        exist ? '有' : '无'
      }`,
      {
        taskName: task.name,
        name,
        exist,
      },
    )
    return exist
  }

  async getUsefulTemplate(key: string) {
    this.behaviorService.add('people', '查询可用的成员列表模板', {
      taskKey: key,
    })

    const user = this.ctx.req.userInfo

    const taskKeyList = (
      await this.taskInfoRepository.findWithSpecifyColumn(
        {
          userId: user.id,
          limitPeople: 1,
        },
        ['taskKey'],
      )
    )
      .filter(v => v.taskKey !== key)
      .map(v => v.taskKey)

    if (!taskKeyList.length) {
      return []
    }

    const taskInfo = await this.taskRepository.findWithSpecifyColumn(
      {
        k: In(taskKeyList),
      },
      ['k', 'name'],
    )

    // 查询每任务中的的成员名单信息
    const people = await this.peopleRepository.findWithSpecifyColumn(
      {
        taskKey: In(taskKeyList),
      },
      ['taskKey', 'name'],
    )

    const data = taskInfo.map((v) => {
      const count = people.filter(p => p.taskKey === v.k).length
      return {
        taskKey: v.k,
        name: v.name,
        count,
      }
    })
    return data
  }

  async importPeopleFromTpl(
    taskKey: string,
    tplKey: string,
    type: 'override' | 'add',
  ) {
    const fail: string[] = []
    const success: string[] = []
    // 非法操作
    if (taskKey === tplKey) {
      this.behaviorService.error(
        '非法导入人员模板',
        new Error('非法导入人员模板').stack,
      )
      return {
        success: success.length,
        fail,
      }
    }

    const user = this.ctx.req.userInfo

    // 先取模板需要的
    const people = await this.peopleRepository.findWithSpecifyColumn(
      {
        taskKey: tplKey,
        userId: user.id,
      },
      ['name'],
    )
    // 如果是覆盖
    if (type === 'override') {
      // 先删除当前任务中的
      await this.peopleRepository.delete({
        taskKey,
        userId: user.id,
      })
      success.push(...people.map(v => v.name))
    }
    if (type === 'add') {
      // 取当前任务
      const nowPeople = (
        await this.peopleRepository.findWithSpecifyColumn(
          { userId: user.id, taskKey },
          ['name'],
        )
      ).map(v => v.name)
      for (const p of people) {
        if (nowPeople.includes(p.name)) {
          fail.push(p.name)
        }
        else {
          success.push(p.name)
        }
      }
    }
    if (success.length) {
      await this.peopleRepository.insertMany(
        success.map((name) => {
          const p = new People()
          p.name = name
          p.taskKey = taskKey
          p.userId = user.id
          return p
        }),
      )
    }
    this.behaviorService.add(
      'people',
      `模板导入人员名单 用户:${user.account} 成功:${success.length} 失败:${fail.length}`,
      {
        account: user.account,
        success: success.length,
        fail: fail.length,
      },
    )

    return {
      success: success.length,
      fail,
    }
  }
}
