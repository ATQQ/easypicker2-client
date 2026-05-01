import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { TaskRepository } from '@/db/taskDb'
import { BehaviorService, QiniuService } from '@/service'
import { getUniqueKey } from '@/utils/stringUtil'
import type { TaskInfo } from '@/db/entity'
import { BOOLEAN } from '@/db/model/public'
import { publicError } from '@/constants/errorMsg'

@Provide()
export default class TaskInfoService {
  @InjectCtx()
  private ctx: Context

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(QiniuService)
  private qiniuService: QiniuService

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  async getUseFullTemplate(taskKey: string) {
    const user = this.ctx.req.userInfo
    const infoList = (
      await this.taskInfoRepository.findWithSpecifyColumn(
        {
          userId: user.id,
        },
        ['taskKey', 'info'],
      )
    ).filter(v => v.taskKey !== taskKey)
    if (!infoList.length) {
      return []
    }

    const taskInfo = await this.taskRepository.findWithSpecifyColumn(
      {
        k: In(infoList.map(v => v.taskKey)),
      },
      ['k', 'name'],
    )

    const data = taskInfo.map((v) => {
      const { info } = infoList.find(v2 => v2.taskKey === v.k)
      return {
        taskKey: v.k,
        name: v.name,
        info,
      }
    })
    return data
  }

  async delTipImage(payload: { uid: number, name: string, key: string }) {
    const { uid, name, key } = payload
    const task = await this.taskRepository.findOne({
      k: key,
      userId: this.ctx.req.userInfo.id,
    })
    if (!task) {
      throw publicError.request.errorParams
    }
    const tipImageKey = this.qiniuService.getTipImageKey(key, name, uid)
    this.behaviorService.add(
      'taskInfo',
      `${this.ctx.req.userInfo.account} 删除提示图片: ${tipImageKey}`,
      {
        tipImageKey,
      },
    )
    this.qiniuService.deleteObjByKey(tipImageKey)
  }

  async getTaskInfo(key: string) {
    const taskInfo = await this.taskInfoRepository.findOne({
      taskKey: key,
    })
    const {
      template,
      rewrite,
      format,
      info,
      shareKey: share,
      limitPeople: people,
      tip,
      bindField,
    } = taskInfo || {}
    let { ddl } = taskInfo || {}
    if (ddl && ddl?.getTime) {
      ddl = new Date(ddl.getTime() + 8 * 60 * 60 * 1000)
    }
    this.taskRepository
      .findOne({
        k: key,
      })
      .then((task) => {
        if (task) {
          this.behaviorService.add(
            'taskInfo',
            `获取任务属性 任务:${task.name} 成功`,
            {
              key,
              name: task.name,
            },
          )
        }
      })

    return {
      template,
      rewrite,
      format,
      info,
      share,
      ddl,
      people,
      tip,
      bindField,
    }
  }

  async updateTaskInfo(payload, key: string) {
    const { template, rewrite, format, info, ddl, people, tip, bindField }
      = payload
    let { share } = payload
    const { id: userId, account: logAccount } = this.ctx.req.userInfo

    if (share !== undefined) {
      share = getUniqueKey()
    }
    if (!template && template !== undefined) {
      // 删除旧模板文件
      this.qiniuService.deleteFiles(`easypicker2/${key}_template/`)
    }
    const options = {
      template,
      rewrite,
      format,
      info,
      ddl,
      shareKey: share,
      limitPeople: people,
      tip,
      bindField,
    }
    if (bindField === '') {
      options.bindField = undefined
    }
    await this.taskInfoRepository.updateSpecifyFields(
      {
        taskKey: key,
        userId,
      },
      options,
    )

    // 异步记录日志
    this.taskRepository.findOne({ k: key }).then((task) => {
      const [ks] = Object.keys(options).filter(o => options[o] !== undefined)
      const bType = {
        template: '修改模板',
        rewrite: '设置自动重命名',
        info: '设置提交必填信息',
        ddl: '设置截止日期',
        limitPeople: '限制提交人员',
        tip: '批注信息',
        bindField: '设置绑定字段',
      }

      if (task) {
        this.behaviorService.add(
          'taskInfo',
          `更新任务属性 ${bType[ks]} 用户:${logAccount} 任务:${task.name} 成功`,
          {
            key,
            name: task.name,
            account: logAccount,
            data: payload,
          },
        )
      }
    })
  }

  createTaskInfo(taskInfo: TaskInfo) {
    const data: Partial<TaskInfo> = {
      limitPeople: BOOLEAN.FALSE,
      template: '',
      rewrite: BOOLEAN.FALSE,
      format: '',
      info: JSON.stringify(['姓名']),
      shareKey: getUniqueKey(),
      ddl: null,
    }
    Object.assign(taskInfo, data)

    return this.taskInfoRepository.insert(taskInfo)
  }
}
