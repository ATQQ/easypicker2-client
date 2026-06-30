import type { Context } from 'flash-wolves'
import type { MaskMode } from '@/utils/maskUtil'
import type { ViewConfig } from '@/utils/viewConfig'
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

function normalizeFileInfo(raw: unknown): Record<string, unknown> {
  if (raw == null)
    return {}
  let v: unknown = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    }
    catch {
      return {}
    }
  }
  if (Array.isArray(v)) {
    const out: Record<string, unknown> = {}
    for (const item of v) {
      if (item && typeof item === 'object') {
        const name = (item as any).text ?? (item as any).name
        const value = (item as any).value
        if (typeof name === 'string') {
          out[name] = value
        }
      }
    }
    return out
  }
  if (typeof v === 'object' && v !== null) {
    return v as Record<string, unknown>
  }
  return {}
}

function getMaskForField(
  config: ViewConfig,
  fieldName: string,
  fallback: MaskMode = 'tail',
): MaskMode {
  const found = config.visibleFields.find(f => f.name === fieldName)
  return found ? found.mask : fallback
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

  /** 公开元信息：是否需要密码、可见字段、名单 Tab 配置（不含密码原文） */
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
        ddl: null as Date | null,
        needPassword: false,
        limitPeople: false,
        bindField: null as string | null,
        visibleFields: [] as { name: string }[],
        roster: {
          enabled: false,
          columns: [] as string[],
          showUnsubmitted: false,
        },
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
      limitPeople,
      bindField: info.bindField ?? '姓名',
      // 仅暴露字段名（脱敏在服务端执行），不下发 mask 配置
      visibleFields: viewConfig.visibleFields.map(f => ({ name: f.name })),
      roster: {
        enabled: limitPeople && viewConfig.roster.enabled,
        columns: viewConfig.roster.columns,
        showUnsubmitted: viewConfig.roster.showUnsubmitted,
      },
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
   * - tab='submitted'：按文件平铺，分页（与文件管理页同序 id DESC），服务端脱敏
   * - tab='roster'：限制名单时启用，按 people 表分页（含 status / submitDate）
   */
  async getProgress(
    key: string,
    options?: { tab?: string, pageIndex?: number, pageSize?: number },
  ) {
    const { task, info, viewConfig } = await this.loadEnabledTaskOrThrow(key)
    if (!this.hasValidCookie(key, viewConfig.password)) {
      throw publicError.request.notLogin
    }
    const tab = options?.tab === 'roster' ? 'roster' : 'submitted'
    const pageIndex = clampPage(options?.pageIndex, 1, 1, 100000)
    const pageSize = clampPage(options?.pageSize, 20, 1, 200)
    const limitPeople = Number(info.limitPeople) === Number(BOOLEAN.TRUE)
    const bindField = info.bindField || '姓名'

    if (tab === 'roster') {
      if (!limitPeople || !viewConfig.roster.enabled) {
        // 名单 Tab 未启用 → 返回空
        return {
          tab: 'roster' as const,
          pageIndex,
          pageSize,
          total: 0,
          items: [] as Array<Record<string, unknown>>,
        }
      }
      const nameMask = viewConfig.roster.nameMask
      const peopleList = await selectPeople(
        {
          userId: task.userId,
          taskKey: key,
        },
        ['name', 'status', 'submitDate'],
      )
      // 是否展示未提交人员
      const filtered = viewConfig.roster.showUnsubmitted
        ? peopleList
        : peopleList.filter(p => !!p.status)
      // 排序：已提交在前并按 submitDate DESC；未提交在后，按 name
      const sorted = [...filtered].sort((a, b) => {
        const sa = a.status ? 1 : 0
        const sb = b.status ? 1 : 0
        if (sa !== sb)
          return sb - sa
        const da = a.submitDate ? new Date(a.submitDate).getTime() : 0
        const db = b.submitDate ? new Date(b.submitDate).getTime() : 0
        if (da !== db)
          return db - da
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
      const total = sorted.length
      const pageRows = sorted.slice((pageIndex - 1) * pageSize, pageIndex * pageSize)
      const items = pageRows.map(p => ({
        name: applyMask(p.name, nameMask),
        status: !!p.status,
        submitDate: p.submitDate ? new Date(p.submitDate) : null,
      }))
      return {
        tab: 'roster' as const,
        pageIndex,
        pageSize,
        total,
        items,
      }
    }

    // tab === 'submitted'：按文件平铺
    const { files, total } = await this.fileRepository.findPage({
      userId: task.userId,
      taskKey: key,
      pageIndex,
      pageSize,
    })

    // 绑定字段（姓名）默认脱敏 head_tail；其他字段默认 tail
    const bindMask: MaskMode = getMaskForField(viewConfig, bindField, 'head_tail')

    const items = files.map((f) => {
      const infoObj = normalizeFileInfo((f as any).info)
      const fields: Record<string, string> = {}
      for (const fld of viewConfig.visibleFields) {
        if (fld.name === bindField)
          continue
        fields[fld.name] = applyMask(infoObj[fld.name], fld.mask)
      }
      return {
        id: f.id,
        people: applyMask(f.people || '', bindMask),
        fileName: f.originName || f.name,
        submitDate: f.date ? new Date(f.date) : null,
        fields,
      }
    })

    return {
      tab: 'submitted' as const,
      pageIndex,
      pageSize,
      total,
      items,
      bindField,
      visibleFieldNames: viewConfig.visibleFields
        .map(f => f.name)
        .filter(n => n !== bindField),
    }
  }
}
