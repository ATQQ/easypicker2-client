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
import { getUserInfo } from '@/utils/userUtil'

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

  /**
   * 服务端内部使用：跳过密码门控直接读取 TaskInfo 实体。
   * 仅用于已在上游完成密码/权限校验后，需要拿到原始任务属性进行业务判断的场景，
   * 不允许在 HTTP 接口直接返回该结果。
   */
  async getRawTaskInfoEntity(key: string) {
    return this.taskInfoRepository.findOne({ taskKey: key })
  }

  async getTaskInfo(key: string, providedPassword?: string, mode?: string) {
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
      submitPassword,
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

    // 仅任务所有者（登录后）才返回提交密码明文；
    // 公开提交页只返回 needSubmitPassword 布尔，防止链接被分享时密码被直接读出。
    // 注：当前接口为 noLogin 公开接口，中间件不会自动注入 req.userInfo，
    // 这里软识别一次登录态，仅用于判断是否任务所有者，避免后台「任务配置」页拿不到密码。
    let loginUser = this.ctx.req.userInfo as { id?: number | string } | undefined
    if (!loginUser && this.ctx.req.headers?.token) {
      try {
        loginUser = (await getUserInfo(this.ctx.req)) as typeof loginUser
      }
      catch {
        loginUser = undefined
      }
    }
    // 严格化 id 比较：双方都存在且转 Number 后相等才视为 owner，
    // 避免 undefined 经 String() 转换为字符串 "undefined" 误判通过的情况。
    const ownerLoginId = loginUser?.id
    const ownerTaskId = task?.userId
    const isOwner = !!(
      ownerLoginId != null
      && ownerTaskId != null
      && Number(ownerLoginId) === Number(ownerTaskId)
      && !Number.isNaN(Number(ownerLoginId))
    )
    // mode 规范化：仅识别预期值，未知值一律退化为 undefined，
    // 防止笔误（如 'submitt'）让 owner 误绕过密码门。
    const allowedModes = new Set(['submit', 'config'])
    const normalizedMode = typeof mode === 'string' && allowedModes.has(mode)
      ? (mode as 'submit' | 'config')
      : undefined
    const isSubmitMode = normalizedMode === 'submit'
    const needSubmitPassword = !!submitPassword
    // 密码门控：未开启密码 / 所有者（非提交模式） / 提供了正确密码 才视为通过
    // 提交页（mode==='submit'）下，任务所有者本人也必须凭密码访问，
    // 否则会出现「自己刷新提交页时密码门不弹出」的体验问题。
    const ownerBypass = isOwner && !isSubmitMode
    const passwordValid
      = !needSubmitPassword
        || ownerBypass
        || (typeof providedPassword === 'string'
          && providedPassword.length > 0
          && providedPassword === submitPassword)

    // 未通过密码校验时，不下发任何敏感任务配置，避免分享链接被绕过；
    // 但「同分类下的提交导航」属于任务的公开导览信息，与密码无关，
    // 密码门展示阶段仍允许返回，便于用户在被拦截时跳转到无密码兄弟任务。
    if (!passwordValid) {
      return {
        template: undefined,
        rewrite: undefined,
        format: undefined,
        info: undefined,
        share: undefined,
        ddl: undefined,
        people: undefined,
        tip: undefined,
        bindField: undefined,
        submitNavTasks,
        needSubmitPassword,
        passwordValid,
        submitPassword: undefined,
      }
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
      needSubmitPassword,
      passwordValid,
      submitPassword: isOwner && !isSubmitMode ? submitPassword || '' : undefined,
    }
  }

  async updateTaskInfo(payload, key: string) {
    const {
      template,
      rewrite,
      format,
      info,
      ddl,
      people,
      tip,
      bindField,
      submitPassword,
      viewEnabled,
      viewPassword,
      viewVisibleFields,
      viewShowUnsubmitted,
      viewShowFileNames,
    } = payload
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

    // 提交密码字段标准化与校验
    let normalizedSubmitPassword: string | null | undefined
    if (submitPassword !== undefined) {
      if (typeof submitPassword !== 'string') {
        throw publicError.request.errorParams
      }
      const trimmed = submitPassword.trim()
      if (trimmed === '') {
        normalizedSubmitPassword = null
      }
      else {
        if (trimmed.length < 4 || trimmed.length > 64) {
          throw publicError.request.errorParams
        }
        normalizedSubmitPassword = trimmed
      }
    }

    // view 字段标准化
    let normalizedViewEnabled: number | undefined
    if (viewEnabled !== undefined) {
      normalizedViewEnabled = viewEnabled ? BOOLEAN.TRUE : BOOLEAN.FALSE
    }
    let normalizedViewPassword: string | null | undefined
    if (viewPassword !== undefined) {
      if (viewPassword === null) {
        normalizedViewPassword = null
      }
      else if (typeof viewPassword === 'string') {
        const t = viewPassword.trim()
        if (t === '') {
          normalizedViewPassword = null
        }
        else {
          if (t.length < 4 || t.length > 64) {
            throw publicError.request.errorParams
          }
          normalizedViewPassword = t
        }
      }
      else {
        throw publicError.request.errorParams
      }
    }
    let normalizedViewVisibleFields: string | null | undefined
    if (viewVisibleFields !== undefined) {
      if (viewVisibleFields === null || viewVisibleFields === '') {
        normalizedViewVisibleFields = null
      }
      else if (typeof viewVisibleFields === 'string') {
        // 客户端已序列化
        try {
          JSON.parse(viewVisibleFields)
          normalizedViewVisibleFields = viewVisibleFields
        }
        catch {
          throw publicError.request.errorParams
        }
      }
      else if (typeof viewVisibleFields === 'object') {
        normalizedViewVisibleFields = JSON.stringify(viewVisibleFields)
      }
      else {
        throw publicError.request.errorParams
      }
    }
    let normalizedViewShowUnsubmitted: number | undefined
    if (viewShowUnsubmitted !== undefined) {
      normalizedViewShowUnsubmitted = viewShowUnsubmitted ? BOOLEAN.TRUE : BOOLEAN.FALSE
    }
    let normalizedViewShowFileNames: number | undefined
    if (viewShowFileNames !== undefined) {
      normalizedViewShowFileNames = viewShowFileNames ? BOOLEAN.TRUE : BOOLEAN.FALSE
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
      submitPassword: normalizedSubmitPassword,
      viewEnabled: normalizedViewEnabled,
      viewPassword: normalizedViewPassword,
      viewVisibleFields: normalizedViewVisibleFields,
      viewShowUnsubmitted: normalizedViewShowUnsubmitted,
      viewShowFileNames: normalizedViewShowFileNames,
    }
    if (bindField === '') {
      options.bindField = undefined
    }
    // 过滤掉 undefined 字段，避免 TypeORM 把它们写为 NULL 覆盖其他列
    const updateFields = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined),
    )
    if (Object.keys(updateFields).length === 0) {
      return null
    }
    await this.taskInfoRepository.updateSpecifyFields(
      {
        taskKey: key,
        userId,
      },
      updateFields,
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
        submitPassword: '设置提交密码',
        viewEnabled: '切换分享查看开关',
        viewPassword: '设置查看页密码',
        viewVisibleFields: '设置查看页可见字段',
        viewShowUnsubmitted: '切换查看页未提交显示',
        viewShowFileNames: '切换查看页文件名显示',
      }

      if (task) {
        const safePayload = { ...payload }
        if (safePayload.submitPassword) {
          safePayload.submitPassword = '***'
        }
        if (safePayload.viewPassword) {
          safePayload.viewPassword = '***'
        }
        this.behaviorService.add(
          'taskInfo',
          `更新任务属性 ${bType[ks]} 用户:${logAccount} 任务:${task.name} 成功`,
          {
            key,
            name: task.name,
            account: logAccount,
            data: safePayload,
          },
        )
      }
    })
  }

  /** 任务所有者：获取分享查看页配置 */
  async getViewConfig(key: string) {
    const userId = this.ctx.req.userInfo?.id
    const task = await this.taskRepository.findOne({
      k: key,
      del: BOOLEAN.FALSE,
    })
    if (!task || Number(task.userId) !== Number(userId)) {
      throw publicError.request.errorParams
    }
    const info = await this.taskInfoRepository.findOne({ taskKey: key })
    return {
      viewEnabled: Number(info?.viewEnabled) === Number(BOOLEAN.TRUE),
      viewPassword: info?.viewPassword || '',
      viewVisibleFields: info?.viewVisibleFields || '',
      viewShowUnsubmitted: info?.viewShowUnsubmitted === undefined
        ? true
        : Number(info.viewShowUnsubmitted) === Number(BOOLEAN.TRUE),
      viewShowFileNames: Number(info?.viewShowFileNames) === Number(BOOLEAN.TRUE),
    }
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
      submitPassword: null,
      viewEnabled: BOOLEAN.FALSE,
      viewPassword: null,
      viewVisibleFields: null,
      viewShowUnsubmitted: BOOLEAN.TRUE,
      viewShowFileNames: BOOLEAN.FALSE,
    }
    Object.assign(taskInfo, data)

    return this.taskInfoRepository.insert(taskInfo)
  }
}
