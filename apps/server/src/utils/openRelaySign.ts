import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'

export const OPEN_SIGN_HEADERS = {
  appId: 'x-app-id',
  timestamp: 'x-timestamp',
  nonce: 'x-nonce',
  signature: 'x-signature',
} as const

export interface OpenSignInput {
  method: string
  path: string
  timestamp: string
  nonce: string
  bodyRaw: string
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input || '', 'utf8').digest('hex')
}

export function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message, 'utf8').digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a || '', 'utf8')
  const bb = Buffer.from(b || '', 'utf8')
  if (ba.length !== bb.length)
    return false
  try {
    return crypto.timingSafeEqual(ba, bb)
  }
  catch {
    return false
  }
}

export function computeOpenSignature(secret: string, input: OpenSignInput): string {
  const bodyHash = sha256Hex(input.bodyRaw || '')
  const message = [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.nonce,
    bodyHash,
  ].join('\n')
  return hmacSha256Hex(secret, message)
}

export function verifyOpenSignature(secret: string, input: OpenSignInput, signature: string): boolean {
  const expected = computeOpenSignature(secret, input)
  return safeEqual(expected, signature)
}

export function isTimestampValid(tsStr: string, toleranceMs = 5 * 60 * 1000): boolean {
  const n = Number(tsStr)
  if (!Number.isFinite(n))
    return false
  return Math.abs(Date.now() - n) <= toleranceMs
}

export function genNonce(len = 16): string {
  return crypto.randomBytes(len).toString('base64url')
}

export interface SignedHeadersOptions {
  method: string
  path: string
  bodyRaw: string
}

export interface RelayCredential {
  appId: string
  appSecret: string
}

export function buildSignedHeaders(opts: SignedHeadersOptions, cred: RelayCredential): Record<string, string> {
  const timestamp = String(Date.now())
  const nonce = genNonce(16)
  const signature = computeOpenSignature(cred.appSecret, {
    method: opts.method,
    path: opts.path,
    timestamp,
    nonce,
    bodyRaw: opts.bodyRaw || '',
  })
  return {
    'X-App-Id': cred.appId,
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  }
}

export interface VerifyIncomingOptions {
  appId: string
  appSecret: string
  path: string
  method?: string
  toleranceMs?: number
}

function pickHeader(headers: Record<string, any>, key: string): string {
  if (!headers)
    return ''
  const lower = key.toLowerCase()
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) {
      const v = headers[k]
      return Array.isArray(v) ? String(v[0] ?? '') : (v == null ? '' : String(v))
    }
  }
  return ''
}

export function verifyIncoming(
  headers: Record<string, any>,
  bodyRaw: string,
  opts: VerifyIncomingOptions,
): { ok: boolean, reason?: string } {
  const appId = pickHeader(headers, OPEN_SIGN_HEADERS.appId)
  const timestamp = pickHeader(headers, OPEN_SIGN_HEADERS.timestamp)
  const nonce = pickHeader(headers, OPEN_SIGN_HEADERS.nonce)
  const signature = pickHeader(headers, OPEN_SIGN_HEADERS.signature)
  if (!appId || !timestamp || !nonce || !signature)
    return { ok: false, reason: 'missing sign headers' }
  if (appId !== opts.appId)
    return { ok: false, reason: 'app_id mismatch' }
  if (!isTimestampValid(timestamp, opts.toleranceMs ?? 5 * 60 * 1000))
    return { ok: false, reason: 'timestamp out of range' }
  const ok = verifyOpenSignature(opts.appSecret, {
    method: (opts.method || 'POST').toUpperCase(),
    path: opts.path,
    timestamp,
    nonce,
    bodyRaw: bodyRaw || '',
  }, signature)
  if (!ok)
    return { ok: false, reason: 'sign invalid' }
  return { ok: true }
}
