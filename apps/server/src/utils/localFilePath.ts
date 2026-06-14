import crypto from 'node:crypto'
import path from 'node:path'
import { uploadFileDir } from '@/constants'

const imageMimeMap: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

/** 与七牛 object key 一致的相对路径（POSIX） */
export function localObjectRelPath(taskKey: string, hash: string, filename: string) {
  return `easypicker2/${taskKey}/${hash}/${filename}`
}

export function localObjectAbsPath(relPath: string) {
  const root = path.resolve(uploadFileDir)
  const abs = path.resolve(root, ...relPath.split('/').filter(Boolean))
  if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) {
    throw new Error('invalid local file path')
  }
  return abs
}

export function getLocalImageMimeType(filename: string) {
  return imageMimeMap[path.extname(filename).toLowerCase()] || ''
}

function getLocalAccessSecret() {
  return process.env.TOKEN_PREFIX || 'easypicker2-local-file'
}

function timingSafeStringEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false
  }
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function signLocalFileAccess(
  id: number | string,
  expires: number | string,
  variant = 'origin',
) {
  return crypto
    .createHmac('sha256', getLocalAccessSecret())
    .update(`${id}:${expires}:${variant}`)
    .digest('hex')
}

export function verifyLocalFileAccess(
  id: number | string,
  expires: number | string,
  sign: string,
  variant = 'origin',
) {
  const expiresAt = Number(expires)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false
  }
  const expected = signLocalFileAccess(id, expiresAt, variant)
  return timingSafeStringEqual(expected, sign || '')
}
