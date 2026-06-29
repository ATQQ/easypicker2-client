import type { Context } from 'flash-wolves'
import type { MaskMode } from '@/utils/maskUtil'
import * as crypto from 'node:crypto'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import { publicError, taskError } from '@/constants/errorMsg'
import { selectFiles } from '@/db/fileDb'
import { BOOLEAN } from '@/db/model/public'
import { selectPeople } from '@/db/peopleDb'
import { TaskRepository } from '@/db/taskDb'
import { TaskInfoRepository } from '@/db/taskInfoDb'
import { BehaviorService } from '@/service'
import { applyMask, isValidMask } from '@/utils/maskUtil'

interface VisibleFieldConfig {
  name: string
  mask: MaskMode
}

interface ParsedVisibleConfig {
  fields: VisibleFieldConfig[]
}

const VIEW_COOKIE_PREFIX = 'tv_'
const VIEW_COOKIE_MAX_AGE_SEC = 30 * 60

function parseVisibleFields(raw: string | null | undefined): ParsedVisibleConfig {
  if (!raw || typeof raw !== 'string') {
    return { fields: [] }
  }
  try {
    const obj = JSON.parse(raw)
    const fields = Array.isArray(obj?.fields) ? obj.fields : []
    const cleaned: VisibleFieldConfig[] = []
    for (const f of fields) {
      if (!f || typeof f !== 'object')
        continue
      const name = typeof f.name === 'string' ? f.name : ''
      if (!name)
        continue
      const mask = isValidMask(f.mask) ? f.mask : 'none'
      cleaned.push({ name, mask })
    }
    return { fields: cleaned }
  }
  catch {
    return { fields: [] }
  }
}

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

@Provide()
export default class TaskViewService {
  @InjectCtx()
  private ctx: Context

  @Inject(TaskRepository)
  private taskRepository: TaskRepository

  @Inject(TaskInfoRepository)
  private taskInfoRepository: TaskInfoRepository

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
    return { task, info }
  }

  private hasValidCookie(key: string, viewPassword: string | null): boolean {
    if (!viewPassword)
      return true
    const cookies = parseCookies(this.ctx.req.headers?.cookie as string | undefined)
    const token = cookies[this.cookieName(key)]
    if (!token)
      return false
    return token === passwordFingerprint(viewPassword)
  }

  /** 公开元信息：是否需要密码、显示选项、字段脱敏配置（不含密码原文） */
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
        showUnsubmitted: false,
        showFileNames: false,
        limitPeople: false,
        visibleFields: [] as VisibleFieldConfig[],
        bindField: null as string | null,
      }
    }
    const needPassword = !!info.viewPassword
    const visible = parseVisibleFields(info.viewVisibleFields)
    this.behaviorService.add('taskInfo', `查看页访问 任务:${task.name}`, {
      key,
      needPassword,
    })
    return {
      enabled: true,
      name: task.name,
      ddl: info.ddl ? new Date(info.ddl.getTime() + 8 * 60 * 60 * 1000) : null,
      needPassword,
      showUnsubmitted: Number(info.viewShowUnsubmitted) === Number(BOOLEAN.TRUE),
      showFileNames: Number(info.viewShowFileNames) === Number(BOOLEAN.TRUE),
      limitPeople: Number(info.limitPeople) === Number(BOOLEAN.TRUE),
      visibleFields: visible.fields,
      bindField: info.bindField ?? '姓名',
    }
  }

  /** 校验密码并下发 cookie */
  async verify(key: string, password: string) {
    const { task, info } = await this.loadEnabledTaskOrThrow(key)
    if (!info.viewPassword) {
      // 未设密码也允许通过（兼容前端再次校验场景）
      return { ok: true, taskName: task.name }
    }
    if (typeof password !== 'string' || password.length === 0 || password !== info.viewPassword) {
      this.behaviorService.add('taskInfo', `查看页密码校验失败 任务:${task.name}`, {
        key,
      })
      // TODO: 后续接入 Redis 失败次数限制 / IP 限流
      throw publicError.request.errorParams
    }
    const fp = passwordFingerprint(info.viewPassword)
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

  /** 提交进度：按人员聚合 */
  async getProgress(key: string) {
    const { task, info } = await this.loadEnabledTaskOrThrow(key)
    if (!this.hasValidCookie(key, info.viewPassword)) {
      throw publicError.request.notLogin
    }
    const includeFileNames = Number(info.viewShowFileNames) === Number(BOOLEAN.TRUE)
    const showUnsubmitted = Number(info.viewShowUnsubmitted) === Number(BOOLEAN.TRUE)
    const limited = Number(info.limitPeople) === Number(BOOLEAN.TRUE)
    const visible = parseVisibleFields(info.viewVisibleFields)
    const bindField = info.bindField || '姓名'

    const files = await selectFiles({
      taskKey: key,
      userId: task.userId,
    })

    interface SubmittedRow {
      people: string
      submitAt: Date | null
      fileCount: number
      fileNames?: string[]
      maskedFields: { name: string, value: string }[]
    }

    const byPerson = new Map<string, SubmittedRow>()
    for (const f of files) {
      const person = f.people || ''
      if (!person)
        continue
      const submitDate = f.date ? new Date(f.date) : null
      let row = byPerson.get(person)
      if (!row) {
        // 解析 info（可能是 JSON 字符串 / 数组 / 对象）
        const infoRaw = (f as any).info
        const infoObj = normalizeFileInfo(infoRaw)
        const maskedFields = visible.fields.map((cfg) => {
          const raw = infoObj[cfg.name]
          return { name: cfg.name, value: applyMask(raw, cfg.mask) }
        })
        row = {
          people: applyMask(person, getMaskForBindField(visible, bindField)),
          submitAt: submitDate,
          fileCount: 0,
          maskedFields,
          ...(includeFileNames ? { fileNames: [] as string[] } : {}),
        }
        byPerson.set(person, row)
      }
      row.fileCount += 1
      if (submitDate && (!row.submitAt || submitDate > row.submitAt)) {
        row.submitAt = submitDate
      }
      if (includeFileNames && row.fileNames) {
        row.fileNames.push(f.originName || f.name)
      }
    }

    let unsubmitted: string[] | undefined
    if (limited && showUnsubmitted) {
      const peopleList = await selectPeople(
        {
          userId: task.userId,
          taskKey: key,
        },
        ['name', 'status'],
      )
      const bindMask = getMaskForBindField(visible, bindField)
      unsubmitted = peopleList
        .filter(p => !p.status)
        .map(p => applyMask(p.name, bindMask))
    }

    const submitted = Array.from(byPerson.values()).sort((a, b) => {
      const ta = a.submitAt ? a.submitAt.getTime() : 0
      const tb = b.submitAt ? b.submitAt.getTime() : 0
      return tb - ta
    })

    return {
      name: task.name,
      ddl: info.ddl ? new Date(info.ddl.getTime() + 8 * 60 * 60 * 1000) : null,
      limitPeople: limited,
      showUnsubmitted,
      showFileNames: includeFileNames,
      submitted,
      unsubmitted,
      submittedCount: submitted.length,
      totalPeople: limited && unsubmitted !== undefined
        ? submitted.length + unsubmitted.length
        : undefined,
    }
  }
}

function getMaskForBindField(
  visible: ParsedVisibleConfig,
  bindField: string,
): MaskMode {
  const found = visible.fields.find(f => f.name === bindField)
  return found ? found.mask : 'none'
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
