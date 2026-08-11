import type { Context } from 'flash-wolves'
import type { MaskMode } from '@/utils/maskUtil'
import * as crypto from 'node:crypto'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { publicError, taskError } from '@/constants/errorMsg'
import { FileRepository } from '@/db/fileDb'
import { getClientIp } from '@/db/logDb'
import { BOOLEAN } from '@/db/model/public'
import { PeopleRepository } from '@/db/peopleDb'
import { TaskRepository } from '@/db/taskDb'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { BehaviorService } from '@/service'
import { applyMask } from '@/utils/maskUtil'
import { parseViewConfig } from '@/utils/viewConfig'

const VIEW_COOKIE_PREFIX = 'tv_'
const VIEW_COOKIE_MAX_AGE_SEC = 30 * 60
/** verify：同一 IP + 任务，60s 内最多尝试次数 */
const VERIFY_RATE_WINDOW_MS = 60 * 1000
const VERIFY_RATE_MAX = 20

const verifyRateMap = new Map<string, { count: number, resetAt: number }>()

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

function assertVerifyRateLimit(ip: string, key: string) {
  const id = `${ip || 'unknown'}:${key}`
  const now = Date.now()
  let entry = verifyRateMap.get(id)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + VERIFY_RATE_WINDOW_MS }
    verifyRateMap.set(id, entry)
  }
  entry.count += 1
  if (entry.count > VERIFY_RATE_MAX) {
    throw publicError.request.errorParams
  }
  // 偶发清理，避免 Map 无限增长
  if (verifyRateMap.size > 5000) {
    for (const [k, v] of verifyRateMap) {
      if (v.resetAt <= now)
        verifyRateMap.delete(k)
    }
  }
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

  @Inject(PeopleRepository)
  private peopleRepository: PeopleRepository

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  private cookieName(key: string) {
    return `${VIEW_COOKIE_PREFIX}${key}`
  }

  private setViewCookie(key: string, viewPassword: string) {
    const fp = passwordFingerprint(viewPassword)
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
    const ip = getClientIp(this.ctx.req)
    assertVerifyRateLimit(ip, key)

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
      throw publicError.request.wrongPassword
    }
    this.setViewCookie(key, viewConfig.password)
    this.behaviorService.add('taskInfo', `查看页密码校验成功 任务:${task.name}`, {
      key,
    })
    return { ok: true, taskName: task.name }
  }

  /**
   * 进度查询：
   * - tab='submitted'：分页文件列表（轻量查询，无用量 SUM）
   * - tab='roster'：名单分页，按 roster.columns 决定返回字段
   * 密码校验：仅 Cookie（禁止 query 明文密码）
   */
  async getProgress(
    key: string,
    options?: { tab?: string, pageIndex?: number, pageSize?: number },
  ) {
    const { task, info, viewConfig } = await this.loadEnabledTaskOrThrow(key)
    if (viewConfig.password) {
      if (!this.hasValidCookie(key, viewConfig.password)) {
        throw publicError.request.notLogin
      }
      // 滑动续期，避免挂着页面 30 分钟后轮询失败
      this.setViewCookie(key, viewConfig.password)
    }
    const tab = options?.tab === 'roster' ? 'roster' : 'submitted'
    const limitPeople = Number(info.limitPeople) === Number(BOOLEAN.TRUE)
    const bindField = info.bindField || '姓名'

    if (tab === 'roster') {
      if (!limitPeople || !viewConfig.roster.enabled) {
        return {
          tab: 'roster' as const,
          pageIndex: 1,
          pageSize: 20,
          total: 0,
          pageCount: 0,
          people: [] as Array<Record<string, unknown>>,
          columns: viewConfig.roster.columns,
        }
      }
      const pageIndex = clampPage(options?.pageIndex, 1, 1, 100000)
      const pageSize = clampPage(options?.pageSize, 20, 1, 100)
      const nameMask = viewConfig.roster.nameMask
      const columns = viewConfig.roster.columns
      const { people, total } = await this.peopleRepository.findPageForTask({
        userId: task.userId,
        taskKey: key,
        pageIndex,
        pageSize,
        onlySubmitted: !viewConfig.roster.showUnsubmitted,
      })
      const showStatus = columns.includes('status')
      const showSubmitDate = columns.includes('submitDate')
      const items = people.map((p) => {
        const row: Record<string, unknown> = {
          id: p.id,
          name: applyMask(p.name || '', nameMask),
        }
        if (showStatus) {
          row.status = p.status
        }
        if (showSubmitDate) {
          row.lastDate = p.submitDate ?? null
          row.count = p.submitCount ?? 0
        }
        return row
      })
      return {
        tab: 'roster' as const,
        pageIndex,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize) || 0,
        people: items,
        columns,
      }
    }

    // tab === 'submitted'：轻量分页，不做全用户 SUM
    const pageIndex = clampPage(options?.pageIndex, 1, 1, 100000)
    const pageSize = clampPage(options?.pageSize, 20, 1, 200)
    const { files, total } = await this.fileRepository.findPageLite({
      userId: task.userId,
      taskKey: key,
      pageIndex,
      pageSize,
    })

    const visibleFieldMap = new Map<string, MaskMode>()
    for (const f of viewConfig.visibleFields) {
      visibleFieldMap.set(f.name, f.mask)
    }
    const showBindField = visibleFieldMap.has(bindField)
    const bindMask: MaskMode = showBindField ? visibleFieldMap.get(bindField)! : 'none'
    const fileFields = viewConfig.fileFields

    const maskedFiles = files.map((f) => {
      const maskedInfo = this.maskFileInfo((f as any).info, visibleFieldMap)
      // 白名单字段：不下发 hash / storage / user_id / category_key 等内部信息
      const row: Record<string, unknown> = {
        id: f.id,
        task_name: f.taskName,
        info: maskedInfo,
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
      pageCount: Math.ceil(total / pageSize) || 0,
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
