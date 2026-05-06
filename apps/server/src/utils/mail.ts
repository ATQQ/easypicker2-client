import nodemailer from 'nodemailer'
import { getRedisVal, setRedisValue } from '@/db/redisDb'
import LocalUserDB from '@/utils/user-local-db'

function smtpCfg() {
  return LocalUserDB.getUserConfigByType('smtp') as Record<string, string>
}

function requiredSmtpKeys() {
  return ['host', 'user', 'pass', 'fromAddress'] as const
}

export function isSmtpConfigured(): boolean {
  const c = smtpCfg()
  return requiredSmtpKeys().every((k) => {
    const v = c[k]
    return typeof v === 'string' && v.trim() !== '' && v !== '******'
  })
}

function createTransport() {
  const c = smtpCfg()
  if (!isSmtpConfigured())
    return null
  const port = Number(c.port) || 465
  const secure = c.secure === 'false' || c.secure === '0' ? false : port === 465
  return nodemailer.createTransport({
    host: c.host.trim(),
    port,
    secure,
    auth: {
      user: c.user.trim(),
      pass: c.pass.trim(),
    },
  })
}

function mailGlobalDayKey() {
  const prefix = process.env.TOKEN_PREFIX || 'ep'
  const day = new Date().toISOString().slice(0, 10)
  return `${prefix}-mail-global-${day}`
}

async function getGlobalDailySent(): Promise<number> {
  const raw = await getRedisVal(mailGlobalDayKey())
  return raw ? Number(raw) : 0
}

async function incrGlobalDailySent() {
  const n = await getGlobalDailySent()
  await setRedisValue(mailGlobalDayKey(), String(n + 1), 60 * 60 * 36)
}

export async function sendMail(opts: {
  to: string | string[]
  subject: string
  text: string
  html?: string
}) {
  const transporter = createTransport()
  if (!transporter)
    return { ok: false as const, error: 'smtp not configured' }

  const site = LocalUserDB.getSiteConfig()
  const limit = typeof site?.emailDailyLimit === 'number' ? site.emailDailyLimit : 200
  if (limit > 0 && (await getGlobalDailySent()) >= limit)
    return { ok: false as const, error: 'daily email limit reached' }

  const c = smtpCfg()
  const from = c.fromName
    ? `"${c.fromName}" <${c.fromAddress.trim()}>`
    : c.fromAddress.trim()

  const toList = Array.isArray(opts.to) ? opts.to : [opts.to]

  try {
    await transporter.sendMail({
      from,
      to: toList.join(', '),
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, '<br/>'),
    })
    if (limit > 0)
      await incrGlobalDailySent()
    return { ok: true as const }
  }
  catch (e) {
    console.error('[mail]', e)
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function sendVerifyCodeMail(to: string, code: string) {
  const app = LocalUserDB.getSiteConfig()?.appName || 'EasyPicker'
  return sendMail({
    to,
    subject: `${app} 验证码`,
    text: `您的验证码为：${code}，2 分钟内有效。如非本人操作请忽略。`,
  })
}

let lastAlertAt = 0
const ALERT_COOLDOWN_MS = 5 * 60 * 1000

export async function sendServiceAlertMail(subject: string, body: string) {
  const now = Date.now()
  if (now - lastAlertAt < ALERT_COOLDOWN_MS)
    return
  lastAlertAt = now

  const site = LocalUserDB.getSiteConfig()
  const raw = site?.alertEmails
  if (!raw || typeof raw !== 'string')
    return
  const to = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
  if (to.length === 0 || !isSmtpConfigured())
    return
  await sendMail({
    to,
    subject: `[服务告警] ${subject}`,
    text: body,
  })
}
