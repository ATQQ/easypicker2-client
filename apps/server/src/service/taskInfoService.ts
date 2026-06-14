import type { Context } from 'flash-wolves'
import type { TaskInfo } from '@/db/entity'
import fs from 'node:fs'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { In } from 'typeorm'
import { publicError } from '@/constants/errorMsg'
import { CategoryRepository } from '@/db/categoryDb'
import { BOOLEAN } from '@/db/model/public'
import { TaskRepository } from '@/db/taskDb'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { BehaviorService, QiniuService } from '@/service'
import { localObjectAbsPath } from '@/utils/localFilePath'
import { deleteObjByKey } from '@/utils/qiniuUtil'
import { isLocalStorageMode } from '@/utils/storageMode'
import { getUniqueKey } from '@/utils/stringUtil'

@Provide()
export default class TaskInfoService {
  @InjectCtx()
  private ctx: Context

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(CategoryRepository)
  private categoryRepository: CategoryRepository

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
    const abs = localObjectAbsPath(tipImageKey)
    if (fs.existsSync(abs)) {
      fs.unlinkSync(abs)
    }
    deleteObjByKey(tipImageKey, this.ctx.req, { allowInLocalMode: true })
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
    const task = await this.taskRepository.findOne({
      k: key,
      del: BOOLEAN.FALSE,
    })
    let submitNavTasks: { key: string, name: string }[] = []
    if (task?.categoryKey) {
      const cat = await this.categoryRepository.findOne({
        k: task.categoryKey,
        userId: task.userId,
      })
      if (cat?.submitNavTaskKeys) {
        try {
          const navKeys = JSON.parse(cat.submitNavTaskKeys) as unknown
          if (Array.isArray(navKeys) && navKeys.length) {
            const ks = navKeys.map(String)
            const ts = await this.taskRepository.findMany({
              k: In(ks),
              userId: task.userId,
              del: BOOLEAN.FALSE,
            })
            const ord = new Map(ks.map((k, i) => [k, i]))
            submitNavTasks = [...ts]
              .sort((a, b) => (ord.get(a.k) ?? 0) - (ord.get(b.k) ?? 0))
              .map(t => ({ key: t.k, name: t.name }))
          }
        }
        catch {
          /* ignore */
        }
      }
    }
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
      submitNavTasks,
    }
  }

  async updateTaskInfo(payload, key: string) {
    const { template, rewrite, format, info, ddl, people, tip, bindField }
      = payload
    let { share } = payload
    const { id: userId, account: logAccount } = this.ctx.req.userInfo

    let coercedInfo = info
    if (coercedInfo !== undefined && typeof coercedInfo === 'string') {
      try {
        coercedInfo = JSON.parse(coercedInfo)
      }
      catch {
        // 保持原字符串（旧客户端 / 异常数据）
      }
    }

    if (share !== undefined) {
      share = getUniqueKey()
    }
    if (!template && template !== undefined) {
      // 删除旧模板文件
      if (isLocalStorageMode()) {
        const abs = localObjectAbsPath(`easypicker2/${key}_template/`)
        if (fs.existsSync(abs)) {
          fs.rmSync(abs, { recursive: true, force: true })
        }
      }
      else {
        this.qiniuService.deleteFiles(`easypicker2/${key}_template/`)
      }
    }
    const options = {
      template,
      rewrite,
      format,
      info: coercedInfo,
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
      info: ['姓名'],
      shareKey: getUniqueKey(),
      ddl: null,
    }
    Object.assign(taskInfo, data)

    return this.taskInfoRepository.insert(taskInfo)
  }
}
