import type { Context } from 'flash-wolves'
import type { MaskMode } from '@/utils/maskUtil'
import * as crypto from 'node:crypto'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { publicError, taskError } from '@/constants/errorMsg'
import { FileRepository } from '@/db/fileDb'
import { BOOLEAN } from '@/db/model/public'
import { selectPeople } from '@/db/peopleDb'
import { TaskRepository } from '@/db/taskDb'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { BehaviorService } from '@/service'
import { applyMask } from '@/utils/maskUtil'
import { parseViewConfig } from '@/utils/viewConfig'

const VIEW_COOKIE_PREFIX = 'tv_'
const VIEW_COOKIE_MAX_AGE_SEC = 30 * 60

function passwordFingerprint(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex').slice(0, 8)
}

function parseCookies(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw)
    return out
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1)
      continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k)
      out[k] = decodeURIComponent(v)
  }
  return out
}

function isProtocolHttps(req: any): boolean {
  if (req?.secure)
    return true
  const xfp = (req?.headers?.['x-forwarded-proto'] as string | undefined) || ''
  return xfp.split(',')[0].trim() === 'https'
}

function clampPage(n: unknown, fallback: number, min: number, max: number): number {
  const v = Number(n)
  if (!Number.isFinite(v) || v < min)
    return fallback
  if (v > max)
    return max
  return Math.floor(v)
}

@Provide()
export default class TaskViewService {
  @InjectCtx()
  private ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

  @Inject(FileRepository)
  private fileRepository: FileRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  private cookieName(key: string) {
    return `${VIEW_COOKIE_PREFIX}${key}`
  }

  private async loadEnabledTaskOrThrow(key: string) {
    const task = await this.taskRepository.findOne({
      k: key,
      del: BOOLEAN.FALSE,
    })
    if (!task) {
      throw taskError.noExist
    }
    const info = await this.taskInfoRepository.findOne({ taskKey: key })
    if (!info || Number(info.viewEnabled) !== Number(BOOLEAN.TRUE)) {
      throw taskError.noExist
    }
    const viewConfig = parseViewConfig(info.viewConfig)
    return { task, info, viewConfig }
  }

  private hasValidCookie(key: string, viewPassword: string): boolean {
    if (!viewPassword)
      return true
    const cookies = parseCookies(this.ctx.req.headers?.cookie as string | undefined)
    const token = cookies[this.cookieName(key)]
    if (!token)
      return false
    return token === passwordFingerprint(viewPassword)
  }

  /** 公开元信息：是否需要密码、名单 Tab 配置（不含密码原文，仅返回前端实际使用的字段） */
  async getMeta(key: string) {
    const task = await this.taskRepository.findOne({
      k: key,
      del: BOOLEAN.FALSE,
    })
    if (!task) {
      throw taskError.noExist
    }
    const info = await this.taskInfoRepository.findOne({ taskKey: key })
    const enabled = !!info && Number(info.viewEnabled) === Number(BOOLEAN.TRUE)
    if (!enabled) {
      this.behaviorService.add('taskInfo', `查看页访问 任务:${task.name} 未启用`, {
        key,
      })
      return {
        enabled: false,
        name: task.name,
      }
    }
    const viewConfig = parseViewConfig(info.viewConfig)
    const needPassword = !!viewConfig.password
    const limitPeople = Number(info.limitPeople) === Number(BOOLEAN.TRUE)
    this.behaviorService.add('taskInfo', `查看页访问 任务:${task.name}`, {
      key,
      needPassword,
    })
    return {
      enabled: true,
      name: task.name,
      ddl: info.ddl ? new Date(info.ddl.getTime() + 8 * 60 * 60 * 1000) : null,
      needPassword,
      bindField: info.bindField ?? '姓名',
      roster: {
        enabled: limitPeople && viewConfig.roster.enabled,
        columns: viewConfig.roster.columns,
        showUnsubmitted: viewConfig.roster.showUnsubmitted,
      },
      fileFields: viewConfig.fileFields,
    }
  }

  /** 校验密码并下发 cookie */
  async verify(key: string, password: string) {
    const { task, viewConfig } = await this.loadEnabledTaskOrThrow(key)
    if (!viewConfig.password) {
      return { ok: true, taskName: task.name }
    }
    if (
      typeof password !== 'string'
      || password.length === 0
      || password !== viewConfig.password
    ) {
      this.behaviorService.add('taskInfo', `查看页密码校验失败 任务:${task.name}`, {
        key,
      })
      throw publicError.request.errorParams
    }
    const fp = passwordFingerprint(viewConfig.password)
    const cookieParts = [
      `${this.cookieName(key)}=${fp}`,
      'Path=/',
      `Max-Age=${VIEW_COOKIE_MAX_AGE_SEC}`,
      'HttpOnly',
      'SameSite=Lax',
    ]
    if (isProtocolHttps(this.ctx.req)) {
      cookieParts.push('Secure')
    }
    this.ctx.res.setHeader('Set-Cookie', cookieParts.join('; '))
    this.behaviorService.add('taskInfo', `查看页密码校验成功 任务:${task.name}`, {
      key,
    })
    return { ok: true, taskName: task.name }
  }

  /**
   * 进度查询：
   * - tab='submitted'：返回与「文件管理 POST /file/page」同型的 files 列表（不做字段重命名），
   *   仅按 viewConfig.visibleFields 在原字段上做脱敏：
   *     · info 数组：保留勾选字段，对其 value 应用各自 mask；未勾选字段移除
   *     · people：bindField 勾选时按其 mask 脱敏，否则清空
   *     · 其他列（name / origin_name / size / date / hash / task_* 等）原样返回
   * - tab='roster'：返回与「GET /people/:key」同型的 people 列表，仅对 name 应用 roster.nameMask
   * 密码校验：优先校验 options.password；未传则回退 Cookie（兼容旧逻辑）。
   */
  async getProgress(
    key: string,
    options?: { tab?: string, pageIndex?: number, pageSize?: number, password?: string },
  ) {
    const { task, info, viewConfig } = await this.loadEnabledTaskOrThrow(key)
    if (viewConfig.password) {
      const passed
        = (typeof options?.password === 'string' && options.password === viewConfig.password)
          || this.hasValidCookie(key, viewConfig.password)
      if (!passed) {
        throw publicError.request.notLogin
      }
    }
    const tab = options?.tab === 'roster' ? 'roster' : 'submitted'
    const limitPeople = Number(info.limitPeople) === Number(BOOLEAN.TRUE)
    const bindField = info.bindField || '姓名'

    if (tab === 'roster') {
      if (!limitPeople || !viewConfig.roster.enabled) {
        // 名单 Tab 未启用 → 返回空（结构对齐 /people/:key）
        return {
          tab: 'roster' as const,
          people: [] as Array<Record<string, unknown>>,
        }
      }
      const nameMask = viewConfig.roster.nameMask
      const peopleList = await selectPeople(
        {
          userId: task.userId,
          taskKey: key,
        },
        [],
      )
      // 与 /people/:key 一致：id/name/status/lastDate/count（公开页不做慢查询，fileCount/submitCount 不返回）
      // 按用户配置过滤：未提交是否展示
      const filtered = viewConfig.roster.showUnsubmitted
        ? peopleList
        : peopleList.filter(p => !!p.status)
      const items = filtered.map((p: any) => ({
        id: p.id,
        name: applyMask(p.name, nameMask),
        status: p.status,
        lastDate: p.submit_date ?? null,
        count: p.submit_count ?? 0,
      }))
      return {
        tab: 'roster' as const,
        people: items,
      }
    }

    // tab === 'submitted'：返回与 /file/page 同型的 files 列表（分页）
    const pageIndex = clampPage(options?.pageIndex, 1, 1, 100000)
    const pageSize = clampPage(options?.pageSize, 20, 1, 200)
    const { files, total } = await this.fileRepository.findPage({
      userId: task.userId,
      taskKey: key,
      pageIndex,
      pageSize,
    })

    // 字段配置：可见字段集合 + 每字段脱敏方式
    const visibleFieldMap = new Map<string, MaskMode>()
    for (const f of viewConfig.visibleFields) {
      visibleFieldMap.set(f.name, f.mask)
    }
    const showBindField = visibleFieldMap.has(bindField)
    const bindMask: MaskMode = showBindField ? visibleFieldMap.get(bindField)! : 'none'

    // 文件原生字段配置（文件名 / 原文件名 / 大小）：未勾选则不下发，勾选则按 mask 处理
    const fileFields = viewConfig.fileFields

    const maskedFiles = files.map((f) => {
      // info 仍保持「数组」原型（与 /file/page 一致），仅过滤未勾选项并对 value 脱敏
      const maskedInfo = this.maskFileInfo((f as any).info, visibleFieldMap)
      const row: Record<string, unknown> = {
        id: f.id,
        task_key: f.taskKey,
        task_name: f.taskName,
        category_key: f.categoryKey,
        user_id: f.userId,
        storage: f.storage,
        info: maskedInfo,
        hash: f.hash,
        date: f.date,
        people: showBindField ? applyMask(f.people || '', bindMask) : '',
      }
      if (fileFields.fileName.visible) {
        row.name = applyMask(f.name || '', fileFields.fileName.mask)
      }
      if (fileFields.originName.visible) {
        row.origin_name = applyMask(f.originName || '', fileFields.originName.mask)
      }
      if (fileFields.size.visible) {
        row.size = +f.size
      }
      return row
    })

    return {
      tab: 'submitted' as const,
      pageIndex,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
      files: maskedFiles,
    }
  }

  /**
   * 仅对 info 数组中「用户勾选的字段」保留并脱敏 value；
   * 兼容字符串/对象/数组三种原始形态，输出统一为数组（与 /file/page 的 info 形态一致）。
   */
  private maskFileInfo(
    raw: unknown,
    visibleFieldMap: Map<string, MaskMode>,
  ): Array<{ text: string, value: string }> {
    if (raw == null)
      return []
    let v: unknown = raw
    if (typeof v === 'string') {
      try {
        v = JSON.parse(v)
      }
      catch {
        return []
      }
    }
    const out: Array<{ text: string, value: string }> = []
    if (Array.isArray(v)) {
      for (const item of v) {
        if (!item || typeof item !== 'object')
          continue
        const name = (item as any).text ?? (item as any).name
        if (typeof name !== 'string')
          continue
        if (!visibleFieldMap.has(name))
          continue
        const mask = visibleFieldMap.get(name)!
        out.push({ text: name, value: applyMask((item as any).value, mask) })
      }
      return out
    }
    if (typeof v === 'object' && v !== null) {
      for (const [name, value] of Object.entries(v as Record<string, unknown>)) {
        if (!visibleFieldMap.has(name))
          continue
        out.push({ text: name, value: applyMask(value, visibleFieldMap.get(name)!) })
      }
      return out
    }
    return []
  }
}
